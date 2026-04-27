"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function fmt(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function parseLocal(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number)
  return [y, m, d]
}

function shiftWindow(
  startDate: string,
  endDate: string,
  direction: -1 | 1
): { startDate: string; endDate: string } {
  const [sy, sm, sd] = parseLocal(startDate)
  const [ey, em, ed] = parseLocal(endDate)

  const isFullYear = sm === 1 && sd === 1 && em === 12 && ed === 31 && sy === ey
  if (isFullYear) {
    const y = sy + direction
    return { startDate: fmt(y, 1, 1), endDate: fmt(y, 12, 31) }
  }

  const isFullMonth =
    sy === ey && sm === em && sd === 1 && ed === lastDayOfMonth(sy, sm)
  if (isFullMonth) {
    const base = new Date(sy, sm - 1 + direction, 1)
    const y = base.getFullYear()
    const m = base.getMonth() + 1
    return { startDate: fmt(y, m, 1), endDate: fmt(y, m, lastDayOfMonth(y, m)) }
  }

  const isQuarter =
    sd === 1 &&
    (sm === 1 || sm === 4 || sm === 7 || sm === 10) &&
    sy === ey &&
    em === sm + 2 &&
    ed === lastDayOfMonth(ey, em)
  if (isQuarter) {
    const base = new Date(sy, sm - 1 + direction * 3, 1)
    const y = base.getFullYear()
    const m = base.getMonth() + 1
    const endM = m + 2
    const end = new Date(y, endM - 1, 1)
    const ey2 = end.getFullYear()
    const em2 = end.getMonth() + 1
    return {
      startDate: fmt(y, m, 1),
      endDate: fmt(ey2, em2, lastDayOfMonth(ey2, em2)),
    }
  }

  // Custom range: shift by total span in days (inclusive)
  const start = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  const spanDays =
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  start.setDate(start.getDate() + direction * spanDays)
  end.setDate(end.getDate() + direction * spanDays)
  return {
    startDate: fmt(start.getFullYear(), start.getMonth() + 1, start.getDate()),
    endDate: fmt(end.getFullYear(), end.getMonth() + 1, end.getDate()),
  }
}

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
  basePath?: string
}

export function PeriodFilter({ startDate, endDate, granularity, basePath = "/analytics" }: PeriodFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, val] of Object.entries(updates)) {
        params.set(key, val)
      }
      router.push(`${basePath}?${params.toString()}`)
    },
    [router, searchParams, basePath]
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

  const shiftBy = (direction: -1 | 1) => {
    const next = shiftWindow(startDate, endDate, direction)
    const g = getDefaultGranularity(next.startDate, next.endDate)
    updateParams({
      startDate: next.startDate,
      endDate: next.endDate,
      granularity: g,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date range inputs with prev/next arrows */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Período anterior"
          onClick={() => shiftBy(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
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
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Próximo período"
          onClick={() => shiftBy(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
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
