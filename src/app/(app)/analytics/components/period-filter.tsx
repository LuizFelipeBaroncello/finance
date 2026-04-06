"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

const GRANULARITY_BY_PERIOD: Record<string, { label: string; value: string }[]> = {
  month: [{ label: "Diário", value: "daily" }],
  quarter: [
    { label: "Diário", value: "daily" },
    { label: "Semanal", value: "weekly" },
  ],
  year: [
    { label: "Semanal", value: "weekly" },
    { label: "Mensal", value: "monthly" },
  ],
}

interface PeriodFilterProps {
  period: string
  year: number
  month: number
  granularity: string
}

export function PeriodFilter({ period, year, month, granularity }: PeriodFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, val] of Object.entries(updates)) {
        params.set(key, val)
      }
      router.push(`/analytics?${params.toString()}`)
    },
    [router, searchParams]
  )

  function defaultGranularity(p: string) {
    if (p === "month") return "daily"
    if (p === "quarter") return "weekly"
    return "monthly"
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Period selector */}
      <div className="flex items-center gap-0.5 rounded-lg border border-border p-1">
        {(["month", "quarter", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => updateParams({ period: p, granularity: defaultGranularity(p) })}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              period === p
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p === "month" ? "Mês" : p === "quarter" ? "Trimestre" : "Ano"}
          </button>
        ))}
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => updateParams({ year: String(year - 1) })}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="w-10 text-center text-sm font-medium tabular-nums">{year}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => updateParams({ year: String(year + 1) })}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Month selector (only when period=month) */}
      {period === "month" && (
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              if (month === 1) updateParams({ month: "12", year: String(year - 1) })
              else updateParams({ month: String(month - 1) })
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{MONTHS[month - 1]}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              if (month === 12) updateParams({ month: "1", year: String(year + 1) })
              else updateParams({ month: String(month + 1) })
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Granularity selector */}
      {(GRANULARITY_BY_PERIOD[period] ?? []).length > 1 && (
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-1">
          {(GRANULARITY_BY_PERIOD[period] ?? []).map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParams({ granularity: opt.value })}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                granularity === opt.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
