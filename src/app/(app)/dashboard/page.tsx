import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PatrimonyChart } from "./patrimony-chart"

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const formatDate = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("pt-BR")

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: fixedIncomeData },
    { data: variableIncomeData },
    { data: realEstateData },
    { data: vehicleData },
    { data: liabilitiesData },
    { data: transactionsData },
  ] = await Promise.all([
    supabase
      .from("fixed_income")
      .select("invested_amount, expected_return")
      .eq("is_redeemed", false),
    supabase
      .from("variable_income")
      .select("total_invested")
      .eq("is_sold", false),
    supabase
      .from("real_estate")
      .select("purchase_price, current_estimated_value")
      .eq("is_sold", false),
    supabase
      .from("vehicle")
      .select("purchase_price, current_estimated_value")
      .eq("is_sold", false),
    supabase
      .from("liability")
      .select("outstanding_balance")
      .eq("is_paid_off", false),
    supabase
      .from("transaction")
      .select("trans_id, date, description, amount, type, account(account_name)")
      .order("date", { ascending: false })
      .limit(10),
  ])

  const totalFixedIncome =
    fixedIncomeData?.reduce((acc, fi) => acc + fi.invested_amount, 0) ?? 0
  const totalVariableIncome =
    variableIncomeData?.reduce((acc, vi) => acc + vi.total_invested, 0) ?? 0
  const totalRealEstate =
    realEstateData?.reduce(
      (acc, re) => acc + (re.current_estimated_value ?? re.purchase_price),
      0
    ) ?? 0
  const totalVehicles =
    vehicleData?.reduce(
      (acc, v) => acc + (v.current_estimated_value ?? v.purchase_price),
      0
    ) ?? 0
  const totalLiabilities =
    liabilitiesData?.reduce((acc, l) => acc + l.outstanding_balance, 0) ?? 0
  const totalAssets =
    totalFixedIncome + totalVariableIncome + totalRealEstate + totalVehicles
  const netWorth = totalAssets - totalLiabilities

  const chartData = [
    { name: "Renda Fixa", value: totalFixedIncome, color: "#3b82f6" },
    { name: "Renda Variável", value: totalVariableIncome, color: "#8b5cf6" },
    { name: "Imóveis", value: totalRealEstate, color: "#10b981" },
    { name: "Veículos", value: totalVehicles, color: "#f59e0b" },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>

      {/* Patrimony summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Net worth — highlighted */}
        <Card className="border border-blue-500/30 bg-blue-500/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-300">
              Patrimônio Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-100">{formatBRL(netWorth)}</p>
          </CardContent>
        </Card>

        {/* Total assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total em Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-zinc-100">{formatBRL(totalAssets)}</p>
          </CardContent>
        </Card>

        {/* Total liabilities */}
        <Card className="border border-red-500/30 bg-red-500/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-red-400">
              Total em Passivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-300">{formatBRL(totalLiabilities)}</p>
          </CardContent>
        </Card>

        {/* Fixed income */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Renda Fixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-zinc-100">{formatBRL(totalFixedIncome)}</p>
          </CardContent>
        </Card>

        {/* Variable income */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Renda Variável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-zinc-100">{formatBRL(totalVariableIncome)}</p>
          </CardContent>
        </Card>

        {/* Real estate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Imóveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-zinc-100">{formatBRL(totalRealEstate)}</p>
          </CardContent>
        </Card>

        {/* Vehicles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Veículos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-zinc-100">{formatBRL(totalVehicles)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + recent transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Composition chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-100">
              Composição do Patrimônio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PatrimonyChart data={chartData} />
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-zinc-100">
              Últimas Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!transactionsData || transactionsData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700 text-left text-xs text-zinc-400">
                      <th className="pb-2 pr-4 font-medium">Data</th>
                      <th className="pb-2 pr-4 font-medium">Descrição</th>
                      <th className="pb-2 pr-4 font-medium">Conta</th>
                      <th className="pb-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsData.map((tx) => {
                      const account = Array.isArray(tx.account)
                        ? tx.account[0]
                        : tx.account
                      return (
                        <tr
                          key={tx.trans_id}
                          className="border-b border-zinc-800 last:border-0"
                        >
                          <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">
                            {formatDate(tx.date)}
                          </td>
                          <td className="py-2 pr-4 text-zinc-200 max-w-[140px] truncate">
                            {tx.description}
                          </td>
                          <td className="py-2 pr-4 text-zinc-400 whitespace-nowrap">
                            {account?.account_name ?? "—"}
                          </td>
                          <td
                            className={`py-2 text-right whitespace-nowrap font-medium ${
                              tx.type === "credit" ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {tx.type === "debit" ? "- " : ""}
                            {formatBRL(tx.amount)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
