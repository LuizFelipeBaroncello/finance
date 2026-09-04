import type { Transaction } from "../types"

export type CalendarMode = "out" | "both"
export type CalendarScale = "day" | "month" | "year"

/** One cell of any grid — a day, a month or a year. */
export type GridCell = {
  /** YYYY-MM-DD, YYYY-MM or YYYY */
  key: string
  label: string
  /** ISO date, only present on day cells (used by the detail dialog) */
  date?: string
  entradas: number
  saidas: number
  saldo: number
  count: number
  /** false for cells outside the selected period / outside the history */
  inRange: boolean
}

export type GridSummary = {
  totalEntradas: number
  totalSaidas: number
  totalSaldo: number
  maxSaida: number
  maxEntrada: number
  maxAbsSaldo: number
  /** in-range cells that had any outflow / any movement */
  comSaida: number
  comMovimento: number
  /** in-range cells, i.e. the denominator for averages */
  ativos: number
  maiorSaida: GridCell | null
  maiorEntrada: GridCell | null
}

export type MonthBucket = {
  /** YYYY-MM */
  key: string
  year: number
  month: number
  label: string
  cells: GridCell[]
  /** blank slots before the 1st so the grid starts on the right weekday */
  leadingBlanks: number
  summary: GridSummary
}

/** Pre-aggregated month totals for the whole history, computed on the server. */
export type MonthTotal = {
  /** YYYY-MM */
  key: string
  entradas: number
  saidas: number
  count: number
}

const MONTH_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
]

export const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

/** Weekday (0 = Sunday) of a date, parsed as local time. */
function weekdayOf(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay()
}

function parseIso(date: string): [number, number, number] {
  const [y, m, d] = date.substring(0, 10).split("-").map(Number)
  return [y, m, d]
}

function emptyCell(key: string, label: string, inRange: boolean): GridCell {
  return { key, label, entradas: 0, saidas: 0, saldo: 0, count: 0, inRange }
}

/** Totals, extremes and counts over the in-range cells of a grid. */
export function summarize(cells: GridCell[]): GridSummary {
  const active = cells.filter((c) => c.inRange)

  let totalEntradas = 0
  let totalSaidas = 0
  let maxSaida = 0
  let maxEntrada = 0
  let maxAbsSaldo = 0
  let comSaida = 0
  let comMovimento = 0
  let maiorSaida: GridCell | null = null
  let maiorEntrada: GridCell | null = null

  for (const c of active) {
    totalEntradas += c.entradas
    totalSaidas += c.saidas
    maxSaida = Math.max(maxSaida, c.saidas)
    maxEntrada = Math.max(maxEntrada, c.entradas)
    maxAbsSaldo = Math.max(maxAbsSaldo, Math.abs(c.saldo))
    if (c.saidas > 0) {
      comSaida += 1
      if (!maiorSaida || c.saidas > maiorSaida.saidas) maiorSaida = c
    }
    if (c.count > 0) comMovimento += 1
    if (c.entradas > 0 && (!maiorEntrada || c.entradas > maiorEntrada.entradas)) {
      maiorEntrada = c
    }
  }

  return {
    totalEntradas,
    totalSaidas,
    totalSaldo: totalEntradas - totalSaidas,
    maxSaida,
    maxEntrada,
    maxAbsSaldo,
    comSaida,
    comMovimento,
    ativos: active.length,
    maiorSaida,
    maiorEntrada,
  }
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
 * One day-grid bucket per month of the period. Transfers are ignored so the
 * totals line up with the rest of the analytics page.
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
    const cells: GridCell[] = []

    for (let day = 1; day <= daysInMonth(year, month); day++) {
      const date = `${key}-${pad(day)}`
      const agg = byDate.get(date)
      const saidas = agg?.saidas ?? 0
      const entradas = agg?.entradas ?? 0
      cells.push({
        key: date,
        date,
        label: String(day),
        saidas,
        entradas,
        saldo: entradas - saidas,
        count: agg?.count ?? 0,
        inRange: date >= start && date <= end,
      })
    }

    return {
      key,
      year,
      month,
      label: `${MONTH_LABELS[month - 1]} ${year}`,
      cells,
      leadingBlanks: weekdayOf(year, month, 1),
      summary: summarize(cells),
    }
  })
}

