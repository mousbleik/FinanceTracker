import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotProps,
} from 'recharts'
import { useI18n } from '../i18n/I18nContext'
import type { GlucoseReading } from '../lib/types'
import { STATUS_STYLES, classifyReading } from '../lib/glucose'
import { formatDate, formatTime, withinDays } from '../lib/datetime'

interface Props {
  readings: GlucoseReading[]
  days: 7 | 30
}

interface Point {
  ts: number
  value: number
  color: string
  label: string
  time: string
}

export function TrendChart({ readings, days }: Props) {
  const { lang, dir } = useI18n()

  const data: Point[] = readings
    .filter((r) => withinDays(r.takenAt, days))
    .slice()
    .sort((a, b) => +new Date(a.takenAt) - +new Date(b.takenAt))
    .map((r) => ({
      ts: new Date(r.takenAt).getTime(),
      value: r.value,
      color: STATUS_STYLES[classifyReading(r.value, r.tag)].chart,
      label: formatDate(r.takenAt, lang),
      time: formatTime(r.takenAt, lang),
    }))

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-primary-700/40 text-sm">
        —
      </div>
    )
  }

  return (
    <div className="h-52 -mx-1" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
          <XAxis
            dataKey="label"
            reversed={dir === 'rtl'}
            tick={{ fontSize: 11, fill: '#6b8584' }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            orientation={dir === 'rtl' ? 'right' : 'left'}
            tick={{ fontSize: 11, fill: '#6b8584' }}
            tickLine={false}
            axisLine={false}
            width={42}
            domain={['dataMin - 20', 'dataMax + 20']}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#cdbfa9', strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#157e7d"
            strokeWidth={2.5}
            dot={<ColoredDot />}
            activeDot={<ColoredDot active />}
            isAnimationActive
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ColoredDot(props: DotProps & { active?: boolean; payload?: Point }) {
  const { cx, cy, payload, active } = props
  if (cx == null || cy == null || !payload) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={active ? 6 : 4}
      fill={payload.color}
      stroke="#faf8f5"
      strokeWidth={2}
    />
  )
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const { num } = useI18n()
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl bg-white px-3 py-2 shadow-lift text-center">
      <div className="tnum text-lg font-bold" style={{ color: p.color }}>
        {num(p.value)}
      </div>
      <div className="text-[11px] text-primary-700/60">
        {p.label} · {p.time}
      </div>
    </div>
  )
}
