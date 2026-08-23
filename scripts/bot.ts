/**
 * StomGo Telegram boti — alohida jarayon.
 * Lokal: npm run bot   Server: docker compose "bot" servisi
 *
 * Imkoniyatlar:
 *  HAMMAGA: 🔍 Klinika topish — tuman bo'yicha yoki hozir ochiqlar
 *           (hisob ulanmagan bo'lsa ham ishlaydi)
 *  BEMOR:   ulash, 📅 Yozuvlarim (bekor qilish bilan), eslatmalar (24s/2s),
 *           tashrifdan keyin baholash (yulduz bosish → matn yozish)
 *  KLINIKA: ulash, yangi so'rov + tugmalar, ⏳ Kutilayotganlar,
 *           📋 Bugungi yozuvlar, 📷 QR kod
 *  Buyruqlar: /start /klinikalar /yozuvlarim /yordam /uzish
 */
import { Bot, InlineKeyboard, Keyboard, type Context } from "grammy";
import { PrismaClient } from "@prisma/client";
import { fmtDateTimeUz as fmtDT } from "../lib/date-uz";
import { DISTRICTS } from "../lib/districts";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log("TELEGRAM_BOT_TOKEN berilmagan — bot ishga tushmaydi (bu xato emas).");
  process.exit(0);
}

const db = new PrismaClient();
const bot = new Bot(token);

// Baholashdan keyin matn kutish holati: chatId -> reviewId
const awaitingReviewText = new Map<string, string>();
// Kirish uchun raqam tasdiqlash kutilmoqda: chatId -> otp tgToken
const awaitingContact = new Map<string, string>();

/** Saytning ommaviy manzili — botdagi havolalar uchun */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

const PATIENT_MENU = new Keyboard()
  .text("📅 Yozuvlarim").text("🔍 Klinika topish")
  .row()
  .text("ℹ️ Yordam")
  .resized().persistent();

const CLINIC_MENU = new Keyboard()
  .text("⏳ Kutilayotganlar").text("📋 Bugungi yozuvlar")
  .row()
  .text("📷 QR kod").text("ℹ️ Yordam")
  .resized().persistent();

async function chatRole(chatId: string): Promise<{ type: "clinic"; clinic: { id: string; name: string; checkinCode: string } } | { type: "user"; user: { id: string; name: string | null } } | null> {
  const clinic = await db.clinic.findFirst({
    where: { telegramChatId: chatId },
    select: { id: true, name: true, checkinCode: true },
  });
  if (clinic) return { type: "clinic", clinic };
  const user = await db.user.findFirst({
    where: { telegramChatId: chatId },
    select: { id: true, name: true },
  });
  if (user) return { type: "user", user };
  return null;
}

