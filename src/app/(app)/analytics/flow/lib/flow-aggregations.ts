import type {
  FlowCategory,
  FlowData,
  FlowLink,
  FlowNode,
  FlowTransaction,
} from "../types"

/** Cores das macro categorias (evitam verde/vermelho, reservados a receita/déficit). */
export const MACRO_PALETTE = [
  "#8b5cf6",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#0ea5e9",
  "#a855f7",
  "#eab308",
]

/** Tons de verde para as fontes de receita. */
const INCOME_PALETTE = ["#22c55e", "#16a34a", "#4ade80", "#15803d", "#86efac"]

export const HUB_LABEL = "Renda Total"
export const LEFTOVER_LABEL = "Sobra (não gasto)"
export const DEFICIT_LABEL = "Déficit (uso de saldo)"

export const HUB_COLOR = "#3b82f6"
export const LEFTOVER_COLOR = "#22c55e"
export const DEFICIT_COLOR = "#ef4444"

const UNKNOWN_CATEGORY: FlowCategory = {
  category_name: "Sem categoria",
  macro_name: null,
  macro_order: null,
}

/** Categorias que representam movimentação entre contas próprias, não gasto real. */
const TRANSFER_CATEGORIES = new Set([
  "transferencia enviada",
  "transferencia recebida",
])

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

const FALLBACK_ORDER = Number.MAX_SAFE_INTEGER

type MacroBucket = {
  name: string
  order: number
  total: number
  categories: Map<string, number>
}

function addTo(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

/**
 * Monta o fluxo Receitas → Renda Total → Macro categorias → Categorias.
 *
 * Regras:
 * - transações do tipo `transfer` e as categorias de transferência são ignoradas;
 * - uma transação com N categorias tem o valor rateado igualmente entre elas,
 *   para que a soma dos ramos continue batendo com o total;
 * - despesa sem macro categoria vira um ramo próprio, ligado direto à Renda Total;
 * - quando sobra dinheiro, o excedente vira o nó "Sobra"; quando falta, um nó
 *   "Déficit" alimenta a Renda Total, mantendo entrada e saída equilibradas.
 */
export function buildFlowData(
  transactions: FlowTransaction[],
  categories: Map<number, FlowCategory>
): FlowData {
  const income = new Map<string, number>()
  const macros = new Map<string, MacroBucket>()
  const orphanExpenses = new Map<string, number>()

  for (const t of transactions) {
    if (t.type === "transfer") continue

    const rows = t.re_category_transaction ?? []
    const cats: FlowCategory[] =
      rows.length === 0
        ? [UNKNOWN_CATEGORY]
        : rows.map((rc) => categories.get(rc.category_id) ?? UNKNOWN_CATEGORY)

    const kept = cats.filter(
      (c) => !TRANSFER_CATEGORIES.has(normalize(c.category_name))
    )
    if (kept.length === 0) continue

    const share = Math.abs(Number(t.amount)) / kept.length
    if (!Number.isFinite(share) || share <= 0) continue

    for (const c of kept) {
      if (t.type === "credit") {
        addTo(income, c.category_name, share)
        continue
      }

      if (!c.macro_name) {
        addTo(orphanExpenses, c.category_name, share)
        continue
      }

      let bucket = macros.get(c.macro_name)
      if (!bucket) {
        bucket = {
          name: c.macro_name,
          order: c.macro_order ?? FALLBACK_ORDER,
          total: 0,
          categories: new Map(),
        }
        macros.set(c.macro_name, bucket)
      }
      bucket.total += share
      addTo(bucket.categories, c.category_name, share)
    }
  }

  const totalReceitas = [...income.values()].reduce((s, v) => s + v, 0)
  const totalDespesas =
    [...macros.values()].reduce((s, b) => s + b.total, 0) +
    [...orphanExpenses.values()].reduce((s, v) => s + v, 0)
  const sobra = totalReceitas - totalDespesas

  const nodes: FlowNode[] = []
  const links: FlowLink[] = []
  const push = (node: FlowNode) => {
    nodes.push(node)
    return nodes.length - 1
  }

  const sortedIncome = [...income.entries()].sort((a, b) => b[1] - a[1])
  const sortedMacros = [...macros.values()].sort(
    (a, b) => a.order - b.order || b.total - a.total
  )
  const sortedOrphans = [...orphanExpenses.entries()].sort((a, b) => b[1] - a[1])

  // Coluna 0: fontes de receita (+ déficit, quando as despesas superam a renda).
  const incomeIndexes = sortedIncome.map(([name, value], i) =>
    push({
      name,
      value,
      color: INCOME_PALETTE[i % INCOME_PALETTE.length],
      kind: "income",
    })
  )
  const deficitIndex =
    sobra < 0
      ? push({
          name: DEFICIT_LABEL,
          value: -sobra,
          color: DEFICIT_COLOR,
          kind: "deficit",
        })
      : null

  // Coluna 1: o nó central por onde todo o dinheiro passa.
  const hubIndex = push({
    name: HUB_LABEL,
    value: Math.max(totalReceitas, totalDespesas),
    color: HUB_COLOR,
    kind: "hub",
  })

  sortedIncome.forEach(([, value], i) => {
    links.push({
      source: incomeIndexes[i],
      target: hubIndex,
      value,
      color: nodes[incomeIndexes[i]].color,
    })
  })
  if (deficitIndex !== null) {
    links.push({
      source: deficitIndex,
      target: hubIndex,
      value: -sobra,
      color: DEFICIT_COLOR,
    })
  }

  // Coluna 2: macro categorias.
  const macroIndexes = sortedMacros.map((bucket, i) => {
    const index = push({
      name: bucket.name,
      value: bucket.total,
      color: MACRO_PALETTE[i % MACRO_PALETTE.length],
      kind: "macro",
    })
    links.push({
      source: hubIndex,
      target: index,
      value: bucket.total,
      color: nodes[index].color,
    })
    return index
  })

  // Coluna 3: categorias de cada macro, mantidas agrupadas por macro.
  let leafCount = 0
  sortedMacros.forEach((bucket, i) => {
    const macroIndex = macroIndexes[i]
    const color = nodes[macroIndex].color
    const sorted = [...bucket.categories.entries()].sort((a, b) => b[1] - a[1])
    for (const [name, value] of sorted) {
      const index = push({ name, value, color, kind: "category" })
      links.push({ source: macroIndex, target: index, value, color })
      leafCount += 1
    }
  })

  // Despesas sem macro viram folhas ligadas direto à Renda Total.
  sortedOrphans.forEach(([name, value], i) => {
    const color = MACRO_PALETTE[(sortedMacros.length + i) % MACRO_PALETTE.length]
    const index = push({ name, value, color, kind: "category" })
    links.push({ source: hubIndex, target: index, value, color })
    leafCount += 1
  })

  if (sobra > 0) {
    const index = push({
      name: LEFTOVER_LABEL,
      value: sobra,
      color: LEFTOVER_COLOR,
      kind: "leftover",
    })
    links.push({
      source: hubIndex,
      target: index,
      value: sobra,
      color: LEFTOVER_COLOR,
    })
    leafCount += 1
  }

  return {
    nodes,
    links,
    totalReceitas,
    totalDespesas,
    sobra,
    leafCount,
  }
}
