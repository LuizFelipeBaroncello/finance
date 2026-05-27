"use client"

import { cn } from "@/lib/utils"
import { useFormatBRL } from "@/lib/currency"
import type { Macro } from "./goals-client"

export function MacroProgressList({
  macros,
  goalsByMacro,
  totalsByMacro,
  totalSpent,
  colors,
}: {
  macros: Macro[]
  goalsByMacro: Record<number, number>
  totalsByMacro: Record<string, number>
  totalSpent: number
  colors: string[]
}) {
  const formatBRL = useFormatBRL()

  if (totalSpent === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma saída registrada neste mês.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {macros.map((m, i) => {
        const realValue = totalsByMacro[String(m.macro_category_id)] ?? 0
        const realPct = (realValue / totalSpent) * 100
        const targetPct = goalsByMacro[m.macro_category_id] ?? 0
        const targetValue = (targetPct / 100) * totalSpent
        const overBudget = targetPct > 0 && realPct > targetPct
        const noGoal = targetPct === 0

        return (
          <div key={m.macro_category_id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: colors[i % colors.length] }}
                />
                <span className="font-medium">{m.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  {formatBRL(realValue)} / {formatBRL(targetValue)}
                </span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    noGoal
                      ? "text-muted-foreground"
                      : overBudget
                        ? "text-destructive"
                        : "text-emerald-500"
                  )}
                >
                  {realPct.toFixed(1)}% / {targetPct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, realPct)}%`,
                  background: overBudget ? "#ef4444" : colors[i % colors.length],
                }}
              />
              {!noGoal && (
                <div
                  className="absolute inset-y-0 w-px bg-foreground/40"
                  style={{ left: `${Math.min(100, targetPct)}%` }}
                  title={`Alvo: ${targetPct.toFixed(1)}%`}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
