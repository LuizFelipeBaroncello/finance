"use client"

import * as React from "react"
import type { GoalTransaction, Macro } from "./goals-client"

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })

export function TransactionsByMacro({
  macros,
  transactions,
}: {
  macros: Macro[]
  transactions: GoalTransaction[]
}) {
  const grouped = React.useMemo(() => {
    const map = new Map<number | "null", GoalTransaction[]>()
    for (const t of transactions) {
      const key = t.macro_category_id ?? "null"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [transactions])

  const order: Array<{ id: number | "null"; name: string }> = [
    ...macros.map((m) => ({ id: m.macro_category_id, name: m.name })),
    { id: "null" as const, name: "Sem macro" },
  ]

  if (transactions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma saída registrada neste mês.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {order.map(({ id, name }) => {
        const items = grouped.get(id) ?? []
        if (items.length === 0) return null
        const total = items.reduce((s, t) => s + t.amount, 0)
        return (
          <div key={String(id)} className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground">{formatBRL(total)}</span>
            </div>
            <ul className="divide-y divide-border">
              {items.map((t) => (
                <li
                  key={t.trans_id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(t.date)}
                    </span>
                    <span className="truncate">{t.description}</span>
                    {t.category_name && (
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        · {t.category_name}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 tabular-nums">{formatBRL(t.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
