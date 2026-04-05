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
import Link from "next/link"
import { LiabilityForm } from "./components/liability-form"

const TYPE_LABELS: Record<string, string> = {
  mortgage: "Financiamento Imobiliário",
  vehicle_loan: "Financiamento Veículo",
  personal_loan: "Empréstimo Pessoal",
  credit_card: "Cartão de Crédito",
  student_loan: "Financiamento Estudantil",
  other: "Outro",
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

export default async function LiabilitiesPage() {
  const supabase = await createClient()

  const { data: liabilities } = await supabase
    .from("liability")
    .select("*, institution(name)")
    .order("start_date", { ascending: false })

  const { data: institutions } = await supabase
    .from("institution")
    .select("institution_id, name")
    .order("name")

  const { data: realEstates } = await supabase
    .from("real_estate")
    .select("real_estate_id, name")
    .order("name")

  const { data: vehicles } = await supabase
    .from("vehicle")
    .select("vehicle_id, name")
    .order("name")

  const active = liabilities?.filter((l) => !l.is_paid_off) ?? []
  const paidOff = liabilities?.filter((l) => l.is_paid_off) ?? []

  const totalOutstanding = active.reduce((acc, l) => acc + l.outstanding_balance, 0)
  const totalPaid = paidOff.reduce((acc, l) => acc + l.outstanding_balance, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Passivos"
        description="Gerencie seus passivos e pagamentos"
        action={
          <LiabilityForm
            institutions={institutions ?? []}
            realEstates={realEstates ?? []}
            vehicles={vehicles ?? []}
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Devedor</p>
            <p className="text-2xl font-semibold mt-1">{fmt(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Passivos Ativos</p>
            <p className="text-2xl font-semibold mt-1">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Pago</p>
            <p className="text-2xl font-semibold mt-1">{fmt(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead>Saldo Devedor</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!liabilities?.length && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  Nenhum passivo cadastrado
                </TableCell>
              </TableRow>
            )}
            {liabilities?.map((liability) => (
              <TableRow key={liability.liability_id}>
                <TableCell className="font-medium">
                  <Link
                    href={"/liabilities/" + liability.liability_id}
                    className="hover:underline"
                  >
                    {liability.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {TYPE_LABELS[liability.type] ?? liability.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(liability.institution as any)?.name ?? "—"}
                </TableCell>
                <TableCell>{fmt(liability.outstanding_balance)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {liability.total_installments
                    ? `${liability.paid_installments}/${liability.total_installments}`
                    : liability.paid_installments > 0
                    ? `${liability.paid_installments} pagas`
                    : "—"}
                </TableCell>
                <TableCell>
                  {liability.is_paid_off ? (
                    <Badge variant="secondary">Quitado</Badge>
                  ) : (
                    <Badge>Ativo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <LiabilityForm
                    liability={liability as any}
                    institutions={institutions ?? []}
                    realEstates={realEstates ?? []}
                    vehicles={vehicles ?? []}
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
