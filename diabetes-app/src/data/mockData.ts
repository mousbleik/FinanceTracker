import type { GlucoseReading, Medication, MedicationLog, MealEntry, ReadingTag } from '../lib/types'

// ---------------------------------------------------------------------------
// Mock data. Generates a realistic ~30 days of readings so trends, averages,
// and the doctor report all look populated on first run. Replace this module
// with real API responses later — the services are the only consumers.
// ---------------------------------------------------------------------------

let _id = 0
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(_id++).toString(36)}`

function iso(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

// Gently randomized value around a center, clamped to a plausible range.
function near(center: number, spread: number): number {
  const v = center + (Math.random() - 0.5) * 2 * spread
  return Math.round(Math.max(60, Math.min(280, v)))
}

function buildReadings(): GlucoseReading[] {
  const readings: GlucoseReading[] = []
  // 30 days back → today. Most days: a fasting morning + an after-lunch reading,
  // some days add a before-dinner reading. Mostly in range with realistic drift.
  for (let day = 29; day >= 0; day--) {
    // Fasting morning reading (centered comfortably in range).
    readings.push({
      id: nextId('g'),
      value: near(118, 22),
      tag: 'fasting',
      takenAt: iso(day, 7, 10 + Math.floor(Math.random() * 30)),
    })

    // After-lunch reading (runs higher; occasionally borderline/high).
    const lunchCenter = Math.random() < 0.25 ? 195 : 165
    readings.push({
      id: nextId('g'),
      value: near(lunchCenter, 30),
      tag: 'afterMeal',
      takenAt: iso(day, 14, Math.floor(Math.random() * 50)),
    })

    // ~Half the days: a before-dinner reading.
    if (Math.random() < 0.5) {
      readings.push({
        id: nextId('g'),
        value: near(124, 24),
        tag: 'beforeMeal',
        takenAt: iso(day, 18, 30 + Math.floor(Math.random() * 25)),
      })
    }
  }
  // Sort newest first.
  return readings.sort((a, b) => +new Date(b.takenAt) - +new Date(a.takenAt))
}

function buildMedications(): Medication[] {
  return [
    { id: 'med_metformin', name: 'ميتفورمين', dose: '٥٠٠ ملغم', times: ['08:00', '20:00'] },
    { id: 'med_glic', name: 'جليكلازيد', dose: '٦٠ ملغم', times: ['08:00'] },
  ]
}

function buildMedicationLogs(meds: Medication[]): MedicationLog[] {
  // Mark the earliest of today's doses as already taken, to show a realistic
  // mixed state (some done, some pending).
  const logs: MedicationLog[] = []
  const now = new Date()
  for (const med of meds) {
    for (const time of med.times) {
      const [h, m] = time.split(':').map(Number)
      const scheduled = new Date()
      scheduled.setHours(h, m, 0, 0)
      // Mark as taken only if its time has clearly passed (and the morning one).
      if (scheduled.getTime() < now.getTime() - 30 * 60 * 1000 && h < 12) {
        logs.push({
          id: nextId('ml'),
          medicationId: med.id,
          scheduledTime: time,
          takenAt: iso(0, h, m + 5),
        })
      }
    }
  }
  return logs
}

function buildMeals(): MealEntry[] {
  return [
    { id: nextId('meal'), label: 'كبسة', foodKey: 'kabsa', eatenAt: iso(0, 13, 30) },
    { id: nextId('meal'), label: 'تمر', foodKey: 'dates', eatenAt: iso(0, 7, 0) },
    { id: nextId('meal'), label: 'سمبوسة', foodKey: 'samboosa', eatenAt: iso(1, 19, 0) },
  ]
}

// A single in-memory store instance, seeded once per app load.
const medications = buildMedications()

export const mockStore = {
  readings: buildReadings(),
  medications,
  medicationLogs: buildMedicationLogs(medications),
  meals: buildMeals(),
}

export { nextId }

// Curated starter list of common Saudi/Gulf foods. Labels are resolved via i18n
// keys (food.*). This is intentionally small — not a nutrition database.
export const CURATED_FOODS: { key: string; emoji: string }[] = [
  { key: 'kabsa', emoji: '🍛' },
  { key: 'machboos', emoji: '🥘' },
  { key: 'dates', emoji: '🌴' },
  { key: 'samboosa', emoji: '🥟' },
  { key: 'arabicBread', emoji: '🫓' },
  { key: 'shawarma', emoji: '🌯' },
  { key: 'foul', emoji: '🫘' },
  { key: 'jareesh', emoji: '🍲' },
  { key: 'salad', emoji: '🥗' },
  { key: 'fruit', emoji: '🍎' },
]

export const READING_TAGS: ReadingTag[] = ['fasting', 'beforeMeal', 'afterMeal']
