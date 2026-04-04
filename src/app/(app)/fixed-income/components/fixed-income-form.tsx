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
import { createFixedIncome, updateFixedIncome, deleteFixedIncome } from "../actions"

type FixedIncome = {
  fixed_income_id: number
  client_id: number
  institution_id: number | null
  name: string
  type: "cdb" | "lci" | "lca" | "tesouro_selic" | "tesouro_ipca" | "tesouro_prefixado" | "debenture" | "cri" | "cra" | "other"
  invested_amount: number
  rate_type: "pre" | "pre_ipca" | "pos_cdi" | "pos_ipca" | "pos_selic"
  rate_value: number
  investment_date: string
  maturity_date: string | null
  expected_return: number | null
  is_redeemed: boolean
  redemption_date: string | null
  redemption_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

type Institution = {
  institution_id: number
  name: string
}

const TYPE_OPTIONS = [
  { value: "cdb", label: "CDB" },
  { value: "lci", label: "LCI" },
  { value: "lca", label: "LCA" },
  { value: "tesouro_selic", label: "Tesouro Selic" },
  { value: "tesouro_ipca", label: "Tesouro IPCA+" },
  { value: "tesouro_prefixado", label: "Tesouro Prefixado" },
  { value: "debenture", label: "Debênture" },
  { value: "cri", label: "CRI" },
  { value: "cra", label: "CRA" },
  { value: "other", label: "Outro" },
]

const RATE_TYPE_OPTIONS = [
  { value: "pre", label: "Pré-fixado" },
  { value: "pre_ipca", label: "IPCA+" },
  { value: "pos_cdi", label: "CDI" },
  { value: "pos_ipca", label: "IPCA" },
  { value: "pos_selic", label: "Selic" },
]

interface FixedIncomeFormProps {
  fixedIncome?: FixedIncome
  institutions: Institution[]
}

export function FixedIncomeForm({ fixedIncome, institutions }: FixedIncomeFormProps) {
  const isEditing = !!fixedIncome
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<string>(fixedIncome?.type ?? "cdb")
  const [rateType, setRateType] = useState<string>(fixedIncome?.rate_type ?? "pos_cdi")
  const [institutionId, setInstitutionId] = useState<string>(
    fixedIncome?.institution_id ? String(fixedIncome.institution_id) : ""
  )
  const [isRedeemed, setIsRedeemed] = useState<boolean>(fixedIncome?.is_redeemed ?? false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateFixedIncome(fixedIncome.fixed_income_id, formData)
        : await createFixedIncome(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFixedIncome(fixedIncome!.fixed_income_id)
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
          {isEditing ? "Editar" : "Novo Investimento"}
        </DialogTrigger>

        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Investimento" : "Novo Investimento"}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome</label>
              <Input
                name="name"
                defaultValue={fixedIncome?.name ?? ""}
                placeholder="Ex: CDB Nubank 120% CDI"
                required
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tipo</label>
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

            {/* Instituição */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Instituição</label>
              <Select value={institutionId} onValueChange={setInstitutionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a instituição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.institution_id} value={String(inst.institution_id)}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="institution_id" value={institutionId} />
            </div>

            {/* Valor Investido */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Valor Investido (R$)</label>
              <Input
                name="invested_amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={fixedIncome?.invested_amount ?? ""}
                placeholder="0,00"
                required
              />
            </div>

            {/* Tipo de Taxa */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tipo de Taxa</label>
              <Select value={rateType} onValueChange={setRateType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo de taxa" />
                </SelectTrigger>
                <SelectContent>
                  {RATE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="rate_type" value={rateType} />
            </div>

            {/* Taxa (%) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Taxa (%)</label>
              <Input
                name="rate_value"
                type="number"
                step="0.01"
                defaultValue={fixedIncome?.rate_value ?? ""}
                placeholder="Ex: 12,5"
                required
              />
            </div>

            {/* Data de Investimento */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data de Investimento</label>
              <Input
                name="investment_date"
                type="date"
                defaultValue={fixedIncome?.investment_date ?? ""}
                required
              />
            </div>

            {/* Data de Vencimento */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data de Vencimento (opcional)</label>
              <Input
                name="maturity_date"
                type="date"
                defaultValue={fixedIncome?.maturity_date ?? ""}
              />
            </div>

            {/* Retorno Esperado */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Retorno Esperado (R$, opcional)</label>
              <Input
                name="expected_return"
                type="number"
                step="0.01"
                min="0"
                defaultValue={fixedIncome?.expected_return ?? ""}
                placeholder="0,00"
              />
            </div>

            {/* Resgatado */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_redeemed"
                checked={isRedeemed}
                onChange={(e) => setIsRedeemed(e.target.checked)}
                className="h-4 w-4 rounded border border-input"
              />
              <label htmlFor="is_redeemed" className="text-sm font-medium text-foreground">
                Resgatado
              </label>
              <input type="hidden" name="is_redeemed" value={String(isRedeemed)} />
            </div>

            {/* Campos de resgate */}
            {isRedeemed && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Data de Resgate</label>
                  <Input
                    name="redemption_date"
                    type="date"
                    defaultValue={fixedIncome?.redemption_date ?? ""}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Valor Resgatado (R$)</label>
                  <Input
                    name="redemption_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={fixedIncome?.redemption_amount ?? ""}
                    placeholder="0,00"
                  />
                </div>
              </>
            )}

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Notas (opcional)</label>
              <textarea
                name="notes"
                defaultValue={fixedIncome?.notes ?? ""}
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
