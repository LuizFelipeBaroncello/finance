"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MacroPieChart } from "./macro-pie-chart"
import { MacroTargetsForm } from "./macro-targets-form"
import { MacroProgressList } from "./macro-progress-list"
import { TransactionsByMacro } from "./transactions-by-macro"
import { Simulation } from "./simulation"
import { MonthSwitcher } from "./month-switcher"
import { PeriodSwitcher } from "./period-switcher"
import { PeriodGoalsForm } from "./period-goals-form"
import { PeriodProgressList } from "./period-progress-list"

export type Macro = {
  macro_category_id: number
  name: string
  slug: string
  display_order: number
}

export type Goal = {
  macro_category_id: number
  target_percentage: number
}

export type CategoryRef = {
  category_id: number
  category_name: string
  macro_category_id: number | null
}

export type PeriodType = "quarter" | "semester" | "year"

export type PeriodGoalRow = {
  period_goal_id: number
  macro_category_id: number | null
  category_id: number | null
  period_type: PeriodType
  year: number | null
  period_index: number | null
  kind: "cap" | "target"
  amount: number
}

export type GoalTransaction = {
  trans_id: number
  date: string
  description: string
  amount: number
  category_id: number | null
  macro_category_id: number | null
  category_name: string | null
}

export type ResolvedPeriodGoal = {
  key: string
  periodGoalId: number | null
  scope: "macro" | "category"
  refId: number
  label: string
  kind: "cap" | "target"
  amount: number
  realized: number
  isTemplate: boolean
}

const COLORS = [
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#71717a",
]

