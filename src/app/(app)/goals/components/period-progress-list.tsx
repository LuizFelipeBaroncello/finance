"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import type { ResolvedPeriodGoal } from "./goals-client"
import { deletePeriodGoal } from "../actions"
import { useFormatBRL } from "@/lib/currency"

export function PeriodProgressList({
  resolved,
  onDeleted,
}: {
  resolved: ResolvedPeriodGoal[]
  onDeleted?: () => void
}) {
  const formatBRL = useFormatBRL()

  if (resolved.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma meta cadastrada para este período.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {resolved.map((g) => {
        const target = g.amount
        const real = g.realized
        const ratio = target > 0 ? real / target : 0
        const isCap = g.kind === "cap"
        const success = isCap ? ratio <= 1 : ratio >= 1
        const danger = isCap && ratio > 1

        return (
          <div key={g.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{g.label}</span>
                <Badge variant="outline" className="text-[10px]">
                  {g.scope === "macro" ? "Macro" : "Categoria"}
                </Badge>
                <Badge
                  variant={isCap ? "secondary" : "default"}
                  className="text-[10px]"
                >
                  {isCap ? "Teto" : "Alvo"}
                </Badge>
                {g.isTemplate && (
                  <Badge variant="outline" className="text-[10px]">
                    Template
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatBRL(real)} / {formatBRL(target)}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    danger
                      ? "text-destructive"
                      : success
                        ? "text-emerald-500"
                        : "text-muted-foreground"
                  )}
                >
                  {(ratio * 100).toFixed(0)}%
                </span>
                {g.periodGoalId !== null && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      if (!confirm("Remover esta meta?")) return
                      await deletePeriodGoal(g.periodGoalId!)
                      onDeleted?.()
                    }}
                    aria-label="Remover meta"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ratio * 100)}%`,
                  background: danger
                    ? "#ef4444"
                    : success
                      ? "#22c55e"
                      : "#3b82f6",
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
