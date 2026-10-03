"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useFormatBRL } from "@/lib/currency"
import { setMonthAmount } from "../actions"
import type { MonthTracking, RealTransaction } from "../types"

/** Meses exibidos: os já iniciados (acompanhamento) + os 3 próximos (ajuste de aporte). */
const FUTURE_MONTHS = 3

export function TrackingTable({
  tracking,
  realTransactions,
  today,
  defaultAporte,
}: {
  tracking: MonthTracking[]
  realTransactions: RealTransaction[]
  today: string
  defaultAporte: number
}) {
  const formatBRL = useFormatBRL()
  const todayMonth = today.slice(0, 7)
  const [expanded, setExpanded] = React.useState<string | null>(todayMonth)

  const pastAndCurrent = tracking.filter((t) => t.month <= todayMonth)
  const upcoming = tracking.filter((t) => t.month > todayMonth).slice(0, FUTURE_MONTHS)
  // Mais recente primeiro: o mês atual é o que mais interessa acompanhar.
  const rows = [...upcoming.reverse(), ...pastAndCurrent.reverse()]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-4 py-2 text-left font-medium">Mês</th>
            <th className="px-2 py-2 text-right font-medium">Aporte</th>
            <th className="px-2 py-2 text-right font-medium">Simulado até hoje</th>
            <th className="px-2 py-2 text-right font-medium">Real até hoje</th>
            <th className="px-2 py-2 text-right font-medium">Desvio</th>
            <th className="px-2 py-2 text-right font-medium">Previsão do mês</th>
            <th className="px-4 py-2 text-right font-medium">Saldo final</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const started = row.elapsedDays > 0
            const deviation = row.realToDate - row.estimatedToDate
            const isOpen = expanded === row.month
            const monthTxs = isOpen
              ? realTransactions.filter((t) => t.date.startsWith(row.month))
              : []
            return (
              <React.Fragment key={row.month}>
                <tr
                  className={cn(
                    "border-b border-border/60",
                    row.month === todayMonth && "bg-muted/40"
                  )}
                >
                  <td className="px-4 py-1.5">
                    {started ? (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : row.month)}
                        className="flex items-center gap-1 font-medium hover:text-foreground"
                      >
                        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        {row.label}
                      </button>
                    ) : (
                      <span className="pl-[1.125rem] text-muted-foreground">{row.label}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <AporteCell row={row} defaultAporte={defaultAporte} />
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                    {started ? formatBRL(row.estimatedToDate) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {started ? formatBRL(row.realToDate) : "—"}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-1.5 text-right tabular-nums",
                      started && deviation > 0 && "text-red-600 dark:text-red-400",
                      started && deviation < 0 && "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {started ? `${deviation > 0 ? "+" : ""}${formatBRL(deviation)}` : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                    {formatBRL(row.forecastTotal)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-1.5 text-right font-medium tabular-nums",
                      row.closingBalance < 0 && "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatBRL(row.closingBalance)}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-border/60 bg-muted/20">
                    <td colSpan={7} className="px-4 py-2">
                      {monthTxs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhum gasto de uso livre registrado neste mês.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border/60 text-xs">
                          {monthTxs.map((t) => (
                            <li key={t.trans_id} className="flex items-center gap-3 py-1">
                              <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                                {t.date.slice(8, 10)}/{t.date.slice(5, 7)}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{t.description}</span>
                              <span className="hidden shrink-0 text-muted-foreground sm:inline">
                                {t.category_name}
                              </span>
                              <span
                                className={cn(
                                  "w-24 shrink-0 text-right tabular-nums",
                                  t.spend < 0 && "text-emerald-600 dark:text-emerald-400"
                                )}
                              >
                                {formatBRL(-t.spend)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AporteCell({ row, defaultAporte }: { row: MonthTracking; defaultAporte: number }) {
  const router = useRouter()
  const formatBRL = useFormatBRL()
  const [editing, setEditing] = React.useState(false)
  const [raw, setRaw] = React.useState(String(row.aporte))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function save(amount: number | null) {
    setSaving(true)
    setError(null)
    const res = await setMonthAmount(row.month, amount)
    setSaving(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <form
        className="flex items-center justify-end gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          const value = parseFloat(raw.replace(",", "."))
          if (!Number.isFinite(value) || value < 0) {
            setError("Valor inválido.")
            return
          }
          save(value === defaultAporte ? null : value)
        }}
      >
        <Input
          autoFocus
          type="number"
          min={0}
          step="0.01"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          aria-invalid={!!error}
          title={error ?? undefined}
          className="h-7 w-28 text-right"
          disabled={saving}
        />
      </form>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          setRaw(String(row.aporte))
          setEditing(true)
        }}
        className={cn(
          "rounded px-1 tabular-nums hover:bg-muted",
          row.isOverride && "font-medium text-foreground underline decoration-dotted underline-offset-4"
        )}
        title={row.isOverride ? "Aporte ajustado para este mês" : "Clique para ajustar este mês"}
      >
        {formatBRL(row.aporte)}
      </button>
      {row.isOverride && (
        <Button
          variant="ghost"
          size="icon-xs"
          title="Voltar ao aporte padrão"
          onClick={() => save(null)}
          disabled={saving}
        >
          <RotateCcw />
        </Button>
      )}
    </span>
  )
}
