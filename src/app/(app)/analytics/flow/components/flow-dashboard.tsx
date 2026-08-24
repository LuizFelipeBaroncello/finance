"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Money } from "@/lib/currency"
import { SankeyFlowChart } from "./sankey-flow-chart"
import { CategorySelector } from "./category-selector"
import { allFlowKeys, buildFlowData } from "../lib/flow-aggregations"
import type { FlowTotals } from "../types"

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

  const flow = useMemo(() => buildFlowData(totals, selected), [totals, selected])

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
        <CardHeader>
          <CardTitle className="text-base">Fluxo do Período</CardTitle>
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
