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
import { RealEstateForm } from "./components/real-estate-form"

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartamento",
  house: "Casa",
  land: "Terreno",
  commercial: "Comercial",
  other: "Outro",
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

export default async function RealEstatePage() {
  const supabase = await createClient()
  const { data: properties } = await supabase
    .from("real_estate")
    .select("*")
    .order("purchase_date", { ascending: false })

  const activeProperties = (properties ?? []).filter((p) => !p.is_sold)

  const totalPatrimony = activeProperties.reduce(
    (sum, p) => sum + (p.current_estimated_value ?? p.purchase_price),
    0
  )

  const totalInvested = activeProperties.reduce(
    (sum, p) => sum + p.purchase_price,
    0
  )

  const activeCount = activeProperties.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Imóveis"
        description="Gerencie seu patrimônio imobiliário"
        action={<RealEstateForm />}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Patrimônio Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalPatrimony)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalInvested)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Imóveis Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor de Compra</TableHead>
              <TableHead>Valor Atual</TableHead>
              <TableHead>Financiado</TableHead>
              <TableHead>Alugado</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!properties?.length && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhum imóvel cadastrado
                </TableCell>
              </TableRow>
            )}
            {properties?.map((property) => (
              <TableRow key={property.real_estate_id}>
                <TableCell className="font-medium">{property.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {PROPERTY_TYPE_LABELS[property.property_type] ?? property.property_type}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(property.purchase_price)}</TableCell>
                <TableCell>
                  {property.current_estimated_value
                    ? formatCurrency(property.current_estimated_value)
                    : "—"}
                </TableCell>
                <TableCell>
                  {property.is_financed ? (
                    <Badge variant="outline">Sim</Badge>
                  ) : (
                    <span className="text-muted-foreground">Não</span>
                  )}
                </TableCell>
                <TableCell>
                  {property.is_rental ? (
                    <Badge variant="outline">Sim</Badge>
                  ) : (
                    <span className="text-muted-foreground">Não</span>
                  )}
                </TableCell>
                <TableCell>
                  {property.is_sold ? (
                    <Badge variant="destructive">Vendido</Badge>
                  ) : (
                    <Badge variant="default">Ativo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <RealEstateForm realEstate={property} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
