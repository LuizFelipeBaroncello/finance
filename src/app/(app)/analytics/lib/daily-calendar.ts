import type { Transaction } from "../types"

export type CalendarMode = "out" | "both"

export type DayCell = {
  /** ISO date (YYYY-MM-DD) */
  date: string
  day: number
  saidas: number
  entradas: number
  saldo: number
  count: number
  /** false for days that fall outside the selected period */
  inRange: boolean
}

export type MonthBucket = {
  /** YYYY-MM */
  key: string
  year: number
  month: number
  label: string
  /** Every day of the calendar month, including out-of-range ones */
  days: DayCell[]
  /** Blank slots before the 1st so the grid starts on the right weekday */
  leadingBlanks: number
  totalSaidas: number
  totalEntradas: number
  totalSaldo: number
  maxSaida: number
  maxEntrada: number
  maxAbsSaldo: number
  diasComSaida: number
  diasSemSaida: number
  diasComMovimento: number
  /** Day with the biggest outflow, null when the month has none */
  maiorSaida: DayCell | null
  maiorEntrada: DayCell | null
}

const MONTH_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

export const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

/** Weekday (0 = Sunday) of a YYYY-MM-DD string, parsed as a local date. */
function weekdayOf(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay()
}

function parseIso(date: string): [number, number, number] {
  const [y, m, d] = date.substring(0, 10).split("-").map(Number)
  return [y, m, d]
}

/** Every YYYY-MM key touched by the period, in chronological order. */
export function monthsInRange(startDate: string, endDate: string): string[] {
  const [sy, sm] = parseIso(startDate)
  const [ey, em] = parseIso(endDate)
  const keys: string[] = []
  let y = sy
  let m = sm
  // Guard against inverted ranges, which would otherwise loop forever.
  if (ey < sy || (ey === sy && em < sm)) return [`${sy}-${pad(sm)}`]
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${pad(m)}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return keys
}

/**
 * Builds one calendar bucket per month of the period. Transfers are ignored so
 * the totals line up with the rest of the analytics page.
 */
export function buildCalendar(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): MonthBucket[] {
  const byDate = new Map<string, { saidas: number; entradas: number; count: number }>()

  for (const t of transactions) {
    if (t.type === "transfer") continue
    const date = t.date.substring(0, 10)
    let entry = byDate.get(date)
    if (!entry) {
      entry = { saidas: 0, entradas: 0, count: 0 }
      byDate.set(date, entry)
    }
    const amount = Math.abs(t.amount)
    if (t.type === "debit") entry.saidas += amount
    else entry.entradas += amount
    entry.count += 1
  }

  const start = startDate.substring(0, 10)
  const end = endDate.substring(0, 10)

  return monthsInRange(startDate, endDate).map((key) => {
    const [year, month] = key.split("-").map(Number)
    const total = daysInMonth(year, month)

    const days: DayCell[] = []
    for (let day = 1; day <= total; day++) {
      const date = `${key}-${pad(day)}`
      const agg = byDate.get(date)
      const saidas = agg?.saidas ?? 0
      const entradas = agg?.entradas ?? 0
      days.push({
        date,
        day,
        saidas,
        entradas,
        saldo: entradas - saidas,
        count: agg?.count ?? 0,
        inRange: date >= start && date <= end,
      })
    }

    const inRangeDays = days.filter((d) => d.inRange)
    const totalSaidas = inRangeDays.reduce((s, d) => s + d.saidas, 0)
    const totalEntradas = inRangeDays.reduce((s, d) => s + d.entradas, 0)
    const diasComSaida = inRangeDays.filter((d) => d.saidas > 0).length
    const diasComMovimento = inRangeDays.filter((d) => d.count > 0).length

    let maiorSaida: DayCell | null = null
    let maiorEntrada: DayCell | null = null
    for (const d of inRangeDays) {
      if (d.saidas > 0 && (!maiorSaida || d.saidas > maiorSaida.saidas)) maiorSaida = d
      if (d.entradas > 0 && (!maiorEntrada || d.entradas > maiorEntrada.entradas)) {
        maiorEntrada = d
      }
    }

    return {
      key,
      year,
      month,
      label: `${MONTH_LABELS[month - 1]} ${year}`,
      days,
      leadingBlanks: weekdayOf(year, month, 1),
      totalSaidas,
      totalEntradas,
      totalSaldo: totalEntradas - totalSaidas,
      maxSaida: inRangeDays.reduce((max, d) => Math.max(max, d.saidas), 0),
      maxEntrada: inRangeDays.reduce((max, d) => Math.max(max, d.entradas), 0),
      maxAbsSaldo: inRangeDays.reduce((max, d) => Math.max(max, Math.abs(d.saldo)), 0),
      diasComSaida,
      diasSemSaida: inRangeDays.length - diasComSaida,
      diasComMovimento,
      maiorSaida,
      maiorEntrada,
    }
  })
}

/** Short day label used inside the cells, e.g. 09/07. */
export function formatDayShort(date: string) {
  const [, m, d] = parseIso(date)
  return `${pad(d)}/${pad(m)}`
}

/** Full day label used in the detail dialog, e.g. quinta, 09 de julho de 2026. */
export function formatDayLong(date: string) {
  const [y, m, d] = parseIso(date)
  const weekday = new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long" })
  return `${weekday}, ${pad(d)} de ${MONTH_LABELS[m - 1]} de ${y}`
}
