import { useI18n } from '../i18n/I18nContext'
import { HomeIcon, MealIcon, PillIcon, PlusIcon, ReportIcon } from './icons'

export type Tab = 'home' | 'meds' | 'meals' | 'export'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
  onLog: () => void
}

const TABS: { id: Tab; icon: typeof HomeIcon; labelKey: string }[] = [
  { id: 'home', icon: HomeIcon, labelKey: 'nav.home' },
  { id: 'meds', icon: PillIcon, labelKey: 'nav.meds' },
  { id: 'meals', icon: MealIcon, labelKey: 'nav.meals' },
  { id: 'export', icon: ReportIcon, labelKey: 'nav.export' },
]

export function BottomNav({ active, onChange, onLog }: Props) {
  const { t } = useI18n()

  // Split tabs so the central "+" log button sits in the middle, thumb-reachable.
  const left = TABS.slice(0, 2)
  const right = TABS.slice(2)

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
      <div className="relative w-full max-w-md pointer-events-auto">
        <div className="mx-3 mb-3 rounded-3xl bg-white/95 backdrop-blur shadow-lift border border-sand-200/60 px-2 py-2 flex items-center justify-between">
          {left.map((tab) => (
            <NavButton key={tab.id} tab={tab} active={active === tab.id} onClick={() => onChange(tab.id)} t={t} />
          ))}

          {/* Central primary log action */}
          <button
            onClick={onLog}
            aria-label={t('log.title')}
            className="relative -mt-8 mx-1 flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-lift active:scale-95 active:bg-primary-700 transition-all"
          >
            <PlusIcon className="w-8 h-8" />
          </button>

          {right.map((tab) => (
            <NavButton key={tab.id} tab={tab} active={active === tab.id} onClick={() => onChange(tab.id)} t={t} />
          ))}
        </div>
      </div>
    </nav>
  )
}

function NavButton({
  tab,
  active,
  onClick,
  t,
}: {
  tab: { id: Tab; icon: typeof HomeIcon; labelKey: string }
  active: boolean
  onClick: () => void
  t: (k: string) => string
}) {
  const Icon = tab.icon
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 rounded-2xl transition-colors ${
        active ? 'text-primary-600' : 'text-primary-900/35'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[11px] font-medium">{t(tab.labelKey)}</span>
    </button>
  )
}
