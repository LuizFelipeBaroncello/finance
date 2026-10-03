"use client"

import { cn } from "@/lib/utils"
import { useFormatBRL } from "@/lib/currency"
import { diffDays } from "../lib/projection"
import type { ProjectionSummary } from "../lib/projection"
import type { FreeSpendingPlan } from "../types"

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y.slice(2)}`
}

export function HorizonSummary({
  summary,
  today,
  plan,
}: {
  summary: ProjectionSummary
  today: string
  plan: FreeSpendingPlan
}) {
  const formatBRL = useFormatBRL()
  const started = plan.start_date <= today
  const paceOk = summary.dailyUntilPayday >= plan.daily_estimate

  const items: Array<{
    label: string
    value: string
    hint: string
    tone?: "positive" | "warning" | "negative"
  }> = [
    {
      label: "Saldo hoje",
      value: started ? formatBRL(summary.balanceToday) : "—",
      hint: started ? "aportes − gastos reais até hoje" : `começa em ${formatDate(plan.start_date)}`,
      tone: summary.balanceToday < 0 ? "negative" : undefined,
    },
    {
      label: "Posso gastar hoje",
      value: formatBRL(summary.canSpendThisCycle),
      hint: `sem negativar até o próximo aporte · no horizonte todo: ${formatBRL(summary.canSpendToday)}`,
      tone:
        summary.canSpendThisCycle <= 0
          ? "negative"
          : summary.canSpendToday <= 0
            ? "warning"
            : "positive",
    },
    {
      label: "Por dia até o aporte",
      value: summary.nextPayday ? formatBRL(summary.dailyUntilPayday) : "—",
      hint: summary.nextPayday
        ? `${diffDays(today, summary.nextPayday)} dias até ${formatDate(summary.nextPayday)} · estimado ${formatBRL(plan.daily_estimate)}/dia`
        : "sem próximo aporte no horizonte",
      tone: summary.nextPayday ? (paceOk ? "positive" : "warning") : undefined,
    },
    {
      label: "Primeiro dia negativo",
      value: summary.firstNegative ? formatDate(summary.firstNegative) : "nenhum",
      hint: summary.firstNegative
        ? `em ${diffDays(today, summary.firstNegative)} dias, mantendo o ritmo estimado`
        : "a simulação fecha positiva em todo o horizonte",
      tone: summary.firstNegative ? "negative" : "positive",
    },
  ]

  return (
    <div className="grid grid-cols-2 divide-border rounded-xl ring-1 ring-foreground/10 lg:grid-cols-4 lg:divide-x">
      {items.map((item) => (
        <div key={item.label} className="space-y-1 px-4 py-3">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p
            className={cn(
              "text-lg font-semibold tabular-nums tracking-tight",
              item.tone === "positive" && "text-emerald-600 dark:text-emerald-400",
              item.tone === "warning" && "text-amber-600 dark:text-amber-400",
              item.tone === "negative" && "text-red-600 dark:text-red-400"
            )}
          >
            {item.value}
          </p>
          <p className="text-xs text-muted-foreground">{item.hint}</p>
        </div>
      ))}
    </div>
  )
}
