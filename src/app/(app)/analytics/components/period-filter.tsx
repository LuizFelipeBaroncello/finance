"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function getGranularityOptions(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)

  if (diffDays <= 31) return [{ label: "Diário", value: "daily" }]
  if (diffDays <= 93)
    return [
      { label: "Diário", value: "daily" },
      { label: "Semanal", value: "weekly" },
    ]
  return [
    { label: "Semanal", value: "weekly" },
    { label: "Mensal", value: "monthly" },
  ]
}

function getDefaultGranularity(startDate: string, endDate: string) {
  const options = getGranularityOptions(startDate, endDate)
  return options[options.length - 1].value
}

interface PeriodFilterProps {
  startDate: string
  endDate: string
  granularity: string
}

export function PeriodFilter({ startDate, endDate, granularity }: PeriodFilterProps) {
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

  const granularityOptions = getGranularityOptions(startDate, endDate)

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, "0")

  const shortcuts = [
    {
      label: "Mês",
      getRange: () => {
        const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate()
        return {
          startDate: `${yyyy}-${mm}-01`,
          endDate: `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`,
        }
      },
    },
    {
      label: "Trimestre",
      getRange: () => {
        const q = Math.floor(today.getMonth() / 3)
        const sm = q * 3 + 1
        const em = sm + 2
        const lastDay = new Date(yyyy, em, 0).getDate()
        return {
          startDate: `${yyyy}-${String(sm).padStart(2, "0")}-01`,
          endDate: `${yyyy}-${String(em).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
        }
      },
    },
    {
      label: "Ano",
      getRange: () => ({
        startDate: `${yyyy}-01-01`,
        endDate: `${yyyy}-12-31`,
      }),
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date range inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            const newStart = e.target.value
            if (!newStart) return
            const newGranularity = getDefaultGranularity(newStart, endDate)
            updateParams({ startDate: newStart, granularity: newGranularity })
          }}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm tabular-nums"
        />
        <span className="text-xs text-muted-foreground">até</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            const newEnd = e.target.value
            if (!newEnd) return
            const newGranularity = getDefaultGranularity(startDate, newEnd)
            updateParams({ endDate: newEnd, granularity: newGranularity })
          }}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm tabular-nums"
        />
      </div>

      {/* Quick shortcuts */}
      <div className="flex items-center gap-0.5 rounded-lg border border-border p-1">
        {shortcuts.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              const range = s.getRange()
              const g = getDefaultGranularity(range.startDate, range.endDate)
              updateParams({
                startDate: range.startDate,
                endDate: range.endDate,
                granularity: g,
              })
            }}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Granularity selector */}
      {granularityOptions.length > 1 && (
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-1">
          {granularityOptions.map((opt) => (
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
