import type { GlucoseReading, ReadingTag } from '../lib/types'
import { mockStore, nextId } from '../data/mockData'

// ---------------------------------------------------------------------------
// glucoseService — the ONLY place the UI talks to for glucose data.
// Returns promises over the in-memory mock store so a real HTTP API can be
// dropped in here later without touching any component.
// ---------------------------------------------------------------------------

// Simulate a tiny bit of latency so loading states are realistic.
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))

export const glucoseService = {
  async list(): Promise<GlucoseReading[]> {
    await delay()
    return [...mockStore.readings].sort(
      (a, b) => +new Date(b.takenAt) - +new Date(a.takenAt),
    )
  },

  async add(input: { value: number; tag: ReadingTag; takenAt?: string; note?: string }): Promise<GlucoseReading> {
    await delay()
    const reading: GlucoseReading = {
      id: nextId('g'),
      value: input.value,
      tag: input.tag,
      takenAt: input.takenAt ?? new Date().toISOString(),
      note: input.note,
    }
    mockStore.readings.unshift(reading)
    return reading
  },

  async remove(id: string): Promise<void> {
    await delay()
    mockStore.readings = mockStore.readings.filter((r) => r.id !== id)
  },
}
