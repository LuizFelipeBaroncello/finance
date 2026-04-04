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
import { InstitutionForm } from "./components/institution-form"

const TYPE_LABELS: Record<string, string> = {
  bank: "Banco",
  broker: "Corretora",
  fintech: "Fintech",
  other: "Outro",
}

export default async function InstitutionsPage() {
  const supabase = await createClient()
  const { data: institutions } = await supabase
    .from("institution")
    .select("*")
    .order("name")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instituições"
        description="Gerencie seus bancos, corretoras e fintechs"
        action={<InstitutionForm />}
      />
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!institutions?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhuma instituição cadastrada
                </TableCell>
              </TableRow>
            )}
            {institutions?.map((inst) => (
              <TableRow key={inst.institution_id}>
                <TableCell className="font-medium">{inst.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{TYPE_LABELS[inst.type] ?? inst.type}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{inst.notes ?? "—"}</TableCell>
                <TableCell>
                  <InstitutionForm institution={inst} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
