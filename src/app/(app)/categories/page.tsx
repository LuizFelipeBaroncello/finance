import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { CategoriesView } from "./components/categories-view"
import type { CardCategory } from "./components/category-card"

export default async function CategoriesPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: macros }] = await Promise.all([
    supabase
      .from("category")
      .select("*, parent:parent_category_id(category_name)")
      .order("type")
      .order("category_name"),
    supabase
      .from("macro_category")
      .select("macro_category_id, name, display_order")
      .order("display_order"),
  ])

  const plainCategories: CardCategory[] = (categories ?? []).map((c) => ({
    category_id: c.category_id,
    category_name: c.category_name,
    type: c.type,
    parent_category_id: c.parent_category_id,
    macro_category_id: c.macro_category_id,
    parent_name:
      (c.parent as { category_name: string } | null)?.category_name ?? null,
  }))

  const plainMacros = (macros ?? []).map((m) => ({
    macro_category_id: m.macro_category_id,
    name: m.name,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Gerencie suas categorias de receitas, despesas e transferências"
      />
      <CategoriesView categories={plainCategories} macros={plainMacros} />
    </div>
  )
}
