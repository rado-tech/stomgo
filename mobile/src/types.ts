export type ClinicListItem = {
  id: string; slug: string; name: string; district: string; address: string;
  lat: number; lng: number; rating: number; reviewCount: number;
  distanceKm: number; isOpen: boolean; todayHours: string;
  is247: boolean; emergency: boolean; childFriendly: boolean;
  hasFemaleDoctor: boolean; tier: string; isPromo: boolean;
  coverHue: number; photoUrl: string | null; consultPrice: number | null;
  filteredService: { name: string; priceMin: number; priceMax: number } | null;
  infoStale: boolean;
  nextSlot: { date: string; label: string; time: string } | null;
  avgResponseMin: number;
  responseRate: number;
};

export type ClinicDetail = {
  id: string; slug: string; name: string; description: string; address: string; district: string;
  phone: string; lat: number; lng: number; distanceKm: number; isOpen: boolean; todayHours: string;
  week: { day: string; label: string; isToday: boolean }[];
  is247: boolean; emergency: boolean; childFriendly: boolean; verified: boolean; tier: string;
  rating: number; reviewCount: number; avgResponseMin: number; coverHue: number;
  photoUrl: string | null; gallery: string[]; infoStale: boolean;
  servicesByCategory: Record<string, { code: string; name: string; priceMin: number; priceMax: number }[]>;
  doctors: { id: string; name: string; gender: string; specialty: string; experienceYears: number; verification: string; photoUrl: string | null }[];
  showDoctors: boolean;
  reviews: { id: string; rating: number; text: string; reply: string; author: string; date: string }[];
  slots: { date: string; label: string; slots: string[] }[];
};

export type Appointment = {
  id: string; status: string; requestedAt: string; altAt: string | null; code: string;
  createdAt: string; note: string; rejectReason: string;
  clinic: { name: string; slug: string; address: string; phone: string; coverHue: number; active?: boolean };
  doctor: { name: string; specialty: string } | null;
  review: { id: string } | null;
};

export type Me = {
  id: string; name: string | null; phone: string; role: string;
  photoUrl?: string | null; birthYear?: number | null; gender?: string | null;
};

export type OtpResponse = {
  ok: boolean;
  via?: "telegram" | "telegram_link" | "sms" | "screen";
  devCode?: string;
  deepLink?: string;
  botUsername?: string;
};

export type NotificationItem = {
  id: string; title: string; body: string; link: string;
  readAt: string | null; createdAt: string;
};

export type ConversationItem = {
  id: string; type: "CLINIC" | "SUPPORT"; title: string; subtitle: string;
  photoUrl: string | null; coverHue: number; clinicSlug: string | null;
  lastMessageAt: string; unread: number;
};

export type ChatMessage = {
  id: string; senderRole: string; senderName: string; body: string;
  imageUrl?: string | null; createdAt: string;
};

export type TriageResult = {
  urgency: "EMERGENCY" | "TODAY" | "SOON" | "ROUTINE";
  specialty: string;
  explanation: string;
  priceMin: number; priceMax: number;
  clinics: { slug: string; name: string; district: string; rating: number; reviewCount: number; distanceKm: number; isOpen: boolean; todayHours: string; coverHue: number }[];
};
