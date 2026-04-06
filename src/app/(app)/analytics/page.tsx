import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EvolutionChart } from "./components/evolution-chart"
import { CategoryChart } from "./components/category-chart"
import { TypeChart } from "./components/type-chart"
import { AccountChart } from "./components/account-chart"
import { SeriesEvolutionChart } from "./components/series-evolution-chart"
import { PeriodFilter } from "./components/period-filter"

type Transaction = {
  trans_id: number
  account_id: number
  date: string
  description: string
  amount: number
  type: "debit" | "credit" | "transfer"
  account: { account_name: string } | null
  re_category_transaction: Array<{
    category_id: number
    category: { category_name: string } | null
  }>
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

function getDefaultGranularity(period: string) {
  if (period === "month") return "daily"
  if (period === "quarter") return "weekly"
  return "monthly"
}

function getDateRange(period: string, year: number, month: number) {
  if (period === "month") {
    const lastDay = new Date(year, month, 0).getDate()
    const mm = String(month).padStart(2, "0")
    return {
      startDate: `${year}-${mm}-01`,
      endDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
    }
  }
  if (period === "quarter") {
    const q = Math.floor((month - 1) / 3)
    const startMonth = q * 3 + 1
    const endMonth = startMonth + 2
    const lastDay = new Date(year, endMonth, 0).getDate()
    return {
      startDate: `${year}-${String(startMonth).padStart(2, "0")}-01`,
      endDate: `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    }
  }
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` }
}

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

function parseDate(date: string): Date {
  // Supabase pode retornar "2024-01-15" ou "2024-01-15 00:00:00"
  const iso = date.trim().replace(" ", "T")
  return new Date(iso)
}

function getPeriodKey(date: string, granularity: string): { label: string; order: string } {
  const raw = date.substring(0, 10) // "YYYY-MM-DD"
  const [y, m, dd] = raw.split("-")

  if (granularity === "daily") {
    return { label: `${dd}/${m}`, order: raw }
  }
  if (granularity === "weekly") {
    const d = parseDate(date)
    const tmp = new Date(d)
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
    const week1 = new Date(tmp.getFullYear(), 0, 4)
    const weekNum =
      1 +
      Math.round(
        ((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
      )
    return { label: `S${weekNum}`, order: `${y}-W${String(weekNum).padStart(2, "0")}` }
  }
  // monthly
  const monthIdx = parseInt(m, 10) - 1
  return { label: MONTH_NAMES[monthIdx], order: `${y}-${m}` }
}

// ─── Agrupamento: evolução geral ───────────────────────────────────────────────

function groupByPeriod(transactions: Transaction[], granularity: string) {
  const map = new Map<
    string,
    { label: string; receitas: number; despesas: number; saldo: number; order: string }
  >()

  for (const t of transactions) {
    const { label, order } = getPeriodKey(t.date, granularity)
    if (!map.has(label)) {
      map.set(label, { label, receitas: 0, despesas: 0, saldo: 0, order })
    }
    const entry = map.get(label)!
    const amount = Math.abs(t.amount)
    if (t.type === "credit") entry.receitas += amount
    else if (t.type === "debit") entry.despesas += amount
    entry.saldo = entry.receitas - entry.despesas
  }

  const sorted = Array.from(map.values()).sort((a, b) => a.order.localeCompare(b.order))
  let acumulado = 0
  return sorted.map(({ label, receitas, despesas, saldo }) => {
    acumulado += saldo
    return { label, receitas, despesas, saldo, acumulado }
  })
}

// ─── Agrupamento: totais por categoria ─────────────────────────────────────────

function groupByCategory(transactions: Transaction[]) {
  const map = new Map<string, { name: string; debito: number; credito: number }>()

  for (const t of transactions) {
    if (t.type === "transfer") continue
    const names = getCategoryNames(t)
    const amount = Math.abs(t.amount)
    for (const name of names) {
      if (!map.has(name)) map.set(name, { name, debito: 0, credito: 0 })
      const entry = map.get(name)!
      if (t.type === "debit") entry.debito += amount
      else entry.credito += amount
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.debito + b.credito - (a.debito + a.credito))
    .slice(0, 10)
}

// ─── Agrupamento: totais por conta ─────────────────────────────────────────────

function groupByAccount(transactions: Transaction[]) {
  const map = new Map<string, { name: string; debito: number; credito: number }>()

  for (const t of transactions) {
    const name = t.account?.account_name ?? "Conta desconhecida"
    const amount = Math.abs(t.amount)
    if (!map.has(name)) map.set(name, { name, debito: 0, credito: 0 })
    const entry = map.get(name)!
    if (t.type === "debit") entry.debito += amount
    else if (t.type === "credit") entry.credito += amount
  }

  return Array.from(map.values()).sort(
    (a, b) => b.debito + b.credito - (a.debito + a.credito)
  )
}

// ─── Agrupamento: evolução por categoria ao longo do tempo ─────────────────────

function getCategoryNames(t: Transaction): string[] {
  const rcs = t.re_category_transaction ?? []
  if (rcs.length === 0) return ["Sem categoria"]
  return rcs.map((rc) => rc.category?.category_name ?? "Sem categoria")
}

function groupCategoryByPeriod(transactions: Transaction[], granularity: string, topN = 5) {
  // Descobre as top N categorias por volume total
  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === "transfer") continue
    for (const name of getCategoryNames(t)) {
      totals.set(name, (totals.get(name) ?? 0) + Math.abs(t.amount))
    }
  }
  const topCategories = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name)

  // Agrupa por período para as top categorias
  const map = new Map<string, { entry: Record<string, string | number>; order: string }>()
  for (const t of transactions) {
    if (t.type === "transfer") continue
    const { label, order } = getPeriodKey(t.date, granularity)
    if (!map.has(label)) {
      const entry: Record<string, string | number> = { label }
      for (const cat of topCategories) entry[cat] = 0
      map.set(label, { entry, order })
    }
    const { entry } = map.get(label)!
    for (const name of getCategoryNames(t)) {
      if (topCategories.includes(name)) {
        entry[name] = (entry[name] as number) + Math.abs(t.amount)
      }
    }
  }

  const data = Array.from(map.values())
    .sort((a, b) => a.order.localeCompare(b.order))
    .map(({ entry }) => entry)

  return { data, seriesKeys: topCategories }
}

// ─── Agrupamento: evolução por conta ao longo do tempo ─────────────────────────

function groupAccountByPeriod(transactions: Transaction[], granularity: string) {
  const accountNames = new Set<string>()
  for (const t of transactions) {
    accountNames.add(t.account?.account_name ?? "Conta desconhecida")
  }
  const accounts = Array.from(accountNames)

  const map = new Map<string, { entry: Record<string, string | number>; order: string }>()
  for (const t of transactions) {
    const { label, order } = getPeriodKey(t.date, granularity)
    if (!map.has(label)) {
      const entry: Record<string, string | number> = { label }
      for (const acc of accounts) entry[acc] = 0
      map.set(label, { entry, order })
    }
    const { entry } = map.get(label)!
    const name = t.account?.account_name ?? "Conta desconhecida"
    entry[name] = (entry[name] as number) + Math.abs(t.amount)
  }

  const data = Array.from(map.values())
    .sort((a, b) => a.order.localeCompare(b.order))
    .map(({ entry }) => entry)

  return { data, seriesKeys: accounts }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string
    year?: string
    month?: string
    granularity?: string
  }>
}) {
  const params = await searchParams
  const today = new Date()
  const period = params.period ?? "year"
  const year = parseInt(params.year ?? String(today.getFullYear()))
  const month = parseInt(params.month ?? String(today.getMonth() + 1))
  const granularity = params.granularity ?? getDefaultGranularity(period)

  const { startDate, endDate } = getDateRange(period, year, month)

  const supabase = await createClient()
  const { data } = await supabase
    .from("transaction")
    .select(
      "*, account(account_name), re_category_transaction(category_id, category(category_name))"
    )
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })

  const txs = (data ?? []) as unknown as Transaction[]

  const totalReceitas = txs
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalDespesas = txs
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const saldo = totalReceitas - totalDespesas
  const totalTransacoes = txs.length

  const evolutionData = groupByPeriod(txs, granularity)
  const categoryData = groupByCategory(txs)
  const accountData = groupByAccount(txs)
  const categoryEvolution = groupCategoryByPeriod(txs, granularity)
  const accountEvolution = groupAccountByPeriod(txs, granularity)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Análise de transações por categoria, conta e período
          </p>
        </div>
        <PeriodFilter period={period} year={year} month={month} granularity={granularity} />
      </div>

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
    </div>
  )
}
