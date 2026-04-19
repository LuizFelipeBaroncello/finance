"use client"

import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReportRow } from "../types"

const MONTH_INDEX: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
}

function parseMes(mes: string): number {
  const [mon, yy] = mes.split("/")
  const m = MONTH_INDEX[mon.toLowerCase().slice(0, 3)] ?? 0
  const year = 2000 + parseInt(yy, 10)
  return year * 12 + m
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export function FinancialReportTable({ rows }: { rows: ReportRow[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const meses = useMemo(() => {
    const set = new Set(rows.map((r) => r.Mês))
    return Array.from(set).sort((a, b) => parseMes(a) - parseMes(b))
  }, [rows])

  const categorias = useMemo(() => {
    const grouped: Record<string, { tipo: "Credit" | "Debit"; porMes: Record<string, number> }> = {}
    for (const r of rows) {
      if (!grouped[r.Categoria]) grouped[r.Categoria] = { tipo: r.Tipo, porMes: {} }
      grouped[r.Categoria].porMes[r.Mês] = r.Valor
    }
    return grouped
  }, [rows])

  const toggle = (cat: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const receitasCats = useMemo(
    () =>
      Object.entries(categorias)
        .filter(([, v]) => v.tipo === "Credit")
        .sort(([a], [b]) => a.localeCompare(b, "pt-BR")),
    [categorias]
  )
  const despesasCats = useMemo(
    () =>
      Object.entries(categorias)
        .filter(([, v]) => v.tipo === "Debit")
        .sort(([a], [b]) => a.localeCompare(b, "pt-BR")),
    [categorias]
  )

  const totaisPorMes = useMemo(() => {
    const out: Record<string, { receitas: number; despesas: number }> = {}
    for (const mes of meses) {
      let receitas = 0
      let despesas = 0
      for (const [cat, v] of Object.entries(categorias)) {
        if (hidden.has(cat)) continue
        const val = v.porMes[mes] ?? 0
        if (v.tipo === "Credit") receitas += val
        else despesas += val
      }
      out[mes] = { receitas, despesas }
    }
    return out
  }, [categorias, meses, hidden])

  const totalCategoria = (cat: string) => {
    if (hidden.has(cat)) return 0
    const porMes = categorias[cat]?.porMes ?? {}
    return meses.reduce((acc, mes) => acc + (porMes[mes] ?? 0), 0)
  }

  const totalReceitas = meses.reduce((a, m) => a + totaisPorMes[m].receitas, 0)
  const totalDespesas = meses.reduce((a, m) => a + totaisPorMes[m].despesas, 0)
  const totalSaldo = totalReceitas + totalDespesas

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum dado para o período selecionado.</p>
    )
  }

  const renderCategoriaRow = (cat: string, porMes: Record<string, number>) => {
    const isHidden = hidden.has(cat)
    const total = totalCategoria(cat)
    return (
      <TableRow
        key={cat}
        onClick={() => toggle(cat)}
        className={cn("cursor-pointer", isHidden && "opacity-40")}
      >
        <TableCell className="font-medium">{cat}</TableCell>
        {meses.map((mes) => (
          <TableCell key={mes} className="text-right tabular-nums">
            {porMes[mes] ? fmt(porMes[mes]) : "—"}
          </TableCell>
        ))}
        <TableCell className="text-right tabular-nums font-medium">{fmt(total)}</TableCell>
      </TableRow>
    )
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[12rem]">Categoria</TableHead>
            {meses.map((mes) => (
              <TableHead key={mes} className="text-right">
                {mes}
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-emerald-500/10 hover:bg-emerald-500/15">
            <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
              Receitas
            </TableCell>
            {meses.map((mes) => (
              <TableCell
                key={mes}
                className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400"
              >
                {fmt(totaisPorMes[mes].receitas)}
              </TableCell>
            ))}
            <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
              {fmt(totalReceitas)}
            </TableCell>
          </TableRow>
          {receitasCats.map(([cat, v]) => renderCategoriaRow(cat, v.porMes))}

          <TableRow className="bg-rose-500/10 hover:bg-rose-500/15">
            <TableCell className="font-semibold text-rose-600 dark:text-rose-400">
              Despesas
            </TableCell>
            {meses.map((mes) => (
              <TableCell
                key={mes}
                className="text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400"
              >
                {fmt(totaisPorMes[mes].despesas)}
              </TableCell>
            ))}
            <TableCell className="text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
              {fmt(totalDespesas)}
            </TableCell>
          </TableRow>
          {despesasCats.map(([cat, v]) => renderCategoriaRow(cat, v.porMes))}

          <TableRow className="bg-muted/50 border-t-2">
            <TableCell className="font-semibold">Saldo final</TableCell>
            {meses.map((mes) => {
              const saldo = totaisPorMes[mes].receitas + totaisPorMes[mes].despesas
              return (
                <TableCell
                  key={mes}
                  className={cn(
                    "text-right tabular-nums font-semibold",
                    saldo >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {fmt(saldo)}
                </TableCell>
              )
            })}
            <TableCell
              className={cn(
                "text-right tabular-nums font-semibold",
                totalSaldo >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {fmt(totalSaldo)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  )
}
