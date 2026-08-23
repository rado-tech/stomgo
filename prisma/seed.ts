import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const db = new PrismaClient();

const WH_STD = JSON.stringify({ mon: [["09:00","18:00"]], tue: [["09:00","18:00"]], wed: [["09:00","18:00"]], thu: [["09:00","18:00"]], fri: [["09:00","18:00"]], sat: [["09:00","15:00"]], sun: [] });
const WH_LONG = JSON.stringify({ mon: [["08:00","21:00"]], tue: [["08:00","21:00"]], wed: [["08:00","21:00"]], thu: [["08:00","21:00"]], fri: [["08:00","21:00"]], sat: [["09:00","20:00"]], sun: [["10:00","17:00"]] });
const WH_247 = JSON.stringify({ mon: [["00:00","24:00"]], tue: [["00:00","24:00"]], wed: [["00:00","24:00"]], thu: [["00:00","24:00"]], fri: [["00:00","24:00"]], sat: [["00:00","24:00"]], sun: [["00:00","24:00"]] });

const SERVICES: [string, string, string][] = [
  ["konsultatsiya", "Ko'rik va konsultatsiya", "DIAGNOSTIKA"],
  ["rentgen", "Rentgen (vizyografiya)", "DIAGNOSTIKA"],
  ["plomba", "Plomba qo'yish", "TERAPIYA"],
  ["kanal", "Kanal davolash (endodontiya)", "TERAPIYA"],
  ["tozalash", "Professional tozalash", "GIGIENA"],
  ["oqartirish", "Tishlarni oqartirish", "ESTETIKA"],
  ["olib_tashlash", "Tish olib tashlash", "XIRURGIYA"],
  ["akl_tishi", "Aql tishini olib tashlash", "XIRURGIYA"],
  ["implant", "Implant o'rnatish", "ORTOPEDIYA"],
  ["koronka", "Koronka (qoplama)", "ORTOPEDIYA"],
  ["protez", "Olinadigan protez", "ORTOPEDIYA"],
  ["breket", "Breket o'rnatish", "ORTODONTIYA"],
  ["vinir", "Vinir", "ESTETIKA"],
  ["bolalar_davolash", "Bolalar tishini davolash", "BOLALAR"],
];

// bazaviy narxlar ming so'mda
const PRICE_BASE: Record<string, [number, number]> = {
  konsultatsiya: [50, 150], rentgen: [60, 120], plomba: [250, 600],
  kanal: [450, 1200], tozalash: [300, 600], oqartirish: [800, 2500],
  olib_tashlash: [200, 500], akl_tishi: [500, 1500], implant: [4500, 12000],
  koronka: [900, 3500], protez: [2500, 8000], breket: [8000, 22000],
  vinir: [1800, 4500], bolalar_davolash: [150, 500],
};

type ClinicSeed = {
  slug: string; name: string; district: string; address: string;
  lat: number; lng: number; phone: string; wh: string;
  is247?: boolean; emergency?: boolean; child?: boolean; showDoctors?: boolean;
  tier?: string; rating: number; reviewCount: number; priceFactor: number;
  hue: number; desc: string;
  doctors: [string, "MALE" | "FEMALE", string, number][];
  services: string[];
};

