"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useCurrencyVisibility, MASK } from "@/lib/currency"
import {
  buildCalendar,
  buildMonthCells,
  buildYearCells,
  cellLabel,
  formatDayLong,
  monthRange,
  summarize,
  WEEKDAY_LABELS,
  yearRange,
  yearsInHistory,
  type CalendarMode,
  type CalendarScale,
  type GridCell,
  type MonthTotal,
} from "../lib/calendar"
import type { Transaction } from "../types"

const SCALES: Array<{ value: CalendarScale; label: string }> = [
  { value: "day", label: "Dia" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
]

const MODES: Array<{ value: CalendarMode; label: string }> = [
  { value: "out", label: "Só saídas" },
  { value: "both", label: "Entradas e saídas" },
]

/** Compact amount for the cells, e.g. 8,8mil. */
function compactNumber(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")}mi`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1).replace(".", ",")}mil`
  return `${sign}${Math.round(abs)}`
}

function compactBRL(value: number) {
  return `R$ ${compactNumber(value)}`
}

function fullBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function percent(value: number, total: number) {
  if (total <= 0) return "0%"
  const pct = (value / total) * 100
  if (pct > 0 && pct < 0.1) return "<0,1%"
  return `${pct.toFixed(pct >= 10 ? 0 : 1).replace(".", ",")}%`
}

/**
 * Alpha ramp for the heat scale. The exponent lifts small cells out of the
 * background without letting them rival the peak.
 */
function intensity(value: number, max: number) {
  if (value <= 0 || max <= 0) return 0
  return 0.12 + 0.73 * Math.pow(value / max, 0.55)
}

function cellBackground(alpha: number, positive: boolean) {
  if (alpha <= 0) return undefined
  const rgb = positive ? "34, 197, 94" : "239, 68, 68"
  return `rgba(${rgb}, ${alpha.toFixed(3)})`
}

/** Cell amount: the "R$" prefix is dropped on narrow screens to avoid wrapping. */
function ShortMoney({ value, hidden }: { value: number; hidden: boolean }) {
  if (hidden) return <>{MASK}</>
  return (
    <>
      <span className="hidden sm:inline">R$ </span>
      {compactNumber(value)}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

interface CalendarChartProps {
  /** Period-scoped and already filtered by the dashboard's search/category. */
  transactions: Transaction[]
  /** Whole-history month totals, for the month and year scales. */
  monthlyTotals: MonthTotal[]
  startDate: string
  endDate: string
}

export function CalendarChart({
  transactions,
  monthlyTotals,
  startDate,
  endDate,
}: CalendarChartProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hidden } = useCurrencyVisibility()

  const [scale, setScale] = useState<CalendarScale>("day")
  const [mode, setMode] = useState<CalendarMode>("out")
  const [monthKey, setMonthKey] = useState<string | null>(null)
  const [yearKey, setYearKey] = useState<number | null>(null)
  const [selected, setSelected] = useState<GridCell | null>(null)

  const money = (value: number) => (hidden ? MASK : fullBRL(value))
  const moneyShort = (value: number) => (hidden ? MASK : compactBRL(value))

  /** Re-scopes the whole analytics page to a new period. */
  const goToPeriod = useCallback(
    (range: { startDate: string; endDate: string }, granularity: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("startDate", range.startDate)
      params.set("endDate", range.endDate)
      params.set("granularity", granularity)
      router.push(`/analytics?${params.toString()}`)
    },
    [router, searchParams]
  )

  // --- Day scale: one grid per month of the selected period -----------------
  const months = useMemo(
    () => buildCalendar(transactions, startDate, endDate),
    [transactions, startDate, endDate]
  )

  // Open on the most recent month that has movement, so a full-year period
  // doesn't land on an empty grid.
  const defaultMonthKey = useMemo(() => {
    const withMovement = [...months].reverse().find((m) => m.summary.comMovimento > 0)
    return (withMovement ?? months[months.length - 1])?.key
  }, [months])

  const activeMonthKey =
    monthKey && months.some((m) => m.key === monthKey) ? monthKey : defaultMonthKey
  const monthIndex = months.findIndex((m) => m.key === activeMonthKey)
  const bucket = months[monthIndex] ?? months[0]

  // --- Month scale: the 12 months of a year --------------------------------
  const years = useMemo(() => yearsInHistory(monthlyTotals), [monthlyTotals])
  const periodYear = Number(startDate.substring(0, 4))
  const activeYear =
    yearKey && years.includes(yearKey)
      ? yearKey
      : years.includes(periodYear)
        ? periodYear
        : (years[years.length - 1] ?? periodYear)
  const yearIndex = years.indexOf(activeYear)

  const monthCells = useMemo(
    () => buildMonthCells(monthlyTotals, activeYear),
    [monthlyTotals, activeYear]
  )

  // --- Year scale: the whole history ---------------------------------------
  const yearCells = useMemo(() => buildYearCells(monthlyTotals), [monthlyTotals])

  // --- Active grid ----------------------------------------------------------
  const cells = useMemo(() => {
    if (scale === "day") return bucket?.cells ?? []
    return scale === "month" ? monthCells : yearCells
  }, [scale, bucket, monthCells, yearCells])

  const summary = useMemo(
    () => (scale === "day" ? bucket?.summary : summarize(cells)),
    [scale, bucket, cells]
  )

  const dayTransactions = useMemo(() => {
    if (!selected?.date) return []
    const date = selected.date
    return transactions
      .filter((t) => t.type !== "transfer" && t.date.substring(0, 10) === date)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  }, [transactions, selected])

  if (!summary) return null

  const onlyOut = mode === "out"
  const headline = onlyOut ? summary.totalSaidas : summary.totalSaldo
  const headlineCount = onlyOut ? summary.comSaida : summary.comMovimento
  const mediaBase = summary.ativos || 1

  const unit =
    scale === "day"
      ? { one: "dia", many: "dias", cap: "por dia" }
      : scale === "month"
        ? { one: "mês", many: "meses", cap: "por mês" }
        : { one: "ano", many: "anos", cap: "por ano" }

  const scopeLabel =
    scale === "day"
      ? bucket.label
      : scale === "month"
        ? String(activeYear)
        : years.length > 0
          ? `${years[0]} – ${years[years.length - 1]}`
          : "sem histórico"

  const subtitle = onlyOut
    ? `quanto saiu em cada ${unit.one}`
    : `entradas e saídas de cada ${unit.one}`

  /** Clicking a cell drills down: year → months → days → transactions. */
  const handleCellClick = (cell: GridCell) => {
    if (scale === "day") {
      setSelected(cell)
      return
    }
    if (scale === "month") {
      const [y, m] = cell.key.split("-").map(Number)
      setScale("day")
      setMonthKey(null)
      goToPeriod(monthRange(y, m), "daily")
      return
    }
    const year = Number(cell.key)
    setYearKey(year)
    setScale("month")
    goToPeriod(yearRange(year), "monthly")
  }

  const navigation =
    scale === "day" && months.length > 1
      ? {
          label: `${monthIndex + 1}/${months.length}`,
          prevLabel: "Mês anterior",
          nextLabel: "Próximo mês",
          canPrev: monthIndex > 0,
          canNext: monthIndex < months.length - 1,
          onPrev: () => setMonthKey(months[monthIndex - 1]?.key ?? null),
          onNext: () => setMonthKey(months[monthIndex + 1]?.key ?? null),
        }
      : scale === "month" && years.length > 1
        ? {
            label: String(activeYear),
            prevLabel: "Ano anterior",
            nextLabel: "Próximo ano",
            canPrev: yearIndex > 0,
            canNext: yearIndex < years.length - 1,
            onPrev: () => setYearKey(years[yearIndex - 1] ?? null),
            onNext: () => setYearKey(years[yearIndex + 1] ?? null),
          }
        : null

  const gridClass =
    scale === "day"
      ? "grid-cols-7"
      : scale === "month"
        ? "grid-cols-3 sm:grid-cols-4"
        : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5"

  return (
    <div className="flex flex-col gap-5">
      {/* Header: scope, headline, scale/mode toggles and navigation */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {scopeLabel} · {subtitle}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={cn(
                "text-3xl font-semibold tracking-tight tabular-nums",
                onlyOut ? "text-foreground" : headline >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {money(headline)}
            </span>
            <span className="text-sm text-muted-foreground">
              {onlyOut
                ? `em ${headlineCount} ${headlineCount === 1 ? unit.one : unit.many} com saída`
                : `saldo em ${headlineCount} ${headlineCount === 1 ? unit.one : unit.many} com movimento`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border p-1">
            {SCALES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setScale(opt.value)
                  setSelected(null)
                }}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  scale === opt.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border border-border p-1">
            {MODES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  mode === opt.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {navigation && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={navigation.prevLabel}
                disabled={!navigation.canPrev}
                onClick={navigation.onPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-10 text-center text-xs font-medium tabular-nums text-muted-foreground">
                {navigation.label}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={navigation.nextLabel}
                disabled={!navigation.canNext}
                onClick={navigation.onNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className={cn("grid gap-1.5 sm:gap-2", gridClass)}>
        {scale === "day" && (
          <>
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="px-1 text-[10px] font-medium tracking-wider text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {Array.from({ length: bucket.leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} aria-hidden />
            ))}
          </>
        )}

        {cells.map((cell) => {
          const positive = !onlyOut && cell.saldo > 0
          const alpha = onlyOut
            ? intensity(cell.saidas, summary.maxSaida)
            : intensity(Math.abs(cell.saldo), summary.maxAbsSaldo)
          const empty = onlyOut ? cell.saidas === 0 : cell.count === 0
          const isSelected = selected?.key === cell.key
          const clickable = cell.inRange && cell.count > 0

          const saidaPct = percent(cell.saidas, summary.totalSaidas)
          const entradaPct = percent(cell.entradas, summary.totalEntradas)

          return (
            <button
              key={cell.key}
              type="button"
              disabled={!clickable}
              onClick={() => handleCellClick(cell)}
              title={
                cell.count === 0
                  ? undefined
                  : `${cell.date ? formatDayLong(cell.date) : cell.label} — entrou ${money(cell.entradas)} · saiu ${money(cell.saidas)}`
              }
              className={cn(
                "flex min-h-16 flex-col justify-between gap-1 overflow-hidden rounded-lg border border-transparent p-1.5 text-left transition-all duration-150 sm:min-h-20 sm:p-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                empty && "bg-muted/40",
                !cell.inRange && "opacity-30",
                clickable &&
                  "cursor-pointer hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md hover:brightness-125",
                isSelected && "border-foreground/60 shadow-md"
              )}
              style={{ backgroundColor: cellBackground(alpha, positive) }}
            >
              <span
                className={cn(
                  "text-[11px] tabular-nums sm:text-xs",
                  empty ? "text-muted-foreground" : "font-medium text-foreground"
                )}
              >
                {cell.label}
              </span>

              {onlyOut ? (
                cell.saidas > 0 ? (
                  <span className="flex flex-col leading-tight">
                    <span className="text-[11px] font-semibold tabular-nums sm:text-xs">
                      <ShortMoney value={cell.saidas} hidden={hidden} />
                    </span>
                    <span className="text-[9px] tabular-nums text-foreground/70 sm:text-[10px]">
                      {saidaPct}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground sm:text-xs">–</span>
                )
              ) : cell.count > 0 ? (
                <span className="flex flex-col leading-tight">
                  {cell.entradas > 0 && (
                    <span className="text-[10px] font-semibold tabular-nums text-foreground sm:text-[11px]">
                      <span className="text-green-500">↑</span>{" "}
                      <ShortMoney value={cell.entradas} hidden={hidden} />{" "}
                      <span className="font-normal text-foreground/60">{entradaPct}</span>
                    </span>
                  )}
                  {cell.saidas > 0 && (
                    <span className="text-[10px] font-semibold tabular-nums text-foreground sm:text-[11px]">
                      <span className="text-red-500">↓</span>{" "}
                      <ShortMoney value={cell.saidas} hidden={hidden} />{" "}
                      <span className="font-normal text-foreground/60">{saidaPct}</span>
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground sm:text-xs">–</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer stats */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <Stat
            label={onlyOut ? `Média ${unit.cap}` : `Saldo médio/${unit.one}`}
            value={money((onlyOut ? summary.totalSaidas : summary.totalSaldo) / mediaBase)}
          />
          <Stat
            label={onlyOut ? `Maior ${unit.one}` : "Maior entrada"}
            value={(() => {
              const cell = onlyOut ? summary.maiorSaida : summary.maiorEntrada
              if (!cell) return "–"
              return `${cellLabel(cell)} · ${moneyShort(onlyOut ? cell.saidas : cell.entradas)}`
            })()}
          />
          <Stat
            label={onlyOut ? `${unit.many} sem saída` : `${unit.many} sem movimento`}
            value={String(
              onlyOut ? summary.ativos - summary.comSaida : summary.ativos - summary.comMovimento
            )}
          />
          {!onlyOut && <Stat label="Total de entradas" value={money(summary.totalEntradas)} />}
          {!onlyOut && <Stat label="Total de saídas" value={money(summary.totalSaidas)} />}
        </div>
        <p className="text-xs text-muted-foreground">
          {scale === "day"
            ? "Clique num dia para ver as transações"
            : scale === "month"
              ? "Clique num mês para abrir os dias"
              : "Clique num ano para abrir os meses"}
        </p>
      </div>

      {/* Day detail */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="first-letter:uppercase">
              {selected?.date ? formatDayLong(selected.date) : ""}
            </DialogTitle>
            <DialogDescription>
              {selected && (
                <span className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-green-500">
                    Entradas {money(selected.entradas)} (
                    {percent(selected.entradas, summary.totalEntradas)} do mês)
                  </span>
                  <span className="text-red-500">
                    Saídas {money(selected.saidas)} (
                    {percent(selected.saidas, summary.totalSaidas)} do mês)
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 divide-y divide-border overflow-y-auto">
            {dayTransactions.map((t) => (
              <div key={t.trans_id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{t.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {t.account?.account_name ?? "Conta desconhecida"}
                    </span>
                    {(t.re_category_transaction ?? []).map(
                      (rc) =>
                        rc.category?.category_name && (
                          <Badge key={rc.category_id} variant="secondary" className="text-[10px]">
                            {rc.category.category_name}
                          </Badge>
                        )
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-medium tabular-nums",
                    t.type === "credit" ? "text-green-500" : "text-red-500"
                  )}
                >
                  {t.type === "credit" ? "+" : "-"}
                  {money(Math.abs(t.amount))}
                </span>
              </div>
            ))}
            {dayTransactions.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">Nenhuma transação neste dia.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
