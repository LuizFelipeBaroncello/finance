import type {
  FlowCategory,
  FlowData,
  FlowEntry,
  FlowLink,
  FlowMacro,
  FlowNode,
  FlowTotals,
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

/** Transferências não são gasto/receita de verdade: cor neutra para destacá-las. */
export const TRANSFER_MACRO = "Transferências"
const TRANSFER_COLOR = "#94a3b8"

const UNKNOWN_CATEGORY: FlowCategory = {
  category_name: "Sem categoria",
  macro_name: null,
  macro_order: null,
}

/** Categorias que representam movimentação entre contas próprias. */
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

function isTransfer(categoryName: string) {
  return TRANSFER_CATEGORIES.has(normalize(categoryName))
}

const FALLBACK_ORDER = Number.MAX_SAFE_INTEGER
/** As transferências ficam sempre depois das macros de verdade. */
const TRANSFER_ORDER = FALLBACK_ORDER - 1

/** Chave de seleção de uma fonte de receita. */
export function incomeKey(name: string) {
  return `r:${name}`
}

/** Chave de seleção de uma categoria de despesa. */
export function expenseKey(name: string) {
  return `d:${name}`
}

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
 * Agrega as transações do período em totais por fonte de receita e por
 * macro/categoria de despesa.
 *
 * Regras:
 * - uma transação com N categorias tem o valor rateado igualmente entre elas,
 *   para que a soma dos ramos continue batendo com o total;
 * - transferências entram no gráfico, mas as enviadas ficam sob uma macro
 *   própria ("Transferências") e ambas usam uma cor neutra, já que são
 *   movimentação entre contas e não gasto ou renda de verdade;
 * - despesa sem macro categoria vira um ramo próprio (`orphans`).
 */
export function aggregateFlowTotals(
  transactions: FlowTransaction[],
  categories: Map<number, FlowCategory>
): FlowTotals {
  const income = new Map<string, number>()
  const macros = new Map<string, MacroBucket>()
  const orphanExpenses = new Map<string, number>()

  for (const t of transactions) {
    const rows = t.re_category_transaction ?? []
    const cats: FlowCategory[] =
      rows.length === 0
        ? [UNKNOWN_CATEGORY]
        : rows.map((rc) => categories.get(rc.category_id) ?? UNKNOWN_CATEGORY)

    const amount = Number(t.amount)
    const share = Math.abs(amount) / cats.length
    if (!Number.isFinite(share) || share <= 0) continue

    // Transações marcadas como `transfer` não têm débito/crédito próprio;
    // o sinal do valor diz a direção.
    const isIncome = t.type === "transfer" ? amount >= 0 : t.type === "credit"

    for (const c of cats) {
      if (isIncome) {
        addTo(income, c.category_name, share)
        continue
      }

      const macroName = isTransfer(c.category_name)
        ? TRANSFER_MACRO
        : c.macro_name
      if (!macroName) {
        addTo(orphanExpenses, c.category_name, share)
        continue
      }

      let bucket = macros.get(macroName)
      if (!bucket) {
        bucket = {
          name: macroName,
          order:
            macroName === TRANSFER_MACRO
              ? TRANSFER_ORDER
              : c.macro_order ?? FALLBACK_ORDER,
          total: 0,
          categories: new Map(),
        }
        macros.set(macroName, bucket)
      }
      bucket.total += share
      addTo(bucket.categories, c.category_name, share)
    }
  }

  const sortedMacros = [...macros.values()].sort(
    (a, b) => a.order - b.order || b.total - a.total
  )

  const incomeEntries: FlowEntry[] = [...income.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      key: incomeKey(name),
      color: isTransfer(name)
        ? TRANSFER_COLOR
        : INCOME_PALETTE[i % INCOME_PALETTE.length],
    }))

  const macroEntries: FlowMacro[] = sortedMacros.map((bucket, i) => {
    const color =
      bucket.name === TRANSFER_MACRO
        ? TRANSFER_COLOR
        : MACRO_PALETTE[i % MACRO_PALETTE.length]
    return {
      name: bucket.name,
      value: bucket.total,
      color,
      categories: [...bucket.categories.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({
          name,
          value,
          key: expenseKey(name),
          color,
        })),
    }
  })

  const orphanEntries: FlowEntry[] = [...orphanExpenses.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      key: expenseKey(name),
      color: MACRO_PALETTE[(sortedMacros.length + i) % MACRO_PALETTE.length],
    }))

  return { income: incomeEntries, macros: macroEntries, orphans: orphanEntries }
}

