import BackButton from "@/components/BackButton";

export const metadata = { title: "Ommaviy oferta" };

/**
 * DIQQAT: bu shablon — e'lon qilishdan oldin yurist bilan ko'rib chiqing
 * va [TO'LDIRING] joylarini to'ldiring.
 */
export default function OfferPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 text-[14.5px] leading-relaxed text-zinc-700">
      <BackButton href="/" label="Bosh sahifa" />
      <h1 className="mt-3 text-2xl font-extrabold text-zinc-900">Foydalanish shartlari (ommaviy oferta)</h1>

      <h2 className="mt-6 font-bold text-zinc-900">1. Xizmat tavsifi</h2>
      <p>
        StomGo — axborot platformasi: klinikalarni qidirish, taqqoslash va qabulga yozilish
        so&apos;rovini yuborish imkonini beradi. StomGo tibbiy xizmat ko&apos;rsatmaydi va tibbiy
        faoliyat bilan shug&apos;ullanmaydi. Barcha tibbiy xizmatlar klinikalar tomonidan, ularning
        litsenziyalari asosida ko&apos;rsatiladi.
      </p>

      <h2 className="mt-5 font-bold text-zinc-900">2. Javobgarlik chegarasi</h2>
      <ul className="mt-1 list-disc pl-5">
        <li>Klinikalar ko&apos;rsatgan xizmat sifati uchun klinikaning o&apos;zi javobgar</li>
        <li>Narxlar taxminiy diapazon — yakuniy narx ko&apos;rikdan keyin klinikada belgilanadi</li>
        <li>AI maslahat tashxis emas — yo&apos;naltiruvchi taxmin, xolos</li>
        <li>Platformadan tashqarida (telefon, Telegram va h.k.) kelishilgan munosabatlar uchun platforma javobgar emas</li>
      </ul>

      <h2 className="mt-5 font-bold text-zinc-900">3. Foydalanuvchi majburiyatlari</h2>
      <p>
        To&apos;g&apos;ri ma&apos;lumot kiritish, yozuvga bora olmasangiz — bekor qilish, soxta sharh yozmaslik.
        Qoidabuzarlik hisobni bloklashga olib kelishi mumkin.
      </p>

      <h2 className="mt-5 font-bold text-zinc-900">4. Rekvizitlar</h2>
      <p>[TO&apos;LDIRING: yuridik shaxs/YaTT nomi, STIR, manzil, email, telefon]</p>
    </div>
  );
}
