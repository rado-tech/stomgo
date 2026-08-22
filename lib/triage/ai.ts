import type { TriageAnswers } from "./rules";

/**
 * Erkin matnni tuzilgan simptom obyektiga aylantiradi.
 * GEMINI_API_KEY bo'lsa — Google Gemini (structured JSON chiqish),
 * bo'lmasa — kalit so'z tahlili.
 * AI faqat TARJIMON: shoshilinchlik qarorini rules.ts qabul qiladi.
 *
 * Kalit olish: https://aistudio.google.com (bepul tarif mavjud)
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    problem: { type: "STRING", enum: ["OGRIQ", "SHISH", "QONASH", "TRAVMA", "ESTETIKA", "PROFILAKTIKA", "BOSHQA"] },
    painLevel: { type: "STRING", enum: ["YENGIL", "ORTACHA", "KUCHLI", "CHIDAB_BOLMAS", "NOMALUM"] },
    duration: { type: "STRING", enum: ["BUGUN", "KUNLAR_2_3", "HAFTA", "OY", "NOMALUM"] },
    flags: {
      type: "ARRAY",
      items: { type: "STRING", enum: ["FACE_SWELLING", "FEVER", "SWALLOW", "BREATH", "BLEEDING_NONSTOP", "NIGHT_PAIN", "SENSITIVITY", "GUM_BLEED"] },
    },
    isChild: { type: "BOOLEAN" },
  },
  required: ["problem", "painLevel", "duration", "flags", "isChild"],
};

const SYSTEM_PROMPT =
  "Sen stomatologik simptomlarni tasniflaydigan yordamchisan. Bemorning o'zbek (lotin yoki kirill) yoki rus tilidagi matnini o'qib, belgilangan JSON formatida javob ber. Tashxis qo'yma — faqat matnda ANIQ ko'ringan belgilarni qayd et. Matnda yo'q belgini flags ga qo'shma. Noma'lum bo'lsa NOMALUM ishlat.";

export async function parseFreeText(text: string): Promise<{ answers: TriageAnswers; aiUsed: boolean }> {
  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: text.slice(0, 2000) }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              temperature: 0,
            },
          }),
          signal: AbortSignal.timeout(12_000),
        }
      );
      if (!res.ok) {
        console.error("Gemini xatosi:", res.status, await res.text().catch(() => ""));
      } else {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const raw = JSON.parse(jsonText) as Record<string, unknown>;
          return {
            answers: {
              problem: (raw.problem as TriageAnswers["problem"]) ?? "BOSHQA",
              painLevel: raw.painLevel === "NOMALUM" ? undefined : (raw.painLevel as TriageAnswers["painLevel"]),
              duration: raw.duration === "NOMALUM" ? undefined : (raw.duration as TriageAnswers["duration"]),
              flags: Array.isArray(raw.flags) ? (raw.flags as string[]) : [],
              isChild: Boolean(raw.isChild),
            },
            aiUsed: true,
          };
        }
      }
    } catch (e) {
      console.error("Gemini triage xatosi, fallback ishlatilmoqda:", e);
    }
  }
  return { answers: keywordParse(text), aiUsed: false };
}

/** API kalitisiz ishlash uchun oddiy kalit so'z tahlili */
function keywordParse(text: string): TriageAnswers {
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  let problem: TriageAnswers["problem"] = "BOSHQA";
  if (has("og'ri", "ogri", "оғри", "болит", "боль", "og`ri")) problem = "OGRIQ";
  if (has("shish", "шиш", "опух", "flyus", "флюс")) problem = "SHISH";
  if (has("qon", "кон", "кровь", "milk")) problem = "QONASH";
  if (has("sindi", "singan", "urib", "yiqil", "chiqib ketdi", "травма", "слома")) problem = "TRAVMA";
  if (has("oqartir", "vinir", "chiroyli", "отбел", "estetik")) problem = "ESTETIKA";
  if (has("tekshir", "profilaktika", "ko'rik", "tozalash", "осмотр")) problem = "PROFILAKTIKA";

  let painLevel: TriageAnswers["painLevel"] | undefined;
  if (has("chidab bo'lmas", "chidolmayapman", "juda qattiq", "невыносим")) painLevel = "CHIDAB_BOLMAS";
  else if (has("kuchli", "qattiq", "сильн")) painLevel = "KUCHLI";
  else if (has("o'rtacha", "средн")) painLevel = "ORTACHA";
  else if (has("yengil", "sal", "biroz", "слегка", "легк")) painLevel = "YENGIL";

  let duration: TriageAnswers["duration"] | undefined;
  if (has("bugun", "сегодня", "hozir")) duration = "BUGUN";
  else if (has("kecha", "2 kun", "3 kun", "ikki kun", "uch kun", "вчера")) duration = "KUNLAR_2_3";
  else if (has("hafta", "недел")) duration = "HAFTA";
  else if (has("oy", "месяц", "uzoq")) duration = "OY";

  const flags: string[] = [];
  if (has("yuz", "bet", "lunj", "щек", "лицо") && has("shish", "опух", "шиш")) flags.push("FACE_SWELLING");
  if (has("harorat", "isitma", "температур")) flags.push("FEVER");
  if (has("yutish", "yutolmay", "глотать")) flags.push("SWALLOW");
  if (has("nafas", "дышать")) flags.push("BREATH");
  if (has("to'xtamay", "tuxtamay", "не останавл")) flags.push("BLEEDING_NONSTOP");
  if (has("tunda", "uxlolmay", "kechasi", "ночью", "спать")) flags.push("NIGHT_PAIN");
  if (has("sovuq", "issiq", "холодн", "горяч")) flags.push("SENSITIVITY");
  if (has("milk", "десн") && has("qon", "кров")) flags.push("GUM_BLEED");

  // "bola" faqat alohida so'z sifatida — "bo'ladi/boladi" fe'liga adashmaslik uchun
  const isChild =
    /(bolam|bolasi|bola uchun|bolaga|bolani|o'g'lim|og'lim|qizim|farzand|ребен|сын|доч)/.test(t) ||
    /(^|\s)bola($|\s)/.test(t);

  return { problem, painLevel, duration, flags, isChild };
}
