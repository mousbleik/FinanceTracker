// ---------------------------------------------------------------------------
// Shared domain types for the diabetes logging prototype.
// Kept framework-agnostic so the same shapes can move to a real API later.
// ---------------------------------------------------------------------------

/** When a glucose reading was taken, relative to eating. */
export type ReadingTag = 'fasting' | 'beforeMeal' | 'afterMeal'

/** A single blood glucose reading. Values are in mg/dL. */
export interface GlucoseReading {
  id: string
  /** mg/dL */
  value: number
  tag: ReadingTag
  /** ISO timestamp */
  takenAt: string
  note?: string
}

/**
 * Non-clinical orientation status for a reading.
 * NOTE: This is supportive orientation only — never medical advice.
 */
export type GlucoseStatus = 'low' | 'inRange' | 'borderline' | 'high'

/** A medication the user is tracking. */
export interface Medication {
  id: string
  name: string
  dose: string
  /** Times of day in 24h "HH:mm" format. */
  times: string[]
}

/** A record that a medication dose was taken on a given day. */
export interface MedicationLog {
  id: string
  medicationId: string
  /** The scheduled time this log satisfies, "HH:mm". */
  scheduledTime: string
  /** ISO timestamp when marked taken. */
  takenAt: string
}

/** A lightweight meal entry — we only capture that a meal happened. */
export interface MealEntry {
  id: string
  /** Localized/free-text label of what was eaten. */
  label: string
  /** Key into the curated food list, or 'custom' for free text. */
  foodKey: string
  /** ISO timestamp */
  eatenAt: string
}
