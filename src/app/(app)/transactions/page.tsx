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
import { MonthPicker } from "./components/month-picker"
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
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()

  const { month } = await searchParams
  const now = new Date()
  const selectedMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [year, mon] = selectedMonth.split("-").map(Number)
  const firstOfMonth = `${selectedMonth}-01`
  const firstOfNextMonth = new Date(year, mon, 1).toISOString().split("T")[0]

  const [
    { data: transactions },
    { data: accounts },
    { data: categories },
    { data: monthTransactions },
  ] = await Promise.all([
    supabase
      .from("transaction")
      .select("*, account(account_name), re_category_transaction(category_id, category(category_name))")
      .gte("date", firstOfMonth)
      .lt("date", firstOfNextMonth)
      .order("date", { ascending: false }),
    supabase
      .from("account")
      .select("account_id, account_name")
      .order("account_name"),
    supabase
      .from("category")
      .select("category_id, category_name, type")
      .order("category_name"),
    supabase
      .from("transaction")
      .select("amount, type")
      .gte("date", firstOfMonth)
      .lt("date", firstOfNextMonth),
  ])

  const totalReceitas = (monthTransactions ?? [])
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + Math.abs(t.amount ?? 0), 0)

  const totalDespesas = (monthTransactions ?? [])
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
            <MonthPicker value={selectedMonth} />
            <TransactionForm
              accounts={accounts ?? []}
              categories={categories ?? []}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receitas do Mês
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
              Despesas do Mês
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
              Saldo do Mês
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
