"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CategoryCard, type CardCategory } from "./category-card"
import type { CategoryFormCategory, MacroOption } from "./category-form"
import { TYPE_LABELS, TYPE_ORDER } from "./category-constants"
import { CategoryForm } from "./category-form"

interface CategoriesViewProps {
  categories: CardCategory[]
  macros: MacroOption[]
}

function Grid({
  items,
  categories,
  macros,
}: {
  items: CardCategory[]
  categories: CategoryFormCategory[]
  macros: MacroOption[]
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">Nenhuma categoria.</p>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((cat) => (
        <CategoryCard
          key={cat.category_id}
          category={cat}
          categories={categories}
          macros={macros}
        />
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function CategoriesView({ categories, macros }: CategoriesViewProps) {
  const [view, setView] = useState<"macro" | "type" | "grid">("macro")

  const plainCategories: CategoryFormCategory[] = categories.map((c) => ({
    category_id: c.category_id,
    category_name: c.category_name,
    type: c.type,
    parent_category_id: c.parent_category_id,
    macro_category_id: c.macro_category_id,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="macro">Por macro</TabsTrigger>
            <TabsTrigger value="type">Por tipo</TabsTrigger>
            <TabsTrigger value="grid">Grid</TabsTrigger>
          </TabsList>
        </Tabs>
        <CategoryForm categories={plainCategories} macros={macros} />
      </div>

      {view === "macro" && (
        <div className="space-y-6">
          {macros.map((m) => {
            const items = categories.filter((c) => c.macro_category_id === m.macro_category_id)
            if (!items.length) return null
            return (
              <Section key={m.macro_category_id} title={m.name}>
                <Grid items={items} categories={plainCategories} macros={macros} />
              </Section>
            )
          })}
          {(() => {
            const items = categories.filter((c) => c.macro_category_id == null)
            if (!items.length) return null
            return (
              <Section title="Sem macro">
                <Grid items={items} categories={plainCategories} macros={macros} />
              </Section>
            )
          })()}
          {!categories.length && (
            <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          )}
        </div>
      )}

      {view === "type" && (
        <div className="space-y-6">
          {TYPE_ORDER.map((t) => {
            const items = categories.filter((c) => c.type === t)
            if (!items.length) return null
            return (
              <Section key={t} title={TYPE_LABELS[t]}>
                <Grid items={items} categories={plainCategories} macros={macros} />
              </Section>
            )
          })}
          {!categories.length && (
            <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          )}
        </div>
      )}

      {view === "grid" && (
        <Grid items={categories} categories={plainCategories} macros={macros} />
      )}
    </div>
  )
}