const CLINICS: ClinicSeed[] = [
  { slug: "smile-dent", name: "Smile Dent", district: "Chilonzor", address: "Chilonzor 19-mavze, Bunyodkor ko'chasi 12", lat: 41.2755, lng: 69.2049, phone: "+998712000001", wh: WH_LONG, emergency: true, child: true, tier: "PREMIUM", rating: 4.8, reviewCount: 124, priceFactor: 1.1, hue: 210, desc: "Zamonaviy uskunalar va 12 yillik tajriba. Implantologiya va estetik stomatologiya bo'yicha ixtisoslashgan.", doctors: [["Aziz Karimov","MALE","IMPLANTOLOG",14],["Dilnoza Rahimova","FEMALE","TERAPEVT",9],["Nilufar Sodiqova","FEMALE","ORTODONT",7],["Jasur Toshev","MALE","XIRURG",11]], services: ["konsultatsiya","rentgen","plomba","kanal","tozalash","oqartirish","olib_tashlash","akl_tishi","implant","koronka","vinir","bolalar_davolash"] },
  { slug: "dental-city", name: "Dental City", district: "Yunusobod", address: "Yunusobod 4-mavze, Amir Temur shoh ko'chasi 108", lat: 41.3512, lng: 69.2884, phone: "+998712000002", wh: WH_LONG, emergency: true, tier: "PREMIUM", rating: 4.7, reviewCount: 98, priceFactor: 1.2, hue: 260, desc: "To'liq raqamli diagnostika: 3D KT, mikroskop ostida kanal davolash.", doctors: [["Sherzod Aliyev","MALE","TERAPEVT",12],["Madina Yusupova","FEMALE","TERAPEVT",8],["Bekzod Nazarov","MALE","ORTOPED",15]], services: ["konsultatsiya","rentgen","plomba","kanal","tozalash","oqartirish","implant","koronka","protez","vinir"] },
  { slug: "denta-lux", name: "DentaLux", district: "Mirzo Ulug'bek", address: "Buyuk Ipak Yo'li 45", lat: 41.3268, lng: 69.3341, phone: "+998712000003", wh: WH_STD, child: true, tier: "STANDARD", rating: 4.6, reviewCount: 67, priceFactor: 1.0, hue: 160, desc: "Oilaviy stomatologiya — kattalar va bolalar uchun qulay narxlar.", doctors: [["Gulnora Abdullayeva","FEMALE","BOLALAR",13],["Otabek Ergashev","MALE","TERAPEVT",6],["Zulfiya Qosimova","FEMALE","GIGIENIST",5]], services: ["konsultatsiya","rentgen","plomba","kanal","tozalash","olib_tashlash","bolalar_davolash","koronka"] },
  { slug: "prodent-24", name: "ProDent 24/7", district: "Mirobod", address: "Amir Temur ko'chasi 24", lat: 41.2951, lng: 69.2831, phone: "+998712000004", wh: WH_247, is247: true, emergency: true, tier: "STANDARD", rating: 4.4, reviewCount: 156, priceFactor: 1.15, hue: 0, desc: "Kecha-kunduz shoshilinch stomatologik yordam. Tungi og'riqda ham qabul qilamiz.", doctors: [["Sardor Umarov","MALE","XIRURG",10],["Farrux Islomov","MALE","TERAPEVT",7],["Nargiza Tosheva","FEMALE","TERAPEVT",9]], services: ["konsultatsiya","rentgen","plomba","kanal","olib_tashlash","akl_tishi"] },
  { slug: "oq-tish", name: "Oq Tish", district: "Yakkasaroy", address: "Shota Rustaveli ko'chasi 33", lat: 41.2934, lng: 69.2587, phone: "+998712000005", wh: WH_STD, tier: "STANDARD", rating: 4.5, reviewCount: 45, priceFactor: 0.9, hue: 45, desc: "Hamyonbop narxlar, sifatli xizmat. 2015-yildan beri faoliyatda.", doctors: [["Ulug'bek Hamidov","MALE","TERAPEVT",16],["Feruza Karimova","FEMALE","GIGIENIST",4]], services: ["konsultatsiya","plomba","kanal","tozalash","olib_tashlash","protez","koronka"] },
  { slug: "eurodent", name: "EuroDent", district: "Shayxontohur", address: "Navoiy ko'chasi 16A", lat: 41.3197, lng: 69.2401, phone: "+998712000006", wh: WH_LONG, child: true, tier: "FREE", rating: 4.3, reviewCount: 38, priceFactor: 1.05, hue: 290, desc: "Yevropa standartidagi materiallar, breket va ortodontiya markazi.", doctors: [["Kamola Saidova","FEMALE","ORTODONT",11],["Botir Rasulov","MALE","TERAPEVT",8]], services: ["konsultatsiya","rentgen","plomba","tozalash","breket","vinir","bolalar_davolash"] },
  { slug: "mediva-dental", name: "Mediva Dental", district: "Yunusobod", address: "Yunusobod 11-mavze, Chinobod ko'chasi 5", lat: 41.3660, lng: 69.2951, phone: "+998712000007", wh: WH_STD, tier: "FREE", rating: 4.2, reviewCount: 29, priceFactor: 0.95, hue: 190, desc: "Mahalla ichidagi qulay klinika. Terapiya va gigiena xizmatlari.", doctors: [["Malika Ahmedova","FEMALE","TERAPEVT",6],["Davron Yo'ldoshev","MALE","XIRURG",9]], services: ["konsultatsiya","plomba","kanal","tozalash","olib_tashlash"] },
  { slug: "grand-dent", name: "Grand Dent", district: "Olmazor", address: "Qorasaroy ko'chasi 71", lat: 41.3405, lng: 69.2286, phone: "+998712000008", wh: WH_STD, child: true, tier: "FREE", rating: 4.1, reviewCount: 22, priceFactor: 0.9, hue: 120, desc: "Bolalar va kattalar stomatologiyasi, rentgen kabineti mavjud.", doctors: [["Shahnoza Mirzayeva","FEMALE","BOLALAR",7],["Akmal Sobirov","MALE","TERAPEVT",5]], services: ["konsultatsiya","rentgen","plomba","tozalash","bolalar_davolash","olib_tashlash"] },
  { slug: "sergeli-stom", name: "Sergeli Stom", district: "Sergeli", address: "Yangi Sergeli ko'chasi 12", lat: 41.2224, lng: 69.2221, phone: "+998712000009", wh: WH_STD, tier: "FREE", rating: 4.0, reviewCount: 18, priceFactor: 0.8, hue: 30, desc: "Sergeli tumanidagi hamyonbop stomatologiya.", doctors: [["Rustam Qodirov","MALE","TERAPEVT",10],["Sevara Nizomova","FEMALE","TERAPEVT",3]], services: ["konsultatsiya","plomba","kanal","olib_tashlash","protez"] },
  { slug: "impladent", name: "ImplaDent", district: "Mirobod", address: "Afrosiyob ko'chasi 8", lat: 41.2898, lng: 69.2778, phone: "+998712000010", wh: WH_STD, tier: "STANDARD", rating: 4.7, reviewCount: 84, priceFactor: 1.3, hue: 230, desc: "Implantologiya markazi — Osstem, Straumann tizimlari, kafolat bilan.", doctors: [["Anvar Beknazarov","MALE","IMPLANTOLOG",18],["Lola Xo'jayeva","FEMALE","ORTOPED",12]], services: ["konsultatsiya","rentgen","implant","koronka","protez","akl_tishi"] },
  { slug: "family-dent", name: "Family Dent", district: "Uchtepa", address: "Uchtepa 23-mavze, Farg'ona yo'li 9", lat: 41.2930, lng: 69.1805, phone: "+998712000011", wh: WH_LONG, child: true, tier: "FREE", rating: 4.4, reviewCount: 41, priceFactor: 0.85, hue: 340, desc: "Oilaviy klinika: onalar va bolalar uchun alohida sharoit.", doctors: [["Nodira Ismoilova","FEMALE","BOLALAR",9],["Zilola Rustamova","FEMALE","TERAPEVT",6],["Islom Karimov","MALE","XIRURG",8]], services: ["konsultatsiya","plomba","tozalash","bolalar_davolash","olib_tashlash","kanal"] },
  { slug: "dent-art", name: "Dent Art", district: "Yashnobod", address: "Maxtumquli ko'chasi 105", lat: 41.2980, lng: 69.3204, phone: "+998712000012", wh: WH_STD, tier: "FREE", rating: 4.3, reviewCount: 33, priceFactor: 1.0, hue: 75, desc: "Estetik stomatologiya: vinir, oqartirish, tabassum dizayni.", doctors: [["Jamshid Toirov","MALE","ORTOPED",10],["Munisa Aliyeva","FEMALE","TERAPEVT",7]], services: ["konsultatsiya","tozalash","oqartirish","vinir","koronka","plomba"] },
  { slug: "bektemir-dent", name: "Bektemir Dent", district: "Bektemir", address: "Bektemir shoh ko'chasi 3", lat: 41.2452, lng: 69.3301, phone: "+998712000013", wh: WH_STD, tier: "FREE", rating: 3.9, reviewCount: 12, priceFactor: 0.8, hue: 15, desc: "Tuman markazidagi kichik, qulay klinika.", doctors: [["Baxtiyor Ortiqov","MALE","TERAPEVT",12]], services: ["konsultatsiya","plomba","olib_tashlash","protez"] },
  { slug: "lola-dent", name: "Lola Dent", district: "Chilonzor", address: "Chilonzor 9-mavze, Muqimiy ko'chasi 44", lat: 41.2850, lng: 69.2153, phone: "+998712000014", wh: WH_STD, tier: "FREE", rating: 4.6, reviewCount: 52, priceFactor: 0.95, hue: 320, desc: "Ayol shifokorlar jamoasi. Ayollar va bolalar uchun qulay muhit.", doctors: [["Lola Yusupova","FEMALE","TERAPEVT",14],["Dildora Saidova","FEMALE","GIGIENIST",6],["Mohira Tursunova","FEMALE","ORTODONT",8]], services: ["konsultatsiya","plomba","kanal","tozalash","oqartirish","breket","bolalar_davolash"] },
  { slug: "premium-stom", name: "Premium Stom", district: "Mirzo Ulug'bek", address: "Sayram ko'chasi 22", lat: 41.3350, lng: 69.3120, phone: "+998712000015", wh: WH_LONG, emergency: true, tier: "STANDARD", rating: 4.5, reviewCount: 61, priceFactor: 1.25, hue: 250, desc: "VIP xizmat, alohida kabinetlar, mikroskop ostida davolash.", doctors: [["Temur G'aniyev","MALE","TERAPEVT",13],["Aziza Mahmudova","FEMALE","XIRURG",10]], services: ["konsultatsiya","rentgen","plomba","kanal","tozalash","oqartirish","implant","koronka","vinir","akl_tishi"], showDoctors: false },
  { slug: "shifo-dent", name: "Shifo Dent", district: "Shayxontohur", address: "Beruniy ko'chasi 47", lat: 41.3302, lng: 69.2350, phone: "+998712000016", wh: WH_STD, tier: "FREE", rating: 4.2, reviewCount: 26, priceFactor: 0.85, hue: 140, desc: "Talabalar va oilalar uchun chegirmali stomatologiya.", doctors: [["Muhammad Yoqubov","MALE","TERAPEVT",4],["Robiya Ergasheva","FEMALE","TERAPEVT",5]], services: ["konsultatsiya","plomba","tozalash","olib_tashlash","kanal"] },
];

