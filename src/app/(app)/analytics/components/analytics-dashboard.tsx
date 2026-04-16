"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EvolutionChart } from "./evolution-chart"
import { CategoryChart } from "./category-chart"
import { TypeChart } from "./type-chart"
import { AccountChart } from "./account-chart"
import { SeriesEvolutionChart } from "./series-evolution-chart"
import { TransactionList } from "./transaction-list"
import {
  groupByPeriod,
  groupByCategory,
  groupByAccount,
  groupCategoryByPeriod,
  groupAccountByPeriod,
  getCategoryNames,
} from "../lib/aggregations"
import { applyCategoryFilter } from "../lib/category-filter"
import type { CategoryFilter, Transaction } from "../types"

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

interface AnalyticsDashboardProps {
  transactions: Transaction[]
  categories: string[]
  granularity: string
}

export function AnalyticsDashboard({
  transactions,
  categories,
  granularity,
}: AnalyticsDashboardProps) {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>({
    mode: "include",
    selected: new Set(),
  })
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())

  // Debounce search for chart aggregation
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [search])

  const handleToggleHidden = useCallback((id: number) => {
    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleClearHidden = useCallback(() => {
    setHiddenIds(new Set())
  }, [])

  // Transactions filtered by search + category (for chart aggregation)
  const filteredForCharts = useMemo(() => {
    let result = transactions

    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase()
      result = result.filter((t) => t.description.toLowerCase().includes(term))
    }

    result = applyCategoryFilter(result, categoryFilter)

    // Exclude hidden transactions from charts
    if (hiddenIds.size > 0) {
      result = result.filter((t) => !hiddenIds.has(t.trans_id))
    }

    return result
  }, [transactions, debouncedSearch, categoryFilter, hiddenIds])

  // Aggregations
  const evolutionData = useMemo(
    () => groupByPeriod(filteredForCharts, granularity),
    [filteredForCharts, granularity]
  )
  const categoryData = useMemo(
    () => groupByCategory(filteredForCharts),
    [filteredForCharts]
  )
  const accountData = useMemo(
    () => groupByAccount(filteredForCharts),
    [filteredForCharts]
  )
  const categoryEvolution = useMemo(
    () => groupCategoryByPeriod(filteredForCharts, granularity),
    [filteredForCharts, granularity]
  )
  const accountEvolution = useMemo(
    () => groupAccountByPeriod(filteredForCharts, granularity),
    [filteredForCharts, granularity]
  )

  // Summary totals
  const { totalReceitas, totalDespesas, saldo, totalTransacoes } = useMemo(() => {
    const receitas = filteredForCharts
      .filter((t) => t.type === "credit")
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    const despesas = filteredForCharts
      .filter((t) => t.type === "debit")
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    return {
      totalReceitas: receitas,
      totalDespesas: despesas,
      saldo: receitas - despesas,
      totalTransacoes: filteredForCharts.length,
    }
  }, [filteredForCharts])

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-green-500">{formatBRL(totalReceitas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-red-500">{formatBRL(totalDespesas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-xl font-semibold ${saldo >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {formatBRL(saldo)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">{totalTransacoes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Evolução Receitas / Despesas / Saldo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução no Período</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <EvolutionChart data={evolutionData} />
        </CardContent>
      </Card>

      {/* Débito vs Crédito por período */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Débito vs Crédito por Período</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <TypeChart data={evolutionData} />
        </CardContent>
      </Card>

      {/* Categorias: totais + evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Categoria (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <CategoryChart data={categoryData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução por Categoria (Top 5)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <SeriesEvolutionChart
              data={categoryEvolution.data}
              seriesKeys={categoryEvolution.seriesKeys}
            />
          </CardContent>
        </Card>
      </div>

      {/* Contas: totais + evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Conta</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <AccountChart data={accountData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução por Conta</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <SeriesEvolutionChart
              data={accountEvolution.data}
              seriesKeys={accountEvolution.seriesKeys}
            />
          </CardContent>
        </Card>
      </div>

      {/* Listagem de transações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={transactions}
            categories={categories}
            search={search}
            onSearchChange={setSearch}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            hiddenIds={hiddenIds}
            onToggleHidden={handleToggleHidden}
            onClearHidden={handleClearHidden}
          />
        </CardContent>
      </Card>
    </>
  )
}
