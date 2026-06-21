import type { Lang } from '../i18n/strings'

// Locale-aware date/time helpers used across the app.

export function locale(lang: Lang): string {
  return lang === 'ar' ? 'ar-SA' : 'en-US'
}

export function formatTime(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleTimeString(locale(lang), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(locale(lang), {
    day: 'numeric',
    month: 'short',
  })
}

export function formatTimeOfDay(hhmm: string, lang: Lang): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return formatTime(d.toISOString(), lang)
}

/** Returns an i18n key + params describing how long ago `iso` was. */
export function relativeAgo(iso: string): { key: string; params?: Record<string, number> } {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return { key: 'home.ago.justNow' }
  if (mins < 60) return { key: 'home.ago.minutes', params: { n: mins } }
  const hours = Math.floor(mins / 60)
  if (hours < 24) return { key: 'home.ago.hours', params: { n: hours } }
  const days = Math.floor(hours / 24)
  return { key: 'home.ago.days', params: { n: days } }
}

export function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString()
}

export function withinDays(iso: string, days: number): boolean {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return new Date(iso).getTime() >= cutoff
}
