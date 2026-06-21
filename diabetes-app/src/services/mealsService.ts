import type { MealEntry } from '../lib/types'
import { mockStore, nextId } from '../data/mockData'

// ---------------------------------------------------------------------------
// mealsService — minimal meal logging. We only record that a meal happened and
// roughly what, so it can sit on the timeline next to glucose readings.
// ---------------------------------------------------------------------------

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))

export const mealsService = {
  async list(): Promise<MealEntry[]> {
    await delay()
    return [...mockStore.meals].sort((a, b) => +new Date(b.eatenAt) - +new Date(a.eatenAt))
  },

  async add(input: { label: string; foodKey: string; eatenAt?: string }): Promise<MealEntry> {
    await delay()
    const meal: MealEntry = {
      id: nextId('meal'),
      label: input.label,
      foodKey: input.foodKey,
      eatenAt: input.eatenAt ?? new Date().toISOString(),
    }
    mockStore.meals.unshift(meal)
    return meal
  },

  async remove(id: string): Promise<void> {
    await delay()
    mockStore.meals = mockStore.meals.filter((m) => m.id !== id)
  },
}
