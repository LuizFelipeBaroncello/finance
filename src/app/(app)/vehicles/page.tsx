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
import { VehicleForm } from "./components/vehicle-form"

const TYPE_LABELS: Record<string, string> = {
  car: "Carro",
  motorcycle: "Moto",
  truck: "Caminhão",
  other: "Outro",
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data: vehicles } = await supabase
    .from("vehicle")
    .select("*")
    .order("purchase_date", { ascending: false })

  const active = vehicles?.filter((v) => !v.is_sold) ?? []
  const totalInvested = active.reduce((acc, v) => acc + v.purchase_price, 0)
  const totalEstimated = active.reduce(
    (acc, v) => acc + (v.current_estimated_value ?? v.purchase_price),
    0
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veículos"
        description="Gerencie seus veículos e financiamentos"
        action={<VehicleForm />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Patrimônio em Veículos</p>
            <p className="text-2xl font-semibold mt-1">{fmt(totalEstimated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Investido</p>
            <p className="text-2xl font-semibold mt-1">{fmt(totalInvested)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Veículos Ativos</p>
            <p className="text-2xl font-semibold mt-1">{active.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Marca / Modelo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Valor Compra</TableHead>
              <TableHead>Valor Atual</TableHead>
              <TableHead>Financiado</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!vehicles?.length && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  Nenhum veículo cadastrado
                </TableCell>
              </TableRow>
            )}
            {vehicles?.map((v) => (
              <TableRow key={v.vehicle_id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{TYPE_LABELS[v.vehicle_type] ?? v.vehicle_type}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[v.brand, v.model].filter(Boolean).join(" ") || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{v.year ?? "—"}</TableCell>
                <TableCell>{fmt(v.purchase_price)}</TableCell>
                <TableCell>
                  {v.current_estimated_value ? fmt(v.current_estimated_value) : "—"}
                </TableCell>
                <TableCell>
                  {v.is_financed ? (
                    <Badge variant="outline">Sim</Badge>
                  ) : (
                    <span className="text-muted-foreground">Não</span>
                  )}
                </TableCell>
                <TableCell>
                  {v.is_sold ? (
                    <Badge variant="secondary">Vendido</Badge>
                  ) : (
                    <Badge>Ativo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <VehicleForm vehicle={v} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
