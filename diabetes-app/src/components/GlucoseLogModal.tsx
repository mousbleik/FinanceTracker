import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import type { GlucoseReading, ReadingTag } from '../lib/types'
import {
  MAX_GLUCOSE,
  MIN_GLUCOSE,
  STATUS_STYLES,
  averageOf,
  classifyReading,
  compareToAverage,
  suggestTagForTime,
} from '../lib/glucose'
import { READING_TAGS } from '../data/mockData'
import { withinDays } from '../lib/datetime'
import { BackspaceIcon, CheckIcon, CloseIcon } from './icons'

interface Props {
  readings: GlucoseReading[]
  onSave: (input: { value: number; tag: ReadingTag }) => Promise<GlucoseReading>
  onClose: () => void
}

type Phase = 'entry' | 'confirm'

export function GlucoseLogModal({ readings, onSave, onClose }: Props) {
  const { t } = useI18n()
  const [tag, setTag] = useState<ReadingTag>(() => suggestTagForTime())
  const [digits, setDigits] = useState('')
  const [phase, setPhase] = useState<Phase>('entry')
  const [saved, setSaved] = useState<GlucoseReading | null>(null)
  const [busy, setBusy] = useState(false)

  const value = digits === '' ? 0 : parseInt(digits, 10)
  const valid = value >= MIN_GLUCOSE && value <= MAX_GLUCOSE

  const press = (d: string) => {
    if (digits.length >= 3) return
    if (digits === '' && d === '0') return
    setDigits((s) => s + d)
  }
  const back = () => setDigits((s) => s.slice(0, -1))

  const handleSave = async () => {
    if (!valid || busy) return
    setBusy(true)
    const r = await onSave({ value, tag })
    setSaved(r)
    setPhase('confirm')
    setBusy(false)
  }

  if (phase === 'confirm' && saved) {
    return <SaveConfirmation reading={saved} readings={readings} onClose={onClose} />
  }

  return (
    <Sheet onClose={onClose} title={t('log.title')}>
      {/* Tag chips — default guessed by time of day, one tap to change */}
      <p className="text-center text-sm text-primary-700/70 mb-3">{t('log.tagQuestion')}</p>
      <div className="flex gap-2 justify-center mb-6">
        {READING_TAGS.map((rt) => (
          <button
            key={rt}
            onClick={() => setTag(rt)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tag === rt
                ? 'bg-primary-600 text-white shadow-soft'
                : 'bg-sand-100 text-primary-800 active:bg-sand-200'
            }`}
          >
            {t(`tag.${rt}`)}
          </button>
        ))}
      </div>

      {/* Big value display */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-2">
          <span
            className={`tnum text-7xl font-bold tracking-tight ${
              digits === '' ? 'text-sand-300' : 'text-primary-900'
            }`}
          >
            {digits === '' ? '—' : digits}
          </span>
          <span className="text-lg text-primary-700/60 font-medium">{t('common.unit')}</span>
        </div>
        {/* Live status hint as they type (orientation only) */}
        {valid ? (
          <LiveHint value={value} tag={tag} />
        ) : (
          <span className="text-sm text-transparent select-none">.</span>
        )}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <PadKey key={d} onClick={() => press(d)}>
            {d}
          </PadKey>
        ))}
        <PadKey onClick={back} aria-label="backspace">
          <BackspaceIcon className="w-7 h-7 mx-auto" />
        </PadKey>
        <PadKey onClick={() => press('0')}>0</PadKey>
        <PadKey
          onClick={handleSave}
          disabled={!valid || busy}
          className={`!bg-primary-600 !text-white ${
            !valid || busy ? 'opacity-40' : 'active:!bg-primary-700 shadow-soft'
          }`}
          aria-label={t('log.saveReading')}
        >
          <CheckIcon className="w-8 h-8 mx-auto" />
        </PadKey>
      </div>

      <button
        onClick={handleSave}
        disabled={!valid || busy}
        className={`w-full py-4 rounded-2xl text-lg font-semibold transition-all ${
          valid && !busy
            ? 'bg-primary-600 text-white shadow-soft active:bg-primary-700 active:scale-[0.99]'
            : 'bg-sand-200 text-primary-700/40'
        }`}
      >
        {t('log.saveReading')}
      </button>
    </Sheet>
  )
}

function LiveHint({ value, tag }: { value: number; tag: ReadingTag }) {
  const { t } = useI18n()
  const status = classifyReading(value, tag)
  const s = STATUS_STYLES[status]
  return (
    <div className="mt-2 inline-flex items-center gap-2 animate-fade-in">
      <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
      <span className={`text-sm font-medium ${s.text}`}>{t(`status.${status}`)}</span>
    </div>
  )
}

function PadKey({
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`tnum h-16 rounded-2xl bg-sand-50 text-3xl font-semibold text-primary-900 shadow-card transition-all active:scale-95 active:bg-sand-100 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// The instant-payoff moment. The single most important interaction: a calm,
// satisfying confirmation that reflects the reading straight back.
// ---------------------------------------------------------------------------
function SaveConfirmation({
  reading,
  readings,
  onClose,
}: {
  reading: GlucoseReading
  readings: GlucoseReading[]
  onClose: () => void
}) {
  const { t, num } = useI18n()
  const status = classifyReading(reading.value, reading.tag)
  const s = STATUS_STYLES[status]

  // Compare against the recent (7-day) average of the SAME context, excluding
  // this just-saved reading. Orientation only — never advice.
  const recentAvg = useMemo(() => {
    const peers = readings.filter(
      (r) => r.id !== reading.id && r.tag === reading.tag && withinDays(r.takenAt, 7),
    )
    return averageOf(peers)
  }, [readings, reading])

  const cmp = compareToAverage(reading.value, recentAvg)

  return (
    <Sheet onClose={onClose} title="">
      <div className="flex flex-col items-center text-center pt-2 pb-4">
        {/* Animated ring + check around the value */}
        <div className="relative mb-6 animate-pop-in">
          <svg width="180" height="180" viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5"
              className={s.bg} />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={s.chart}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="283"
              className="animate-ring-draw"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`tnum text-6xl font-bold ${s.text}`}>{num(reading.value)}</span>
            <span className="text-sm text-primary-700/50 font-medium">{t('common.unit')}</span>
          </div>
        </div>

        {/* Non-clinical status */}
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${s.bg} mb-3`}>
          <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
          <span className={`font-semibold ${s.text}`}>{t(`status.${status}`)}</span>
          <span className="text-primary-800/50 text-sm">· {t(`tag.${reading.tag}`)}</span>
        </div>

        {/* Comparison to recent average */}
        <p className="text-primary-800/80 text-[15px] leading-relaxed max-w-[18rem]">
          {cmp == null
            ? t('compare.noData')
            : t(`compare.${cmp}`)}
        </p>

        {/* Gentle disclaimer — orientation, not advice */}
        <p className="text-xs text-primary-700/40 mt-4 max-w-[16rem]">
          {t('feedback.disclaimer')}
        </p>

        <button
          onClick={onClose}
          className="mt-8 w-full py-4 rounded-2xl bg-primary-600 text-white text-lg font-semibold shadow-soft active:bg-primary-700 active:scale-[0.99] transition-all"
        >
          {t('common.done')}
        </button>
      </div>
    </Sheet>
  )
}

// Shared bottom sheet shell with backdrop + slide-up animation.
function Sheet({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode
  onClose: () => void
  title: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-primary-900/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-sand-50 rounded-t-3xl px-5 pt-4 pb-8 shadow-lift animate-slide-up max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold text-primary-900">{title}</span>
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-full text-primary-700/60 active:bg-sand-200"
            aria-label="close"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