// ---------- /start ----------
bot.command("start", async (ctx) => {
  const code = (ctx.match ?? "").trim();
  const chatId = String(ctx.chat.id);

  // Saytdan/ilovadan kirish: botda raqamni tasdiqlash → kod shu yerda beriladi
  if (code.startsWith("otp_")) {
    const tgToken = code.slice(4);
    const otp = await db.otpCode.findFirst({
      where: { tgToken, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!otp) {
      await ctx.reply("Bu havola eskirgan. Sayt/ilovada «Kod olish»ni qaytadan bosing.");
      return;
    }
    awaitingContact.set(chatId, tgToken);
    await ctx.reply(
      `Kirish uchun <b>${otp.phone}</b> raqami sizniki ekanini tasdiqlang.\n\nPastdagi tugmani bosing — Telegram raqamingizni xavfsiz yuboradi:`,
      {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "📱 Raqamni tasdiqlash", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  if (code) {
    await linkByCode(code, chatId, ctx);
    return;
  }

  // Allaqachon ulanganmi? Qayta so'ramaymiz — menyu ko'rsatamiz
  const role = await chatRole(chatId);
  if (role?.type === "clinic") {
    await ctx.reply(
      `✅ Bu chat «${role.clinic.name}» klinikasiga ulangan.\n\nYangi yozuv so'rovlari shu yerga tushadi. Pastdagi menyudan foydalaning:`,
      { reply_markup: CLINIC_MENU }
    );
    return;
  }
  if (role?.type === "user") {
    await ctx.reply(
      `✅ Ulangansiz${role.user.name ? `, ${role.user.name}` : ""}!\n\nYozuv tasdiqlansa va qabuldan oldin eslatmalar shu yerga keladi.`,
      { reply_markup: PATIENT_MENU }
    );
    return;
  }
  // Hisobi ulanmagan bo'lsa ham bot foydali bo'lsin — klinika qidirsa bo'ladi
  await ctx.reply(
    "Assalomu alaykum! Bu <b>StomGo</b> boti — Toshkentdagi stomatologiyalar.\n\n" +
      "🔍 Klinika topish uchun pastdagi tugmani bosing — hisob shart emas.\n\n" +
      "🔗 Yozuvlaringiz va eslatmalar shu yerga kelishi uchun hisobingizni ulang: " +
      "ilova yoki paneldagi «Telegram'ga ulash» tugmasi. Kod bo'lsa shu yerga yuboring " +
      "(masalan: <code>u_ab12cd34</code>).",
    { parse_mode: "HTML", reply_markup: PATIENT_MENU },
  );
});

// ---------- /uzish: hisobni botdan ajratish ----------
bot.command("uzish", async (ctx) => {
  const chatId = String(ctx.chat.id);
  const role = await chatRole(chatId);

  if (!role) {
    await ctx.reply("Bu chatga hech qanday hisob ulanmagan.");
    return;
  }

  if (role.type === "clinic") {
    await db.clinic.update({ where: { id: role.clinic.id }, data: { telegramChatId: null } });
    await db.auditLog.create({
      data: { actorRole: "BOT", actorName: role.clinic.name, action: "TG_UNLINK", entity: "Clinic", entityId: role.clinic.id },
    }).catch(() => {});
    await ctx.reply(
      `🔌 «${role.clinic.name}» uzildi. Yangi so'rovlar bu yerga tushmaydi.\n\n` +
        "⚠️ Diqqat: parolni tiklash ham shu ulanish orqali ishlaydi. " +
        "Qaytadan ulash uchun paneldan yangi kod oling.",
      { reply_markup: { remove_keyboard: true } },
    );
    return;
  }

  await db.user.update({ where: { id: role.user.id }, data: { telegramChatId: null } });
  await db.auditLog.create({
    data: { actorId: role.user.id, actorRole: "BOT", actorName: role.user.name ?? "Bemor", action: "TG_UNLINK", entity: "User", entityId: role.user.id },
  }).catch(() => {});
  await ctx.reply(
    "🔌 Hisobingiz uzildi. Eslatmalar bu yerga kelmaydi.\n\n" +
      "⚠️ Diqqat: saytga kirish kodi ham shu bot orqali keladi. " +
      "Qaytadan ulash uchun ilovadagi Profil bo'limidan yangi kod oling.",
    { reply_markup: { remove_keyboard: true } },
  );
});

async function linkByCode(code: string, chatId: string, ctx: Context) {
  if (code.startsWith("c_")) {
    const clinic = await db.clinic.findUnique({ where: { tgLinkCode: code } });
    if (!clinic) {
      await ctx.reply("Kod topilmadi. Klinika panelidagi Sozlamalar bo'limidan yangi kod oling.");
      return;
    }
    if (clinic.telegramChatId === chatId) {
      await ctx.reply(`✅ «${clinic.name}» allaqachon shu chatga ulangan.`, { reply_markup: CLINIC_MENU });
      return;
    }
    await db.clinic.update({ where: { id: clinic.id }, data: { telegramChatId: chatId } });
    await db.auditLog.create({ data: { actorRole: "BOT", actorName: clinic.name, action: "TG_LINK", entity: "Clinic", entityId: clinic.id } }).catch(() => {});
    await ctx.reply(
      `✅ «${clinic.name}» klinikasi ulandi!\n\nYangi yozuv so'rovlari shu yerga tushadi — tugmalar bilan tasdiqlaysiz.`,
      { reply_markup: CLINIC_MENU }
    );
  } else if (code.startsWith("u_")) {
    const user = await db.user.findUnique({ where: { tgLinkCode: code } });
    if (!user) {
      await ctx.reply("Kod topilmadi. Ilovadagi Profil bo'limidan yangi kod oling.");
      return;
    }
    if (user.telegramChatId === chatId) {
      await ctx.reply("✅ Hisobingiz allaqachon ulangan.", { reply_markup: PATIENT_MENU });
      return;
    }
    await db.user.update({ where: { id: user.id }, data: { telegramChatId: chatId } });
    await db.auditLog.create({ data: { actorId: user.id, actorRole: "BOT", actorName: user.name ?? user.phone, action: "TG_LINK", entity: "User", entityId: user.id } }).catch(() => {});
    await ctx.reply(
      `✅ Hisobingiz ulandi${user.name ? `, ${user.name}` : ""}!\n\nYozuvlaringiz holati va eslatmalar shu yerga keladi.`,
      { reply_markup: PATIENT_MENU }
    );
  } else {
    await ctx.reply("Kod formati noto'g'ri.");
  }
}

// ---------- Kontakt: kirish uchun raqam tasdiqlash ----------
bot.on("message:contact", async (ctx) => {
  const chatId = String(ctx.chat.id);
  const tgToken = awaitingContact.get(chatId);
  if (!tgToken) return;

  const contact = ctx.message.contact;
  // Faqat O'Z raqamini yuborishi mumkin (boshqa odam kontaktini emas)
  if (contact.user_id !== ctx.from?.id) {
    await ctx.reply("Iltimos, tugma orqali O'Z raqamingizni yuboring.");
    return;
  }
  const digits = contact.phone_number.replace(/\D/g, "");
  const contactPhone = digits.startsWith("998") ? `+${digits}` : `+998${digits.slice(-9)}`;

  const otp = await db.otpCode.findFirst({
    where: { tgToken, usedAt: null, expiresAt: { gt: new Date() } },
  });
  awaitingContact.delete(chatId);

  if (!otp) {
    await ctx.reply("Havola eskirgan. Sayt/ilovada «Kod olish»ni qaytadan bosing.", { reply_markup: { remove_keyboard: true } });
    return;
  }
  if (otp.phone !== contactPhone) {
    await ctx.reply(
      `❌ Mos kelmadi.\nSaytda kiritilgan: ${otp.phone}\nTelegram raqamingiz: ${contactPhone}\n\nSayt/ilovada Telegram raqamingizni kiriting va qaytadan urining.`,
      { reply_markup: { remove_keyboard: true } }
    );
    return;
  }

  // Mavjud foydalanuvchini botga ulab qo'yamiz (yangi foydalanuvchi kirishda yaratiladi)
  const user = await db.user.findUnique({ where: { phone: contactPhone } });
  if (user && !user.telegramChatId) {
    await db.user.update({ where: { id: user.id }, data: { telegramChatId: chatId } });
  }

  await ctx.reply(
    `✅ Tasdiqlandi!\n\n🔐 Kirish kodingiz: <code>${otp.code}</code>\n\nSayt/ilovaga qaytib shu kodni kiriting. 10 daqiqa amal qiladi.`,
    { parse_mode: "HTML", reply_markup: { remove_keyboard: true } }
  );
});

// ---------- Matnli xabarlar (menyu + kod + sharh matni) ----------
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  const chatId = String(ctx.chat.id);

  // Ulash kodi
  if (/^[cu]_[a-z0-9]{6,12}$/i.test(text)) {
    await linkByCode(text, chatId, ctx);
    return;
  }

  // Baholashdan keyingi sharh matni
  const reviewId = awaitingReviewText.get(chatId);
  if (reviewId && !text.startsWith("/") && !text.startsWith("📅") && !text.startsWith("⏳") && !text.startsWith("📋") && !text.startsWith("🔑") && !text.startsWith("ℹ️")) {
    awaitingReviewText.delete(chatId);
    await db.review.update({ where: { id: reviewId }, data: { text: text.slice(0, 1000) } }).catch(() => {});
    await ctx.reply("✅ Rahmat! Sharhingiz moderatsiyadan so'ng e'lon qilinadi.");
    return;
  }

  const role = await chatRole(chatId);

  if (text === "ℹ️ Yordam" || text === "/yordam") {
    await ctx.reply(
      role?.type === "clinic"
        ? "⏳ Kutilayotganlar — javob berilmagan so'rovlar\n📋 Bugungi yozuvlar — bugungi tasdiqlanganlar\n📷 QR kod — kelganini tasdiqlash yo'riqnomasi\n\nYangi so'rovlar avtomatik tushadi."
        : "📅 Yozuvlarim — faol yozuvlaringiz va bekor qilish\n\nYozuv tasdiqlanganda, rad etilganda va qabuldan 24/2 soat oldin xabar keladi. Tashrifdan keyin baholash so'raladi."
    );
    return;
  }

  // Klinika qidirish — hisob ulanmagan bo'lsa ham ishlaydi
  if (text === "🔍 Klinika topish" || text === "/klinikalar") {
    const kb = new InlineKeyboard();
    DISTRICTS.forEach((d, i) => {
      kb.text(d, `dist:${d}`);
      if (i % 2 === 1) kb.row();
    });
    kb.row().text("🌙 Hozir ochiq", "dist:__open__");
    await ctx.reply("Qaysi tumandan qidiramiz?", { reply_markup: kb });
    return;
  }

  if (role?.type === "user" && (text === "📅 Yozuvlarim" || text === "/yozuvlarim")) {
    const items = await db.appointment.findMany({
      where: { userId: role.user.id, status: { in: ["PENDING", "CONFIRMED", "ALT_OFFERED"] } },
      include: { clinic: { select: { name: true, address: true } } },
      orderBy: { requestedAt: "asc" },
      take: 10,
    });
    if (!items.length) {
      await ctx.reply("Faol yozuvlaringiz yo'q. Ilovadan klinika tanlab yozilishingiz mumkin.");
      return;
    }
    for (const a of items) {
      const st = a.status === "CONFIRMED" ? "✅ Tasdiqlangan" : a.status === "PENDING" ? "⏳ Kutilmoqda" : "📅 Boshqa vaqt taklifi";
      const kb = new InlineKeyboard().text("❌ Bekor qilish", `aptcancel:${a.id}`);
      await ctx.reply(
        `${st}\n🏥 <b>${a.clinic.name}</b>\n🕐 ${fmtDT(a.requestedAt)}\n📍 ${a.clinic.address}${a.status === "CONFIRMED" ? `\n🔑 Kod: <code>${a.code}</code>` : ""}`,
        { parse_mode: "HTML", reply_markup: kb }
      );
    }
    return;
  }

  if (role?.type === "clinic") {
    if (text === "⏳ Kutilayotganlar") {
      const items = await db.appointment.findMany({
        where: { clinicId: role.clinic.id, status: "PENDING" },
        include: { user: { select: { name: true, phone: true } } },
        orderBy: { createdAt: "asc" },
        take: 10,
      });
      if (!items.length) {
        await ctx.reply("✅ Javob kutayotgan so'rovlar yo'q.");
        return;
      }
      for (const a of items) {
        const kb = new InlineKeyboard()
          .text("✅ Tasdiqlash", `apt:confirm:${a.id}`)
          .text("❌ Rad etish", `apt:reject:${a.id}`);
        await ctx.reply(
          `⏳ <b>${a.user.name ?? "Bemor"}</b> — ${a.user.phone}\n🕐 ${fmtDT(a.requestedAt)}${a.note ? `\n💬 ${a.note}` : ""}`,
          { parse_mode: "HTML", reply_markup: kb }
        );
      }
      return;
    }
    if (text === "📋 Bugungi yozuvlar") {
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 864e5);
      const items = await db.appointment.findMany({
        where: {
          clinicId: role.clinic.id,
          requestedAt: { gte: dayStart, lt: dayEnd },
          status: { in: ["CONFIRMED", "ARRIVED", "DONE"] },
        },
        include: { user: { select: { name: true, phone: true } }, doctor: { select: { name: true } } },
        orderBy: { requestedAt: "asc" },
      });
      if (!items.length) {
        await ctx.reply("Bugunga tasdiqlangan yozuvlar yo'q.");
        return;
      }
      const lines = items.map((a) => {
        const st = a.status === "CONFIRMED" ? "🕐" : a.status === "ARRIVED" ? "🟢" : "✔️";
        return `${st} ${fmtDT(a.requestedAt).split(", ")[1]} — ${a.user.name ?? a.user.phone}${a.doctor ? ` (${a.doctor.name})` : ""}`;
      });
      await ctx.reply(`📋 <b>Bugungi yozuvlar (${items.length}):</b>\n\n${lines.join("\n")}`, { parse_mode: "HTML" });
      return;
    }
    if (text === "📷 QR kod") {
      await ctx.reply(
        "📷 <b>Kelganini tasdiqlash</b>\n\nBemor resepshndagi QR kodni skanerlab o'zi tasdiqlaydi.\nQR kodni chop etish: panel → QR kod.\n\nSkanerlay olmasa — paneldagi yozuv ustidan «Keldi» tugmasini bosasiz.",
        { parse_mode: "HTML" }
      );
      return;
    }
  }

  // Hech nimaga to'g'ri kelmadi — jim qolmaymiz, yo'l ko'rsatamiz
  await ctx.reply(
    role
      ? "Tushunmadim. Pastdagi tugmalardan foydalaning yoki /yordam yozing."
      : "Tushunmadim.\n\n🔍 Klinika topish uchun tugmani bosing.\n" +
        "🔗 Hisobingizni ulash uchun ilovadagi «Telegram'ga ulash» dan kod oling.",
    { reply_markup: role?.type === "clinic" ? CLINIC_MENU : PATIENT_MENU },
  );
});

// ---------- Inline tugmalar ----------
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = String(ctx.chat?.id ?? "");

  // Tuman bo'yicha klinika ro'yxati
  const mDist = data.match(/^dist:(.+)$/);
  if (mDist) {
    const key = mDist[1];
    const openNow = key === "__open__";

    const clinics = await db.clinic.findMany({
      where: {
        deactivatedAt: null,
        ...(openNow ? { OR: [{ is247: true }, { emergency: true }] } : { district: key }),
      },
      select: { name: true, slug: true, district: true, address: true, rating: true, phone: true, is247: true, workingHours: true },
      orderBy: { rating: "desc" },
      take: 8,
    });

    await ctx.answerCallbackQuery();

    if (!clinics.length) {
      await ctx.reply(
        openNow
          ? "Hozir kecha-kunduz ishlaydigan klinika topilmadi."
          : `${key} tumanida klinika topilmadi. Boshqa tumanni tanlang.`,
      );
      return;
    }

    const lines = clinics.map((c, i) => {
      const stars = c.rating > 0 ? ` ⭐ ${c.rating.toFixed(1)}` : "";
      const nonstop = c.is247 ? " · 24/7" : "";
      return (
        `${i + 1}. <b>${c.name}</b>${stars}${nonstop}\n` +
        `    📍 ${c.address}\n` +
        `    <a href="${SITE}/klinika/${c.slug}">Batafsil va qabulga yozilish →</a>`
      );
    });

    await ctx.reply(
      `${openNow ? "🌙 <b>Kecha-kunduz ishlaydiganlar</b>" : `🏥 <b>${key} tumani</b>`} (${clinics.length} ta):\n\n` +
        lines.join("\n\n"),
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
    );
    return;
  }

  // Klinika: tasdiqlash/rad etish
  const mApt = data.match(/^apt:(confirm|reject):(.+)$/);
  if (mApt) {
    const [, action, aptId] = mApt;
    const apt = await db.appointment.findUnique({
      where: { id: aptId },
      include: { clinic: true, user: true },
    });
    if (!apt || apt.clinic.telegramChatId !== chatId) {
      await ctx.answerCallbackQuery({ text: "Ruxsat yo'q", show_alert: true });
      return;
    }
    if (!["PENDING", "ALT_OFFERED"].includes(apt.status)) {
      await ctx.answerCallbackQuery({ text: `Allaqachon ko'rib chiqilgan (${apt.status})`, show_alert: true });
      return;
    }
    const newStatus = action === "confirm" ? "CONFIRMED" : "REJECTED";
    await db.appointment.update({
      where: { id: aptId },
      data: { status: newStatus, respondedAt: apt.respondedAt ?? new Date() },
    });
    await db.auditLog.create({
      data: {
        actorRole: "BOT", actorName: apt.clinic.name,
        action: action === "confirm" ? "APT_CONFIRM" : "APT_REJECT",
        entity: "Appointment", entityId: aptId,
        meta: JSON.stringify({ via: "telegram", patient: apt.user.phone }),
      },
    }).catch(() => {});
    if (apt.user.telegramChatId) {
      const text =
        action === "confirm"
          ? `✅ <b>${apt.clinic.name}</b> yozuvingizni tasdiqladi!\n\n🕐 ${fmtDT(apt.requestedAt)}\n📍 ${apt.clinic.address}\n🔑 Yozuv kodi: <code>${apt.code}</code>`
          : `❌ <b>${apt.clinic.name}</b> so'rovingizni rad etdi. Ilovada boshqa klinika tanlashingiz mumkin.`;
      await bot.api.sendMessage(apt.user.telegramChatId, text, { parse_mode: "HTML" }).catch(() => {});
    }
    await db.notification.create({
      data: {
        userId: apt.userId,
        type: action === "confirm" ? "APT_CONFIRMED" : "APT_REJECTED",
        title: action === "confirm" ? `${apt.clinic.name} yozuvingizni tasdiqladi ✅` : `${apt.clinic.name} so'rovni rad etdi`,
        body: action === "confirm" ? `${fmtDT(apt.requestedAt)} · kod: ${apt.code}` : "Boshqa klinika tanlashingiz mumkin.",
        link: "/profil",
      },
    }).catch(() => {});
    await ctx.answerCallbackQuery({ text: action === "confirm" ? "Tasdiqlandi ✅" : "Rad etildi ❌" });
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() }).catch(() => {});
    return;
  }

  // Bemor: yozuvni bekor qilish
  const mCancel = data.match(/^aptcancel:(.+)$/);
  if (mCancel) {
    const apt = await db.appointment.findUnique({
      where: { id: mCancel[1] },
      include: { user: true, clinic: true },
    });
    if (!apt || apt.user.telegramChatId !== chatId) {
      await ctx.answerCallbackQuery({ text: "Ruxsat yo'q", show_alert: true });
      return;
    }
    if (!["PENDING", "CONFIRMED", "ALT_OFFERED"].includes(apt.status)) {
      await ctx.answerCallbackQuery({ text: "Bu yozuvni bekor qilib bo'lmaydi", show_alert: true });
      return;
    }
    await db.appointment.update({ where: { id: apt.id }, data: { status: "CANCELLED" } });
    await db.auditLog.create({ data: { actorId: apt.userId, actorRole: "BOT", actorName: apt.user.name ?? apt.user.phone, action: "APT_CANCEL", entity: "Appointment", entityId: apt.id, meta: JSON.stringify({ via: "telegram" }) } }).catch(() => {});
    if (apt.clinic.telegramChatId) {
      await bot.api.sendMessage(apt.clinic.telegramChatId, `ℹ️ ${apt.user.name ?? "Bemor"} ${fmtDT(apt.requestedAt)} dagi yozuvini bekor qildi.`).catch(() => {});
    }
    await ctx.answerCallbackQuery({ text: "Bekor qilindi" });
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() }).catch(() => {});
    return;
  }

  // Bemor: baholash (yulduzlar)
  const mRev = data.match(/^rev:(.+):([1-5])$/);
  if (mRev) {
    const [, aptId, ratingStr] = mRev;
    const apt = await db.appointment.findUnique({
      where: { id: aptId },
      include: { user: true, review: true },
    });
    if (!apt || apt.user.telegramChatId !== chatId) {
      await ctx.answerCallbackQuery({ text: "Ruxsat yo'q", show_alert: true });
      return;
    }
    if (apt.review) {
      await ctx.answerCallbackQuery({ text: "Bu tashrif uchun sharh yozilgan", show_alert: true });
      return;
    }
    if (!["ARRIVED", "DONE"].includes(apt.status)) {
      await ctx.answerCallbackQuery({ text: "Sharh faqat tashrifdan keyin", show_alert: true });
      return;
    }
    const review = await db.review.create({
      data: {
        appointmentId: apt.id, userId: apt.userId, clinicId: apt.clinicId,
        rating: parseInt(ratingStr, 10), status: "PENDING",
      },
    });
    await db.auditLog.create({ data: { actorId: apt.userId, actorRole: "BOT", actorName: apt.user.name ?? apt.user.phone, action: "REVIEW_CREATE", entity: "Review", entityId: review.id, meta: JSON.stringify({ via: "telegram", rating: ratingStr }) } }).catch(() => {});
    awaitingReviewText.set(chatId, review.id);
    await ctx.answerCallbackQuery({ text: `${ratingStr} yulduz qabul qilindi ⭐` });
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() }).catch(() => {});
    await ctx.reply(
      `⭐ ${"⭐".repeat(parseInt(ratingStr, 10) - 1)} bahoingiz qabul qilindi!\n\nIzoh qo'shmoqchi bo'lsangiz, keyingi xabaringizda yozib yuboring (ixtiyoriy). Sharh moderatsiyadan so'ng e'lon qilinadi.`
    );
    return;
  }

  await ctx.answerCallbackQuery();
});

