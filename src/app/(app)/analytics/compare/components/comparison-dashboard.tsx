"use client"

import { useCallback, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFormatBRL } from "@/lib/currency"
import { PALETTE, SeriesEvolutionChart } from "../../components/series-evolution-chart"
import {
  METRIC_LABELS,
  buildComparisonData,
  summarizeRange,
} from "../lib/compare-aggregations"
import { SubperiodModal } from "./subperiod-modal"
import type {
  CompareGranularity,
  ComparePeriodData,
  Metric,
  PeriodType,
} from "../types"

interface ComparisonDashboardProps {
  periods: ComparePeriodData[]
  type: PeriodType
  metric: Metric
  granularity: CompareGranularity
}

export function ComparisonDashboard({
  periods,
  type,
  metric,
  granularity,
}: ComparisonDashboardProps) {
  const formatBRL = useFormatBRL()

  const { data, seriesKeys, totals, series } = useMemo(
    () => buildComparisonData(periods, type, granularity, metric),
    [periods, type, granularity, metric]
  )

  const [range, setRange] = useState<{ from: number; to: number } | null>(null)

  const handleRangeSelect = useCallback((from: number, to: number) => {
    setRange({ from, to })
  }, [])

  const subperiod = useMemo(() => {
    if (!range) return null
    return {
      title: `${data[range.from]?.label} – ${data[range.to]?.label}`,
      rows: summarizeRange(series, range.from, range.to),
    }
  }, [range, data, series])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {METRIC_LABELS[metric]} por período
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {seriesKeys.map((key, i) => (
            <div key={key} className="flex items-center gap-1.5 text-sm">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="text-muted-foreground">{key}:</span>
              <span className="font-medium tabular-nums">
                {formatBRL(totals[key] ?? 0)}
              </span>
            </div>
          ))}
          <span className="text-xs text-muted-foreground">
            Arraste no gráfico para comparar um subperíodo
          </span>
        </div>

        <SeriesEvolutionChart
          data={data}
          seriesKeys={seriesKeys}
          onRangeSelect={handleRangeSelect}
        />
      </CardContent>

      {subperiod && (
        <SubperiodModal
          open={range !== null}
          onOpenChange={(open) => {
            if (!open) setRange(null)
          }}
          title={subperiod.title}
          rows={subperiod.rows}
        />
      )}
    </Card>
  )
}
