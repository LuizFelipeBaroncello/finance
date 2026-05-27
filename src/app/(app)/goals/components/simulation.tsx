"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useFormatBRL } from "@/lib/currency"
import type { Macro } from "./goals-client"

export function Simulation({
  macros,
  goalsByMacro,
  totalsByMacro,
  colors,
}: {
  macros: Macro[]
  goalsByMacro: Record<number, number>
  totalsByMacro: Record<string, number>
  colors: string[]
}) {
  const formatBRL = useFormatBRL()
  const [raw, setRaw] = React.useState("")
  const amount = parseFloat(raw.replace(",", ".")) || 0

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="sim-value" className="text-sm font-medium">
          Valor a simular
        </label>
        <Input
          id="sim-value"
          type="number"
          min={0}
          step="0.01"
          placeholder="Ex: 5000"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </div>

      {amount > 0 ? (
        <div className="space-y-4">
          {macros.map((m, i) => {
            const pct = goalsByMacro[m.macro_category_id] ?? 0
            const simulatedTarget = (amount * pct) / 100
            const realSpent = totalsByMacro[String(m.macro_category_id)] ?? 0
            const usagePct =
              simulatedTarget > 0 ? (realSpent / simulatedTarget) * 100 : 0
            const overBudget = simulatedTarget > 0 && realSpent > simulatedTarget
            const noTarget = simulatedTarget === 0

            return (
              <div key={m.macro_category_id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: colors[i % colors.length] }}
                    />
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground tabular-nums">
                      {formatBRL(realSpent)} / {formatBRL(simulatedTarget)}
                    </span>
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        noTarget
                          ? "text-muted-foreground"
                          : overBudget
                            ? "text-destructive"
                            : "text-emerald-500"
                      )}
                    >
                      {usagePct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, usagePct)}%`,
                      background: overBudget ? "#ef4444" : colors[i % colors.length],
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Digite um valor para ver a divisão segundo as metas definidas e o quanto
          já foi usado no mês.
        </p>
      )}
    </div>
  )
}
