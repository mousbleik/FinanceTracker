// ---------------------------------------------------------------------------
// Centralized i18n strings. Arabic is the primary experience; English is the
// secondary toggle. Keep ALL user-facing copy here so wording (especially the
// supportive, non-clinical feedback) is easy to review and adjust.
// ---------------------------------------------------------------------------

export type Lang = 'ar' | 'en'

export const LANGS: Lang[] = ['ar', 'en']

// Using a flat record keyed by string id. Values may contain {param} tokens.
type Dict = Record<string, string>

const ar: Dict = {
  'app.name': 'سُكّري',
  'app.tagline': 'رفيقك اليومي',

  // Navigation
  'nav.home': 'الرئيسية',
  'nav.meds': 'الأدوية',
  'nav.meals': 'الوجبات',
  'nav.export': 'تقرير الطبيب',

  // Common
  'common.save': 'حفظ',
  'common.cancel': 'إلغاء',
  'common.add': 'إضافة',
  'common.done': 'تم',
  'common.close': 'إغلاق',
  'common.today': 'اليوم',
  'common.delete': 'حذف',
  'common.optional': 'اختياري',
  'common.unit': 'ملغم/دل',

  // Greeting
  'home.greeting.morning': 'صباح الخير',
  'home.greeting.afternoon': 'مساء الخير',
  'home.greeting.evening': 'مساء الخير',
  'home.latestReading': 'آخر قراءة',
  'home.noReadings': 'لا توجد قراءات بعد',
  'home.noReadings.hint': 'سجّل أول قراءة لك اليوم',
  'home.ago.justNow': 'الآن',
  'home.ago.minutes': 'قبل {n} دقيقة',
  'home.ago.hours': 'قبل {n} ساعة',
  'home.ago.days': 'قبل {n} يوم',
  'home.avg7': 'متوسط ٧ أيام',
  'home.medsToday': 'أدوية اليوم',
  'home.medsDone': '{done} من {total}',
  'home.trend': 'مؤشر القراءات',
  'home.range.7': '٧ أيام',
  'home.range.30': '٣٠ يوم',
  'home.viewAll': 'عرض الكل',
  'home.dueNow': 'حان موعد الدواء',

  // Tags
  'tag.fasting': 'صائم',
  'tag.beforeMeal': 'قبل الأكل',
  'tag.afterMeal': 'بعد الأكل',

  // Logging
  'log.title': 'تسجيل قراءة',
  'log.placeholder': 'أدخل القيمة',
  'log.tagQuestion': 'متى أخذت القراءة؟',
  'log.saveReading': 'حفظ القراءة',

  // Instant feedback (NON-CLINICAL orientation only — never advice)
  'status.low': 'منخفض',
  'status.inRange': 'ضمن المعدل',
  'status.borderline': 'مرتفع قليلاً',
  'status.high': 'مرتفع',
  'feedback.savedAt': 'سُجّلت {time}',
  'compare.above': 'أعلى من متوسط أيامك الأخيرة',
  'compare.similar': 'قريب من متوسط أيامك الأخيرة',
  'compare.below': 'أقل من متوسط أيامك الأخيرة',
  'compare.noData': 'أول قراءة لك — سنريك المقارنة لاحقاً',
  'feedback.disclaimer': 'هذه معلومة للمتابعة فقط وليست نصيحة طبية',

  // Meds
  'meds.title': 'الأدوية',
  'meds.today': 'جرعات اليوم',
  'meds.allDone': 'أكملت كل جرعات اليوم 🌿',
  'meds.taken': 'تم أخذها',
  'meds.markTaken': 'أخذتها',
  'meds.due': 'مستحقة',
  'meds.upcoming': 'قادمة',
  'meds.yourMeds': 'أدويتي',
  'meds.add': 'إضافة دواء',
  'meds.name': 'اسم الدواء',
  'meds.namePlaceholder': 'مثال: ميتفورمين',
  'meds.dose': 'الجرعة',
  'meds.dosePlaceholder': 'مثال: ٥٠٠ ملغم',
  'meds.times': 'مواعيد اليوم',
  'meds.addTime': 'إضافة موعد',
  'meds.empty': 'لم تضف أي دواء بعد',

  // Meals
  'meals.title': 'الوجبات',
  'meals.today': 'وجبات اليوم',
  'meals.add': 'تسجيل وجبة',
  'meals.pick': 'اختر من الأطعمة الشائعة',
  'meals.custom': 'أو اكتب وجبتك',
  'meals.customPlaceholder': 'ماذا تناولت؟',
  'meals.empty': 'لم تسجّل أي وجبة اليوم',
  'meals.logged': 'سُجّلت الوجبة',

  // Foods (curated Saudi/Gulf starter list)
  'food.kabsa': 'كبسة',
  'food.machboos': 'مجبوس',
  'food.dates': 'تمر',
  'food.samboosa': 'سمبوسة',
  'food.arabicBread': 'خبز عربي',
  'food.shawarma': 'شاورما',
  'food.foul': 'فول',
  'food.jareesh': 'جريش',
  'food.salad': 'سلطة',
  'food.fruit': 'فاكهة',

  // Export
  'export.title': 'تقرير الطبيب',
  'export.subtitle': 'ملخص آخر ٣٠ يوماً لمشاركته مع طبيبك',
  'export.generate': 'تجهيز التقرير',
  'export.print': 'طباعة / حفظ',
  'export.back': 'رجوع',
  'export.patientReport': 'تقرير متابعة السكري',
  'export.period': 'الفترة',
  'export.generatedOn': 'تاريخ الإصدار',
  'export.summary': 'ملخص القراءات',
  'export.totalReadings': 'عدد القراءات',
  'export.average': 'المتوسط العام',
  'export.byTag': 'المتوسط حسب التوقيت',
  'export.inRangePct': 'ضمن المعدل',
  'export.readingsLog': 'سجل القراءات',
  'export.date': 'التاريخ',
  'export.time': 'الوقت',
  'export.value': 'القيمة',
  'export.context': 'التوقيت',
  'export.status': 'الحالة',
  'export.disclaimer':
    'هذا التقرير أنشأه المستخدم لأغراض المتابعة الذاتية فقط، وهو لا يُعد تشخيصاً أو نصيحة طبية. يُرجى مراجعة الطبيب لتفسير القراءات.',
  'export.noData': 'لا توجد قراءات في هذه الفترة',

  // Language toggle
  'lang.toggle': 'English',
}

