"use client"

import { useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFormatBRL } from "@/lib/currency"
import { PALETTE } from "../../components/series-evolution-chart"
import type { ComparePeriodData } from "../types"

interface CompareTransactionListProps {
  periods: ComparePeriodData[]
  hiddenIds: Set<number>
  onToggleHidden: (id: number) => void
  onClearHidden: () => void
}

const TYPE_LABELS = { debit: "Despesa", credit: "Receita", transfer: "Transferência" }

export function CompareTransactionList({
  periods,
  hiddenIds,
  onToggleHidden,
  onClearHidden,
}: CompareTransactionListProps) {
  const formatBRL = useFormatBRL()
  const [search, setSearch] = useState("")
  const [activeToken, setActiveToken] = useState(periods[0]?.spec.token ?? "")

  const activeIndex = Math.max(
    0,
    periods.findIndex((p) => p.spec.token === activeToken)
  )
  const active = periods[activeIndex]

  const rows = useMemo(() => {
    if (!active) return []
    const term = search.trim().toLowerCase()
    return active.transactions
      .filter((t) => !term || t.description.toLowerCase().includes(term))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [active, search])

  if (!active) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Transações do período</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {periods.map((p, i) => (
            <Button
              key={p.spec.token}
              size="sm"
              variant={i === activeIndex ? "secondary" : "ghost"}
              onClick={() => setActiveToken(p.spec.token)}
            >
              <span
                className="mr-1.5 size-2 rounded-full"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              {p.spec.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Pesquisar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          {hiddenIds.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <EyeOff className="size-3.5" />
              <span>
                {hiddenIds.size}{" "}
                {hiddenIds.size === 1 ? "transação oculta" : "transações ocultas"} do gráfico
              </span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClearHidden}>
                Mostrar todas
              </Button>
            </div>
          )}
        </div>

        <div className="max-h-[480px] overflow-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              )}
              {rows.map((tx) => {
                const isHidden = hiddenIds.has(tx.trans_id)
                return (
                  <TableRow key={tx.trans_id} className={isHidden ? "opacity-40" : ""}>
                    <TableCell className="px-2">
                      <button
                        onClick={() => onToggleHidden(tx.trans_id)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                        title={isHidden ? "Mostrar no gráfico" : "Ocultar do gráfico"}
                      >
                        {isHidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(tx.date.replace(" ", "T")).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell
                      className={`whitespace-nowrap font-medium ${
                        tx.type === "credit"
                          ? "text-green-600 dark:text-green-400"
                          : tx.type === "debit"
                            ? "text-red-600 dark:text-red-400"
                            : ""
                      }`}
                    >
                      {tx.type === "credit" ? "+" : tx.type === "debit" ? "-" : ""}
                      {formatBRL(Math.abs(tx.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "debit" ? "destructive" : tx.type === "credit" ? "default" : "secondary"}>
                        {TYPE_LABELS[tx.type]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
