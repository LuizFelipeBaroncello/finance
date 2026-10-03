"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useFormatBRL } from "@/lib/currency"
import { savePlan } from "../actions"
import type { CategoryRef, FreeSpendingPlan, MacroRef } from "../types"

function parseNumber(raw: string) {
  return parseFloat(raw.replace(",", "."))
}

export function PlanForm({
  plan,
  macros,
  categories,
  today,
  historicDaily,
  onDone,
}: {
  plan: FreeSpendingPlan | null
  macros: MacroRef[]
  categories: CategoryRef[]
  today: string
  /** Média diária real das categorias atuais; null quando ainda não há plano. */
  historicDaily: number | null
  onDone?: () => void
}) {
  const router = useRouter()
  const formatBRL = useFormatBRL()
  const [startDate, setStartDate] = React.useState(plan?.start_date ?? `${today.slice(0, 7)}-01`)
  const [monthly, setMonthly] = React.useState(plan ? String(plan.monthly_amount) : "")
  const [payDay, setPayDay] = React.useState(plan ? String(plan.pay_day) : "5")
  const [daily, setDaily] = React.useState(plan ? String(plan.daily_estimate) : "")
  const [warningPct, setWarningPct] = React.useState(plan ? String(plan.warning_pct) : "20")
  const [macroIds, setMacroIds] = React.useState<Set<number>>(new Set(plan?.macro_category_ids ?? []))
  const [categoryIds, setCategoryIds] = React.useState<Set<number>>(new Set(plan?.category_ids ?? []))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const groups = React.useMemo(() => {
    const byMacro = new Map<number | null, CategoryRef[]>()
    for (const c of categories) {
      const key = c.macro_category_id
      byMacro.set(key, [...(byMacro.get(key) ?? []), c])
    }
    return [
      ...macros.map((m) => ({ macro: m as MacroRef | null, items: byMacro.get(m.macro_category_id) ?? [] })),
      { macro: null, items: byMacro.get(null) ?? [] },
    ].filter((g) => g.macro || g.items.length > 0)
  }, [macros, categories])

  function toggle(set: Set<number>, id: number, update: (s: Set<number>) => void) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    update(next)
  }

  function toggleMacro(id: number) {
    toggle(macroIds, id, setMacroIds)
    // Categorias da macro ficam implícitas; evita seleção duplicada.
    const inMacro = categories.filter((c) => c.macro_category_id === id).map((c) => c.category_id)
    setCategoryIds((prev) => new Set([...prev].filter((c) => !inMacro.includes(c))))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const res = await savePlan({
      startDate,
      monthlyAmount: parseNumber(monthly),
      payDay: Number(payDay),
      dailyEstimate: daily.trim() === "" ? 0 : parseNumber(daily),
      warningPct: parseNumber(warningPct),
      macroCategoryIds: [...macroIds],
      categoryIds: [...categoryIds],
    })
    setSaving(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    onDone?.()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Aporte mensal (R$)" htmlFor="fs-monthly">
          <Input
            id="fs-monthly"
            type="number"
            min={0}
            step="0.01"
            placeholder="Ex: 2000"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            required
          />
        </Field>
        <Field label="Dia do aporte" htmlFor="fs-payday">
          <Input
            id="fs-payday"
            type="number"
            min={1}
            max={31}
            value={payDay}
            onChange={(e) => setPayDay(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Gasto diário estimado (R$)"
          htmlFor="fs-daily"
          hint={
            historicDaily !== null ? (
              <button
                type="button"
                className="underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => setDaily(historicDaily.toFixed(2))}
              >
                usar média real de 90 dias ({formatBRL(historicDaily)})
              </button>
            ) : undefined
          }
        >
          <Input
            id="fs-daily"
            type="number"
            min={0}
            step="0.01"
            placeholder="Ex: 60"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
          />
        </Field>
        <Field label="Alerta amarelo abaixo de (% do aporte)" htmlFor="fs-warning">
          <Input
            id="fs-warning"
            type="number"
            min={0}
            max={100}
            step="1"
            value={warningPct}
            onChange={(e) => setWarningPct(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Início da simulação"
          htmlFor="fs-start"
          hint="O saldo começa em zero nesta data."
        >
          <Input
            id="fs-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">O que conta como uso livre</p>
        <p className="text-xs text-muted-foreground">
          Gastos reais nessas macros/categorias descontam do saldo; estornos devolvem.
        </p>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
          {groups.map(({ macro, items }) => {
            const macroChecked = macro ? macroIds.has(macro.macro_category_id) : false
            return (
              <div key={macro?.macro_category_id ?? "none"}>
                {macro ? (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={macroChecked}
                      onChange={() => toggleMacro(macro.macro_category_id)}
                    />
                    {macro.name}
                    <span className="text-xs font-normal text-muted-foreground">(macro inteira)</span>
                  </label>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">Sem macro</p>
                )}
                <div className="ml-5 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {items.map((c) => (
                    <label
                      key={c.category_id}
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        macroChecked ? "text-muted-foreground" : "text-foreground"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={macroChecked || categoryIds.has(c.category_id)}
                        disabled={macroChecked}
                        onChange={() => toggle(categoryIds, c.category_id, setCategoryIds)}
                      />
                      {c.category_name}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        {onDone && (
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
