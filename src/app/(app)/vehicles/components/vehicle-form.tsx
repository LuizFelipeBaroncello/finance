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
import { createVehicle, updateVehicle, deleteVehicle } from "../actions"

type Vehicle = {
  vehicle_id: number
  client_id: number
  name: string
  vehicle_type: "car" | "motorcycle" | "truck" | "other"
  brand: string | null
  model: string | null
  year: number | null
  purchase_date: string
  purchase_price: number
  current_estimated_value: number | null
  is_financed: boolean
  is_sold: boolean
  sell_date: string | null
  sell_price: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

const VEHICLE_TYPE_OPTIONS = [
  { value: "car", label: "Carro" },
  { value: "motorcycle", label: "Moto" },
  { value: "truck", label: "Caminhão" },
  { value: "other", label: "Outro" },
]

interface VehicleFormProps {
  vehicle?: Vehicle
}

export function VehicleForm({ vehicle }: VehicleFormProps) {
  const isEditing = !!vehicle
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vehicleType, setVehicleType] = useState<string>(vehicle?.vehicle_type ?? "car")
  const [isFinanced, setIsFinanced] = useState<boolean>(vehicle?.is_financed ?? false)
  const [isSold, setIsSold] = useState<boolean>(vehicle?.is_sold ?? false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateVehicle(vehicle.vehicle_id, formData)
        : await createVehicle(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteVehicle(vehicle!.vehicle_id)
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
          {isEditing ? "Editar" : "Novo Veículo"}
        </DialogTrigger>

        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Veículo" : "Novo Veículo"}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Nome
              </label>
              <Input
                name="name"
                defaultValue={vehicle?.name ?? ""}
                placeholder="Ex: Honda Civic 2020"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tipo
              </label>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="vehicle_type" value={vehicleType} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Marca (opcional)
                </label>
                <Input
                  name="brand"
                  defaultValue={vehicle?.brand ?? ""}
                  placeholder="Ex: Honda, Toyota"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Modelo (opcional)
                </label>
                <Input
                  name="model"
                  defaultValue={vehicle?.model ?? ""}
                  placeholder="Ex: Civic, Corolla"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Ano (opcional)
              </label>
              <Input
                name="year"
                type="number"
                defaultValue={vehicle?.year ?? ""}
                placeholder="Ex: 2020"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Data de Compra
              </label>
              <Input
                name="purchase_date"
                type="date"
                defaultValue={vehicle?.purchase_date ?? ""}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Preço de Compra
              </label>
              <Input
                name="purchase_price"
                type="number"
                step="0.01"
                defaultValue={vehicle?.purchase_price ?? ""}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Valor Estimado Atual (opcional)
              </label>
              <Input
                name="current_estimated_value"
                type="number"
                step="0.01"
                defaultValue={vehicle?.current_estimated_value ?? ""}
                placeholder="0,00"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="is_financed"
                value={String(isFinanced)}
              />
              <input
                id="is_financed_check"
                type="checkbox"
                checked={isFinanced}
                onChange={(e) => setIsFinanced(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label
                htmlFor="is_financed_check"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Financiado?
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="is_sold"
                value={String(isSold)}
              />
              <input
                id="is_sold_check"
                type="checkbox"
                checked={isSold}
                onChange={(e) => setIsSold(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label
                htmlFor="is_sold_check"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Vendido?
              </label>
            </div>

            {isSold && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Data de Venda
                  </label>
                  <Input
                    name="sell_date"
                    type="date"
                    defaultValue={vehicle?.sell_date ?? ""}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Preço de Venda
                  </label>
                  <Input
                    name="sell_price"
                    type="number"
                    step="0.01"
                    defaultValue={vehicle?.sell_price ?? ""}
                    placeholder="0,00"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Notas (opcional)
              </label>
              <textarea
                name="notes"
                defaultValue={vehicle?.notes ?? ""}
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