const en: Dict = {
  'app.name': 'Sukkari',
  'app.tagline': 'Your daily companion',

  'nav.home': 'Home',
  'nav.meds': 'Meds',
  'nav.meals': 'Meals',
  'nav.export': 'Report',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.add': 'Add',
  'common.done': 'Done',
  'common.close': 'Close',
  'common.today': 'Today',
  'common.delete': 'Delete',
  'common.optional': 'optional',
  'common.unit': 'mg/dL',

  'home.greeting.morning': 'Good morning',
  'home.greeting.afternoon': 'Good afternoon',
  'home.greeting.evening': 'Good evening',
  'home.latestReading': 'Latest reading',
  'home.noReadings': 'No readings yet',
  'home.noReadings.hint': 'Log your first reading today',
  'home.ago.justNow': 'just now',
  'home.ago.minutes': '{n} min ago',
  'home.ago.hours': '{n} h ago',
  'home.ago.days': '{n} d ago',
  'home.avg7': '7-day average',
  'home.medsToday': "Today's meds",
  'home.medsDone': '{done} of {total}',
  'home.trend': 'Glucose trend',
  'home.range.7': '7 days',
  'home.range.30': '30 days',
  'home.viewAll': 'View all',
  'home.dueNow': 'Medication due',

  'tag.fasting': 'Fasting',
  'tag.beforeMeal': 'Before meal',
  'tag.afterMeal': 'After meal',

  'log.title': 'Log a reading',
  'log.placeholder': 'Enter value',
  'log.tagQuestion': 'When did you take it?',
  'log.saveReading': 'Save reading',

  'status.low': 'Low',
  'status.inRange': 'In range',
  'status.borderline': 'Slightly high',
  'status.high': 'High',
  'feedback.savedAt': 'Saved {time}',
  'compare.above': 'above your recent average',
  'compare.similar': 'close to your recent average',
  'compare.below': 'below your recent average',
  'compare.noData': 'Your first reading — comparison will appear later',
  'feedback.disclaimer': 'For tracking only — not medical advice',

  'meds.title': 'Medications',
  'meds.today': "Today's doses",
  'meds.allDone': "You've taken all of today's doses 🌿",
  'meds.taken': 'Taken',
  'meds.markTaken': 'Take',
  'meds.due': 'Due',
  'meds.upcoming': 'Upcoming',
  'meds.yourMeds': 'My medications',
  'meds.add': 'Add medication',
  'meds.name': 'Medication name',
  'meds.namePlaceholder': 'e.g. Metformin',
  'meds.dose': 'Dose',
  'meds.dosePlaceholder': 'e.g. 500 mg',
  'meds.times': 'Daily times',
  'meds.addTime': 'Add time',
  'meds.empty': "You haven't added any medication yet",

  'meals.title': 'Meals',
  'meals.today': "Today's meals",
  'meals.add': 'Log a meal',
  'meals.pick': 'Pick from common foods',
  'meals.custom': 'Or write your own',
  'meals.customPlaceholder': 'What did you eat?',
  'meals.empty': "You haven't logged any meal today",
  'meals.logged': 'Meal logged',

  'food.kabsa': 'Kabsa',
  'food.machboos': 'Machboos',
  'food.dates': 'Dates',
  'food.samboosa': 'Samboosa',
  'food.arabicBread': 'Arabic bread',
  'food.shawarma': 'Shawarma',
  'food.foul': 'Foul',
  'food.jareesh': 'Jareesh',
  'food.salad': 'Salad',
  'food.fruit': 'Fruit',

  'export.title': 'Doctor report',
  'export.subtitle': 'Last 30 days summary to share with your doctor',
  'export.generate': 'Prepare report',
  'export.print': 'Print / Save',
  'export.back': 'Back',
  'export.patientReport': 'Diabetes Tracking Report',
  'export.period': 'Period',
  'export.generatedOn': 'Generated on',
  'export.summary': 'Readings summary',
  'export.totalReadings': 'Total readings',
  'export.average': 'Overall average',
  'export.byTag': 'Average by context',
  'export.inRangePct': 'In range',
  'export.readingsLog': 'Readings log',
  'export.date': 'Date',
  'export.time': 'Time',
  'export.value': 'Value',
  'export.context': 'Context',
  'export.status': 'Status',
  'export.disclaimer':
    'This report was generated by the user for self-tracking only. It is not a diagnosis or medical advice. Please consult a clinician to interpret readings.',
  'export.noData': 'No readings in this period',

  'lang.toggle': 'العربية',
}

export const STRINGS: Record<Lang, Dict> = { ar, en }

export function isRTL(lang: Lang): boolean {
  return lang === 'ar'
}