export function GoalsClient({
  macros,
  goals,
  periodGoals,
  categories,
  transactions,
  monthLabel,
  selectedMonth,
  view,
  periodType,
  periodYear,
  periodIndex,
  periodLabel,
}: {
  macros: Macro[]
  goals: Goal[]
  periodGoals: PeriodGoalRow[]
  categories: CategoryRef[]
  transactions: GoalTransaction[]
  monthLabel: string
  selectedMonth: string
  view: "monthly" | "period"
  periodType: PeriodType
  periodYear: number
  periodIndex: number | null
  periodLabel: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [monthlyTab, setMonthlyTab] = React.useState<"planning" | "tracking">("planning")
  const tab = view === "period" ? "period" : monthlyTab

  const handleTabChange = (value: string) => {
    if (value === "period") {
      const sp = new URLSearchParams(searchParams.toString())
      sp.set("view", "period")
      router.push(`${pathname}?${sp.toString()}`)
      return
    }
    if (view === "period") {
      const sp = new URLSearchParams(searchParams.toString())
      sp.delete("view")
      sp.delete("period")
      sp.delete("year")
      sp.delete("pidx")
      router.push(`${pathname}?${sp.toString()}`)
    }
    setMonthlyTab(value === "tracking" ? "tracking" : "planning")
  }

  const totals = React.useMemo(() => {
    const acc: Record<string, number> = {}
    for (const m of macros) acc[String(m.macro_category_id)] = 0
    acc["null"] = 0
    for (const t of transactions) {
      const key = t.macro_category_id === null ? "null" : String(t.macro_category_id)
      acc[key] = (acc[key] ?? 0) + t.amount
    }
    return acc
  }, [macros, transactions])

  const totalSpent = React.useMemo(
    () => transactions.reduce((s, t) => s + t.amount, 0),
    [transactions]
  )

  const pieData = React.useMemo(() => {
    const data = macros.map((m, i) => ({
      name: m.name,
      value: totals[String(m.macro_category_id)] ?? 0,
      color: COLORS[i % COLORS.length],
    }))
    const unclassified = totals["null"] ?? 0
    if (unclassified > 0) {
      data.push({ name: "Sem macro", value: unclassified, color: COLORS[6] })
    }
    return data.filter((d) => d.value > 0)
  }, [macros, totals])

  const goalsByMacro = React.useMemo(() => {
    const map: Record<number, number> = {}
    for (const g of goals) map[g.macro_category_id] = g.target_percentage
    return map
  }, [goals])

  const totalsByCategory = React.useMemo(() => {
    const acc: Record<number, number> = {}
    for (const t of transactions) {
      if (t.category_id !== null) {
        acc[t.category_id] = (acc[t.category_id] ?? 0) + t.amount
      }
    }
    return acc
  }, [transactions])

  const macroNameById = React.useMemo(() => {
    const m: Record<number, string> = {}
    for (const x of macros) m[x.macro_category_id] = x.name
    return m
  }, [macros])

  const categoryNameById = React.useMemo(() => {
    const m: Record<number, string> = {}
    for (const c of categories) m[c.category_id] = c.category_name
    return m
  }, [categories])

  const resolvedPeriodGoals: ResolvedPeriodGoal[] = React.useMemo(() => {
    const relevant = periodGoals.filter((g) => g.period_type === periodType)
    const overrides = new Map<string, PeriodGoalRow>()
    const templates = new Map<string, PeriodGoalRow>()
    for (const g of relevant) {
      const scopeKey = g.macro_category_id !== null
        ? `m:${g.macro_category_id}:${g.kind}`
        : `c:${g.category_id}:${g.kind}`
      if (g.year === null) {
        templates.set(scopeKey, g)
      } else if (
        g.year === periodYear &&
        (periodType === "year" || g.period_index === periodIndex)
      ) {
        overrides.set(scopeKey, g)
      }
    }
    const allKeys = new Set([...overrides.keys(), ...templates.keys()])
    const out: ResolvedPeriodGoal[] = []
    for (const key of allKeys) {
      const row = overrides.get(key) ?? templates.get(key)!
      const isTemplate = !overrides.has(key)
      const scope: "macro" | "category" = row.macro_category_id !== null ? "macro" : "category"
      const refId = (scope === "macro" ? row.macro_category_id : row.category_id) as number
      const label =
        scope === "macro"
          ? macroNameById[refId] ?? `Macro #${refId}`
          : categoryNameById[refId] ?? `Categoria #${refId}`
      const realized =
        scope === "macro"
          ? totals[String(refId)] ?? 0
          : totalsByCategory[refId] ?? 0
      out.push({
        key,
        periodGoalId: row.period_goal_id,
        scope,
        refId,
        label,
        kind: row.kind,
        amount: Number(row.amount),
        realized,
        isTemplate,
      })
    }
    return out.sort((a, b) => a.label.localeCompare(b.label))
  }, [
    periodGoals,
    periodType,
    periodYear,
    periodIndex,
    macroNameById,
    categoryNameById,
    totals,
    totalsByCategory,
  ])

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="planning">Planejamento</TabsTrigger>
          <TabsTrigger value="tracking">Acompanhamento</TabsTrigger>
          <TabsTrigger value="period">Metas por período</TabsTrigger>
        </TabsList>
        {view === "period" ? (
          <PeriodSwitcher
            periodType={periodType}
            year={periodYear}
            periodIndex={periodIndex}
            label={periodLabel}
          />
        ) : (
          <MonthSwitcher selectedMonth={selectedMonth} />
        )}
      </div>

      <TabsContent value="planning">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Uso atual ({monthLabel})</CardTitle>
            </CardHeader>
            <CardContent>
              <MacroPieChart data={pieData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Metas de distribuição</CardTitle>
            </CardHeader>
            <CardContent>
              <MacroTargetsForm macros={macros} initialGoals={goalsByMacro} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="tracking">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Planejado × Realizado ({monthLabel})</CardTitle>
            </CardHeader>
            <CardContent>
              <MacroProgressList
                macros={macros}
                goalsByMacro={goalsByMacro}
                totalsByMacro={totals}
                totalSpent={totalSpent}
                colors={COLORS}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Simulação (uso real de {monthLabel})</CardTitle>
            </CardHeader>
            <CardContent>
              <Simulation
                macros={macros}
                goalsByMacro={goalsByMacro}
                totalsByMacro={totals}
                colors={COLORS}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saídas do mês por macro</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsByMacro macros={macros} transactions={transactions} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="period">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Metas de {periodLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PeriodGoalsForm
                macros={macros}
                categories={categories}
                periodType={periodType}
                year={periodYear}
                periodIndex={periodIndex}
              />
              <PeriodProgressList resolved={resolvedPeriodGoals} onDeleted={() => router.refresh()} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}
