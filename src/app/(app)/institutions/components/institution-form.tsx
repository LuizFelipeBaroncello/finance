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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createInstitution, updateInstitution, deleteInstitution } from "../actions"

type Institution = {
  institution_id: number
  name: string
  type: string
  notes: string | null
}

const TYPE_OPTIONS = [
  { value: "bank", label: "Banco" },
  { value: "broker", label: "Corretora" },
  { value: "fintech", label: "Fintech" },
  { value: "other", label: "Outro" },
]

interface InstitutionFormProps {
  institution?: Institution
}

export function InstitutionForm({ institution }: InstitutionFormProps) {
  const isEditing = !!institution
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<string>(institution?.type ?? "bank")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateInstitution(institution.institution_id, formData)
        : await createInstitution(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteInstitution(institution!.institution_id)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant={isEditing ? "outline" : "default"} size="sm" />
          }
        >
          {isEditing ? "Editar" : "Nova Instituição"}
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Instituição" : "Nova Instituição"}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Nome
              </label>
              <Input
                name="name"
                defaultValue={institution?.name ?? ""}
                placeholder="Ex: Nubank, XP Investimentos..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tipo
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="type" value={type} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Notas
              </label>
              <textarea
                name="notes"
                defaultValue={institution?.notes ?? ""}
                placeholder="Observações opcionais..."
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
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
