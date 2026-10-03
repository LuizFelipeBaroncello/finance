import type {
  DayKind,
  DayStatus,
  FreeSpendingPlan,
  MonthTracking,
  PlannedExpense,
  ProjectedDay,
  ProjectedMonth,
} from "../types"

const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
]

/** Datas são tratadas como strings YYYY-MM-DD em UTC para evitar desvios de fuso. */
export function toIso(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(iso: string, n: number) {
  const d = parseIso(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toIso(d)
}

export function diffDays(a: string, b: string) {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86_400_000)
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

export function monthKeyOf(iso: string) {
  return iso.slice(0, 7)
}

export function monthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number)
  return `${MONTH_LABELS[m - 1]}/${String(y).slice(2)}`
}

/** Primeiro dia do mês, `offset` meses depois do mês de `iso`. */
export function shiftMonth(iso: string, offset: number) {
  const d = parseIso(iso)
  return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1)))
}

/** Dia do aporte no mês: meses curtos usam o último dia. */
function paydayOf(year: number, monthIndex: number, payDay: number) {
  return Math.min(payDay, daysInMonth(year, monthIndex))
}

export type ProjectionInput = {
  plan: FreeSpendingPlan
  /** Aporte por mês (YYYY-MM) que sobrescreve o valor padrão. */
  monthOverrides: Record<string, number>
  planned: PlannedExpense[]
  /** Gasto real líquido por dia (YYYY-MM-DD). */
  realByDate: Record<string, number>
  today: string
  monthsAhead?: number
}

export type ProjectionSummary = {
  balanceToday: number
  /** Maior gasto pontual possível hoje sem negativar até a véspera do próximo aporte. */
  canSpendThisCycle: number
  /** Maior gasto pontual possível hoje sem negativar em nenhum dia do horizonte. */
  canSpendToday: number
  /** Ritmo diário que zera o saldo exatamente na véspera do próximo aporte. */
  dailyUntilPayday: number
  nextPayday: string | null
  firstNegative: string | null
  minBalance: { date: string; balance: number } | null
}

export type Projection = {
  months: ProjectedMonth[]
  tracking: MonthTracking[]
  summary: ProjectionSummary
}

export function aporteFor(plan: FreeSpendingPlan, overrides: Record<string, number>, monthKey: string) {
  return overrides[monthKey] ?? plan.monthly_amount
}

function statusOf(balance: number, threshold: number): DayStatus {
  if (balance < 0) return "negative"
  if (balance < threshold) return "warning"
  return "positive"
}

export function buildProjection({
  plan,
  monthOverrides,
  planned,
  realByDate,
  today,
  monthsAhead = 12,
}: ProjectionInput): Projection {
  const plannedByDate: Record<string, number> = {}
  for (const p of planned) {
    plannedByDate[p.date] = (plannedByDate[p.date] ?? 0) + p.amount
  }

  const start = plan.start_date
  const firstMonth = shiftMonth(start, 0)
  // O horizonte vai sempre `monthsAhead` meses adiante de hoje (ou do início, se for futuro).
  const anchor = start > today ? start : today
  const lastMonth = shiftMonth(anchor, monthsAhead - 1)

  const months: ProjectedMonth[] = []
  const tracking: MonthTracking[] = []
  const timeline: ProjectedDay[] = []
  let balance = 0

  for (let monthStart = firstMonth; monthStart <= lastMonth; monthStart = shiftMonth(monthStart, 1)) {
    const key = monthKeyOf(monthStart)
    const d = parseIso(monthStart)
    const year = d.getUTCFullYear()
    const monthIndex = d.getUTCMonth()
    const dim = daysInMonth(year, monthIndex)
    const payday = paydayOf(year, monthIndex, plan.pay_day)
    const aporte = aporteFor(plan, monthOverrides, key)
    const threshold = (plan.warning_pct / 100) * aporte

    const days: Array<ProjectedDay | null> = []
    let elapsedDays = 0
    let estimatedToDate = 0
    let realToDate = 0
    let futureSpend = 0

    for (let day = 1; day <= dim; day++) {
      const date = `${key}-${String(day).padStart(2, "0")}`
      if (date < start) {
        days.push(null)
        continue
      }

      const kind: DayKind = date < today ? "past" : date === today ? "today" : "future"
      const inflow = day === payday ? aporte : 0
      const estimated = plan.daily_estimate + (plannedByDate[date] ?? 0)
      const outflow = kind === "future" ? estimated : realByDate[date] ?? 0

      if (kind === "future") {
        futureSpend += estimated
      } else {
        elapsedDays++
        estimatedToDate += estimated
        realToDate += outflow
      }

      balance += inflow - outflow
      const projected: ProjectedDay = {
        date,
        day,
        kind,
        inflow,
        outflow,
        balance,
        status: statusOf(balance, threshold),
      }
      days.push(projected)
      timeline.push(projected)
    }

    months.push({ month: key, label: monthLabel(key), aporte, days, closingBalance: balance })
    tracking.push({
      month: key,
      label: monthLabel(key),
      aporte,
      isOverride: key in monthOverrides,
      elapsedDays,
      estimatedToDate,
      realToDate,
      forecastTotal: realToDate + futureSpend,
      closingBalance: balance,
    })
  }

  return { months, tracking, summary: summarize(timeline, today) }
}

function summarize(timeline: ProjectedDay[], today: string): ProjectionSummary {
  const fromToday = timeline.filter((d) => d.date >= today)
  const todayEntry = timeline.find((d) => d.date === today)
  const balanceToday = todayEntry?.balance ?? 0

  let minBalance: ProjectionSummary["minBalance"] = null
  for (const d of fromToday) {
    if (!minBalance || d.balance < minBalance.balance) {
      minBalance = { date: d.date, balance: d.balance }
    }
  }

  const firstNegative = fromToday.find((d) => d.balance < 0)?.date ?? null
  const nextPaydayEntry = fromToday.find((d) => d.date > today && d.inflow > 0)
  const nextPayday = nextPaydayEntry?.date ?? null

  // Saldo de hoje dividido pelos dias que ele precisa durar (hoje até a véspera do aporte).
  const cycle = fromToday.filter((d) => !nextPayday || d.date < nextPayday)
  const cycleMin = cycle.length ? Math.min(...cycle.map((d) => d.balance)) : 0

  const daysToPayday = nextPayday ? diffDays(today, nextPayday) : 0
  const dailyUntilPayday = daysToPayday > 0 ? Math.max(0, balanceToday) / daysToPayday : 0

  return {
    balanceToday,
    canSpendThisCycle: Math.max(0, cycleMin),
    canSpendToday: Math.max(0, minBalance?.balance ?? 0),
    dailyUntilPayday,
    nextPayday,
    firstNegative,
    minBalance,
  }
}

/** Média diária de gasto real em uma janela de dias que termina ontem. */
export function averageDailySpend(realByDate: Record<string, number>, today: string, windowDays: number) {
  let total = 0
  for (let i = 1; i <= windowDays; i++) {
    total += realByDate[addDays(today, -i)] ?? 0
  }
  return total / windowDays
}
