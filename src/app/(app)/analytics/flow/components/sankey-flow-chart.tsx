"use client"

import { useCallback, useMemo, useState } from "react"
import {
  Sankey,
  Tooltip,
  ResponsiveContainer,
  type SankeyNodeProps,
  type SankeyLinkProps,
  type SankeyElementType,
} from "recharts"
import { formatBRL as formatBRLBase, MASK, useCurrencyVisibility } from "@/lib/currency"
import type { FlowData, FlowNode } from "../types"

const NODE_WIDTH = 12
const NODE_PADDING = 16
const LABEL_GAP = 8
/** Abaixo disso os rótulos se sobrepõem; telas estreitas rolam na horizontal. */
const MIN_CHART_WIDTH = 860

/** Nó já processado pelo recharts: mistura nossos campos com os do layout. */
type LayoutNode = FlowNode & {
  x: number
  y: number
  dx: number
  dy: number
  depth: number
  value: number
  /** No recharts, `sourceLinks` são as ligações que CHEGAM no nó. */
  sourceLinks: number[]
  /** E `targetLinks` são as que SAEM dele. */
  targetLinks: number[]
}

type LayoutLink = {
  value: number
  color?: string
  source: LayoutNode
  target: LayoutNode
}

interface SankeyFlowChartProps {
  data: FlowData
}

export function SankeyFlowChart({ data }: SankeyFlowChartProps) {
  const { hidden: valuesHidden } = useCurrencyVisibility()
  const formatBRL = useCallback(
    (value: number) => (valuesHidden ? MASK : formatBRLBase(value)),
    [valuesHidden]
  )

  // Índices das ligações em destaque; null = nada sob o cursor.
  const [highlighted, setHighlighted] = useState<Set<number> | null>(null)

  const total = Math.max(data.totalReceitas, data.totalDespesas)

  const handleMouseEnter = useCallback(
    (item: SankeyNodeProps | SankeyLinkProps, type: SankeyElementType) => {
      if (type === "link") {
        setHighlighted(new Set([item.index]))
        return
      }
      const node = (item as SankeyNodeProps).payload as unknown as LayoutNode
      setHighlighted(new Set([...node.sourceLinks, ...node.targetLinks]))
    },
    []
  )

  const handleMouseLeave = useCallback(() => setHighlighted(null), [])

  const renderNode = useCallback(
    (props: SankeyNodeProps) => {
      const { x, y, width, height, payload } = props
      const node = payload as unknown as LayoutNode
      // Nós sem entrada (as fontes de receita) recebem o rótulo à direita;
      // os demais à esquerda, sobre o fluxo que chega.
      const hasIncoming = node.sourceLinks.length > 0
      const labelX = hasIncoming ? x - LABEL_GAP : x + width + LABEL_GAP
      const emphasis = node.kind === "hub" || node.kind === "macro"

      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={Math.max(height, 1)}
            fill={node.color}
            rx={2}
          />
          <text
            x={labelX}
            y={y + height / 2}
            textAnchor={hasIncoming ? "end" : "start"}
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={emphasis ? 600 : 400}
            fill={emphasis ? "#f4f4f5" : "#d4d4d8"}
            style={{ pointerEvents: "none" }}
          >
            {node.name}: {formatBRL(node.value)}
          </text>
        </g>
      )
    },
    [formatBRL]
  )

  const renderLink = useCallback(
    (props: SankeyLinkProps) => {
      const {
        sourceX,
        targetX,
        sourceY,
        targetY,
        sourceControlX,
        targetControlX,
        linkWidth,
        index,
        payload,
      } = props
      const link = payload as unknown as LayoutLink
      const isHighlighted = highlighted?.has(index) ?? false
      const opacity = highlighted === null ? 0.32 : isHighlighted ? 0.62 : 0.12

      return (
        <path
          d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
          fill="none"
          stroke={link.color ?? "#52525b"}
          strokeWidth={Math.max(linkWidth, 1)}
          strokeOpacity={opacity}
        />
      )
    },
    [highlighted]
  )

  const chartData = useMemo(
    () => ({ nodes: data.nodes, links: data.links }),
    [data.nodes, data.links]
  )

  const height = Math.max(520, data.leafCount * 40)

  if (data.nodes.length === 0 || data.links.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        Nenhuma receita ou despesa no período selecionado.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: MIN_CHART_WIDTH }}>
        <ResponsiveContainer width="100%" height={height}>
          <Sankey
            data={chartData}
            nodeWidth={NODE_WIDTH}
            nodePadding={NODE_PADDING}
            linkCurvature={0.5}
            verticalAlign="top"
            margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
            node={renderNode}
            link={renderLink}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const entry = payload[0]
                const value = Number(entry.value)
                const share = total > 0 ? (value / total) * 100 : 0
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="text-muted-foreground">{entry.name}</p>
                    <p className="font-medium text-foreground">
                      {formatBRL(value)}
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        ({share.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                )
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
