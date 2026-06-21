import { useCallback, useEffect, useState } from 'react'
import { glucoseService } from '../services/glucoseService'
import { medsService } from '../services/medsService'
import { mealsService } from '../services/mealsService'
import type {
  GlucoseReading,
  Medication,
  MedicationLog,
  MealEntry,
  ReadingTag,
} from '../lib/types'

// Single hook that owns app data and exposes promise-backed actions. Screens
// consume this so the UI never touches services directly more than needed.
export function useAppData() {
  const [readings, setReadings] = useState<GlucoseReading[]>([])
  const [meds, setMeds] = useState<Medication[]>([])
  const [medLogs, setMedLogs] = useState<MedicationLog[]>([])
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [r, m, l, f] = await Promise.all([
      glucoseService.list(),
      medsService.list(),
      medsService.todaysLogs(),
      mealsService.list(),
    ])
    setReadings(r)
    setMeds(m)
    setMedLogs(l)
    setMeals(f)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // --- Glucose ---
  const addReading = useCallback(async (input: { value: number; tag: ReadingTag }) => {
    const created = await glucoseService.add(input)
    setReadings(await glucoseService.list())
    return created
  }, [])

  // --- Meds ---
  const addMed = useCallback(async (input: { name: string; dose: string; times: string[] }) => {
    await medsService.add(input)
    setMeds(await medsService.list())
  }, [])

  const removeMed = useCallback(async (id: string) => {
    await medsService.remove(id)
    const [m, l] = await Promise.all([medsService.list(), medsService.todaysLogs()])
    setMeds(m)
    setMedLogs(l)
  }, [])

  const toggleDose = useCallback(
    async (medId: string, time: string, taken: boolean) => {
      if (taken) await medsService.unmarkTaken(medId, time)
      else await medsService.markTaken(medId, time)
      setMedLogs(await medsService.todaysLogs())
    },
    [],
  )

  // --- Meals ---
  const addMeal = useCallback(async (input: { label: string; foodKey: string }) => {
    await mealsService.add(input)
    setMeals(await mealsService.list())
  }, [])

  const removeMeal = useCallback(async (id: string) => {
    await mealsService.remove(id)
    setMeals(await mealsService.list())
  }, [])

  return {
    loading,
    readings,
    meds,
    medLogs,
    meals,
    refresh,
    addReading,
    addMed,
    removeMed,
    toggleDose,
    addMeal,
    removeMeal,
  }
}

export type AppData = ReturnType<typeof useAppData>
