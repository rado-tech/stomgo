/**
 * Dinamik sozlama.
 *
 * Expo avval app.json ni o'qiydi va natijani shu yerga `config` sifatida beradi.
 * Bu yerda faqat MUHITGA bog'liq qiymatlarni ustiga qo'yamiz — shunda ilovani
 * boshqa serverga yo'naltirish uchun app.json ni qo'lda tahrirlash shart emas:
 *
 *   STOMGO_API_URL=https://stomgo.uz npx expo prebuild
 *   STOMGO_API_URL=https://stomgo.uz ./gradlew assembleRelease
 *
 * Manzil berilmasa app.json dagi qiymat qoladi.
 */
module.exports = ({ config }) => {
  const apiUrl = process.env.STOMGO_API_URL?.trim();

  if (apiUrl && !/^https:\/\/[^\s/]+/.test(apiUrl)) {
    // http yoki buzuq manzil bilan yig'ilib ketmasin: kirish kodlari
    // shifrlanmagan tarmoqda ketardi
    throw new Error(
      `STOMGO_API_URL https:// bilan boshlanishi kerak. Berilgan: "${apiUrl}"`,
    );
  }

  return {
    ...config,
    extra: {
      ...config.extra,
      ...(apiUrl ? { apiUrl } : {}),
    },
  };
};
