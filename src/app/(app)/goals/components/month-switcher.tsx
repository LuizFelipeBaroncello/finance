"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

function shift(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${yyyy}-${mm}`
}

export function MonthSwitcher({ selectedMonth }: { selectedMonth: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [y, m] = selectedMonth.split("-").map(Number)
  const label = `${MONTH_NAMES[m - 1]} ${y}`

  const go = (delta: number) => {
    const next = shift(selectedMonth, delta)
    router.push(`${pathname}?month=${next}`)
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => go(-1)}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <div className="min-w-[140px] text-center text-sm font-medium tabular-nums">
        {label}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => go(1)}
        aria-label="Próximo mês"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
