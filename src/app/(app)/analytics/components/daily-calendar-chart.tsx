"use client"

import { useMemo, useState } from "react"
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
  formatDayLong,
  WEEKDAY_LABELS,
  type CalendarMode,
  type DayCell,
} from "../lib/daily-calendar"
import type { Transaction } from "../types"

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
 * Alpha ramp for the heat scale. The exponent lifts small days out of the
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

interface DailyCalendarChartProps {
  transactions: Transaction[]
  startDate: string
  endDate: string
}

export function DailyCalendarChart({
  transactions,
  startDate,
  endDate,
}: DailyCalendarChartProps) {
  const { hidden } = useCurrencyVisibility()
  const [mode, setMode] = useState<CalendarMode>("out")
  const [monthKey, setMonthKey] = useState<string | null>(null)
  const [selected, setSelected] = useState<DayCell | null>(null)

  const money = (value: number) => (hidden ? MASK : fullBRL(value))
  const moneyShort = (value: number) => (hidden ? MASK : compactBRL(value))

  const months = useMemo(
    () => buildCalendar(transactions, startDate, endDate),
    [transactions, startDate, endDate]
  )

  // Open on the most recent month that has movement, so a full-year period
  // doesn't land on an empty grid.
  const defaultKey = useMemo(() => {
    const withMovement = [...months]
      .reverse()
      .find((m) => m.diasComMovimento > 0)
    return (withMovement ?? months[months.length - 1])?.key
  }, [months])

  const activeKey =
    monthKey && months.some((m) => m.key === monthKey) ? monthKey : defaultKey
  const activeIndex = months.findIndex((m) => m.key === activeKey)
  const bucket = months[activeIndex] ?? months[0]

  const dayTransactions = useMemo(() => {
    if (!selected) return []
    return transactions
      .filter((t) => t.type !== "transfer" && t.date.substring(0, 10) === selected.date)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  }, [transactions, selected])

  if (!bucket) return null

  const onlyOut = mode === "out"
  const headline = onlyOut ? bucket.totalSaidas : bucket.totalSaldo
  const headlineDays = onlyOut ? bucket.diasComSaida : bucket.diasComMovimento
  const mediaBase = bucket.days.filter((d) => d.inRange).length || 1

  return (
    <div className="flex flex-col gap-5">
      {/* Header: title, mode toggle and month navigation */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {bucket.label} ·{" "}
            {onlyOut ? "quanto saiu em cada dia" : "entradas e saídas de cada dia"}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={cn(
                "text-3xl font-semibold tracking-tight tabular-nums",
                onlyOut
                  ? "text-foreground"
                  : headline >= 0
                    ? "text-green-500"
                    : "text-red-500"
              )}
            >
              {money(headline)}
            </span>
            <span className="text-sm text-muted-foreground">
              {onlyOut
                ? `em ${headlineDays} ${headlineDays === 1 ? "dia" : "dias"} com saída`
                : `saldo em ${headlineDays} ${headlineDays === 1 ? "dia" : "dias"} com movimento`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {months.length > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Mês anterior"
                disabled={activeIndex <= 0}
                onClick={() => setMonthKey(months[activeIndex - 1]?.key ?? null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-8 text-center text-xs font-medium tabular-nums text-muted-foreground">
                {activeIndex + 1}/{months.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Próximo mês"
                disabled={activeIndex >= months.length - 1}
                onClick={() => setMonthKey(months[activeIndex + 1]?.key ?? null)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
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

        {bucket.days.map((cell) => {
          const value = onlyOut ? cell.saidas : cell.saldo
          const positive = !onlyOut && cell.saldo > 0
          const alpha = onlyOut
            ? intensity(cell.saidas, bucket.maxSaida)
            : intensity(Math.abs(cell.saldo), bucket.maxAbsSaldo)
          const empty = onlyOut ? cell.saidas === 0 : cell.count === 0
          const isSelected = selected?.date === cell.date

          const saidaPct = percent(cell.saidas, bucket.totalSaidas)
          const entradaPct = percent(cell.entradas, bucket.totalEntradas)

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!cell.inRange || cell.count === 0}
              onClick={() => setSelected(cell)}
              title={
                cell.count === 0
                  ? undefined
                  : `${formatDayLong(cell.date)} — entrou ${money(cell.entradas)} · saiu ${money(cell.saidas)}`
              }
              className={cn(
                "flex min-h-16 flex-col justify-between gap-1 overflow-hidden rounded-lg border border-transparent p-1.5 text-left transition-all duration-150 sm:min-h-20 sm:p-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                empty && "bg-muted/40",
                !cell.inRange && "opacity-30",
                cell.inRange &&
                  cell.count > 0 &&
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
                {cell.day}
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

              {value !== 0 && <span className="sr-only">{money(Math.abs(value))}</span>}
            </button>
          )
        })}
      </div>

      {/* Footer stats */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <Stat
            label={onlyOut ? "Média por dia" : "Saldo médio/dia"}
            value={money((onlyOut ? bucket.totalSaidas : bucket.totalSaldo) / mediaBase)}
          />
          <Stat
            label={onlyOut ? "Maior saída" : "Maior entrada"}
            value={
              onlyOut
                ? bucket.maiorSaida
                  ? `${bucket.maiorSaida.day}/${String(bucket.month).padStart(2, "0")} · ${moneyShort(bucket.maiorSaida.saidas)}`
                  : "–"
                : bucket.maiorEntrada
                  ? `${bucket.maiorEntrada.day}/${String(bucket.month).padStart(2, "0")} · ${moneyShort(bucket.maiorEntrada.entradas)}`
                  : "–"
            }
          />
          <Stat
            label={onlyOut ? "Dias sem saída" : "Dias sem movimento"}
            value={String(
              onlyOut
                ? bucket.diasSemSaida
                : bucket.days.filter((d) => d.inRange).length - bucket.diasComMovimento
            )}
          />
          {!onlyOut && <Stat label="Entradas no mês" value={money(bucket.totalEntradas)} />}
          {!onlyOut && <Stat label="Saídas no mês" value={money(bucket.totalSaidas)} />}
        </div>
        <p className="text-xs text-muted-foreground">
          Clique num dia para ver as transações
        </p>
      </div>

      {/* Day detail */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="first-letter:uppercase">
              {selected ? formatDayLong(selected.date) : ""}
            </DialogTitle>
            <DialogDescription>
              {selected && (
                <span className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-green-500">
                    Entradas {money(selected.entradas)} ({percent(selected.entradas, bucket.totalEntradas)} do mês)
                  </span>
                  <span className="text-red-500">
                    Saídas {money(selected.saidas)} ({percent(selected.saidas, bucket.totalSaidas)} do mês)
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
                          <Badge
                            key={rc.category_id}
                            variant="secondary"
                            className="text-[10px]"
                          >
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
              <p className="py-4 text-sm text-muted-foreground">
                Nenhuma transação neste dia.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
