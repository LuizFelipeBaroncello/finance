import { createClient } from "@/lib/supabase/server"
import { CompareFilter } from "./components/compare-filter"
import { ComparisonDashboard } from "./components/comparison-dashboard"
import {
  DEFAULT_GRANULARITY,
  GRANULARITY_BY_TYPE,
  MAX_PERIODS,
  defaultTokens,
  parsePeriodToken,
} from "./lib/compare-aggregations"
import type {
  CompareGranularity,
  CompareTransaction,
  Metric,
  PeriodSpec,
  PeriodType,
} from "./types"

const PERIOD_TYPES: PeriodType[] = ["month", "quarter", "year"]
const METRICS: Metric[] = ["receitas", "despesas", "saldo", "acumulado"]

export default async function AnalyticsComparePage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string
    periods?: string
    metric?: string
    granularity?: string
  }>
}) {
  const params = await searchParams

  const type: PeriodType = PERIOD_TYPES.includes(params.type as PeriodType)
    ? (params.type as PeriodType)
    : "month"

  const seen = new Set<string>()
  let specs = (params.periods ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => parsePeriodToken(t, type))
    .filter((s): s is PeriodSpec => s !== null)
    .filter((s) => (seen.has(s.token) ? false : (seen.add(s.token), true)))
    .slice(0, MAX_PERIODS)

  if (specs.length === 0) {
    specs = defaultTokens(type)
      .map((t) => parsePeriodToken(t, type))
      .filter((s): s is PeriodSpec => s !== null)
  }

  const metric: Metric = METRICS.includes(params.metric as Metric)
    ? (params.metric as Metric)
    : "despesas"

  const granularity: CompareGranularity = GRANULARITY_BY_TYPE[type].includes(
    params.granularity as CompareGranularity
  )
    ? (params.granularity as CompareGranularity)
    : DEFAULT_GRANULARITY[type]

  const supabase = await createClient()
  const results = await Promise.all(
    specs.map((spec) =>
      supabase
        .from("transaction")
        .select("date, amount, type")
        .eq("is_provisional", false)
        .gte("date", spec.startDate)
        .lte("date", spec.endDate)
        .order("date", { ascending: true })
    )
  )

  const periods = specs.map((spec, i) => ({
    spec,
    transactions: (results[i].data ?? []) as unknown as CompareTransaction[],
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comparar Períodos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compare receitas, despesas e saldo entre meses, trimestres ou anos
          </p>
        </div>
      </div>

      <CompareFilter type={type} specs={specs} metric={metric} granularity={granularity} />

      <ComparisonDashboard
        periods={periods}
        type={type}
        metric={metric}
        granularity={granularity}
      />
    </div>
  )
}