/** Todas as chaves de seleção do período — é o estado inicial do seletor. */
export function allFlowKeys(totals: FlowTotals): Set<string> {
  const keys = new Set<string>()
  for (const entry of totals.income) keys.add(entry.key)
  for (const macro of totals.macros) {
    for (const entry of macro.categories) keys.add(entry.key)
  }
  for (const entry of totals.orphans) keys.add(entry.key)
  return keys
}

/**
 * Monta o fluxo Receitas → Renda Total → Macro categorias → Categorias a partir
 * dos totais, considerando apenas as categorias selecionadas.
 *
 * Com `showMacros` desligado a coluna das macros some e as categorias saem
 * direto da Renda Total, mantendo a cor e a ordem do macro a que pertencem.
 *
 * Quando sobra dinheiro, o excedente vira o nó "Sobra"; quando falta, um nó
 * "Déficit" alimenta a Renda Total, mantendo entrada e saída equilibradas.
 */
export function buildFlowData(
  totals: FlowTotals,
  selected: Set<string>,
  showMacros = true
): FlowData {
  const income = totals.income.filter((e) => selected.has(e.key))
  const macros = totals.macros
    .map((macro) => ({
      ...macro,
      categories: macro.categories.filter((e) => selected.has(e.key)),
    }))
    .filter((macro) => macro.categories.length > 0)
  const orphans = totals.orphans.filter((e) => selected.has(e.key))

  const sum = (entries: FlowEntry[]) =>
    entries.reduce((s, e) => s + e.value, 0)

  const totalReceitas = sum(income)
  const totalDespesas =
    macros.reduce((s, m) => s + sum(m.categories), 0) + sum(orphans)
  const sobra = totalReceitas - totalDespesas

  const nodes: FlowNode[] = []
  const links: FlowLink[] = []
  const push = (node: FlowNode) => {
    nodes.push(node)
    return nodes.length - 1
  }

  // Coluna 0: fontes de receita (+ déficit, quando as despesas superam a renda).
  const incomeIndexes = income.map((entry) =>
    push({
      name: entry.name,
      value: entry.value,
      color: entry.color,
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

  income.forEach((entry, i) => {
    links.push({
      source: incomeIndexes[i],
      target: hubIndex,
      value: entry.value,
      color: entry.color,
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

  // Coluna 2: macro categorias (puladas quando o usuário esconde as macros).
  const macroIndexes = macros.map((macro) => {
    if (!showMacros) return hubIndex
    const value = sum(macro.categories)
    const index = push({
      name: macro.name,
      value,
      color: macro.color,
      kind: "macro",
    })
    links.push({ source: hubIndex, target: index, value, color: macro.color })
    return index
  })

  // Coluna 3: categorias de cada macro, mantidas agrupadas por macro.
  let leafCount = 0
  macros.forEach((macro, i) => {
    const parentIndex = macroIndexes[i]
    for (const entry of macro.categories) {
      const index = push({
        name: entry.name,
        value: entry.value,
        color: entry.color,
        kind: "category",
      })
      links.push({
        source: parentIndex,
        target: index,
        value: entry.value,
        color: entry.color,
      })
      leafCount += 1
    }
  })

  // Despesas sem macro viram folhas ligadas direto à Renda Total.
  for (const entry of orphans) {
    const index = push({
      name: entry.name,
      value: entry.value,
      color: entry.color,
      kind: "category",
    })
    links.push({
      source: hubIndex,
      target: index,
      value: entry.value,
      color: entry.color,
    })
    leafCount += 1
  }

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

  return { nodes, links, totalReceitas, totalDespesas, sobra, leafCount }
}
