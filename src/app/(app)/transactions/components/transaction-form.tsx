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
import { createTransaction, updateTransaction, deleteTransaction } from "../actions"

type Transaction = {
  trans_id: number
  account_id: number
  date: string
  description: string
  amount: number
  type: string
  category_ids?: number[]
}

type Account = {
  account_id: number
  account_name: string
}

type Category = {
  category_id: number
  category_name: string
  type: string
}

interface TransactionFormProps {
  transaction?: Transaction
  accounts: Account[]
  categories: Category[]
}

const TYPE_OPTIONS = [
  { value: "debit", label: "Despesa" },
  { value: "credit", label: "Receita" },
  { value: "transfer", label: "Transferência" },
]

export function TransactionForm({ transaction, accounts, categories }: TransactionFormProps) {
  const isEditing = !!transaction
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<string>(transaction?.type ?? "debit")
  const [accountId, setAccountId] = useState<string>(
    transaction?.account_id != null ? String(transaction.account_id) : ""
  )
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(
    new Set(transaction?.category_ids ?? [])
  )
  const [isPending, startTransition] = useTransition()

  const filteredCategories = categories.filter((cat) => cat.type === type)

  function handleTypeChange(newType: string) {
    setType(newType)
    // Clear selected categories when type changes since they may not match
    setSelectedCategoryIds(new Set())
  }

  function handleCategoryToggle(catId: number) {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) {
        next.delete(catId)
      } else {
        next.add(catId)
      }
      return next
    })
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateTransaction(transaction.trans_id, formData)
        : await createTransaction(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTransaction(transaction!.trans_id)
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
          {isEditing ? "Editar" : "Nova Transação"}
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Transação" : "Nova Transação"}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Data
              </label>
              <Input
                name="date"
                type="date"
                defaultValue={transaction?.date ?? new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Descrição
              </label>
              <Input
                name="description"
                defaultValue={transaction?.description ?? ""}
                placeholder="Ex: Supermercado, Salário..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Valor
              </label>
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={transaction?.amount != null ? String(transaction.amount) : ""}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tipo
              </label>
              <Select value={type} onValueChange={handleTypeChange}>
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
                Conta
              </label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.account_id} value={String(acc.account_id)}>
                      {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="account_id" value={accountId} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Categorias
              </label>
              <div className="overflow-y-auto max-h-32 rounded-lg border border-input p-2 space-y-1">
                {filteredCategories.length === 0 && (
                  <p className="text-sm text-muted-foreground py-1 px-1">
                    Nenhuma categoria disponível para este tipo
                  </p>
                )}
                {filteredCategories.map((cat) => (
                  <label
                    key={cat.category_id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5"
                  >
                    <input
                      type="checkbox"
                      name="category_ids"
                      value={cat.category_id}
                      checked={selectedCategoryIds.has(cat.category_id)}
                      onChange={() => handleCategoryToggle(cat.category_id)}
                      className="rounded border-input"
                    />
                    {cat.category_name}
                  </label>
                ))}
              </div>
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
