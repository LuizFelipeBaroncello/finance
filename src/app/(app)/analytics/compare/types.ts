export type PeriodType = "month" | "quarter" | "year"

export type Metric = "receitas" | "despesas" | "saldo" | "acumulado"

export type CompareGranularity = "daily" | "weekly" | "monthly"

export type PeriodSpec = {
  token: string
  label: string
  startDate: string
  endDate: string
}

export type CompareTransaction = {
  date: string
  amount: number
  type: "debit" | "credit" | "transfer"
}

export type ComparePeriodData = {
  spec: PeriodSpec
  transactions: CompareTransaction[]
}
