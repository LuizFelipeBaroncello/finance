import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VariableIncomeForm } from "./components/variable-income-form"

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock: "Ação",
  fii: "FII",
  etf: "ETF",
  crypto: "Cripto",
  bdr: "BDR",
  other: "Outro",
}

const ASSET_TYPE_BADGE_VARIANTS: Record<string, string> = {
  stock: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  fii: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  etf: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  crypto: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  bdr: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const formatNumber = (value: number, decimals = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)

export default async function VariableIncomePage() {
  const supabase = await createClient()

  const { data: assets } = await supabase
    .from("variable_income")
    .select("*, institution(name)")
    .order("asset_type")
    .order("ticker")

  const { data: institutions } = await supabase
    .from("institution")
    .select("institution_id, name")
    .order("name")

  const activeAssets = assets?.filter((a) => !a.is_sold) ?? []
  const totalInvested = activeAssets.reduce((sum, a) => sum + (a.total_invested ?? 0), 0)
  const assetCount = activeAssets.length
  const totalStocks = activeAssets
    .filter((a) => a.asset_type === "stock")
    .reduce((sum, a) => sum + (a.total_invested ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renda Variável"
        description="Gerencie seus ativos de renda variável"
        action={<VariableIncomeForm institutions={institutions ?? []} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
            <p className="text-xs text-muted-foreground mt-1">Ativos em carteira</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quantidade de Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assetCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Posições abertas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total em Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalStocks)}</p>
            <p className="text-xs text-muted-foreground mt-1">Somente ações (stock)</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Preço Médio</TableHead>
              <TableHead className="text-right">Total Investido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!assets?.length && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Nenhum ativo cadastrado
                </TableCell>
              </TableRow>
            )}
            {assets?.map((asset) => (
              <TableRow key={asset.variable_income_id}>
                <TableCell className="font-mono font-semibold">{asset.ticker}</TableCell>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ASSET_TYPE_BADGE_VARIANTS[asset.asset_type] ?? ASSET_TYPE_BADGE_VARIANTS.other
                    }`}
                  >
                    {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(asset.institution as { name: string } | null)?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatNumber(asset.quantity, 8)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(asset.avg_price)}
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {formatCurrency(asset.total_invested)}
                </TableCell>
                <TableCell>
                  <Badge variant={asset.is_sold ? "secondary" : "default"}>
                    {asset.is_sold ? "Vendido" : "Ativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <VariableIncomeForm
                    variableIncome={asset as any}
                    institutions={institutions ?? []}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
