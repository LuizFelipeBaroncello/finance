"use client"

import { useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Button } from "@/components/ui/button"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react"
import { useState } from "react"
import { applyCategoryFilter } from "../lib/category-filter"
import type { CategoryFilter, CategoryFilterMode, Transaction } from "../types"

type SortKey = "date" | "description" | "amount" | "type" | "account"
type SortDir = "asc" | "desc"

const TYPE_LABELS: Record<string, string> = {
  debit: "Despesa",
  credit: "Receita",
  transfer: "Transferência",
}

const TYPE_VARIANTS: Record<string, "destructive" | "default" | "secondary"> = {
  debit: "destructive",
  credit: "default",
  transfer: "secondary",
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (column !== sortKey) return <ArrowUpDown className="ml-1 inline size-3.5 text-muted-foreground/50" />
  if (sortDir === "asc") return <ArrowUp className="ml-1 inline size-3.5" />
  return <ArrowDown className="ml-1 inline size-3.5" />
}

interface TransactionListProps {
  transactions: Transaction[]
  categories: string[]
  search: string
  onSearchChange: (value: string) => void
  categoryFilter: CategoryFilter
  onCategoryFilterChange: (value: CategoryFilter) => void
  hiddenIds: Set<number>
  onToggleHidden: (id: number) => void
  onClearHidden: () => void
}

function getCategoryFilterLabel(filter: CategoryFilter): string {
  const count = filter.selected.size
  if (count === 0) return "Todas as categorias"
  if (filter.mode === "exclude") {
    return count === 1
      ? `Ocultando 1 categoria`
      : `Ocultando ${count} categorias`
  }
  if (count === 1) {
    const [only] = filter.selected
    return only
  }
  return `${count} categorias`
}

export function TransactionList({
  transactions,
  categories,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  hiddenIds,
  onToggleHidden,
  onClearHidden,
}: TransactionListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filtered = useMemo(() => {
    let result = transactions

    if (search.trim()) {
      const term = search.toLowerCase()
      result = result.filter((t) => t.description.toLowerCase().includes(term))
    }

    result = applyCategoryFilter(result, categoryFilter)

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "date":
          cmp = a.date.localeCompare(b.date)
          break
        case "description":
          cmp = a.description.localeCompare(b.description, "pt-BR")
          break
        case "amount":
          cmp = Math.abs(a.amount) - Math.abs(b.amount)
          break
        case "type":
          cmp = a.type.localeCompare(b.type)
          break
        case "account":
          cmp = (a.account?.account_name ?? "").localeCompare(
            b.account?.account_name ?? "",
            "pt-BR"
          )
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [transactions, search, categoryFilter, sortKey, sortDir])

  const thClass =
    "cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"

  const hiddenCount = hiddenIds.size

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Pesquisar por descrição..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" className="min-w-56 justify-between" />}>
            <span className="truncate">{getCategoryFilterLabel(categoryFilter)}</span>
            <ChevronDown className="ml-2 size-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Modo</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={categoryFilter.mode}
                onValueChange={(value) =>
                  onCategoryFilterChange({
                    ...categoryFilter,
                    mode: value as CategoryFilterMode,
                  })
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
              disabled={categoryFilter.selected.size === 0}
              onClick={() =>
                onCategoryFilterChange({ ...categoryFilter, selected: new Set() })
              }
            >
              Limpar seleção
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Categorias</DropdownMenuLabel>
              {categories.map((cat) => (
                <DropdownMenuCheckboxItem
                  key={cat}
                  checked={categoryFilter.selected.has(cat)}
                  closeOnClick={false}
                  onCheckedChange={(checked) => {
                    const next = new Set(categoryFilter.selected)
                    if (checked) next.add(cat)
                    else next.delete(cat)
                    onCategoryFilterChange({ ...categoryFilter, selected: next })
                  }}
                >
                  {cat}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {hiddenCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <EyeOff className="size-3.5" />
            <span>
              {hiddenCount} {hiddenCount === 1 ? "transação oculta" : "transações ocultas"} dos gráficos
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClearHidden}>
              Mostrar todas
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead className={thClass} onClick={() => handleSort("date")}>
                Data
                <SortIcon column="date" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("description")}>
                Descrição
                <SortIcon column="description" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("amount")}>
                Valor
                <SortIcon column="amount" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("type")}>
                Tipo
                <SortIcon column="type" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("account")}>
                Conta
                <SortIcon column="account" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead>Categorias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            )}
            {filtered.map((tx) => {
              const relCategories = tx.re_category_transaction ?? []
              const isHidden = hiddenIds.has(tx.trans_id)
              return (
                <TableRow key={tx.trans_id} className={isHidden ? "opacity-40" : ""}>
                  <TableCell className="px-2">
                    <button
                      onClick={() => onToggleHidden(tx.trans_id)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title={isHidden ? "Mostrar nos gráficos" : "Ocultar dos gráficos"}
                    >
                      {isHidden ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(tx.date.replace(" ", "T")).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-medium">{tx.description}</TableCell>
                  <TableCell
                    className={`font-medium whitespace-nowrap ${
                      tx.type === "credit"
                        ? "text-green-600 dark:text-green-400"
                        : tx.type === "debit"
                          ? "text-red-600 dark:text-red-400"
                          : ""
                    }`}
                  >
                    {tx.type === "credit" ? "+" : tx.type === "debit" ? "-" : ""}
                    {formatCurrency(Math.abs(tx.amount))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={TYPE_VARIANTS[tx.type] ?? "secondary"}>
                      {TYPE_LABELS[tx.type] ?? tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tx.account?.account_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {relCategories.length === 0 && (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                      {relCategories.map((rc) => (
                        <Badge key={rc.category_id} variant="outline" className="text-xs">
                          {rc.category?.category_name ?? rc.category_id}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
