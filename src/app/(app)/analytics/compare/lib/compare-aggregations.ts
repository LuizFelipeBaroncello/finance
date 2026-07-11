import { MONTH_NAMES } from "../../lib/aggregations"
import type {
  CompareGranularity,
  ComparePeriodData,
  Metric,
  PeriodSpec,
  PeriodType,
} from "../types"

export const MAX_PERIODS = 10

export const GRANULARITY_BY_TYPE: Record<PeriodType, CompareGranularity[]> = {
  month: ["daily", "weekly"],
  quarter: ["daily", "weekly", "monthly"],
  year: ["weekly", "monthly"],
}

export const DEFAULT_GRANULARITY: Record<PeriodType, CompareGranularity> = {
  month: "daily",
  quarter: "weekly",
  year: "monthly",
}

export const METRIC_LABELS: Record<Metric, string> = {
  receitas: "Receitas",
  despesas: "Despesas",
  saldo: "Saldo",
  acumulado: "Saldo Acumulado",
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function fmt(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function monthLabel(year: number, month: number) {
  return `${capitalize(MONTH_NAMES[month - 1])}/${year}`
}

export function parsePeriodToken(
  token: string,
  type: PeriodType
): PeriodSpec | null {
  if (type === "month") {
    const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(token)
    if (!m) return null
    const y = Number(m[1])
    const mo = Number(m[2])
    return {
      token,
      label: monthLabel(y, mo),
      startDate: fmt(y, mo, 1),
      endDate: fmt(y, mo, lastDayOfMonth(y, mo)),
    }
  }
  if (type === "quarter") {
    const m = /^(\d{4})-Q([1-4])$/.exec(token)
    if (!m) return null
    const y = Number(m[1])
    const q = Number(m[2])
    const sm = (q - 1) * 3 + 1
    const em = sm + 2
    return {
      token,
      label: `T${q}/${y}`,
      startDate: fmt(y, sm, 1),
      endDate: fmt(y, em, lastDayOfMonth(y, em)),
    }
  }
  const m = /^\d{4}$/.exec(token)
  if (!m) return null
  const y = Number(token)
  return {
    token,
    label: token,
    startDate: fmt(y, 1, 1),
    endDate: fmt(y, 12, 31),
  }
}

export function defaultTokens(type: PeriodType, today = new Date()): string[] {
  const y = today.getFullYear()
  const mo = today.getMonth() + 1
  if (type === "month") {
    const prev = mo === 1 ? `${y - 1}-12` : `${y}-${pad(mo - 1)}`
    return [prev, `${y}-${pad(mo)}`]
  }
  if (type === "quarter") {
    const q = Math.floor((mo - 1) / 3) + 1
    const prev = q === 1 ? `${y - 1}-Q4` : `${y}-Q${q - 1}`
    return [prev, `${y}-Q${q}`]
  }
  return [String(y - 1), String(y)]
}

function parseLocalDay(dateStr: string): Date {
  const [y, m, d] = dateStr.substring(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function periodLengthDays(spec: PeriodSpec) {
  return daysBetween(parseLocalDay(spec.startDate), parseLocalDay(spec.endDate)) + 1
}

function bucketCount(
  spec: PeriodSpec,
  type: PeriodType,
  granularity: CompareGranularity
): number {
  if (granularity === "daily") return periodLengthDays(spec)
  if (granularity === "weekly") return Math.ceil(periodLengthDays(spec) / 7)
  return type === "quarter" ? 3 : 12
}

function bucketIndex(
  dateStr: string,
  spec: PeriodSpec,
  granularity: CompareGranularity
): number {
  const raw = dateStr.substring(0, 10)
  if (granularity === "monthly") {
    const [ty, tm] = raw.split("-").map(Number)
    const [sy, sm] = spec.startDate.split("-").map(Number)
    return (ty - sy) * 12 + (tm - sm)
  }
  const dayOffset = daysBetween(parseLocalDay(spec.startDate), parseLocalDay(raw))
  return granularity === "daily" ? dayOffset : Math.floor(dayOffset / 7)
}

function bucketLabel(
  i: number,
  type: PeriodType,
  granularity: CompareGranularity
): string {
  if (granularity === "daily") return `Dia ${i + 1}`
  if (granularity === "weekly") return `Sem ${i + 1}`
  return type === "year" ? capitalize(MONTH_NAMES[i]) : `Mês ${i + 1}`
}

export type PeriodSeries = {
  label: string
  receitas: number[]
  despesas: number[]
}

export type SubperiodRow = {
  label: string
  receitas: number
  despesas: number
  saldo: number
}

export function summarizeRange(
  series: PeriodSeries[],
  from: number,
  to: number
): SubperiodRow[] {
  return series.map((s) => {
    let receitas = 0
    let despesas = 0
    const end = Math.min(to, s.receitas.length - 1)
    for (let i = from; i <= end; i++) {
      receitas += s.receitas[i]
      despesas += s.despesas[i]
    }
    return { label: s.label, receitas, despesas, saldo: receitas - despesas }
  })
}

export function buildComparisonData(
  periods: ComparePeriodData[],
  type: PeriodType,
  granularity: CompareGranularity,
  metric: Metric
): {
  data: Record<string, string | number>[]
  seriesKeys: string[]
  totals: Record<string, number>
  series: PeriodSeries[]
} {
  const perPeriod = periods.map(({ spec, transactions }) => {
    const count = bucketCount(spec, type, granularity)
    const receitas = new Array<number>(count).fill(0)
    const despesas = new Array<number>(count).fill(0)

    for (const t of transactions) {
      if (t.type === "transfer") continue
      const i = bucketIndex(t.date, spec, granularity)
      if (i < 0 || i >= count) continue
      const amount = Math.abs(t.amount)
      if (t.type === "credit") receitas[i] += amount
      else despesas[i] += amount
    }

    let values: number[]
    if (metric === "receitas") values = receitas
    else if (metric === "despesas") values = despesas
    else {
      values = receitas.map((r, i) => r - despesas[i])
      if (metric === "acumulado") {
        // Soma corrente reiniciada em zero no início de cada período
        let sum = 0
        values = values.map((s) => (sum += s))
      }
    }

    const total =
      metric === "acumulado" ? (values[values.length - 1] ?? 0) : values.reduce((a, b) => a + b, 0)

    return { label: spec.label, values, total, receitas, despesas }
  })

  const maxBuckets = perPeriod.reduce((max, p) => Math.max(max, p.values.length), 0)
  const data: Record<string, string | number>[] = []
  for (let i = 0; i < maxBuckets; i++) {
    const row: Record<string, string | number> = {
      label: bucketLabel(i, type, granularity),
    }
    for (const p of perPeriod) {
      if (i < p.values.length) row[p.label] = p.values[i]
    }
    data.push(row)
  }

  const totals: Record<string, number> = {}
  for (const p of perPeriod) totals[p.label] = p.total

  return {
    data,
    seriesKeys: perPeriod.map((p) => p.label),
    totals,
    series: perPeriod.map(({ label, receitas, despesas }) => ({
      label,
      receitas,
      despesas,
    })),
  }
}
