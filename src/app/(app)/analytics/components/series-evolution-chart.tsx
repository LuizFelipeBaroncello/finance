"use client"

import { useState, useCallback, useRef } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts"
import { formatBRL as formatBRLBase, MASK, useCurrencyVisibility } from "@/lib/currency"

export const PALETTE = [
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

interface SeriesEvolutionChartProps {
  data: Record<string, string | number>[]
  seriesKeys: string[]
  onRangeSelect?: (fromIndex: number, toIndex: number) => void
}

export function SeriesEvolutionChart({
  data,
  seriesKeys,
  onRangeSelect,
}: SeriesEvolutionChartProps) {
  const { hidden: valuesHidden } = useCurrencyVisibility()
  const formatBRL = (value: number) =>
    valuesHidden ? MASK : formatBRLBase(value)
  const formatShort = (value: number) => {
    if (valuesHidden) return MASK
    if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`
    return `R$ ${value.toFixed(0)}`
  }

  const [hidden, setHidden] = useState<Set<string>>(new Set())
  // Refs rastreiam o arrasto de forma síncrona (eventos podem chegar no mesmo
  // frame, antes de qualquer re-render); o estado só desenha a ReferenceArea.
  // armedRef cobre o mousedown que chega antes de o recharts ter um índice
  // ativo (mouse ainda não tinha se movido sobre o gráfico).
  const armedRef = useRef(false)
  const selStartRef = useRef<number | null>(null)
  const selEndRef = useRef<number | null>(null)
  const [sel, setSel] = useState<{ start: number; end: number } | null>(null)

  const handleLegendClick = useCallback((dataKey: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(dataKey)) next.delete(dataKey)
      else next.add(dataKey)
      return next
    })
  }, [])

  // Mapeia a posição do mouse para o índice do bucket usando a geometria real
  // do plot (linhas do grid), em vez do activeTooltipIndex do recharts — o
  // estado interno do tooltip pode ficar defasado/fixado durante o arrasto.
  const containerRef = useRef<HTMLDivElement | null>(null)
  const indexFromClientX = (clientX: number): number | null => {
    const root = containerRef.current
    if (!root || data.length < 2) return null
    const grid = root.querySelector<SVGLineElement>(
      ".recharts-cartesian-grid-horizontal line"
    )
    // ownerSVGElement garante o svg do plot (a legenda também usa
    // svg.recharts-surface nos ícones, e vem antes no DOM)
    const svg = grid?.ownerSVGElement
    if (!grid || !svg) return null
    const x1 = parseFloat(grid.getAttribute("x1") ?? "")
    const x2 = parseFloat(grid.getAttribute("x2") ?? "")
    if (!Number.isFinite(x1) || !Number.isFinite(x2) || x2 <= x1) return null
    const rect = svg.getBoundingClientRect()
    const idx = Math.round(
      ((clientX - rect.left - x1) / (x2 - x1)) * (data.length - 1)
    )
    return Math.max(0, Math.min(data.length - 1, idx))
  }

  const clearSelection = () => {
    armedRef.current = false
    selStartRef.current = null
    selEndRef.current = null
    setSel(null)
  }

  if (data.length === 0 || seriesKeys.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
        Dados insuficientes para o período.
      </div>
    )
  }

  const selMin = sel && sel.start !== sel.end ? Math.min(sel.start, sel.end) : null
  const selMax = sel && sel.start !== sel.end ? Math.max(sel.start, sel.end) : null

  const handleMouseDown = (e: { clientX: number }) => {
    armedRef.current = true
    const i = indexFromClientX(e.clientX)
    if (i === null) return
    selStartRef.current = i
    selEndRef.current = i
    setSel({ start: i, end: i })
  }

  const handleMouseMove = (e: { clientX: number }) => {
    if (!armedRef.current) return
    const i = indexFromClientX(e.clientX)
    if (i === null) return
    if (selStartRef.current === null) selStartRef.current = i
    selEndRef.current = i
    setSel({ start: selStartRef.current, end: i })
  }

  const handleMouseUp = () => {
    const start = selStartRef.current
    const end = selEndRef.current
    if (start !== null && end !== null && start !== end) {
      onRangeSelect?.(Math.min(start, end), Math.max(start, end))
    }
    clearSelection()
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={onRangeSelect ? handleMouseDown : undefined}
      onMouseMove={onRangeSelect ? handleMouseMove : undefined}
      onMouseUp={onRangeSelect ? handleMouseUp : undefined}
      onMouseLeave={onRangeSelect ? clearSelection : undefined}
      style={onRangeSelect ? { userSelect: "none", cursor: "crosshair" } : undefined}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          accessibilityLayer={!onRangeSelect}
        >
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
          formatter={(value, name) => [formatBRL(Number(value)), name]}
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
        {selMin !== null && selMax !== null && (
          <ReferenceArea
            x1={data[selMin].label as string}
            x2={data[selMax].label as string}
            fill="#3b82f6"
            fillOpacity={0.12}
            stroke="#3b82f6"
            strokeOpacity={0.35}
          />
        )}
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
    </div>
  )
}
