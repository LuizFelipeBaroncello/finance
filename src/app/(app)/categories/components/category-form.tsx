"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { OptionSelect } from "@/components/ui/option-select"
import { createCategory, updateCategory, deleteCategory } from "../actions"

export type CategoryFormCategory = {
  category_id: number
  category_name: string
  type: string
  parent_category_id: number | null
  macro_category_id: number | null
}

export type MacroOption = {
  macro_category_id: number
  name: string
}

interface CategoryFormProps {
  category?: CategoryFormCategory
  categories: CategoryFormCategory[]
  macros: MacroOption[]
}

const TYPE_OPTIONS = [
  { value: "debit", label: "Despesa" },
  { value: "credit", label: "Receita" },
  { value: "transfer", label: "Transferência" },
]

export function CategoryForm({ category, categories, macros }: CategoryFormProps) {
  const isEditing = !!category
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<string>(category?.type ?? "debit")
  const [parentId, setParentId] = useState<string>(
    category?.parent_category_id != null ? String(category.parent_category_id) : "none"
  )
  const [macroId, setMacroId] = useState<string>(
    category?.macro_category_id != null ? String(category.macro_category_id) : "none"
  )
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateCategory(category.category_id, formData)
        : await createCategory(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCategory(category!.category_id)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  const parentOptions = categories.filter(
    (c) => !isEditing || c.category_id !== category.category_id
  )

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant={isEditing ? "outline" : "default"} size="sm" />
          }
        >
          {isEditing ? "Editar" : "Nova Categoria"}
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Nome da Categoria
              </label>
              <Input
                name="category_name"
                defaultValue={category?.category_name ?? ""}
                placeholder="Ex: Alimentação, Salário..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tipo
              </label>
              <OptionSelect
                value={type}
                onValueChange={setType}
                placeholder="Selecione o tipo"
                triggerClassName="w-full"
                options={TYPE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
              <input type="hidden" name="type" value={type} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Macro Categoria
              </label>
              <OptionSelect
                value={macroId}
                onValueChange={setMacroId}
                placeholder="Selecione uma macro categoria"
                triggerClassName="w-full"
                options={[
                  { value: "none", label: "Nenhuma" },
                  ...macros.map((m) => ({
                    value: String(m.macro_category_id),
                    label: m.name,
                  })),
                ]}
              />
              <input type="hidden" name="macro_category_id" value={macroId} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Categoria Pai
              </label>
              <OptionSelect
                value={parentId}
                onValueChange={setParentId}
                placeholder="Selecione uma categoria pai"
                triggerClassName="w-full"
                options={[
                  { value: "none", label: "Nenhuma" },
                  ...parentOptions.map((cat) => ({
                    value: String(cat.category_id),
                    label: cat.category_name,
                  })),
                ]}
              />
              <input type="hidden" name="parent_category_id" value={parentId} />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isEditing && (
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleDelete}
        >
          Excluir
        </Button>
      )}
    </div>
  )
}
