"use client"

import { useState, useCallback } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export interface AccountData {
  name: string
  debito: number
  credito: number
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const formatShort = (value: number) => {
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`
  return `R$ ${value.toFixed(0)}`
}

const LABELS: Record<string, string> = {
  debito: "Débito",
  credito: "Crédito",
}

export function AccountChart({ data }: { data: AccountData[] }) {
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
        Nenhuma conta no período.
      </div>
    )
  }

  const height = Math.max(320, data.length * 72)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatShort}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatBRL(value),
            name === "debito" ? "Débito" : "Crédito",
          ]}
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
        <Bar dataKey="debito" name="debito" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24} hide={hidden.has("debito")} />
        <Bar dataKey="credito" name="credito" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={24} hide={hidden.has("credito")} />
      </BarChart>
    </ResponsiveContainer>
  )
}
