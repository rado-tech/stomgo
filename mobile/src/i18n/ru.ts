import type { uz } from "./uz";

/**
 * Ruscha lug'at.
 * Tip uz.ts dan olinadi — kalit unutilsa TypeScript yig'ilishda to'xtatadi.
 */
export const ru: Record<keyof typeof uz, string> = {
  // ---------- Umumiy ----------
  "common.back": "Назад",
  "common.cancel": "Отмена",
  "common.save": "Сохранить",
  "common.close": "Закрыть",
  "common.confirm": "Подтвердить",
  "common.delete": "Удалить",
  "common.edit": "Изменить",
  "common.search": "Поиск",
  "common.loading": "Загрузка...",
  "common.retry": "Повторить",
  "common.more": "Подробнее",
  "common.all": "Все",
  "common.km": "км",
  "common.sum": "сум",
  "common.from": "от",
  "common.to": "до",
  "common.today": "Сегодня",
  "common.tomorrow": "Завтра",

  // ---------- Navigatsiya ----------
  "nav.home": "Главная",
  "nav.clinics": "Клиники",
  "nav.ai": "ИИ",
  "nav.messages": "Сообщения",
  "nav.profile": "Профиль",
  "nav.prices": "Цены",
  "nav.notifications": "Уведомления",

  // ---------- Bosh sahifa va ro'yxat ----------
  "home.searchPlaceholder": "Клиника или район...",
  "home.allServices": "Все услуги",
  "home.nothingFound": "Ничего не найдено",
  "home.changeFilters": "Попробуйте изменить фильтры",
  "home.map": "Карта",
  "home.nearMe": "Рядом со мной",
  "home.openNow": "Открыто сейчас",
  "home.urgent": "Срочно",
  "home.sort": "Сортировка",
  "home.sortMix": "Смешанная (рекомендуем)",
  "home.sortDistance": "По расстоянию",
  "home.sortRating": "По рейтингу",
  "home.sortPrice": "По цене",
  "home.nextSlot": "Ближайшее время",
  "home.repliesIn": "Отвечает за",
  "home.min": "мин",

  // ---------- Klinika sahifasi ----------
  "clinic.book": "Записаться на приём",
  "clinic.services": "Услуги и цены",
  "clinic.doctors": "Врачи",
  "clinic.reviews": "Отзывы",
  "clinic.hours": "Часы работы",
  "clinic.route": "Маршрут",
  "clinic.message": "Написать сообщение",
  "clinic.closed": "Закрыто",
  "clinic.open": "Открыто",
  "clinic.nonstop": "24/7",
  "clinic.verified": "Документы проверены",
  "clinic.contractEnded": "Договор с этой клиникой расторгнут",
  "clinic.noReviews": "Пока нет отзывов",
  "clinic.reviewsOnlyAfterVisit": "Отзывы можно оставить только после подтверждённого визита.",

  // ---------- Qabulga yozilish ----------
  "booking.chooseDay": "Выберите день",
  "booking.chooseTime": "Выберите время",
  "booking.chooseDoctor": "Врач (необязательно)",
  "booking.note": "Комментарий (необязательно)",
  "booking.notePlaceholder": "Кратко опишите жалобу",
  "booking.submit": "Записаться",
  "booking.noSlots": "На этот день свободного времени нет",
  "booking.success": "Заявка отправлена. Дождитесь подтверждения клиники.",

  // ---------- Yozuv holatlari ----------
  "status.PENDING": "Ожидает",
  "status.CONFIRMED": "Подтверждено",
  "status.ALT_OFFERED": "Предложено другое время",
  "status.REJECTED": "Отклонено",
  "status.CANCELLED": "Отменено",
  "status.ARRIVED": "Пришёл",
  "status.NO_SHOW": "Не пришёл",
  "status.DONE": "Завершено",

  // ---------- Profil ----------
  "profile.myBookings": "Мои записи",
  "profile.noBookings": "Записей нет",
  "profile.noBookingsHint": "Выберите клинику и запишитесь на приём",
  "profile.logout": "Выйти",
  "profile.settings": "Настройки",
  "profile.language": "Язык",
  "profile.deleteAccount": "Удалить аккаунт",
  "profile.reschedule": "Перенести время",
  "profile.cancelBooking": "Отменить",
  "profile.rate": "Оценить",

  // ---------- Kirish ----------
  "auth.title": "Вход или регистрация",
  "auth.subtitle": "Код подтверждения придёт на ваш номер",
  "auth.phone": "Номер телефона",
  "auth.getCode": "Получить код",
  "auth.enterCode": "Введите код",
  "auth.staffLogin": "Вход для сотрудников",
  "auth.patient": "Пациент",
  "auth.staff": "Сотрудник",
  "auth.forgotPassword": "Забыли пароль?",

  // ---------- Xabarlar ----------
  "chat.title": "Сообщения",
  "chat.empty": "Пока нет переписки",
  "chat.placeholder": "Напишите сообщение...",
  "chat.send": "Отправить",
  "chat.photo": "Фото",
  "chat.support": "Поддержка",
  "chat.onlyInApp":
    "Договорённости действуют только в этом чате. За договорённости вне приложения мы не отвечаем.",

  // ---------- AI triaj ----------
  "triage.title": "ИИ-помощник",
  "triage.subtitle": "Опишите жалобу — определим срочность",
  "triage.placeholder": "Например: нижний зуб сильно болит со вчерашнего вечера",
  "triage.analyze": "Анализировать",
  "triage.notDiagnosis": "Это не диагноз. Точный ответ даст врач.",

  // ---------- Xatoliklar ----------
  "error.offline": "Нет интернета — часть данных может не обновляться",
  "error.restored": "Соединение восстановлено",
  "error.generic": "Произошла ошибка",
  "error.tryAgain": "Попробуйте через некоторое время",
  "error.notFound": "Страница не найдена",

  "home.service": "Услуга",
  "home.serviceType": "Тип услуги",
  "home.femaleDoctor": "Женщина-врач",
  "home.children": "Детям",
  "home.serviceHint": "После выбора услуги у каждой клиники показывается её цена и становится доступна сортировка по цене.",
  "home.sortMixHint": "Близость + рейтинг + скорость ответа",
  "home.sortPriceHint": "Если выбрана услуга — по её цене",
  "home.list": "Список",

  "home.vip": "VIP-объявления",
  "home.ad": "Реклама",

  "chat.loginToSee": "Войдите, чтобы увидеть переписку",
  "chat.loginHint": "Здесь переписка с клиниками и поддержка",
  "chat.emptyHint": "Задайте вопрос через кнопку «Написать сообщение» на странице клиники",
  "triage.nearbyOpen": "Ближайшие клиники, принимающие сейчас",
  "triage.matching": "Подходящие клиники",

  "clinics.searchPlaceholder": "Введите название клиники",
  "clinics.notFound": "Клиника не найдена",
  "clinics.notFoundHint": "Попробуйте другое название",

  // ---------- Xizmat nomlari ----------
  "service.konsultatsiya": "Консультация",
  "service.plomba": "Пломба",
  "service.kanal": "Лечение каналов",
  "service.tozalash": "Чистка",
  "service.oqartirish": "Отбеливание",
  "service.olib_tashlash": "Удаление зуба",
  "service.akl_tishi": "Зуб мудрости",
  "service.implant": "Имплант",
  "service.koronka": "Коронка",
  "service.protez": "Протез",
  "service.breket": "Брекеты",
  "service.vinir": "Виниры",
  "service.bolalar_davolash": "Детское лечение",
  "service.rentgen": "Рентген",
};
