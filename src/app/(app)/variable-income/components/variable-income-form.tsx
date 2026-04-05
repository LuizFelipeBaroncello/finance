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
import { createVariableIncome, updateVariableIncome, deleteVariableIncome } from "../actions"

type VariableIncome = {
  variable_income_id: number
  client_id: number
  institution_id: number | null
  asset_type: "stock" | "fii" | "etf" | "crypto" | "bdr" | "other"
  ticker: string
  name: string
  quantity: number
  avg_price: number
  total_invested: number
  investment_date: string
  is_sold: boolean
  sell_date: string | null
  sell_price: number | null
  sell_total: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

type Institution = {
  institution_id: number
  name: string
}

const ASSET_TYPE_OPTIONS = [
  { value: "stock", label: "Ação" },
  { value: "fii", label: "FII" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Cripto" },
  { value: "bdr", label: "BDR" },
  { value: "other", label: "Outro" },
]

interface VariableIncomeFormProps {
  variableIncome?: VariableIncome
  institutions: Institution[]
}

export function VariableIncomeForm({ variableIncome, institutions }: VariableIncomeFormProps) {
  const isEditing = !!variableIncome
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assetType, setAssetType] = useState<string>(variableIncome?.asset_type ?? "stock")
  const [institutionId, setInstitutionId] = useState<string>(
    variableIncome?.institution_id ? String(variableIncome.institution_id) : ""
  )
  const [isSold, setIsSold] = useState<boolean>(variableIncome?.is_sold ?? false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateVariableIncome(variableIncome.variable_income_id, formData)
        : await createVariableIncome(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteVariableIncome(variableIncome!.variable_income_id)
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
          {isEditing ? "Editar" : "Novo Ativo"}
        </DialogTrigger>

        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Ativo" : "Novo Ativo de Renda Variável"}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Ticker
                </label>
                <Input
                  name="ticker"
                  defaultValue={variableIncome?.ticker ?? ""}
                  placeholder="PETR4, BTC..."
                  required
                  style={{ textTransform: "uppercase" }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Tipo de Ativo
                </label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="asset_type" value={assetType} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Nome do Ativo
              </label>
              <Input
                name="name"
                defaultValue={variableIncome?.name ?? ""}
                placeholder="Ex: Petrobras PN, Bitcoin..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Instituição (opcional)
              </label>
              <Select value={institutionId} onValueChange={setInstitutionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a instituição" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.institution_id} value={String(inst.institution_id)}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="institution_id" value={institutionId} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Quantidade
                </label>
                <Input
                  name="quantity"
                  type="number"
                  step="0.00000001"
                  defaultValue={variableIncome?.quantity ?? ""}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Preço Médio (R$)
                </label>
                <Input
                  name="avg_price"
                  type="number"
                  step="0.01"
                  defaultValue={variableIncome?.avg_price ?? ""}
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Total Investido (R$)
                </label>
                <Input
                  name="total_invested"
                  type="number"
                  step="0.01"
                  defaultValue={variableIncome?.total_invested ?? ""}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Data do Investimento
                </label>
                <Input
                  name="investment_date"
                  type="date"
                  defaultValue={variableIncome?.investment_date ?? ""}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_sold_checkbox"
                type="checkbox"
                checked={isSold}
                onChange={(e) => setIsSold(e.target.checked)}
                className="h-4 w-4 rounded border border-input accent-primary"
              />
              <label htmlFor="is_sold_checkbox" className="text-sm font-medium text-foreground cursor-pointer">
                Ativo vendido
              </label>
              <input type="hidden" name="is_sold" value={isSold ? "true" : "false"} />
            </div>

            {isSold && (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-muted-foreground">Informações de venda</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Data da Venda
                    </label>
                    <Input
                      name="sell_date"
                      type="date"
                      defaultValue={variableIncome?.sell_date ?? ""}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Preço de Venda (R$)
                    </label>
                    <Input
                      name="sell_price"
                      type="number"
                      step="0.01"
                      defaultValue={variableIncome?.sell_price ?? ""}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Total da Venda (R$)
                  </label>
                  <Input
                    name="sell_total"
                    type="number"
                    step="0.01"
                    defaultValue={variableIncome?.sell_total ?? ""}
                    placeholder="0,00"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Notas
              </label>
              <textarea
                name="notes"
                defaultValue={variableIncome?.notes ?? ""}
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
