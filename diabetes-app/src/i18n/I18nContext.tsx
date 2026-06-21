import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { STRINGS, isRTL, type Lang } from './strings'

interface I18nValue {
  lang: Lang
  dir: 'rtl' | 'ltr'
  setLang: (l: Lang) => void
  toggleLang: () => void
  /** Translate by key, with optional {token} interpolation. */
  t: (key: string, params?: Record<string, string | number>) => string
  /** Format a number using the active locale's digits. */
  num: (n: number) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] != null ? String(params[k]) : `{${k}}`,
  )
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Arabic-first: default language is Arabic.
  const [lang, setLang] = useState<Lang>('ar')

  // Keep the document direction + lang in sync so layout is RTL-native.
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr'
  }, [lang])

  const value = useMemo<I18nValue>(() => {
    const dict = STRINGS[lang]
    return {
      lang,
      dir: isRTL(lang) ? 'rtl' : 'ltr',
      setLang,
      toggleLang: () => setLang((l) => (l === 'ar' ? 'en' : 'ar')),
      t: (key, params) => interpolate(dict[key] ?? key, params),
      num: (n) =>
        new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
          maximumFractionDigits: 1,
        }).format(n),
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
