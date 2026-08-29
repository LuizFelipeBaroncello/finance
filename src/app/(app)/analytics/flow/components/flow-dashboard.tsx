"use client"

import { useMemo, useState } from "react"
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Money } from "@/lib/currency"
import { SankeyFlowChart } from "./sankey-flow-chart"
import { CategorySelector } from "./category-selector"
import { allFlowKeys, buildFlowData } from "../lib/flow-aggregations"
import type { FlowSort, FlowTotals } from "../types"

const SORT_OPTIONS: Array<{
  value: FlowSort
  label: string
  title: string
  icon?: typeof ArrowDownWideNarrow
}> = [
  {
    value: "default",
    label: "Padrão",
    title: "Agrupadas por macro categoria",
  },
  {
    value: "desc",
    label: "Maior",
    title: "Do maior para o menor valor",
    icon: ArrowDownWideNarrow,
  },
  {
    value: "asc",
    label: "Menor",
    title: "Do menor para o maior valor",
    icon: ArrowUpNarrowWide,
  },
]

function SummaryCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

interface FlowDashboardProps {
  totals: FlowTotals
}

export function FlowDashboard({ totals }: FlowDashboardProps) {
  // Tudo selecionado por padrão; desmarcar uma categoria a tira do gráfico e
  // dos totais, então os cards e o Sankey nunca discordam entre si.
  const [selected, setSelected] = useState(() => allFlowKeys(totals))
  // Desligado, o gráfico liga a Renda Total direto nas categorias.
  const [showMacros, setShowMacros] = useState(true)
  const [sort, setSort] = useState<FlowSort>("default")

  const flow = useMemo(
    () => buildFlowData(totals, selected, showMacros, sort),
    [totals, selected, showMacros, sort]
  )

  const positivo = flow.sobra >= 0
  const tone = positivo ? "text-green-500" : "text-red-500"

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Receitas">
          <Money
            value={flow.totalReceitas}
            className="text-xl font-semibold text-green-500"
          />
        </SummaryCard>
        <SummaryCard title="Despesas">
          <Money
            value={flow.totalDespesas}
            className="text-xl font-semibold text-red-500"
          />
        </SummaryCard>
        <SummaryCard title={positivo ? "Sobra" : "Déficit"}>
          <Money
            value={Math.abs(flow.sobra)}
            className={`text-xl font-semibold ${tone}`}
          />
        </SummaryCard>
        <SummaryCard title="Taxa de poupança">
          <p className={`text-xl font-semibold ${tone}`}>
            {flow.totalReceitas > 0
              ? `${((flow.sobra / flow.totalReceitas) * 100).toFixed(1)}%`
              : "—"}
          </p>
        </SummaryCard>
      </div>

      <Card>
        {/* flex em vez do grid padrão do CardHeader: em telas estreitas os
            controles quebram para baixo do título em vez de espremê-lo. */}
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Fluxo do Período</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {/* Sem as macros o agrupamento some, então a ordem passa a ser
                escolha do usuário. */}
            {!showMacros && (
              <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
                {SORT_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.title}
                      aria-pressed={sort === opt.value}
                      onClick={() => setSort(opt.value)}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                        sort === opt.value
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {Icon && <Icon className="size-3.5" />}
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )}
            <button
              type="button"
              aria-pressed={showMacros}
              onClick={() => setShowMacros((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                showMacros
                  ? "border-border bg-accent text-accent-foreground"
                  : "border-dashed border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="size-3.5" />
              Ver macros
            </button>
          </div>
        </CardHeader>
        <CardContent className="pl-2">
          <SankeyFlowChart data={flow} />
          <CategorySelector
            totals={totals}
            selected={selected}
            onChange={setSelected}
          />
        </CardContent>
      </Card>
    </>
  )
}
