/**
 * Triaj qoidalar mexanizmi — deterministik, testlanadigan.
 * Shoshilinchlik darajasini FAQAT shu modul hal qiladi; LLM bu qarorni o'zgartira olmaydi.
 */

export type TriageAnswers = {
  problem: "OGRIQ" | "SHISH" | "QONASH" | "TRAVMA" | "ESTETIKA" | "PROFILAKTIKA" | "BOSHQA";
  painLevel?: "YENGIL" | "ORTACHA" | "KUCHLI" | "CHIDAB_BOLMAS";
  duration?: "BUGUN" | "KUNLAR_2_3" | "HAFTA" | "OY";
  flags: string[]; // FACE_SWELLING | FEVER | SWALLOW | BREATH | BLEEDING_NONSTOP | NIGHT_PAIN | SENSITIVITY | GUM_BLEED
  isChild: boolean;
};

export type Urgency = "EMERGENCY" | "TODAY" | "SOON" | "ROUTINE";

export type TriageResult = {
  urgency: Urgency;
  specialty: string;
  serviceCodes: string[];
  explanation: string;
};

const RED_FLAG_COMBOS: { flags: string[]; reason: string }[] = [
  { flags: ["BREATH"], reason: "nafas olish qiyinligi" },
  { flags: ["SWALLOW"], reason: "yutish qiyinligi" },
  { flags: ["BLEEDING_NONSTOP"], reason: "to'xtamayotgan qon ketishi" },
  { flags: ["FACE_SWELLING", "FEVER"], reason: "yuz shishi va harorat birga" },
];

export function evaluateTriage(a: TriageAnswers): TriageResult {
  // 1. Qizil bayroqlar — qattiy qoidalar, hech narsa bekor qila olmaydi
  for (const combo of RED_FLAG_COMBOS) {
    if (combo.flags.every((f) => a.flags.includes(f))) {
      return {
        urgency: "EMERGENCY",
        specialty: a.isChild ? "BOLALAR" : "XIRURG",
        serviceCodes: ["konsultatsiya"],
        explanation: `Sizda ${combo.reason} belgisi bor — bu jiddiy holat bo'lishi mumkin. Kechiktirmasdan tez tibbiy yordamga (103) qo'ng'iroq qiling yoki eng yaqin navbatchi klinikaga boring.`,
      };
    }
  }

  if (a.problem === "TRAVMA") {
    return {
      urgency: "TODAY",
      specialty: a.isChild ? "BOLALAR" : "XIRURG",
      serviceCodes: ["konsultatsiya", "rentgen"],
      explanation:
        "Tish yoki jag' travmasida vaqt juda muhim — singan yoki chiqqan tishni birinchi soatlarda saqlab qolish imkoniyati yuqori. Bugunoq xirurg-stomatologga murojaat qiling. Chiqqan tishni sut yoki tuzli suvda olib boring.",
    };
  }

  // 2. Shoshilinchlik darajasi
  let urgency: Urgency = "ROUTINE";
  if (a.problem === "OGRIQ" || a.problem === "SHISH") {
    if (a.painLevel === "CHIDAB_BOLMAS" || a.flags.includes("NIGHT_PAIN") || a.flags.includes("FACE_SWELLING")) {
      urgency = "TODAY";
    } else if (a.painLevel === "KUCHLI") {
      urgency = "TODAY";
    } else if (a.painLevel === "ORTACHA") {
      urgency = "SOON";
    } else {
      urgency = a.duration === "OY" ? "SOON" : "SOON";
    }
  } else if (a.problem === "QONASH") {
    urgency = "SOON";
  } else if (a.problem === "ESTETIKA" || a.problem === "PROFILAKTIKA") {
    urgency = "ROUTINE";
  } else {
    urgency = a.flags.length > 0 ? "SOON" : "ROUTINE";
  }

  // 3. Mutaxassis va tegishli xizmatlar
  let specialty = "TERAPEVT";
  let serviceCodes: string[] = ["konsultatsiya"];

  if (a.isChild) {
    specialty = "BOLALAR";
    serviceCodes = ["konsultatsiya", "bolalar_davolash"];
  } else if (a.problem === "OGRIQ" || a.problem === "SHISH") {
    specialty = "TERAPEVT";
    serviceCodes = a.painLevel === "CHIDAB_BOLMAS" || a.flags.includes("NIGHT_PAIN")
      ? ["konsultatsiya", "kanal"]
      : ["konsultatsiya", "plomba", "kanal"];
  } else if (a.problem === "QONASH") {
    specialty = "GIGIENIST";
    serviceCodes = ["konsultatsiya", "tozalash"];
  } else if (a.problem === "ESTETIKA") {
    specialty = "ORTOPED";
    serviceCodes = ["konsultatsiya", "oqartirish", "vinir"];
  } else if (a.problem === "PROFILAKTIKA") {
    specialty = "GIGIENIST";
    serviceCodes = ["konsultatsiya", "tozalash"];
  }

  // 4. Tushuntirish matni (daraja allaqachon hal qilingan)
  const explanations: Record<Urgency, string> = {
    EMERGENCY: "",
    TODAY:
      "Belgilaringizga ko'ra yallig'lanish rivojlanayotgan bo'lishi mumkin. Bugun yoki ertaga shifokorga ko'rinish tavsiya etiladi — kechiktirilsa davolash murakkablashadi va qimmatlashadi.",
    SOON:
      "Holat shoshilinch emas, lekin 3–5 kun ichida shifokorga ko'rinish tavsiya etiladi. Erta murojaat — oddiyroq va arzonroq davolash degani.",
    ROUTINE:
      "Shoshilinch holat ko'rinmayapti. Qulay vaqtda rejali ko'rikka yozilishingiz mumkin. Yiliga 2 marta profilaktik ko'rik ko'p muammolarning oldini oladi.",
  };

  return { urgency, specialty, serviceCodes, explanation: explanations[urgency] };
}

export const URGENCY_LABELS: Record<Urgency, { label: string; color: string; action: string }> = {
  EMERGENCY: { label: "Shoshilinch", color: "red", action: "Hoziroq 103 ga qo'ng'iroq qiling yoki navbatchi klinikaga boring" },
  TODAY: { label: "Bugun ko'rining", color: "orange", action: "Bugun-ertaga qabulga yoziling" },
  SOON: { label: "3–5 kun ichida", color: "amber", action: "Shu hafta ichida qabulga yoziling" },
  ROUTINE: { label: "Rejali ko'rik", color: "emerald", action: "Qulay vaqtda yoziling" },
};
