import { createClient } from "@/lib/supabase/server"
import { PeriodFilter } from "./components/period-filter"
import { AnalyticsDashboard } from "./components/analytics-dashboard"
import type { Transaction } from "./types"

function getDefaultGranularity(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)

  if (diffDays <= 31) return "daily"
  if (diffDays <= 93) return "weekly"
  return "monthly"
}

// Compatibilidade com params antigos (period/year/month)
function legacyDateRange(period: string, year: number, month: number) {
  if (period === "month") {
    const lastDay = new Date(year, month, 0).getDate()
    const mm = String(month).padStart(2, "0")
    return {
      startDate: `${year}-${mm}-01`,
      endDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
    }
  }
  if (period === "quarter") {
    const q = Math.floor((month - 1) / 3)
    const startMonth = q * 3 + 1
    const endMonth = startMonth + 2
    const lastDay = new Date(year, endMonth, 0).getDate()
    return {
      startDate: `${year}-${String(startMonth).padStart(2, "0")}-01`,
      endDate: `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    }
  }
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    granularity?: string
    // Legacy params
    period?: string
    year?: string
    month?: string
  }>
}) {
  const params = await searchParams
  const today = new Date()
  const yyyy = today.getFullYear()

  let startDate: string
  let endDate: string

  if (params.startDate && params.endDate) {
    startDate = params.startDate
    endDate = params.endDate
  } else if (params.period) {
    // Compatibilidade com URLs antigas
    const year = parseInt(params.year ?? String(yyyy))
    const month = parseInt(params.month ?? String(today.getMonth() + 1))
    const range = legacyDateRange(params.period, year, month)
    startDate = range.startDate
    endDate = range.endDate
  } else {
    startDate = `${yyyy}-01-01`
    endDate = `${yyyy}-12-31`
  }

  const granularity = params.granularity ?? getDefaultGranularity(startDate, endDate)

  const supabase = await createClient()
  const { data } = await supabase
    .from("transaction")
    .select(
      "*, account(account_name), re_category_transaction(category_id, category(category_name))"
    )
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })

  const txs = (data ?? []) as unknown as Transaction[]

  const uniqueCategories = Array.from(
    new Set(
      txs.flatMap((t) =>
        (t.re_category_transaction ?? [])
          .map((rc) => rc.category?.category_name)
          .filter((name): name is string => !!name)
      )
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"))

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Análise de transações por categoria, conta e período
          </p>
        </div>
        <PeriodFilter startDate={startDate} endDate={endDate} granularity={granularity} />
      </div>

      <AnalyticsDashboard
        transactions={txs}
        categories={uniqueCategories}
        granularity={granularity}
      />
    </div>
  )
}
