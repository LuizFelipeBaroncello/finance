"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, X } from "lucide-react"
import { upsertPeriodGoal, type UpsertPeriodGoalInput } from "../actions"
import type { Macro, CategoryRef } from "./goals-client"

type PeriodType = "quarter" | "semester" | "year"

export function PeriodGoalsForm({
  macros,
  categories,
  periodType,
  year,
  periodIndex,
}: {
  macros: Macro[]
  categories: CategoryRef[]
  periodType: PeriodType
  year: number
  periodIndex: number | null
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [scope, setScope] = React.useState<"macro" | "category">("macro")
  const [macroId, setMacroId] = React.useState<string>("")
  const [categoryId, setCategoryId] = React.useState<string>("")
  const [kind, setKind] = React.useState<"cap" | "target">("cap")
  const [amount, setAmount] = React.useState<string>("")
  const [isTemplate, setIsTemplate] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reset = () => {
    setScope("macro")
    setMacroId("")
    setCategoryId("")
    setKind("cap")
    setAmount("")
    setIsTemplate(true)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(amount.replace(",", "."))
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      setError("Valor inválido.")
      return
    }
    const input: UpsertPeriodGoalInput = {
      scope,
      macroCategoryId: scope === "macro" ? Number(macroId) : null,
      categoryId: scope === "category" ? Number(categoryId) : null,
      periodType,
      year: isTemplate ? null : year,
      periodIndex: isTemplate ? null : periodType === "year" ? null : periodIndex,
      kind,
      amount: amountNum,
    }
    setSaving(true)
    const res = await upsertPeriodGoal(input)
    setSaving(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    reset()
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" /> Nova meta
      </Button>
    )
  }

  const periodLabel =
    periodType === "year"
      ? `${year}`
      : periodType === "quarter"
        ? `Q${periodIndex} ${year}`
        : `S${periodIndex} ${year}`

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Nova meta</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            reset()
            setOpen(false)
          }}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Escopo</label>
          <Select value={scope} onValueChange={(v) => setScope(v as "macro" | "category")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="macro">Macro categoria</SelectItem>
              <SelectItem value="category">Categoria</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scope === "macro" ? (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Macro</label>
            <Select value={macroId} onValueChange={(v) => setMacroId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {macros.map((m) => (
                  <SelectItem key={m.macro_category_id} value={String(m.macro_category_id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Categoria</label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.category_id} value={String(c.category_id)}>
                    {c.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tipo</label>
          <Select value={kind} onValueChange={(v) => setKind(v as "cap" | "target")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cap">Teto de gasto</SelectItem>
              <SelectItem value="target">Alvo de acúmulo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Valor (R$)</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={isTemplate}
          onChange={(e) => setIsTemplate(e.target.checked)}
          className="accent-primary"
        />
        Aplicar a todo período {periodType === "year" ? "(ano)" : periodType === "quarter" ? "(trimestre)" : "(semestre)"}{" "}
        {!isTemplate && `(somente ${periodLabel})`}
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => { reset(); setOpen(false) }}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  )
}
