"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

type PeriodType = "quarter" | "semester" | "year"

export function PeriodSwitcher({
  periodType,
  year,
  periodIndex,
  label,
}: {
  periodType: PeriodType
  year: number
  periodIndex: number | null
  label: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildHref = (next: {
    period?: PeriodType
    year?: number
    pidx?: number | null
  }) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set("view", "period")
    if (next.period) sp.set("period", next.period)
    if (next.year !== undefined) sp.set("year", String(next.year))
    if (next.pidx === null) sp.delete("pidx")
    else if (next.pidx !== undefined) sp.set("pidx", String(next.pidx))
    return `${pathname}?${sp.toString()}`
  }

  const go = (delta: number) => {
    if (periodType === "year") {
      router.push(buildHref({ year: year + delta }))
      return
    }
    const max = periodType === "quarter" ? 4 : 2
    const current = periodIndex ?? 1
    let nextIdx = current + delta
    let nextYear = year
    if (nextIdx < 1) {
      nextIdx = max
      nextYear -= 1
    } else if (nextIdx > max) {
      nextIdx = 1
      nextYear += 1
    }
    router.push(buildHref({ year: nextYear, pidx: nextIdx }))
  }

  const handlePeriodChange = (value: string | null) => {
    if (!value) return
    const next = value as PeriodType
    const today = new Date()
    let pidx: number | null = null
    if (next === "quarter") pidx = Math.floor(today.getMonth() / 3) + 1
    else if (next === "semester") pidx = today.getMonth() < 6 ? 1 : 2
    router.push(buildHref({ period: next, year, pidx }))
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={periodType} onValueChange={handlePeriodChange}>
        <SelectTrigger className="h-8 w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="quarter">Trimestre</SelectItem>
          <SelectItem value="semester">Semestre</SelectItem>
          <SelectItem value="year">Ano</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => go(-1)}
          aria-label="Período anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-[110px] text-center text-sm font-medium tabular-nums">
          {label}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => go(1)}
          aria-label="Próximo período"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
