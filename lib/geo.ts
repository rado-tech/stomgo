// Toshkent markazi — geolokatsiya berilmaganda standart nuqta
export const TASHKENT_CENTER = { lat: 41.3111, lng: 69.2797 };

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Standart "aralash" saralash balli:
 * yaqinlik + reyting + javob berish sifati.
 * Promo slot alohida ko'rsatiladi, bu ballga qo'shilmaydi.
 */
export function mixScore(distanceKm: number, rating: number, responseRate: number): number {
  const distScore = 1 / (1 + distanceKm / 3); // 3 km da ~0.5
  return 0.45 * distScore + 0.35 * (rating / 5) + 0.2 * responseRate;
}
