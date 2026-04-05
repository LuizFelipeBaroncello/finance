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
import { CategoryForm } from "./components/category-form"

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

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from("category")
    .select("*, parent:parent_category_id(category_name)")
    .order("type")
    .order("category_name")

  const plainCategories = (categories ?? []).map((c) => ({
    category_id: c.category_id,
    category_name: c.category_name,
    type: c.type,
    parent_category_id: c.parent_category_id,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Gerencie suas categorias de receitas, despesas e transferências"
        action={<CategoryForm categories={plainCategories} />}
      />
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria Pai</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!categories?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhuma categoria cadastrada
                </TableCell>
              </TableRow>
            )}
            {categories?.map((cat) => (
              <TableRow key={cat.category_id}>
                <TableCell className="font-medium">{cat.category_name}</TableCell>
                <TableCell>
                  <Badge variant={TYPE_VARIANTS[cat.type] ?? "secondary"}>
                    {TYPE_LABELS[cat.type] ?? cat.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(cat.parent as { category_name: string } | null)?.category_name ?? "—"}
                </TableCell>
                <TableCell>
                  <CategoryForm
                    category={{
                      category_id: cat.category_id,
                      category_name: cat.category_name,
                      type: cat.type,
                      parent_category_id: cat.parent_category_id,
                    }}
                    categories={plainCategories}
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
