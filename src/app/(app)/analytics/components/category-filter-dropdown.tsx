"use client"

import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CategoryFilter, CategoryFilterMode } from "../types"

function getCategoryFilterLabel(filter: CategoryFilter): string {
  const count = filter.selected.size
  if (count === 0) return "Todas as categorias"
  if (filter.mode === "exclude") {
    return count === 1 ? `Ocultando 1 categoria` : `Ocultando ${count} categorias`
  }
  if (count === 1) {
    const [only] = filter.selected
    return only
  }
  return `${count} categorias`
}

interface CategoryFilterDropdownProps {
  categories: string[]
  value: CategoryFilter
  onChange: (value: CategoryFilter) => void
}

export function CategoryFilterDropdown({
  categories,
  value,
  onChange,
}: CategoryFilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="min-w-56 justify-between" />}>
        <span className="truncate">{getCategoryFilterLabel(value)}</span>
        <ChevronDown className="ml-2 size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Modo</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value.mode}
            onValueChange={(mode) =>
              onChange({ ...value, mode: mode as CategoryFilterMode })
            }
          >
            <DropdownMenuRadioItem value="include">
              Mostrar selecionadas
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="exclude">
              Ocultar selecionadas
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={value.selected.size === 0}
          onClick={() => onChange({ ...value, selected: new Set() })}
        >
          Limpar seleção
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Categorias</DropdownMenuLabel>
          {categories.map((cat) => (
            <DropdownMenuCheckboxItem
              key={cat}
              checked={value.selected.has(cat)}
              closeOnClick={false}
              onCheckedChange={(checked) => {
                const next = new Set(value.selected)
                if (checked) next.add(cat)
                else next.delete(cat)
                onChange({ ...value, selected: next })
              }}
            >
              {cat}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
