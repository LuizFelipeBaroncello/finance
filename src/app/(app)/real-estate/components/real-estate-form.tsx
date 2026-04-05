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
import { createRealEstate, updateRealEstate, deleteRealEstate } from "../actions"

type RealEstate = {
  real_estate_id: number
  client_id: number
  name: string
  property_type: "apartment" | "house" | "land" | "commercial" | "other"
  address: string | null
  purchase_date: string
  purchase_price: number
  current_estimated_value: number | null
  is_financed: boolean
  is_rental: boolean
  monthly_rental_income: number | null
  is_sold: boolean
  sell_date: string | null
  sell_price: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

const PROPERTY_TYPE_OPTIONS = [
  { value: "apartment", label: "Apartamento" },
  { value: "house", label: "Casa" },
  { value: "land", label: "Terreno" },
  { value: "commercial", label: "Comercial" },
  { value: "other", label: "Outro" },
]

interface RealEstateFormProps {
  realEstate?: RealEstate
}

export function RealEstateForm({ realEstate }: RealEstateFormProps) {
  const isEditing = !!realEstate
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [propertyType, setPropertyType] = useState<string>(realEstate?.property_type ?? "apartment")
  const [isFinanced, setIsFinanced] = useState<boolean>(realEstate?.is_financed ?? false)
  const [isRental, setIsRental] = useState<boolean>(realEstate?.is_rental ?? false)
  const [isSold, setIsSold] = useState<boolean>(realEstate?.is_sold ?? false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateRealEstate(realEstate.real_estate_id, formData)
        : await createRealEstate(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRealEstate(realEstate!.real_estate_id)
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
          {isEditing ? "Editar" : "Novo Imóvel"}
        </DialogTrigger>

        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Imóvel" : "Novo Imóvel"}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Nome
              </label>
              <Input
                name="name"
                defaultValue={realEstate?.name ?? ""}
                placeholder="Ex: Apartamento Centro"
                required
              />
            </div>

            {/* Tipo do imóvel */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tipo
              </label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="property_type" value={propertyType} />
            </div>

            {/* Endereço */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Endereço (opcional)
              </label>
              <Input
                name="address"
                defaultValue={realEstate?.address ?? ""}
                placeholder="Ex: Rua das Flores, 123"
              />
            </div>

            {/* Data de compra */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Data de Compra
              </label>
              <Input
                name="purchase_date"
                type="date"
                defaultValue={realEstate?.purchase_date ?? ""}
                required
              />
            </div>

            {/* Preço de compra */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Valor de Compra (R$)
              </label>
              <Input
                name="purchase_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={realEstate?.purchase_price ?? ""}
                placeholder="0,00"
                required
              />
            </div>

            {/* Valor estimado atual */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Valor Estimado Atual (R$) (opcional)
              </label>
              <Input
                name="current_estimated_value"
                type="number"
                step="0.01"
                min="0"
                defaultValue={realEstate?.current_estimated_value ?? ""}
                placeholder="0,00"
              />
            </div>

            {/* Financiado */}
            <div className="flex items-center gap-2">
              <input
                id="is_financed"
                type="checkbox"
                checked={isFinanced}
                onChange={(e) => setIsFinanced(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <label htmlFor="is_financed" className="text-sm font-medium text-foreground">
                Financiado?
              </label>
              <input type="hidden" name="is_financed" value={String(isFinanced)} />
            </div>

            {/* Alugado */}
            <div className="flex items-center gap-2">
              <input
                id="is_rental"
                type="checkbox"
                checked={isRental}
                onChange={(e) => setIsRental(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <label htmlFor="is_rental" className="text-sm font-medium text-foreground">
                Alugado?
              </label>
              <input type="hidden" name="is_rental" value={String(isRental)} />
            </div>

            {/* Renda mensal de aluguel (condicional) */}
            {isRental && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Renda Mensal de Aluguel (R$)
                </label>
                <Input
                  name="monthly_rental_income"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={realEstate?.monthly_rental_income ?? ""}
                  placeholder="0,00"
                />
              </div>
            )}

            {/* Vendido */}
            <div className="flex items-center gap-2">
              <input
                id="is_sold"
                type="checkbox"
                checked={isSold}
                onChange={(e) => setIsSold(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <label htmlFor="is_sold" className="text-sm font-medium text-foreground">
                Vendido?
              </label>
              <input type="hidden" name="is_sold" value={String(isSold)} />
            </div>

            {/* Campos de venda (condicionais) */}
            {isSold && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Data de Venda
                  </label>
                  <Input
                    name="sell_date"
                    type="date"
                    defaultValue={realEstate?.sell_date ?? ""}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Valor de Venda (R$)
                  </label>
                  <Input
                    name="sell_price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={realEstate?.sell_price ?? ""}
                    placeholder="0,00"
                  />
                </div>
              </>
            )}

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Notas (opcional)
              </label>
              <textarea
                name="notes"
                defaultValue={realEstate?.notes ?? ""}
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
