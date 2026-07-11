"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFormatBRL } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { PALETTE } from "../../components/series-evolution-chart"
import type { SubperiodRow } from "../lib/compare-aggregations"

interface SubperiodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  rows: SubperiodRow[]
}

const COLUMNS = [
  { key: "receitas", label: "Receitas", invert: false },
  { key: "despesas", label: "Despesas", invert: true },
  { key: "saldo", label: "Saldo", invert: false },
] as const

export function SubperiodModal({ open, onOpenChange, title, rows }: SubperiodModalProps) {
  const formatBRL = useFormatBRL()
  const base = rows[0]

  const renderDelta = (value: number, baseValue: number, invert: boolean) => {
    const delta = value - baseValue
    if (delta === 0) {
      return <span className="text-[11px] text-muted-foreground">=</span>
    }
    const good = invert ? delta < 0 : delta > 0
    const sign = delta > 0 ? "+" : "-"
    const pct =
      baseValue !== 0
        ? ` (${sign}${Math.abs((delta / Math.abs(baseValue)) * 100).toFixed(0)}%)`
        : ""
    return (
      <span
        className={cn(
          "text-[11px] tabular-nums",
          good ? "text-green-500" : "text-red-500"
        )}
      >
        {sign}
        {formatBRL(Math.abs(delta))}
        {pct}
      </span>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Comparação do subperíodo selecionado
            {rows.length > 1 && ` · diferenças em relação a ${rows[0].label}`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="pb-2 pr-3 text-left font-medium">Período</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="pb-2 pl-3 text-right font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-1.5 whitespace-nowrap font-medium">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                      {row.label}
                      {i === 0 && rows.length > 1 && (
                        <span className="text-[11px] font-normal text-muted-foreground">
                          (base)
                        </span>
                      )}
                    </span>
                  </td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="py-2 pl-3 text-right align-top">
                      <div className="flex flex-col items-end gap-0.5">
                        <span
                          className={cn(
                            "tabular-nums",
                            c.key === "saldo" &&
                              (row.saldo >= 0 ? "text-green-500" : "text-red-500")
                          )}
                        >
                          {formatBRL(row[c.key])}
                        </span>
                        {i > 0 && renderDelta(row[c.key], base[c.key], c.invert)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
