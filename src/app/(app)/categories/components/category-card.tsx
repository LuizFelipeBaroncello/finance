"use client"

import { useState, useTransition } from "react"
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { OptionSelect } from "@/components/ui/option-select"
import { CategoryForm, type CategoryFormCategory, type MacroOption } from "./category-form"
import { TYPE_LABELS, TYPE_VARIANTS } from "./category-constants"
import { updateCategoryMacro } from "../actions"

export type CardCategory = CategoryFormCategory & {
  parent_name: string | null
}

interface CategoryCardProps {
  category: CardCategory
  categories: CategoryFormCategory[]
  macros: MacroOption[]
}

export function CategoryCard({ category, categories, macros }: CategoryCardProps) {
  const [macroId, setMacroId] = useState<string>(
    category.macro_category_id != null ? String(category.macro_category_id) : "none"
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleMacroChange(value: string) {
    const next = value === "" ? "none" : value
    setMacroId(next)
    setError(null)
    startTransition(async () => {
      const macro = next === "none" ? null : Number(next)
      const result = await updateCategoryMacro(category.category_id, macro)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="truncate">{category.category_name}</CardTitle>
        <CardAction>
          <Badge variant={TYPE_VARIANTS[category.type] ?? "secondary"}>
            {TYPE_LABELS[category.type] ?? category.type}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Pai: {category.parent_name ?? "—"}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Macro</label>
          <OptionSelect
            value={macroId}
            onValueChange={handleMacroChange}
            disabled={isPending}
            placeholder="Selecione..."
            size="sm"
            triggerClassName="w-full"
            options={[
              { value: "none", label: "Sem macro" },
              ...macros.map((m) => ({
                value: String(m.macro_category_id),
                label: m.name,
              })),
            ]}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="pt-1">
          <CategoryForm category={category} categories={categories} macros={macros} />
        </div>
      </CardContent>
    </Card>
  )
}
