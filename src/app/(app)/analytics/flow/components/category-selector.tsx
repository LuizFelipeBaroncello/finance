"use client"

import { useMemo } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatBRL, MASK, useCurrencyVisibility } from "@/lib/currency"
import type { FlowEntry, FlowTotals } from "../types"

const ORPHAN_GROUP_COLOR = "#71717a"

type Group = { label: string; color: string; entries: FlowEntry[] }

interface CategorySelectorProps {
  totals: FlowTotals
  selected: Set<string>
  onChange: (next: Set<string>) => void
}

export function CategorySelector({
  totals,
  selected,
  onChange,
}: CategorySelectorProps) {
  const { hidden: valuesHidden } = useCurrencyVisibility()
  const format = (value: number) => (valuesHidden ? MASK : formatBRL(value))

  const groups = useMemo<Group[]>(() => {
    const result: Group[] = []
    if (totals.income.length > 0) {
      result.push({ label: "Receitas", color: "#22c55e", entries: totals.income })
    }
    for (const macro of totals.macros) {
      result.push({
        label: macro.name,
        color: macro.color,
        entries: macro.categories,
      })
    }
    if (totals.orphans.length > 0) {
      result.push({
        label: "Sem macro categoria",
        color: ORPHAN_GROUP_COLOR,
        entries: totals.orphans,
      })
    }
    return result
  }, [totals])

  const allKeys = useMemo(
    () => groups.flatMap((g) => g.entries.map((e) => e.key)),
    [groups]
  )

  const toggle = (key: string) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  const toggleGroup = (group: Group) => {
    const keys = group.entries.map((e) => e.key)
    const allOn = keys.every((k) => selected.has(k))
    const next = new Set(selected)
    for (const k of keys) {
      if (allOn) next.delete(k)
      else next.add(k)
    }
    onChange(next)
  }

  if (allKeys.length === 0) return null

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Categorias no gráfico ({selected.size}/{allKeys.length})
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={selected.size === allKeys.length}
            onClick={() => onChange(new Set(allKeys))}
          >
            Marcar todas
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={selected.size === 0}
            onClick={() => onChange(new Set())}
          >
            Desmarcar todas
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {groups.map((group) => {
          const onCount = group.entries.filter((e) => selected.has(e.key)).length
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: group.color }}
                />
                {group.label}
                <span className="font-normal">
                  ({onCount}/{group.entries.length})
                </span>
              </button>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.entries.map((entry) => {
                  const isOn = selected.has(entry.key)
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      aria-pressed={isOn}
                      onClick={() => toggle(entry.key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                        isOn
                          ? "border-border bg-accent/40 text-foreground"
                          : "border-dashed border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span
                        className="flex size-3 shrink-0 items-center justify-center rounded-[3px]"
                        style={{
                          background: isOn ? entry.color : "transparent",
                          border: isOn ? undefined : `1px solid ${entry.color}`,
                          opacity: isOn ? 1 : 0.5,
                        }}
                      >
                        {isOn && <Check className="size-2.5 text-background" />}
                      </span>
                      <span className={cn(!isOn && "line-through")}>
                        {entry.name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {format(entry.value)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
