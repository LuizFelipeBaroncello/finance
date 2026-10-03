"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { formatBRL, useCurrencyVisibility } from "@/lib/currency"
import type { DayStatus, ProjectedDay, ProjectedMonth } from "../types"

const STATUS_BG: Record<DayStatus, string> = {
  positive: "bg-emerald-500/25 dark:bg-emerald-500/30",
  warning: "bg-amber-400/30 dark:bg-amber-400/25",
  negative: "bg-red-500/30 dark:bg-red-500/35",
}

const STATUS_BG_FUTURE: Record<DayStatus, string> = {
  positive: "bg-emerald-500/10 dark:bg-emerald-500/15",
  warning: "bg-amber-400/15 dark:bg-amber-400/10",
  negative: "bg-red-500/15 dark:bg-red-500/20",
}

/** Formato compacto como na planilha: 915,4 · -2,1k · 12,3k. */
function compact(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1000) {
    return `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: abs >= 100_000 ? 0 : 1 })}k`
  }
  return value.toLocaleString("pt-BR", { maximumFractionDigits: abs >= 100 ? 0 : 1 })
}

function cellTitle(day: ProjectedDay) {
  const [y, m, d] = day.date.split("-")
  const lines = [`${d}/${m}/${y} · ${day.kind === "future" ? "projeção" : "real"}`]
  if (day.inflow) lines.push(`Aporte: ${formatBRL(day.inflow)}`)
  if (day.outflow) lines.push(`${day.kind === "future" ? "Gasto simulado" : "Gasto real"}: ${formatBRL(day.outflow)}`)
  lines.push(`Saldo: ${formatBRL(day.balance)}`)
  return lines.join("\n")
}

export function HorizonGrid({ months, today }: { months: ProjectedMonth[]; today: string }) {
  const { hidden } = useCurrencyVisibility()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const todayMonth = today.slice(0, 7)

  // Abre a grade já posicionada no mês atual (com o anterior visível para contexto).
  React.useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-month="${todayMonth}"]`)
    const container = scrollRef.current
    if (!el || !container) return
    const prev = el.previousElementSibling as HTMLElement | null
    container.scrollLeft = (prev ?? el).offsetLeft - container.offsetLeft
  }, [todayMonth])

  return (
    <div ref={scrollRef} className="overflow-x-auto">
      <div className="flex min-w-max px-4">
        {months.map((month) => (
          <div
            key={month.month}
            data-month={month.month}
            className="w-[8.5rem] shrink-0 border-r border-border last:border-r-0"
          >
            <div
              className={cn(
                "sticky top-0 border-b border-border px-2 py-1.5 text-center text-xs font-medium",
                month.month === todayMonth ? "bg-foreground text-background" : "text-muted-foreground"
              )}
            >
              {month.label}
            </div>
            {Array.from({ length: 31 }, (_, i) => {
              const day = month.days[i]
              const exists = i < month.days.length
              const isToday = day?.date === today
              return (
                <div key={i} className="flex h-6 items-stretch border-b border-border/60 text-xs">
                  <span
                    className={cn(
                      "flex w-7 shrink-0 items-center justify-center tabular-nums",
                      exists ? "text-muted-foreground" : "",
                      isToday && "bg-foreground font-semibold text-background",
                      day?.inflow ? "font-semibold text-foreground" : ""
                    )}
                  >
                    {exists ? i + 1 : ""}
                  </span>
                  {day ? (
                    <span
                      title={hidden ? undefined : cellTitle(day)}
                      className={cn(
                        "flex flex-1 items-center justify-end px-2 tabular-nums",
                        day.kind === "future" ? STATUS_BG_FUTURE[day.status] : STATUS_BG[day.status],
                        day.kind === "future" && "text-muted-foreground",
                        day.kind !== "future" && "font-medium text-foreground",
                        isToday && "ring-2 ring-inset ring-foreground"
                      )}
                    >
                      {hidden ? "••" : compact(day.balance)}
                    </span>
                  ) : (
                    <span className={cn("flex-1", exists && "bg-muted/40")} />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
