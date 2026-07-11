"use client"

import { Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { OptionSelect } from "@/components/ui/option-select"
import { cn } from "@/lib/utils"
import { PALETTE } from "../../components/series-evolution-chart"
import {
  DEFAULT_GRANULARITY,
  GRANULARITY_BY_TYPE,
  MAX_PERIODS,
  METRIC_LABELS,
  defaultTokens,
} from "../lib/compare-aggregations"
import type { CompareGranularity, Metric, PeriodSpec, PeriodType } from "../types"

const TYPE_OPTIONS: { label: string; value: PeriodType }[] = [
  { label: "Mês", value: "month" },
  { label: "Trimestre", value: "quarter" },
  { label: "Ano", value: "year" },
]

const METRIC_OPTIONS = (
  Object.entries(METRIC_LABELS) as [Metric, string][]
).map(([value, label]) => ({ value, label }))

const GRANULARITY_LABELS: Record<CompareGranularity, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

interface CompareFilterProps {
  type: PeriodType
  specs: PeriodSpec[]
  metric: Metric
  granularity: CompareGranularity
}

export function CompareFilter({ type, specs, metric, granularity }: CompareFilterProps) {
  const router = useRouter()

  const today = new Date()
  const yyyy = today.getFullYear()
  const currentQuarter = Math.floor(today.getMonth() / 3) + 1

  const [pendingMonth, setPendingMonth] = useState(
    `${yyyy}-${pad(today.getMonth() + 1)}`
  )
  const [pendingQuarter, setPendingQuarter] = useState(String(currentQuarter))
  const [pendingYear, setPendingYear] = useState(String(yyyy))

  const tokens = specs.map((s) => s.token)

  const update = useCallback(
    (next: {
      type?: PeriodType
      tokens?: string[]
      metric?: Metric
      granularity?: CompareGranularity
    }) => {
      const params = new URLSearchParams()
      params.set("type", next.type ?? type)
      params.set("periods", (next.tokens ?? tokens).join(","))
      params.set("metric", next.metric ?? metric)
      params.set("granularity", next.granularity ?? granularity)
      router.push(`/analytics/compare?${params.toString()}`)
    },
    [router, type, tokens, metric, granularity]
  )

  const changeType = (newType: PeriodType) => {
    if (newType === type) return
    // Tokens não são conversíveis entre tipos: reseta para o par default
    update({
      type: newType,
      tokens: defaultTokens(newType),
      granularity: DEFAULT_GRANULARITY[newType],
    })
  }

  const addToken = (token: string) => {
    if (tokens.includes(token) || tokens.length >= MAX_PERIODS) return
    update({ tokens: [...tokens, token] })
  }

  const removeToken = (token: string) => {
    if (tokens.length <= 1) return
    update({ tokens: tokens.filter((t) => t !== token) })
  }

  const pendingToken =
    type === "month"
      ? pendingMonth
      : type === "quarter"
        ? `${pendingYear}-Q${pendingQuarter}`
        : pendingYear

  const atCap = tokens.length >= MAX_PERIODS
  const alreadyAdded = tokens.includes(pendingToken)

  const yearOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(yyyy - i),
    label: String(yyyy - i),
  }))

  const quarterOptions = [1, 2, 3, 4].map((q) => ({
    value: String(q),
    label: `T${q}`,
  }))

  return (
    <div className="flex flex-col gap-3">
      {/* Seletores de tipo, métrica e visão */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => changeType(opt.value)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                type === opt.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-border p-1">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ metric: opt.value })}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                metric === opt.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-border p-1">
          {GRANULARITY_BY_TYPE[type].map((g) => (
            <button
              key={g}
              onClick={() => update({ granularity: g })}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                granularity === g
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {GRANULARITY_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Períodos comparados + adicionar */}
      <div className="flex flex-wrap items-center gap-2">
        {specs.map((spec, i) => (
          <span
            key={spec.token}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            {spec.label}
            {specs.length > 1 && (
              <button
                onClick={() => removeToken(spec.token)}
                aria-label={`Remover ${spec.label}`}
                className="ml-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}

        <div className="flex items-center gap-1.5">
          {type === "month" && (
            <input
              type="month"
              value={pendingMonth}
              onChange={(e) => setPendingMonth(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm tabular-nums"
            />
          )}
          {type === "quarter" && (
            <>
              <OptionSelect
                value={pendingQuarter}
                onValueChange={setPendingQuarter}
                options={quarterOptions}
                size="sm"
              />
              <OptionSelect
                value={pendingYear}
                onValueChange={setPendingYear}
                options={yearOptions}
                size="sm"
              />
            </>
          )}
          {type === "year" && (
            <OptionSelect
              value={pendingYear}
              onValueChange={setPendingYear}
              options={yearOptions}
              size="sm"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={atCap || alreadyAdded || !pendingToken}
            onClick={() => addToken(pendingToken)}
          >
            <Plus className="size-3.5" />
            Adicionar
          </Button>
        </div>

        {specs.length === 1 && (
          <span className="text-xs text-muted-foreground">
            Adicione outro período para comparar
          </span>
        )}
      </div>
    </div>
  )
}
