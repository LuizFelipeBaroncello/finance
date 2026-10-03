export type FreeSpendingPlan = {
  start_date: string
  monthly_amount: number
  pay_day: number
  daily_estimate: number
  warning_pct: number
  macro_category_ids: number[]
  category_ids: number[]
}

export type PlannedExpense = {
  free_spending_planned_id: number
  date: string
  description: string
  amount: number
}

export type MacroRef = {
  macro_category_id: number
  name: string
}

export type CategoryRef = {
  category_id: number
  category_name: string
  macro_category_id: number | null
}

export type RealTransaction = {
  trans_id: number
  date: string
  description: string
  category_name: string | null
  /** Positivo = gasto (consome saldo); negativo = estorno/entrada. */
  spend: number
}

export type DayStatus = "positive" | "warning" | "negative"

export type DayKind = "past" | "today" | "future"

export type ProjectedDay = {
  date: string
  day: number
  kind: DayKind
  /** Aporte recebido no dia. */
  inflow: number
  /** Gasto do dia (real no passado/hoje, simulado no futuro). */
  outflow: number
  balance: number
  status: DayStatus
}

export type ProjectedMonth = {
  /** YYYY-MM */
  month: string
  label: string
  aporte: number
  /** null quando o mês começa antes do início do plano. */
  days: Array<ProjectedDay | null>
  closingBalance: number
}

export type MonthTracking = {
  month: string
  label: string
  aporte: number
  isOverride: boolean
  /** Dias do mês já decorridos (até hoje, inclusive) dentro do plano. */
  elapsedDays: number
  /** Gasto que a simulação previa para os dias decorridos. */
  estimatedToDate: number
  /** Gasto real nos dias decorridos. */
  realToDate: number
  /** Gasto previsto para o mês inteiro: real até hoje + simulado no restante. */
  forecastTotal: number
  closingBalance: number
}
