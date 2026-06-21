import type { Medication, MedicationLog } from './types'

export interface DoseItem {
  med: Medication
  time: string
  taken: boolean
  /** Scheduled time has passed and not yet taken. */
  due: boolean
}

/**
 * Flatten medications × their daily times into per-dose items for today,
 * annotated with taken/due state. Sorted by time of day.
 */
export function buildTodayDoses(meds: Medication[], logs: MedicationLog[]): DoseItem[] {
  const now = new Date()
  const items: DoseItem[] = []
  for (const med of meds) {
    for (const time of med.times) {
      const taken = logs.some(
        (l) => l.medicationId === med.id && l.scheduledTime === time,
      )
      const [h, m] = time.split(':').map(Number)
      const sched = new Date()
      sched.setHours(h, m, 0, 0)
      const due = !taken && sched.getTime() <= now.getTime()
      items.push({ med, time, taken, due })
    }
  }
  return items.sort((a, b) => a.time.localeCompare(b.time))
}
