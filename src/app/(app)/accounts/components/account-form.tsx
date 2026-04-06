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
import { createAccount, updateAccount, deleteAccount } from "../actions"

type Institution = {
  institution_id: number
  name: string
}

type Account = {
  account_id: number
  account_name: string
  description: string
  institution_id: number
}

interface AccountFormProps {
  account?: Account
  institutions: Institution[]
}

export function AccountForm({ account, institutions }: AccountFormProps) {
  const isEditing = !!account
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [institutionId, setInstitutionId] = useState<string>(
    account?.institution_id?.toString() ?? ""
  )
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateAccount(account.account_id, formData)
        : await createAccount(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAccount(account!.account_id)
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
          {isEditing ? "Editar" : "Nova Conta"}
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Conta" : "Nova Conta"}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Instituição
              </label>
              <Select value={institutionId} onValueChange={setInstitutionId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a instituição" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.institution_id} value={inst.institution_id.toString()}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="institution_id" value={institutionId} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Nome da Conta
              </label>
              <Input
                name="account_name"
                defaultValue={account?.account_name ?? ""}
                placeholder="Ex: Conta Corrente, Poupança..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Descrição
              </label>
              <textarea
                name="description"
                defaultValue={account?.description ?? ""}
                placeholder="Descrição opcional..."
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