// ---------- Eslatmalar (har 5 daqiqada) ----------
async function reminderTick() {
  const now = Date.now();
  const upcoming = await db.appointment.findMany({
    where: {
      status: "CONFIRMED",
      requestedAt: { gt: new Date(now), lt: new Date(now + 25 * 3600 * 1000) },
    },
    include: { user: true, clinic: true },
  });

  for (const apt of upcoming) {
    if (!apt.user.telegramChatId) continue;
    const hoursLeft = (apt.requestedAt.getTime() - now) / 3600e3;

    if (hoursLeft <= 24 && hoursLeft > 20 && !apt.reminded24) {
      await bot.api.sendMessage(
        apt.user.telegramChatId,
        `🔔 Eslatma: ertaga <b>${apt.clinic.name}</b> da qabulingiz bor.\n🕐 ${fmtDT(apt.requestedAt)}\n📍 ${apt.clinic.address}\n\nBora olmasangiz, bekor qiling — boshqa bemorga joy bo'shaydi.`,
        { parse_mode: "HTML" }
      ).catch(() => {});
      await db.appointment.update({ where: { id: apt.id }, data: { reminded24: true } });
    } else if (hoursLeft <= 2 && hoursLeft > 0.5 && !apt.reminded2) {
      await bot.api.sendMessage(
        apt.user.telegramChatId,
        `🔔 2 soatdan keyin qabul: <b>${apt.clinic.name}</b>\n🕐 ${fmtDT(apt.requestedAt)}\n📍 ${apt.clinic.address}\n🔑 Kod: <code>${apt.code}</code>\n\nKelgach stoldagi QR kodni skanerlashni unutmang.`,
        { parse_mode: "HTML" }
      ).catch(() => {});
      await db.appointment.update({ where: { id: apt.id }, data: { reminded2: true } });
    }
  }
}

