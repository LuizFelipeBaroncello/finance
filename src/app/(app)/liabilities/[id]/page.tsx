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
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PaymentForm } from "./components/payment-form"
import { deletePayment } from "../actions"
import { notFound } from "next/navigation"

const fmt = (v: number | null | undefined) =>
  v != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
    : "—"

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR")

function DeletePaymentButton({
  paymentId,
  liabilityId,
}: {
  paymentId: number
  liabilityId: number
}) {
  async function handleDelete() {
    "use server"
    await deletePayment(paymentId, liabilityId)
  }

  return (
    <form action={handleDelete}>
      <Button variant="destructive" size="sm" type="submit">
        Excluir
      </Button>
    </form>
  )
}

export default async function LiabilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: liability } = await supabase
    .from("liability")
    .select("*, institution(name)")
    .eq("liability_id", Number(id))
    .single()

  if (!liability) notFound()

  const { data: payments } = await supabase
    .from("liability_payment")
    .select("*")
    .eq("liability_id", Number(id))
    .order("payment_date", { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title={liability.name}
        description={(liability.institution as any)?.name ?? ""}
        action={<PaymentForm liabilityId={liability.liability_id} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Saldo Devedor</p>
            <p className="text-2xl font-semibold mt-1">
              {fmt(liability.outstanding_balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Parcelas Pagas</p>
            <p className="text-2xl font-semibold mt-1">
              {liability.total_installments
                ? `${liability.paid_installments} / ${liability.total_installments}`
                : liability.paid_installments > 0
                ? `${liability.paid_installments}`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Valor da Parcela</p>
            <p className="text-2xl font-semibold mt-1">
              {fmt(liability.installment_amount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Juros</TableHead>
              <TableHead>Parcela #</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!payments?.length && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  Nenhum pagamento registrado
                </TableCell>
              </TableRow>
            )}
            {payments?.map((payment) => (
              <TableRow key={payment.payment_id}>
                <TableCell>{fmtDate(payment.payment_date)}</TableCell>
                <TableCell>{fmt(payment.amount)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {fmt(payment.principal)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fmt(payment.interest)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {payment.installment_number ?? "—"}
                </TableCell>
                <TableCell>
                  <DeletePaymentButton
                    paymentId={payment.payment_id}
                    liabilityId={liability.liability_id}
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
