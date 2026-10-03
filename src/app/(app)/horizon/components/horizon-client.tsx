"use client"

import * as React from "react"
import { Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFormatBRL } from "@/lib/currency"
import { averageDailySpend, buildProjection } from "../lib/projection"
import type {
  CategoryRef,
  FreeSpendingPlan,
  MacroRef,
  PlannedExpense,
  RealTransaction,
} from "../types"
import { HorizonGrid } from "./horizon-grid"
import { HorizonSummary } from "./horizon-summary"
import { PlanForm } from "./plan-form"
import { PlannedExpenses } from "./planned-expenses"
import { TrackingTable } from "./tracking-table"

const HISTORY_DAYS = 90

export function HorizonClient({
  plan,
  monthOverrides,
  planned,
  realTransactions,
  macros,
  categories,
  today,
}: {
  plan: FreeSpendingPlan | null
  monthOverrides: Record<string, number>
  planned: PlannedExpense[]
  realTransactions: RealTransaction[]
  macros: MacroRef[]
  categories: CategoryRef[]
  today: string
}) {
  const [editing, setEditing] = React.useState(false)

  const realByDate = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of realTransactions) map[t.date] = (map[t.date] ?? 0) + t.spend
    return map
  }, [realTransactions])

  const historicDaily = React.useMemo(
    () => averageDailySpend(realByDate, today, HISTORY_DAYS),
    [realByDate, today]
  )

  const projection = React.useMemo(
    () =>
      plan
        ? buildProjection({ plan, monthOverrides, planned, realByDate, today })
        : null,
    [plan, monthOverrides, planned, realByDate, today]
  )

  if (!plan || !projection) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Configurar uso livre</CardTitle>
          <p className="text-sm text-muted-foreground">
            Defina quanto entra por mês para gastos livres, quando entra, quanto você
            estima gastar por dia e quais categorias contam como uso livre.
          </p>
        </CardHeader>
        <CardContent>
          <PlanForm
            plan={null}
            macros={macros}
            categories={categories}
            today={today}
            historicDaily={null}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <HorizonSummary summary={projection.summary} today={today} plan={plan} />

      <Card size="sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Horizonte de saldos</CardTitle>
          <Legend warningPct={plan.warning_pct} />
        </CardHeader>
        <CardContent className="px-0">
          <HorizonGrid months={projection.months} today={today} />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Acompanhamento: simulado × real</CardTitle>
            <p className="text-xs text-muted-foreground">
              Compara o que a simulação previa para os dias que já passaram com o que
              você gastou de fato. Clique no aporte para ajustar um mês específico.
            </p>
          </CardHeader>
          <CardContent className="px-0">
            <TrackingTable
              tracking={projection.tracking}
              realTransactions={realTransactions}
              today={today}
              defaultAporte={plan.monthly_amount}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Gastos planejados</CardTitle>
              <p className="text-xs text-muted-foreground">
                Compras pontuais futuras, somadas ao gasto diário estimado no dia.
              </p>
            </CardHeader>
            <CardContent>
              <PlannedExpenses planned={planned} today={today} />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Configuração</CardTitle>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Settings2 /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editing ? (
                <PlanForm
                  plan={plan}
                  macros={macros}
                  categories={categories}
                  today={today}
                  historicDaily={historicDaily}
                  onDone={() => setEditing(false)}
                />
              ) : (
                <PlanDetails plan={plan} macros={macros} categories={categories} historicDaily={historicDaily} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Legend({ warningPct }: { warningPct: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-emerald-500/70" /> positivo
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-amber-400/70" /> abaixo de {warningPct}% do aporte
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-red-500/70" /> negativo
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-emerald-500/15" /> tom claro = projeção
      </span>
    </div>
  )
}

function PlanDetails({
  plan,
  macros,
  categories,
  historicDaily,
}: {
  plan: FreeSpendingPlan
  macros: MacroRef[]
  categories: CategoryRef[]
  historicDaily: number
}) {
  const brl = useFormatBRL()
  const macroNames = macros
    .filter((m) => plan.macro_category_ids.includes(m.macro_category_id))
    .map((m) => m.name)
  const categoryNames = categories
    .filter((c) => plan.category_ids.includes(c.category_id))
    .map((c) => c.category_name)

  const rows: Array<[string, React.ReactNode]> = [
    ["Início", plan.start_date.split("-").reverse().join("/")],
    ["Aporte mensal", `${brl(plan.monthly_amount)} no dia ${plan.pay_day}`],
    ["Gasto diário estimado", brl(plan.daily_estimate)],
    ["Média real (90 dias)", brl(historicDaily)],
    ["Alerta (amarelo)", `abaixo de ${plan.warning_pct}% do aporte`],
    ["Conta como uso livre", [...macroNames, ...categoryNames].join(", ") || "—"],
  ]

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right tabular-nums">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}
