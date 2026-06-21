import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import type { AppData } from '../hooks/useAppData'
import { STATUS_STYLES, averageOf, classifyReading } from '../lib/glucose'
import { buildTodayDoses } from '../lib/meds'
import { relativeAgo, withinDays } from '../lib/datetime'
import { TrendChart } from '../components/TrendChart'
import { BellIcon, CheckIcon, ClockIcon } from '../components/icons'

export function HomeScreen({ data, onLog }: { data: AppData; onLog: () => void }) {
  const { t, num, lang, toggleLang } = useI18n()
  const [range, setRange] = useState<7 | 30>(7)

  const latest = data.readings[0]
  const avg7 = useMemo(
    () => averageOf(data.readings.filter((r) => withinDays(r.takenAt, 7))),
    [data.readings],
  )
  const doses = useMemo(
    () => buildTodayDoses(data.meds, data.medLogs),
    [data.meds, data.medLogs],
  )
  const dosesDone = doses.filter((d) => d.taken).length
  const dueDoses = doses.filter((d) => d.due)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return t('home.greeting.morning')
    if (h < 18) return t('home.greeting.afternoon')
    return t('home.greeting.evening')
  })()

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">{greeting}</h1>
          <p className="text-primary-700/60 text-sm mt-0.5">{new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button
          onClick={toggleLang}
          className="px-3 py-1.5 rounded-full bg-white text-primary-700 text-sm font-medium shadow-card active:scale-95 transition-transform"
        >
          {t('lang.toggle')}
        </button>
      </header>

      {/* Simulated reminder banner */}
      {dueDoses.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-primary-50 border border-primary-200/60 px-4 py-3 animate-fade-in">
          <BellIcon className="w-5 h-5 text-primary-600 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-primary-800">{t('home.dueNow')}</span>
            <span className="text-primary-700/70"> · {dueDoses.map((d) => d.med.name).join('، ')}</span>
          </div>
        </div>
      )}

      {/* Latest reading — the hero */}
      <LatestCard latest={latest} onLog={onLog} />

      {/* Two small stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-primary-700/60 text-sm mb-1">{t('home.avg7')}</p>
          <p className="tnum text-2xl font-bold text-primary-900">
            {avg7 != null ? num(avg7) : '—'}
            <span className="text-sm font-medium text-primary-700/40 mr-1"> {t('common.unit')}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-primary-700/60 text-sm mb-1">{t('home.medsToday')}</p>
          <p className="tnum text-2xl font-bold text-primary-900">
            {doses.length > 0 ? t('home.medsDone', { done: num(dosesDone), total: num(doses.length) }) : '—'}
          </p>
        </div>
      </div>

      {/* Trend chart */}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-primary-900">{t('home.trend')}</h2>
          <div className="flex rounded-full bg-sand-100 p-0.5 text-sm">
            {([7, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  range === r ? 'bg-white text-primary-700 shadow-card' : 'text-primary-700/50'
                }`}
              >
                {t(`home.range.${r}`)}
              </button>
            ))}
          </div>
        </div>
        <TrendChart readings={data.readings} days={range} />
      </div>

      {/* Today's doses quick list */}
      {doses.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="font-semibold text-primary-900 mb-3">{t('home.medsToday')}</h2>
          <div className="space-y-2">
            {doses.map((d) => (
              <div
                key={`${d.med.id}-${d.time}`}
                className="flex items-center gap-3 rounded-xl bg-sand-50 px-3 py-2.5"
              >
                <button
                  onClick={() => data.toggleDose(d.med.id, d.time, d.taken)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all active:scale-90 ${
                    d.taken
                      ? 'bg-state-inrange border-state-inrange text-white'
                      : 'border-sand-300 text-transparent'
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
                <div className={`flex items-center gap-1 text-sm ${d.due ? 'text-state-high' : 'text-primary-700/50'}`}>
                  <ClockIcon className="w-4 h-4" />
                  <span className="tnum">{d.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LatestCard({
  latest,
  onLog,
}: {
  latest: AppData['readings'][number] | undefined
  onLog: () => void
}) {
  const { t, num } = useI18n()

  if (!latest) {
    return (
      <button
        onClick={onLog}
        className="w-full rounded-3xl bg-white p-8 shadow-card text-center active:scale-[0.99] transition-transform"
      >
        <p className="text-lg font-semibold text-primary-900">{t('home.noReadings')}</p>
        <p className="text-primary-700/60 text-sm mt-1">{t('home.noReadings.hint')}</p>
      </button>
    )
  }

  const status = classifyReading(latest.value, latest.tag)
  const s = STATUS_STYLES[status]
  const ago = relativeAgo(latest.takenAt)

  return (
    <div className={`rounded-3xl ${s.bg} p-6 shadow-card`}>
      <div className="flex items-center justify-between">
        <span className="text-primary-800/70 text-sm font-medium">{t('home.latestReading')}</span>
        <span className="text-primary-800/50 text-xs">{t(ago.key, ago.params)}</span>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <span className={`tnum text-6xl font-bold leading-none ${s.text}`}>{num(latest.value)}</span>
        <span className="text-primary-800/50 text-sm mb-1.5">{t('common.unit')}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60`}>
          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
          <span className={`text-sm font-semibold ${s.text}`}>{t(`status.${status}`)}</span>
        </span>
        <span className="text-primary-800/50 text-sm">{t(`tag.${latest.tag}`)}</span>
      </div>
    </div>
  )
}
