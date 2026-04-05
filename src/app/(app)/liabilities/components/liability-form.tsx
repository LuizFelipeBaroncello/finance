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
import { createLiability, updateLiability, deleteLiability } from "../actions"

type Liability = {
  liability_id: number
  client_id: number
  institution_id: number | null
  name: string
  type: "mortgage" | "vehicle_loan" | "personal_loan" | "credit_card" | "student_loan" | "other"
  original_amount: number
  outstanding_balance: number
  interest_rate: number | null
  interest_rate_period: "monthly" | "yearly" | null
  total_installments: number | null
  paid_installments: number
  installment_amount: number | null
  start_date: string
  end_date: string | null
  real_estate_id: number | null
  vehicle_id: number | null
  is_paid_off: boolean
  notes: string | null
}

type Institution = {
  institution_id: number
  name: string
}

type RealEstate = {
  real_estate_id: number
  name: string
}

type Vehicle = {
  vehicle_id: number
  name: string
}

const TYPE_OPTIONS = [
  { value: "mortgage", label: "Financiamento Imobiliário" },
  { value: "vehicle_loan", label: "Financiamento Veículo" },
  { value: "personal_loan", label: "Empréstimo Pessoal" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "student_loan", label: "Financiamento Estudantil" },
  { value: "other", label: "Outro" },
]

const INTEREST_PERIOD_OPTIONS = [
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
]

interface LiabilityFormProps {
  liability?: Liability
  institutions: Institution[]
  realEstates: RealEstate[]
  vehicles: Vehicle[]
}

export function LiabilityForm({
  liability,
  institutions,
  realEstates,
  vehicles,
}: LiabilityFormProps) {
  const isEditing = !!liability
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<string>(liability?.type ?? "other")
  const [institutionId, setInstitutionId] = useState<string>(
    liability?.institution_id ? String(liability.institution_id) : ""
  )
  const [interestRatePeriod, setInterestRatePeriod] = useState<string>(
    liability?.interest_rate_period ?? ""
  )
  const [realEstateId, setRealEstateId] = useState<string>(
    liability?.real_estate_id ? String(liability.real_estate_id) : ""
  )
  const [vehicleId, setVehicleId] = useState<string>(
    liability?.vehicle_id ? String(liability.vehicle_id) : ""
  )
  const [isPaidOff, setIsPaidOff] = useState<boolean>(liability?.is_paid_off ?? false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateLiability(liability.liability_id, formData)
        : await createLiability(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLiability(liability!.liability_id)
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
          {isEditing ? "Editar" : "Novo Passivo"}
        </DialogTrigger>

        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Passivo" : "Novo Passivo"}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSubmit}>
            <div className="max-h-[80vh] overflow-y-auto space-y-4 pr-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nome</label>
                <Input
                  name="name"
                  defaultValue={liability?.name ?? ""}
                  placeholder="Ex: Financiamento Apartamento"
                  required
                />
              </div>

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

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Instituição (opcional)
                </label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Valor Original
                  </label>
                  <Input
                    name="original_amount"
                    type="number"
                    step="0.01"
                    defaultValue={liability?.original_amount ?? ""}
                    placeholder="0,00"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Saldo Devedor Atual
                  </label>
                  <Input
                    name="outstanding_balance"
                    type="number"
                    step="0.01"
                    defaultValue={liability?.outstanding_balance ?? ""}
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Taxa de Juros (opcional)
                  </label>
                  <Input
                    name="interest_rate"
                    type="number"
                    step="0.01"
                    defaultValue={liability?.interest_rate ?? ""}
                    placeholder="Ex: 0.89"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Período dos Juros (opcional)
                  </label>
                  <Select value={interestRatePeriod} onValueChange={setInterestRatePeriod}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {INTEREST_PERIOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="interest_rate_period" value={interestRatePeriod} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Total de Parcelas (opcional)
                  </label>
                  <Input
                    name="total_installments"
                    type="number"
                    defaultValue={liability?.total_installments ?? ""}
                    placeholder="Ex: 360"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Parcelas Pagas
                  </label>
                  <Input
                    name="paid_installments"
                    type="number"
                    defaultValue={liability?.paid_installments ?? 0}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Valor da Parcela (opcional)
                  </label>
                  <Input
                    name="installment_amount"
                    type="number"
                    step="0.01"
                    defaultValue={liability?.installment_amount ?? ""}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Data de Início
                  </label>
                  <Input
                    name="start_date"
                    type="date"
                    defaultValue={liability?.start_date ?? ""}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Data de Término (opcional)
                  </label>
                  <Input
                    name="end_date"
                    type="date"
                    defaultValue={liability?.end_date ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Imóvel Vinculado (opcional)
                </label>
                <Select value={realEstateId} onValueChange={setRealEstateId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o imóvel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {realEstates.map((re) => (
                      <SelectItem key={re.real_estate_id} value={String(re.real_estate_id)}>
                        {re.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="real_estate_id" value={realEstateId} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Veículo Vinculado (opcional)
                </label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.vehicle_id} value={String(v.vehicle_id)}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="vehicle_id" value={vehicleId} />
              </div>

              <div className="flex items-center gap-2">
                <input type="hidden" name="is_paid_off" value={String(isPaidOff)} />
                <input
                  id="is_paid_off_check"
                  type="checkbox"
                  checked={isPaidOff}
                  onChange={(e) => setIsPaidOff(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <label
                  htmlFor="is_paid_off_check"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Quitado?
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Notas (opcional)
                </label>
                <textarea
                  name="notes"
                  defaultValue={liability?.notes ?? ""}
                  placeholder="Observações opcionais..."
                  rows={3}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter className="mt-4">
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
