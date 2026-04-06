"use client"

import { useState, useCallback } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export interface EvolutionData {
  label: string
  receitas: number
  despesas: number
  saldo: number
  acumulado: number
}

const LABELS: Record<string, string> = {
  receitas: "Receitas",
  despesas: "Despesas",
  saldo: "Saldo",
  acumulado: "Saldo Acumulado",
}

const SERIES = [
  { key: "receitas", color: "#22c55e" },
  { key: "despesas", color: "#ef4444" },
  { key: "saldo", color: "#3b82f6" },
  { key: "acumulado", color: "#a855f7" },
]

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const formatShort = (value: number) => {
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`
  return `R$ ${value.toFixed(0)}`
}

export function EvolutionChart({ data }: { data: EvolutionData[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const handleLegendClick = useCallback((dataKey: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(dataKey)) next.delete(dataKey)
      else next.add(dataKey)
      return next
    })
  }, [])

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-muted-foreground text-sm">
        Nenhuma transação no período.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {SERIES.map(({ key, color }) => (
            <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatShort}
          width={72}
        />
        <Tooltip
          formatter={(value: number, name: string) => [formatBRL(value), LABELS[name] ?? name]}
          contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
          labelStyle={{ color: "#a1a1aa" }}
          itemStyle={{ color: "#f4f4f5" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          onClick={(e) => handleLegendClick(e.dataKey as string)}
          formatter={(value) => (
            <span
              style={{
                color: hidden.has(value) ? "#52525b" : "#a1a1aa",
                fontSize: 12,
                cursor: "pointer",
                textDecoration: hidden.has(value) ? "line-through" : "none",
              }}
            >
              {LABELS[value] ?? value}
            </span>
          )}
        />
        {SERIES.map(({ key, color }) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={color}
            fill={`url(#grad-${key})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            hide={hidden.has(key)}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
