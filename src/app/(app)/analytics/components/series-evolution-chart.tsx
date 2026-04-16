"use client"

import { useState, useCallback } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
]

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const formatShort = (value: number) => {
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`
  return `R$ ${value.toFixed(0)}`
}

interface SeriesEvolutionChartProps {
  data: Record<string, string | number>[]
  seriesKeys: string[]
}

export function SeriesEvolutionChart({ data, seriesKeys }: SeriesEvolutionChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const handleLegendClick = useCallback((dataKey: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(dataKey)) next.delete(dataKey)
      else next.add(dataKey)
      return next
    })
  }, [])

  if (data.length === 0 || seriesKeys.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
        Dados insuficientes para o período.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
          formatter={(value: number, name: string) => [formatBRL(value), name]}
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
              {value}
            </span>
          )}
        />
        {seriesKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            hide={hidden.has(key)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