function rint(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }

async function main() {
  console.log("Seeding...");
  await db.event.deleteMany(); await db.review.deleteMany(); await db.appointment.deleteMany();
  await db.promoSlot.deleteMany(); await db.triageSession.deleteMany(); await db.clinicService.deleteMany();
  await db.doctor.deleteMany(); await db.otpCode.deleteMany(); await db.user.deleteMany();
  await db.serviceCatalog.deleteMany(); await db.clinic.deleteMany();

  const svcMap: Record<string, string> = {};
  for (const [code, name, category] of SERVICES) {
    const s = await db.serviceCatalog.create({ data: { code, name, category } });
    svcMap[code] = s.id;
  }

  // Parollar TASODIFIY yaratiladi va faqat shu yerda bir marta chop etiladi.
  // Ochiq repoda qat'iy parol qoldirish xavfli — jonli tizimga tayyor taxmin bo'ladi.
  // Kerak bo'lsa .env orqali belgilash mumkin: SEED_ADMIN_PASSWORD / SEED_CLINIC_PASSWORD
  const randomPass = () => randomBytes(9).toString("base64url");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || randomPass();
  const clinicPassword = process.env.SEED_CLINIC_PASSWORD || randomPass();
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const clinicHash = await bcrypt.hash(clinicPassword, 10);

  await db.user.create({
    data: { phone: "+998900000000", name: "Admin", role: "ADMIN", username: "admin", passwordHash: adminHash },
  });
  const patient = await db.user.create({ data: { phone: "+998901234567", name: "Shaxobiddin", role: "PATIENT", birthYear: 1999 } });

  let clinicIdx = 0;
  const clinicIds: string[] = [];
  for (const c of CLINICS) {
    clinicIdx++;
    const clinic = await db.clinic.create({ data: {
      slug: c.slug, name: c.name, description: c.desc, address: c.address, district: c.district,
      lat: c.lat, lng: c.lng, phone: c.phone, workingHours: c.wh,
      is247: !!c.is247, emergency: !!c.emergency, childFriendly: !!c.child,
      showDoctors: c.showDoctors !== false, verifiedAt: new Date(), tier: c.tier ?? "FREE",
      tierEndsAt: c.tier !== "FREE" ? new Date(Date.now() + 90 * 864e5) : null,
      rating: c.rating, reviewCount: c.reviewCount,
      responseRate: 0.85 + Math.random() * 0.15, avgResponseMin: rint(3, 25),
      checkinCode: String(rint(1000, 9999)), coverHue: c.hue,
    }});
    clinicIds.push(clinic.id);

    await db.user.create({ data: {
      phone: `+9987120000${String(clinicIdx).padStart(2, "0")}`,
      name: `${c.name} administratori`, role: "CLINIC", clinicId: clinic.id,
      username: c.slug.replace(/-/g, "_"), passwordHash: clinicHash,
    }});

    for (const [name, gender, specialty, exp] of c.doctors) {
      await db.doctor.create({ data: { clinicId: clinic.id, name, gender, specialty, experienceYears: exp, verification: exp > 8 ? "DOC_VERIFIED" : "CLINIC_CONFIRMED", education: "Toshkent davlat stomatologiya instituti", licenseNo: `LIC-${rint(10000, 99999)}` } });
    }

    for (const code of c.services) {
      const [bMin, bMax] = PRICE_BASE[code];
      await db.clinicService.create({ data: { clinicId: clinic.id, serviceId: svcMap[code], priceMin: Math.round(bMin * c.priceFactor) * 1000, priceMax: Math.round(bMax * c.priceFactor) * 1000 } });
    }
  }

  await db.promoSlot.create({ data: { clinicId: clinicIds[0], position: 1, startsAt: new Date(Date.now() - 7 * 864e5), endsAt: new Date(Date.now() + 30 * 864e5) } });
  await db.promoSlot.create({ data: { clinicId: clinicIds[1], position: 2, startsAt: new Date(Date.now() - 7 * 864e5), endsAt: new Date(Date.now() + 30 * 864e5) } });

  const reviewTexts: [number, string][] = [
    [5, "Juda yaxshi xizmat, shifokor har bir bosqichni tushuntirib berdi. Og'riqsiz davolashdi."],
    [5, "Toza, zamonaviy klinika. Narxlar oldindan aytilgani yoqdi."],
    [4, "Xizmat yaxshi, lekin biroz kutishga to'g'ri keldi."],
    [5, "Bolam qo'rqmasdan davolatdi, shifokor bolalar bilan ishlashni biladi."],
  ];
  for (let i = 0; i < 4; i++) {
    const when = new Date(Date.now() - (i + 2) * 7 * 864e5);
    const apt = await db.appointment.create({ data: {
      userId: patient.id, clinicId: clinicIds[i], requestedAt: when,
      status: "DONE", code: String(rint(100000, 999999)),
      createdAt: new Date(when.getTime() - 2 * 864e5), // so'rov 2 kun oldin yaratilgan
      respondedAt: new Date(when.getTime() - 2 * 864e5 + rint(5, 30) * 60000),
      arrivedAt: when,
    }});
    await db.review.create({ data: {
      appointmentId: apt.id, userId: patient.id, clinicId: clinicIds[i],
      rating: reviewTexts[i][0], waitTime: rint(3, 5), attitude: 5, priceMatch: rint(3, 5),
      text: reviewTexts[i][1], status: "APPROVED",
    }});
  }

  console.log(`OK: ${CLINICS.length} klinika, ${SERVICES.length} xizmat`);
  console.log("");
  console.log("=".repeat(58));
  console.log("PAROLLARNI SAQLAB QO'YING — boshqa ko'rsatilmaydi:");
  console.log(`  Admin    : login=admin              parol=${adminPassword}`);
  console.log(`  Klinikalar: login=<slug _ bilan>    parol=${clinicPassword}`);
  console.log("              (masalan: smile_dent)");
  console.log("=".repeat(58));
  console.log(`Demo bemor: ${patient.phone} — kirish kodi Telegram botga keladi`);
}

main().finally(() => db.$disconnect());
