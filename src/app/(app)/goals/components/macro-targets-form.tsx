"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateGoals } from "../actions"
import type { Macro } from "./goals-client"

export function MacroTargetsForm({
  macros,
  initialGoals,
}: {
  macros: Macro[]
  initialGoals: Record<number, number>
}) {
  const [values, setValues] = React.useState<Record<number, string>>(() =>
    Object.fromEntries(
      macros.map((m) => [m.macro_category_id, String(initialGoals[m.macro_category_id] ?? 0)])
    )
  )
  const [saving, setSaving] = React.useState(false)
  const [feedback, setFeedback] = React.useState<{ type: "ok" | "err"; msg: string } | null>(null)

  const total = macros.reduce(
    (s, m) => s + (parseFloat(values[m.macro_category_id] ?? "0") || 0),
    0
  )
  const isValid = Math.round(total * 100) / 100 === 100

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    setSaving(true)
    const targets = macros.map((m) => ({
      macro_category_id: m.macro_category_id,
      target_percentage: parseFloat(values[m.macro_category_id] ?? "0") || 0,
    }))
    const res = await updateGoals(targets)
    setSaving(false)
    if (res?.error) setFeedback({ type: "err", msg: res.error })
    else setFeedback({ type: "ok", msg: "Metas salvas." })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {macros.map((m) => (
          <div key={m.macro_category_id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={`macro-${m.macro_category_id}`} className="font-medium">
                {m.name}
              </label>
              <span className="text-muted-foreground">
                {values[m.macro_category_id] || "0"}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id={`macro-${m.macro_category_id}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={parseFloat(values[m.macro_category_id] ?? "0") || 0}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [m.macro_category_id]: e.target.value }))
                }
                className="flex-1 accent-primary"
              />
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={values[m.macro_category_id] ?? "0"}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [m.macro_category_id]: e.target.value }))
                }
                className="w-20 text-right"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className={isValid ? "font-medium text-foreground" : "font-medium text-destructive"}>
          {total.toFixed(2)}%
        </span>
      </div>

      {feedback && (
        <p
          className={
            feedback.type === "ok"
              ? "text-sm text-emerald-500"
              : "text-sm text-destructive"
          }
        >
          {feedback.msg}
        </p>
      )}

      <Button type="submit" disabled={!isValid || saving} className="w-full">
        {saving ? "Salvando..." : "Salvar metas"}
      </Button>
    </form>
  )
}
