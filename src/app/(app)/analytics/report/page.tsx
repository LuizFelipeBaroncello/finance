import { createClient } from "@/lib/supabase/server"
import { PeriodFilter } from "../components/period-filter"
import { FinancialReportTable } from "./components/financial-report-table"
import type { ReportRow } from "./types"

function yearsInRange(startDate: string, endDate: string): number[] {
  const startYear = new Date(startDate).getUTCFullYear()
  const endYear = new Date(endDate).getUTCFullYear()
  const years: number[] = []
  for (let y = startYear; y <= endYear; y++) years.push(y)
  return years
}

export default async function AnalyticsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}) {
  const params = await searchParams
  const yyyy = new Date().getFullYear()
  const startDate = params.startDate ?? `${yyyy}-01-01`
  const endDate = params.endDate ?? `${yyyy}-12-31`

  const anos = yearsInRange(startDate, endDate)

  const supabase = await createClient()
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: ReportRow[] | null; error: { message: string } | null }>
  )("relatorio_financeiro", { anos })

  const rows = ((data ?? []) as ReportRow[]).map((r) => ({
    ...r,
    Valor: Number(r.Valor),
    Porcentagem: Number(r.Porcentagem),
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatório Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receitas e despesas por categoria e mês
          </p>
        </div>
        <PeriodFilter
          startDate={startDate}
          endDate={endDate}
          granularity="monthly"
          basePath="/analytics/report"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar os dados: {error.message}
        </p>
      ) : (
        <FinancialReportTable rows={rows} />
      )}
    </div>
  )
}
