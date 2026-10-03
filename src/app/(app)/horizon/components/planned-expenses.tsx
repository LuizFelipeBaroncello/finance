"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useFormatBRL } from "@/lib/currency"
import { addPlannedExpense, deletePlannedExpense } from "../actions"
import type { PlannedExpense } from "../types"

export function PlannedExpenses({ planned, today }: { planned: PlannedExpense[]; today: string }) {
  const router = useRouter()
  const formatBRL = useFormatBRL()
  const [date, setDate] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showPast, setShowPast] = React.useState(false)

  const upcoming = planned.filter((p) => p.date > today)
  const past = planned.filter((p) => p.date <= today)
  const visible = showPast ? [...past, ...upcoming] : upcoming

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const value = parseFloat(amount.replace(",", "."))
    if (!date || date <= today) {
      setError("Escolha uma data futura.")
      return
    }
    setSaving(true)
    const res = await addPlannedExpense({ date, description, amount: value })
    setSaving(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    setDate("")
    setDescription("")
    setAmount("")
    router.refresh()
  }

  async function handleDelete(id: number) {
    const res = await deletePlannedExpense(id)
    if (res?.error) setError(res.error)
    else router.refresh()
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="grid grid-cols-[8.5rem_1fr] gap-2 sm:grid-cols-[8.5rem_1fr_6.5rem_auto]">
        <Input
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Data"
        />
        <Input
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Descrição"
        />
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Valor"
        />
        <Button type="submit" size="icon" disabled={saving} aria-label="Adicionar gasto planejado">
          <Plus />
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum gasto planejado.</p>
      ) : (
        <ul className="divide-y divide-border/60 text-sm">
          {visible.map((p) => {
            const isPast = p.date <= today
            return (
              <li key={p.free_spending_planned_id} className={cn("flex items-center gap-3 py-1.5", isPast && "text-muted-foreground")}>
                <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {p.date.slice(8, 10)}/{p.date.slice(5, 7)}
                </span>
                <span className="min-w-0 flex-1 truncate">{p.description}</span>
                <span className="shrink-0 tabular-nums">{formatBRL(p.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleDelete(p.free_spending_planned_id)}
                  aria-label={`Remover ${p.description}`}
                >
                  <X />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {past.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPast((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showPast ? "Ocultar" : "Mostrar"} {past.length} já passado{past.length > 1 ? "s" : ""} (substituídos pelo gasto real)
        </button>
      )}
    </div>
  )
}
