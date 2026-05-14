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
import { TransactionForm } from "./components/transaction-form"
import { TransactionsFilters } from "./components/transactions-filters"
import { PluggyImportButton } from "@/components/transactions/pluggy-import-button"
import { applyCategoryFilter } from "@/app/(app)/analytics/lib/category-filter"
import type { CategoryFilter, Transaction } from "@/app/(app)/analytics/types"
import Link from "next/link"

const TYPE_LABELS: Record<string, string> = {
  debit: "Despesa",
  credit: "Receita",
  transfer: "Transferência",
}

const TYPE_VARIANTS: Record<string, "destructive" | "default" | "secondary"> = {
  debit: "destructive",
  credit: "default",
  transfer: "secondary",
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    cat?: string
    catMode?: string
  }>
}) {
  const supabase = await createClient()

  const params = await searchParams
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate()
  const startDate = params.startDate ?? `${yyyy}-${mm}-01`
  const endDate = params.endDate ?? `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`

  const categoryFilter: CategoryFilter = {
    mode: params.catMode === "exclude" ? "exclude" : "include",
    selected: new Set(
      (params.cat ?? "")
        .split(",")
        .map((s) => decodeURIComponent(s).trim())
        .filter(Boolean)
    ),
  }

  const [{ data: transactionsData }, { data: accounts }, { data: categories }] =
    await Promise.all([
      supabase
        .from("transaction")
        .select(
          "*, account(account_name), re_category_transaction(category_id, category(category_name))"
        )
        .eq("is_provisional", false)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false }),
      supabase
        .from("account")
        .select("account_id, account_name")
        .order("account_name"),
      supabase
        .from("category")
        .select("category_id, category_name, type")
        .order("category_name"),
    ])

  const transactions = applyCategoryFilter(
    (transactionsData ?? []) as unknown as Transaction[],
    categoryFilter
  )

  const categoryNames = (categories ?? [])
    .map((c) => c.category_name)
    .filter((name): name is string => !!name)

  const totalReceitas = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + Math.abs(t.amount ?? 0), 0)

  const totalDespesas = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + Math.abs(t.amount ?? 0), 0)

  const saldoMes = totalReceitas - totalDespesas

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transações"
        description={
          <span>
            Gerencie suas transações financeiras •{" "}
            <Link href="/accounts" className="underline underline-offset-2 hover:text-foreground">
              Contas
            </Link>
            {" · "}
            <Link href="/categories" className="underline underline-offset-2 hover:text-foreground">
              Categorias
            </Link>
            {" · "}
            <Link href="/transactions/import" className="underline underline-offset-2 hover:text-foreground">
              Importar CSV
            </Link>
            {" · "}
            <Link href="/classification-rules" className="underline underline-offset-2 hover:text-foreground">
              Regras
            </Link>
          </span>
        }
        action={
          <div className="flex items-center gap-3">
            <PluggyImportButton accounts={accounts ?? []} />
            <TransactionForm
              accounts={accounts ?? []}
              categories={categories ?? []}
            />
          </div>
        }
      />

      <TransactionsFilters
        startDate={startDate}
        endDate={endDate}
        categories={categoryNames}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receitas do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalReceitas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalDespesas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${saldoMes >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {formatCurrency(saldoMes)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Categorias</TableHead>
              <TableHead className="w-[140px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!transactions?.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma transação cadastrada
                </TableCell>
              </TableRow>
            )}
            {transactions?.map((tx) => {
              const relCategories = (tx.re_category_transaction ?? []) as Array<{
                category_id: number
                category: { category_name: string } | null
              }>
              const categoryIds = relCategories.map((rc) => rc.category_id)

              return (
                <TableRow key={tx.trans_id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(tx.date.replace(" ", "T")).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-medium">{tx.description}</TableCell>
                  <TableCell
                    className={`font-medium whitespace-nowrap ${
                      tx.type === "credit"
                        ? "text-green-600 dark:text-green-400"
                        : tx.type === "debit"
                        ? "text-red-600 dark:text-red-400"
                        : ""
                    }`}
                  >
                    {tx.type === "credit" ? "+" : tx.type === "debit" ? "-" : ""}
                    {formatCurrency(Math.abs(tx.amount ?? 0))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={TYPE_VARIANTS[tx.type] ?? "secondary"}>
                      {TYPE_LABELS[tx.type] ?? tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(tx.account as { account_name: string } | null)?.account_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {relCategories.length === 0 && (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                      {relCategories.map((rc) => (
                        <Badge key={rc.category_id} variant="outline" className="text-xs">
                          {rc.category?.category_name ?? rc.category_id}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <TransactionForm
                      transaction={{
                        trans_id: tx.trans_id,
                        account_id: tx.account_id,
                        date: tx.date,
                        description: tx.description,
                        amount: tx.amount,
                        type: tx.type,
                        category_ids: categoryIds,
                      }}
                      accounts={accounts ?? []}
                      categories={categories ?? []}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
