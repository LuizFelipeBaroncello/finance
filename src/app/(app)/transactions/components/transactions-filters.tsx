"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { PeriodFilter } from "@/app/(app)/analytics/components/period-filter"
import { CategoryFilterDropdown } from "@/app/(app)/analytics/components/category-filter-dropdown"
import type { CategoryFilter } from "@/app/(app)/analytics/types"

function parseCategoryFilter(searchParams: URLSearchParams): CategoryFilter {
  const raw = searchParams.get("cat")
  const selected = new Set(
    (raw ?? "")
      .split(",")
      .map((s) => decodeURIComponent(s).trim())
      .filter(Boolean)
  )
  const mode = searchParams.get("catMode") === "exclude" ? "exclude" : "include"
  return { mode, selected }
}

interface TransactionsFiltersProps {
  startDate: string
  endDate: string
  categories: string[]
}

export function TransactionsFilters({
  startDate,
  endDate,
  categories,
}: TransactionsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const value = parseCategoryFilter(new URLSearchParams(searchParams.toString()))

  const onChange = useCallback(
    (next: CategoryFilter) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.selected.size === 0) {
        params.delete("cat")
        params.delete("catMode")
      } else {
        params.set(
          "cat",
          Array.from(next.selected).map(encodeURIComponent).join(",")
        )
        if (next.mode === "exclude") params.set("catMode", "exclude")
        else params.delete("catMode")
      }
      router.push(`/transactions?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      <PeriodFilter
        startDate={startDate}
        endDate={endDate}
        granularity="monthly"
        basePath="/transactions"
      />
      <CategoryFilterDropdown
        categories={categories}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
