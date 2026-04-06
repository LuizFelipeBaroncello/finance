"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MonthPicker({ value }: { value: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navigate(month: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", month)
    router.push(`${pathname}?${params.toString()}`)
  }

  function shift(delta: number) {
    const [year, month] = value.split("-").map(Number)
    const d = new Date(year, month - 1 + delta, 1)
    navigate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const label = new Date(value + "-01T00:00:00").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(-1)}>
        <ChevronLeft className="size-4" />
      </Button>
      <input
        type="month"
        value={value}
        onChange={(e) => navigate(e.target.value)}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize"
        aria-label={label}
      />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(1)}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
