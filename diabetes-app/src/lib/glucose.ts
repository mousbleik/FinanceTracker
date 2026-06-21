import type { GlucoseReading, GlucoseStatus, ReadingTag } from './types'

// ===========================================================================
// CENTRALIZED GLUCOSE RANGE LOGIC
// ===========================================================================
//
// ⚠️ PLACEHOLDER THRESHOLDS — NOT MEDICAL ADVICE ⚠️
//
// The numeric bands below are reasonable, commonly-cited general references
// for Type 2 diabetes self-monitoring (mg/dL), used here ONLY to drive a
// supportive, non-clinical "orientation" color and message in the prototype.
//
// They MUST be reviewed and confirmed by a qualified clinician, and ideally
// made per-user (targets differ by person, age, pregnancy, etc.) before this
// app is used by real patients. This product does not diagnose, interpret, or
// advise — it reflects logged data back to the user.
//
// All values are in mg/dL.
// ===========================================================================

export const GLUCOSE_UNIT = 'mg/dL'

interface ThresholdBand {
  /** Below this value → "low". */
  low: number
  /** Upper bound of the comfortable in-range band (inclusive). */
  inRangeMax: number
  /** Upper bound of the "borderline / slightly high" band (inclusive). */
  borderlineMax: number
}

// PLACEHOLDER bands per reading context — confirm with a clinician.
const THRESHOLDS: Record<ReadingTag, ThresholdBand> = {
  // Fasting and before-meal share the tighter band.
  fasting: { low: 70, inRangeMax: 130, borderlineMax: 160 },
  beforeMeal: { low: 70, inRangeMax: 130, borderlineMax: 160 },
  // Post-meal readings are expected to run higher.
  afterMeal: { low: 70, inRangeMax: 180, borderlineMax: 220 },
}

/** Plausible manual-entry bounds, used only for input validation. */
export const MIN_GLUCOSE = 20
export const MAX_GLUCOSE = 600

/**
 * Classify a reading into a non-clinical orientation status.
 * This drives color + supportive wording only.
 */
export function classifyReading(value: number, tag: ReadingTag): GlucoseStatus {
  const band = THRESHOLDS[tag]
  if (value < band.low) return 'low'
  if (value <= band.inRangeMax) return 'inRange'
  if (value <= band.borderlineMax) return 'borderline'
  return 'high'
}

/** Tailwind class tokens for each status — calm, never harsh. */
export const STATUS_STYLES: Record<
  GlucoseStatus,
  { text: string; bg: string; dot: string; chart: string }
> = {
  inRange: {
    text: 'text-state-inrange',
    bg: 'bg-state-inrangebg',
    dot: 'bg-state-inrange',
    chart: '#2f9e6e',
  },
  borderline: {
    text: 'text-state-high',
    bg: 'bg-state-highbg',
    dot: 'bg-state-high',
    chart: '#d99a3a',
  },
  high: {
    text: 'text-state-low',
    bg: 'bg-state-lowbg',
    dot: 'bg-state-low',
    chart: '#d9736a',
  },
  low: {
    text: 'text-state-low',
    bg: 'bg-state-lowbg',
    dot: 'bg-state-low',
    chart: '#d9736a',
  },
}

/** Average of a set of readings (mg/dL), rounded. Null when empty. */
export function averageOf(readings: GlucoseReading[]): number | null {
  if (readings.length === 0) return null
  const sum = readings.reduce((acc, r) => acc + r.value, 0)
  return Math.round(sum / readings.length)
}

/** Suggest a sensible default tag based on the time of day. */
export function suggestTagForTime(date = new Date()): ReadingTag {
  const h = date.getHours()
  // Early morning before breakfast → fasting.
  if (h >= 4 && h < 9) return 'fasting'
  // Common meal windows → after meal feedback is the usual check.
  if ((h >= 13 && h < 16) || (h >= 20 && h < 23)) return 'afterMeal'
  return 'beforeMeal'
}

/** How a value compares to a recent average, as a non-clinical descriptor. */
export type Comparison = 'above' | 'similar' | 'below'

export function compareToAverage(value: number, avg: number | null): Comparison | null {
  if (avg == null) return null
  const diff = value - avg
  // Within ~10 mg/dL we treat as "similar" to avoid over-signaling noise.
  if (Math.abs(diff) <= 10) return 'similar'
  return diff > 0 ? 'above' : 'below'
}