/**
 * Profilaktik eslatma: oxirgi tashrifidan 180 kun o'tgan bemorlarga
 * (keyin boshqa tashrifi bo'lmagan) — 6 oylik ko'rik eslatmasi.
 * Kuniga bir marta tekshiriladi; takror yubormaslik Notification jadvali orqali.
 */
async function preventiveTick() {
  const from = new Date(Date.now() - 187 * 864e5);
  const to = new Date(Date.now() - 180 * 864e5);
  const oldVisits = await db.appointment.findMany({
    where: { status: { in: ["ARRIVED", "DONE"] }, arrivedAt: { gte: from, lte: to } },
    include: { user: true, clinic: { select: { name: true, slug: true } } },
  });

  for (const apt of oldVisits) {
    // Keyinroq boshqa tashrifi bo'lganmi?
    const newer = await db.appointment.findFirst({
      where: { userId: apt.userId, status: { in: ["ARRIVED", "DONE"] }, arrivedAt: { gt: apt.arrivedAt! } },
    });
    if (newer) continue;
    // Shu tashrif uchun eslatma allaqachon yuborilganmi?
    const already = await db.notification.findFirst({
      where: { userId: apt.userId, type: "PREVENTIVE", link: `/klinika/${apt.clinic.slug}` },
    });
    if (already) continue;

    await db.notification.create({
      data: {
        userId: apt.userId,
        type: "PREVENTIVE",
        title: "Profilaktik ko'rik vaqti keldi 🪥",
        body: `${apt.clinic.name} dagi tashrifingizdan 6 oy o'tdi. Yiliga 2 marta ko'rik ko'p muammolarning oldini oladi.`,
        link: `/klinika/${apt.clinic.slug}`,
      },
    });
    if (apt.user.telegramChatId) {
      await bot.api.sendMessage(
        apt.user.telegramChatId,
        `🪥 <b>Profilaktik ko'rik vaqti keldi</b>\n\n${apt.clinic.name} dagi tashrifingizdan 6 oy o'tdi. Yiliga 2 marta ko'rik — sog'lom tishlar garovi. Ilovadan qulay vaqtga yozilishingiz mumkin.`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }
  }
}

setInterval(() => void reminderTick().catch((e) => console.error("Eslatma xatosi:", e)), 5 * 60 * 1000);
setInterval(() => void preventiveTick().catch((e) => console.error("Profilaktika xatosi:", e)), 24 * 3600 * 1000);
void preventiveTick().catch(() => {});

// Xato bo'lsa foydalanuvchi jim qolmasin — nima bo'lganini bilsin
bot.catch(async (err) => {
  console.error("Bot xatosi:", err.message);
  await err.ctx
    .reply("⚠️ Kutilmagan xatolik. Birozdan keyin qayta urining.")
    .catch(() => {});
});

/** Telegram menyusidagi buyruqlar ro'yxati */
async function publishCommands() {
  await bot.api.setMyCommands([
    { command: "start", description: "Boshlash va hisobni ulash" },
    { command: "klinikalar", description: "Klinika topish" },
    { command: "yozuvlarim", description: "Faol yozuvlarim" },
    { command: "yordam", description: "Yordam" },
    { command: "uzish", description: "Hisobni botdan uzish" },
  ]).catch((e) => console.error("Buyruqlarni o'rnatib bo'lmadi:", e));
}

console.log("StomGo bot ishga tushdi (long polling)...");
void publishCommands();
void reminderTick().catch(() => {});
bot.start();
