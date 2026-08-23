import BackButton from "@/components/BackButton";

export const metadata = { title: "Maxfiylik siyosati" };

/**
 * DIQQAT: bu shablon — Play Market va foydalanuvchilar uchun majburiy sahifa.
 * E'lon qilishdan oldin yurist bilan ko'rib chiqing va [TO'LDIRING] joylarini to'ldiring.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 text-[14.5px] leading-relaxed text-zinc-700">
      <BackButton href="/" label="Bosh sahifa" />
      <h1 className="mt-3 text-2xl font-extrabold text-zinc-900">Maxfiylik siyosati</h1>
      <p className="mt-1 text-[12px] text-zinc-400">Oxirgi yangilanish: 2026-yil avgust</p>

      <h2 className="mt-6 font-bold text-zinc-900">1. Biz kimmiz</h2>
      <p>
        StomGo — stomatologiya klinikalari va bemorlarni bog&apos;lovchi platforma.
        Operator: [TO&apos;LDIRING: yuridik shaxs/YaTT nomi, STIR, manzil].
      </p>

      <h2 className="mt-5 font-bold text-zinc-900">2. Qanday ma&apos;lumotlar yig&apos;iladi</h2>
      <ul className="mt-1 list-disc pl-5">
        <li>Telefon raqami va ism (hisob yaratish uchun)</li>
        <li>Yozuv ma&apos;lumotlari: tanlangan klinika, sana/vaqt, izoh</li>
        <li>AI maslahat bo&apos;limiga kiritilgan simptom tavsiflari</li>
        <li>Joylashuv (faqat ruxsat bersangiz, yaqin klinikalarni ko&apos;rsatish uchun)</li>
        <li>Texnik ma&apos;lumotlar: qurilma turi, ilovadan foydalanish statistikasi</li>
      </ul>

      <h2 className="mt-5 font-bold text-zinc-900">3. Ma&apos;lumotlar nima uchun ishlatiladi</h2>
      <p>
        Qabulga yozish va klinikaga uzatish, eslatmalar yuborish (SMS/Telegram), xizmat sifatini
        yaxshilash. Ma&apos;lumotlaringiz uchinchi shaxslarga sotilmaydi. Yozuv ma&apos;lumotlari faqat siz
        tanlagan klinikaga ko&apos;rsatiladi.
      </p>

      <h2 className="mt-5 font-bold text-zinc-900">4. Saqlash</h2>
      <p>
        Ma&apos;lumotlar O&apos;zbekiston Respublikasi hududidagi serverlarda saqlanadi
        (O&apos;zRning &quot;Shaxsga doir ma&apos;lumotlar to&apos;g&apos;risida&quot;gi Qonuni talablariga muvofiq).
      </p>

      <h2 className="mt-5 font-bold text-zinc-900">5. AI maslahat haqida</h2>
      <p>
        AI maslahat bo&apos;limi tibbiy tashxis qo&apos;ymaydi — faqat yo&apos;naltiruvchi ma&apos;lumot beradi.
        Aniq tashxis uchun shifokorga murojaat qilish shart.
      </p>

      <h2 className="mt-5 font-bold text-zinc-900">6. Huquqlaringiz</h2>
      <p>
        Hisobingizni va ma&apos;lumotlaringizni o&apos;chirishni so&apos;rashingiz mumkin:
        [TO&apos;LDIRING: aloqa email/telefon].
      </p>
    </div>
  );
}
