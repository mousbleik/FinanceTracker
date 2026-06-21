import type { Medication, MedicationLog } from '../lib/types'
import { mockStore, nextId } from '../data/mockData'

// ---------------------------------------------------------------------------
// medsService — UI's single entry point for medication data + adherence logs.
// Promise-based over mock data; swap for a real API later.
// ---------------------------------------------------------------------------

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export const medsService = {
  async list(): Promise<Medication[]> {
    await delay()
    return [...mockStore.medications]
  },

  async add(input: { name: string; dose: string; times: string[] }): Promise<Medication> {
    await delay()
    const med: Medication = {
      id: nextId('med'),
      name: input.name,
      dose: input.dose,
      times: [...input.times].sort(),
    }
    mockStore.medications.push(med)
    return med
  },

  async remove(id: string): Promise<void> {
    await delay()
    mockStore.medications = mockStore.medications.filter((m) => m.id !== id)
    mockStore.medicationLogs = mockStore.medicationLogs.filter((l) => l.medicationId !== id)
  },

  /** Logs taken today only — used to render today's adherence. */
  async todaysLogs(): Promise<MedicationLog[]> {
    await delay()
    const key = todayKey()
    return mockStore.medicationLogs.filter((l) => l.takenAt.slice(0, 10) === key)
  },

  async markTaken(medicationId: string, scheduledTime: string): Promise<MedicationLog> {
    await delay()
    const log: MedicationLog = {
      id: nextId('ml'),
      medicationId,
      scheduledTime,
      takenAt: new Date().toISOString(),
    }
    mockStore.medicationLogs.push(log)
    return log
  },

  async unmarkTaken(medicationId: string, scheduledTime: string): Promise<void> {
    await delay()
    const key = todayKey()
    mockStore.medicationLogs = mockStore.medicationLogs.filter(
      (l) =>
        !(
          l.medicationId === medicationId &&
          l.scheduledTime === scheduledTime &&
          l.takenAt.slice(0, 10) === key
        ),
    )
  },
}