/** The only fields the monthly aggregation reads. */
export type MonthlyInput = Pick<Transaction, "date" | "amount" | "type">

/**
 * Collapses transactions into per-month totals. Runs on the server so the
 * month and year grids cost a handful of rows instead of the whole history.
 */
export function aggregateMonthlyTotals(transactions: MonthlyInput[]): MonthTotal[] {
  const map = new Map<string, MonthTotal>()

  for (const t of transactions) {
    if (t.type === "transfer") continue
    const key = t.date.substring(0, 7)
    let entry = map.get(key)
    if (!entry) {
      entry = { key, entradas: 0, saidas: 0, count: 0 }
      map.set(key, entry)
    }
    const amount = Math.abs(t.amount)
    if (t.type === "debit") entry.saidas += amount
    else entry.entradas += amount
    entry.count += 1
  }

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
}

/** The 12 months of a year, as grid cells. */
export function buildMonthCells(totals: MonthTotal[], year: number): GridCell[] {
  const byKey = new Map(totals.map((t) => [t.key, t]))
  const cells: GridCell[] = []

  for (let month = 1; month <= 12; month++) {
    const key = `${year}-${pad(month)}`
    const total = byKey.get(key)
    if (!total) {
      cells.push(emptyCell(key, MONTH_SHORT[month - 1], true))
      continue
    }
    cells.push({
      key,
      label: MONTH_SHORT[month - 1],
      entradas: total.entradas,
      saidas: total.saidas,
      saldo: total.entradas - total.saidas,
      count: total.count,
      inRange: true,
    })
  }

  return cells
}

/** One cell per year covered by the history, oldest first. */
export function buildYearCells(totals: MonthTotal[]): GridCell[] {
  const byYear = new Map<number, GridCell>()

  for (const total of totals) {
    const year = Number(total.key.substring(0, 4))
    let cell = byYear.get(year)
    if (!cell) {
      cell = emptyCell(String(year), String(year), true)
      byYear.set(year, cell)
    }
    cell.entradas += total.entradas
    cell.saidas += total.saidas
    cell.saldo = cell.entradas - cell.saidas
    cell.count += total.count
  }

  return Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, cell]) => cell)
}

/** Years present in the history, oldest first. */
export function yearsInHistory(totals: MonthTotal[]): number[] {
  return Array.from(new Set(totals.map((t) => Number(t.key.substring(0, 4))))).sort(
    (a, b) => a - b
  )
}

/** Readable label for any grid cell: 09/07, jul/2026 or 2026. */
export function cellLabel(cell: GridCell) {
  if (cell.date) {
    const [, m, d] = parseIso(cell.date)
    return `${pad(d)}/${pad(m)}`
  }
  if (cell.key.length === 7) return formatMonthKey(cell.key)
  return cell.key
}

/** Short label for a month key, e.g. jul/2026. */
export function formatMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number)
  return `${MONTH_SHORT[m - 1]}/${y}`
}

/** Full day label used in the detail dialog, e.g. quinta-feira, 09 de julho de 2026. */
export function formatDayLong(date: string) {
  const [y, m, d] = parseIso(date)
  const weekday = new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long" })
  return `${weekday}, ${pad(d)} de ${MONTH_LABELS[m - 1]} de ${y}`
}

/** First and last day of a month, as ISO strings. */
export function monthRange(year: number, month: number) {
  return {
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
  }
}

/** First and last day of a year, as ISO strings. */
export function yearRange(year: number) {
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` }
}
