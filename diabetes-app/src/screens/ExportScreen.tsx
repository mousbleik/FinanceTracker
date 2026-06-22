import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import type { AppData } from '../hooks/useAppData'
import type { GlucoseReading, ReadingTag } from '../lib/types'
import { GLUCOSE_UNIT, STATUS_STYLES, averageOf, classifyReading } from '../lib/glucose'
import { formatDate, formatTime, withinDays } from '../lib/datetime'
import { READING_TAGS } from '../data/mockData'

export function ExportScreen({ data }: { data: AppData }) {
  const { t } = useI18n()
  const [showReport, setShowReport] = useState(false)

  if (showReport) {
    return <Report data={data} onBack={() => setShowReport(false)} />
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-bold text-primary-900">{t('export.title')}</h1>
      <p className="text-primary-700/70">{t('export.subtitle')}</p>

      <div className="rounded-2xl bg-white p-6 shadow-card text-center">
        <div className="text-5xl mb-3">📄</div>
        <p className="text-primary-800 mb-6 leading-relaxed">{t('export.subtitle')}</p>
        <button
          onClick={() => setShowReport(true)}
          className="w-full py-4 rounded-2xl bg-primary-600 text-white text-lg font-semibold shadow-soft active:scale-[0.99] active:bg-primary-700 transition-all"
        >
          {t('export.generate')}
        </button>
      </div>
    </div>
  )
}

function Report({ data, onBack }: { data: AppData; onBack: () => void }) {
  const { t, num, lang } = useI18n()

  const last30 = useMemo(
    () =>
      data.readings
        .filter((r) => withinDays(r.takenAt, 30))
        .sort((a, b) => +new Date(b.takenAt) - +new Date(a.takenAt)),
    [data.readings],
  )

  const overallAvg = averageOf(last30)
  const inRangeCount = last30.filter(
    (r) => classifyReading(r.value, r.tag) === 'inRange',
  ).length
  const inRangePct = last30.length > 0 ? Math.round((inRangeCount / last30.length) * 100) : 0

  const byTag: { tag: ReadingTag; avg: number | null; count: number }[] = READING_TAGS.map(
    (tag) => {
      const subset = last30.filter((r) => r.tag === tag)
      return { tag, avg: averageOf(subset), count: subset.length }
    },
  )

  const today = new Date().toISOString()
  const periodStart = last30.length
    ? last30[last30.length - 1].takenAt
    : today

  return (
    <div className="min-h-screen bg-white">
      {/* Action bar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between bg-sand-50 px-4 py-3 shadow-card">
        <button onClick={onBack} className="px-4 py-2 rounded-full bg-white text-primary-700 font-medium shadow-card active:scale-95 transition-transform">
          {t('export.back')}
        </button>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-full bg-primary-600 text-white font-medium shadow-soft active:scale-95 transition-transform"
        >
          {t('export.print')}
        </button>
      </div>

      {/* Printable report */}
      <div className="mx-auto max-w-2xl px-6 py-8 text-primary-900">
        <header className="border-b-2 border-primary-200 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-700">{t('app.name')}</h1>
              <p className="text-primary-700/60 text-sm">{t('export.patientReport')}</p>
            </div>
            <div className="text-left text-sm text-primary-700/60">
              <p>
                {t('export.generatedOn')}: <span className="tnum">{formatDate(today, lang)}</span>
              </p>
              <p>
                {t('export.period')}:{' '}
                <span className="tnum">
                  {formatDate(periodStart, lang)} — {formatDate(today, lang)}
                </span>
              </p>
            </div>
          </div>
        </header>

        {last30.length === 0 ? (
          <p className="text-center text-primary-700/50 py-12">{t('export.noData')}</p>
        ) : (
          <>
            {/* Summary cards */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">{t('export.summary')}</h2>
              <div className="grid grid-cols-3 gap-3">
                <Stat label={t('export.totalReadings')} value={num(last30.length)} />
                <Stat label={t('export.average')} value={overallAvg != null ? `${num(overallAvg)} ${GLUCOSE_UNIT}` : '—'} />
                <Stat label={t('export.inRangePct')} value={`${num(inRangePct)}%`} accent />
              </div>
            </section>

            {/* By tag */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">{t('export.byTag')}</h2>
              <div className="grid grid-cols-3 gap-3">
                {byTag.map((b) => (
                  <div key={b.tag} className="rounded-xl border border-primary-100 p-3">
                    <p className="text-sm text-primary-700/60">{t(`tag.${b.tag}`)}</p>
                    <p className="tnum text-xl font-bold">
                      {b.avg != null ? num(b.avg) : '—'}
                      <span className="text-xs font-normal text-primary-700/40"> ({num(b.count)})</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Readings log table */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">{t('export.readingsLog')}</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-200 text-primary-700/60 text-right">
                    <th className="py-2 font-medium">{t('export.date')}</th>
                    <th className="py-2 font-medium">{t('export.time')}</th>
                    <th className="py-2 font-medium">{t('export.value')}</th>
                    <th className="py-2 font-medium">{t('export.context')}</th>
                    <th className="py-2 font-medium">{t('export.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {last30.map((r) => (
                    <ReadingRow key={r.id} reading={r} />
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        <footer className="border-t border-primary-100 pt-4 mt-8">
          <p className="text-xs text-primary-700/50 leading-relaxed">{t('export.disclaimer')}</p>
        </footer>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? 'border-state-inrange/40 bg-state-inrangebg' : 'border-primary-100'}`}>
      <p className="text-sm text-primary-700/60">{label}</p>
      <p className={`tnum text-xl font-bold ${accent ? 'text-state-inrange' : ''}`}>{value}</p>
    </div>
  )
}

function ReadingRow({ reading }: { reading: GlucoseReading }) {
  const { t, num, lang } = useI18n()
  const status = classifyReading(reading.value, reading.tag)
  const s = STATUS_STYLES[status]
  return (
    <tr className="border-b border-primary-50">
      <td className="py-2 tnum">{formatDate(reading.takenAt, lang)}</td>
      <td className="py-2 tnum">{formatTime(reading.takenAt, lang)}</td>
      <td className="py-2 tnum font-semibold">{num(reading.value)}</td>
      <td className="py-2 text-primary-700/70">{t(`tag.${reading.tag}`)}</td>
      <td className="py-2">
        <span className={`inline-flex items-center gap-1.5 ${s.text}`}>
          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
          {t(`status.${status}`)}
        </span>
      </td>
    </tr>
  )
}
