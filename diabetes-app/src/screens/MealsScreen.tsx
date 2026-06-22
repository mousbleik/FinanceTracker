import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import type { AppData } from '../hooks/useAppData'
import { CURATED_FOODS } from '../data/mockData'
import { formatTime, isToday } from '../lib/datetime'
import { PlusIcon, TrashIcon } from '../components/icons'

export function MealsScreen({ data }: { data: AppData }) {
  const { t, lang } = useI18n()
  const [adding, setAdding] = useState(false)

  const todays = data.meals.filter((m) => isToday(m.eatenAt))

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-bold text-primary-900">{t('meals.title')}</h1>

      <button
        onClick={() => setAdding(true)}
        className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary-600 text-white text-lg font-semibold shadow-soft active:scale-[0.99] active:bg-primary-700 transition-all"
      >
        <PlusIcon className="w-6 h-6" />
        {t('meals.add')}
      </button>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="font-semibold text-primary-900 mb-3">{t('meals.today')}</h2>
        {todays.length === 0 ? (
          <p className="text-primary-700/50 text-sm py-4 text-center">{t('meals.empty')}</p>
        ) : (
          <div className="space-y-2">
            {todays.map((meal) => {
              const food = CURATED_FOODS.find((f) => f.key === meal.foodKey)
              return (
                <div key={meal.id} className="flex items-center gap-3 rounded-xl bg-sand-50 px-3 py-3">
                  <span className="text-2xl">{food?.emoji ?? '🍽️'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-primary-900">
                      {food ? t(`food.${food.key}`) : meal.label}
                    </p>
                    <p className="tnum text-xs text-primary-700/50">{formatTime(meal.eatenAt, lang)}</p>
                  </div>
                  <button
                    onClick={() => data.removeMeal(meal.id)}
                    className="p-2 rounded-full text-primary-700/40 active:bg-sand-200 active:text-state-low"
                    aria-label={t('common.delete')}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {adding && <AddMealSheet data={data} onClose={() => setAdding(false)} />}
    </div>
  )
}

function AddMealSheet({ data, onClose }: { data: AppData; onClose: () => void }) {
  const { t } = useI18n()
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)

  const pick = async (foodKey: string, label: string) => {
    if (busy) return
    setBusy(true)
    await data.addMeal({ foodKey, label })
    setBusy(false)
    onClose()
  }

  const saveCustom = async () => {
    if (custom.trim() === '' || busy) return
    setBusy(true)
    await data.addMeal({ foodKey: 'custom', label: custom.trim() })
    setBusy(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-primary-900/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-sand-50 rounded-t-3xl px-5 pt-5 pb-8 shadow-lift animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-primary-900 mb-1">{t('meals.add')}</h2>
        <p className="text-sm text-primary-700/60 mb-4">{t('meals.pick')}</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {CURATED_FOODS.map((food) => (
            <button
              key={food.key}
              onClick={() => pick(food.key, t(`food.${food.key}`))}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white py-4 shadow-card active:scale-95 transition-transform"
            >
              <span className="text-3xl">{food.emoji}</span>
              <span className="text-sm font-medium text-primary-900">{t(`food.${food.key}`)}</span>
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium text-primary-800 mb-2">{t('meals.custom')}</label>
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveCustom()}
            placeholder={t('meals.customPlaceholder')}
            className="flex-1 rounded-xl bg-white px-4 py-3 text-primary-900 shadow-card outline-none focus:ring-2 ring-primary-300"
          />
          <button
            onClick={saveCustom}
            disabled={custom.trim() === '' || busy}
            className={`px-5 rounded-xl font-semibold transition-all ${
              custom.trim() !== '' && !busy ? 'bg-primary-600 text-white active:scale-95' : 'bg-sand-200 text-primary-700/40'
            }`}
          >
            {t('common.add')}
          </button>
        </div>
      </div>
    </div>
  )
}
