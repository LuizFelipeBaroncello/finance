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
import { Card, CardContent } from "@/components/ui/card"
import { FixedIncomeForm } from "./components/fixed-income-form"

const TYPE_LABELS: Record<string, string> = {
  cdb: "CDB",
  lci: "LCI",
  lca: "LCA",
  tesouro_selic: "Tesouro Selic",
  tesouro_ipca: "Tesouro IPCA+",
  tesouro_prefixado: "Tesouro Prefixado",
  debenture: "Debênture",
  cri: "CRI",
  cra: "CRA",
  other: "Outro",
}

const RATE_TYPE_LABELS: Record<string, string> = {
  pre: "Pré-fixado",
  pre_ipca: "IPCA+",
  pos_cdi: "CDI",
  pos_ipca: "IPCA",
  pos_selic: "Selic",
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

export default async function FixedIncomePage() {
  const supabase = await createClient()

  const { data: fixedIncomes } = await supabase
    .from("fixed_income")
    .select("*, institution(name)")
    .order("investment_date", { ascending: false })

  const { data: institutions } = await supabase
    .from("institution")
    .select("institution_id, name")
    .order("name")

  const active = (fixedIncomes ?? []).filter((fi) => !fi.is_redeemed)
  const totalInvested = active.reduce((sum, fi) => sum + (fi.invested_amount ?? 0), 0)
  const totalExpectedReturn = active.reduce((sum, fi) => sum + (fi.expected_return ?? 0), 0)
  const activeCount = active.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renda Fixa"
        description="Gerencie seus investimentos em renda fixa"
        action={<FixedIncomeForm institutions={institutions ?? []} />}
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Investido</p>
            <p className="mt-1 text-2xl font-bold">{formatBRL(totalInvested)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Retorno Esperado</p>
            <p className="mt-1 text-2xl font-bold">{formatBRL(totalExpectedReturn)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Quantidade Ativa</p>
            <p className="mt-1 text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead>Valor Investido</TableHead>
              <TableHead>Taxa</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!(fixedIncomes?.length) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum investimento cadastrado
                </TableCell>
              </TableRow>
            )}
            {fixedIncomes?.map((fi) => (
              <TableRow key={fi.fixed_income_id}>
                <TableCell className="font-medium">{fi.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{TYPE_LABELS[fi.type] ?? fi.type}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(fi.institution as { name: string } | null)?.name ?? "—"}
                </TableCell>
                <TableCell>{formatBRL(fi.invested_amount)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {RATE_TYPE_LABELS[fi.rate_type] ?? fi.rate_type} {fi.rate_value}%
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fi.maturity_date
                    ? new Intl.DateTimeFormat("pt-BR").format(new Date(fi.maturity_date + "T00:00:00"))
                    : "—"}
                </TableCell>
                <TableCell>
                  {fi.is_redeemed ? (
                    <Badge variant="secondary">Resgatado</Badge>
                  ) : (
                    <Badge variant="default">Ativo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <FixedIncomeForm fixedIncome={fi as any} institutions={institutions ?? []} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
