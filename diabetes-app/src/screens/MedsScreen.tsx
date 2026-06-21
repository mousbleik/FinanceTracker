import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import type { AppData } from '../hooks/useAppData'
import { buildTodayDoses } from '../lib/meds'
import { CheckIcon, ClockIcon, PlusIcon, TrashIcon } from '../components/icons'

export function MedsScreen({ data }: { data: AppData }) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)

  const doses = useMemo(
    () => buildTodayDoses(data.meds, data.medLogs),
    [data.meds, data.medLogs],
  )
  const allDone = doses.length > 0 && doses.every((d) => d.taken)

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-bold text-primary-900">{t('meds.title')}</h1>

      {/* Today's doses */}
      <section className="rounded-2xl bg-white p-4 shadow-card">
        <h2 className="font-semibold text-primary-900 mb-3">{t('meds.today')}</h2>
        {allDone && (
          <div className="rounded-xl bg-state-inrangebg text-state-inrange text-center py-3 font-medium mb-2">
            {t('meds.allDone')}
          </div>
        )}
        {doses.length === 0 ? (
          <p className="text-primary-700/50 text-sm py-4 text-center">{t('meds.empty')}</p>
        ) : (
          <div className="space-y-2">
            {doses.map((d) => (
              <div
                key={`${d.med.id}-${d.time}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                  d.due ? 'bg-state-highbg' : 'bg-sand-50'
                }`}
              >
                <button
                  onClick={() => data.toggleDose(d.med.id, d.time, d.taken)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all active:scale-90 ${
                    d.taken
                      ? 'bg-state-inrange border-state-inrange text-white'
                      : 'border-sand-300 text-transparent bg-white'
                  }`}
                  aria-label={t('meds.markTaken')}
                >
                  <CheckIcon className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <p className={`font-medium ${d.taken ? 'text-primary-700/40 line-through' : 'text-primary-900'}`}>
                    {d.med.name}
                  </p>
                  <p className="text-xs text-primary-700/50">{d.med.dose}</p>
                </div>
                <div className="text-left">
                  <div className={`flex items-center gap-1 text-sm ${d.due ? 'text-state-high font-medium' : 'text-primary-700/50'}`}>
                    <ClockIcon className="w-4 h-4" />
                    <span className="tnum">{d.time}</span>
                  </div>
                  <span className="text-[11px] text-primary-700/40">
                    {d.taken ? t('meds.taken') : d.due ? t('meds.due') : t('meds.upcoming')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Medication list + add */}
      <section className="rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-primary-900">{t('meds.yourMeds')}</h2>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-medium active:scale-95 transition-transform"
          >
            <PlusIcon className="w-4 h-4" />
            {t('meds.add')}
          </button>
        </div>
        {data.meds.length === 0 ? (
          <p className="text-primary-700/50 text-sm py-4 text-center">{t('meds.empty')}</p>
        ) : (
          <div className="space-y-2">
            {data.meds.map((med) => (
              <div key={med.id} className="flex items-center gap-3 rounded-xl bg-sand-50 px-3 py-3">
                <div className="flex-1">
                  <p className="font-medium text-primary-900">{med.name}</p>
                  <p className="text-xs text-primary-700/50">
                    {med.dose} · {med.times.join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => data.removeMed(med.id)}
                  className="p-2 rounded-full text-primary-700/40 active:bg-sand-200 active:text-state-low"
                  aria-label={t('common.delete')}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {adding && <AddMedSheet data={data} onClose={() => setAdding(false)} />}
    </div>
  )
}

function AddMedSheet({ data, onClose }: { data: AppData; onClose: () => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [busy, setBusy] = useState(false)

  const canSave = name.trim() !== '' && times.length > 0

  const save = async () => {
    if (!canSave || busy) return
    setBusy(true)
    await data.addMed({ name: name.trim(), dose: dose.trim(), times })
    setBusy(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-primary-900/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-sand-50 rounded-t-3xl px-5 pt-5 pb-8 shadow-lift animate-slide-up">
        <h2 className="text-lg font-semibold text-primary-900 mb-4">{t('meds.add')}</h2>

        <label className="block text-sm font-medium text-primary-800 mb-1">{t('meds.name')}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('meds.namePlaceholder')}
          className="w-full mb-4 rounded-xl bg-white px-4 py-3 text-primary-900 shadow-card outline-none focus:ring-2 ring-primary-300"
        />

        <label className="block text-sm font-medium text-primary-800 mb-1">
          {t('meds.dose')} <span className="text-primary-700/40 font-normal">({t('common.optional')})</span>
        </label>
        <input
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          placeholder={t('meds.dosePlaceholder')}
          className="w-full mb-4 rounded-xl bg-white px-4 py-3 text-primary-900 shadow-card outline-none focus:ring-2 ring-primary-300"
        />

        <label className="block text-sm font-medium text-primary-800 mb-2">{t('meds.times')}</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {times.map((time, i) => (
            <input
              key={i}
              type="time"
              value={time}
              onChange={(e) => {
                const next = [...times]
                next[i] = e.target.value
                setTimes(next)
              }}
              className="tnum rounded-xl bg-white px-3 py-2 text-primary-900 shadow-card outline-none focus:ring-2 ring-primary-300"
              dir="ltr"
            />
          ))}
          <button
            onClick={() => setTimes([...times, '20:00'])}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            {t('meds.addTime')}
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-sand-200 text-primary-800 font-semibold active:scale-[0.99] transition-transform">
            {t('common.cancel')}
          </button>
          <button
            onClick={save}
            disabled={!canSave || busy}
            className={`flex-1 py-3.5 rounded-2xl font-semibold transition-all ${
              canSave && !busy ? 'bg-primary-600 text-white shadow-soft active:scale-[0.99]' : 'bg-sand-200 text-primary-700/40'
            }`}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
