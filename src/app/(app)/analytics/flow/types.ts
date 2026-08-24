/**
 * Categoria com o macro já resolvido. As categorias são carregadas à parte e
 * indexadas por id, evitando repetir os nomes em cada transação.
 */
export type FlowCategory = {
  category_name: string
  macro_name: string | null
  macro_order: number | null
}

/** Transação no formato mínimo exigido pelo Sankey. */
export type FlowTransaction = {
  trans_id: number
  amount: number
  type: "debit" | "credit" | "transfer"
  re_category_transaction: Array<{ category_id: number }>
}

export type FlowEntry = {
  name: string
  value: number
  /** Chave estável usada pelo seletor de categorias. */
  key: string
  color: string
}

export type FlowMacro = {
  name: string
  value: number
  color: string
  categories: FlowEntry[]
}

/**
 * Totais do período já agregados no servidor. É a partir daqui que o cliente
 * remonta o gráfico a cada mudança na seleção de categorias — bem mais leve do
 * que mandar todas as transações para o navegador.
 */
export type FlowTotals = {
  income: FlowEntry[]
  macros: FlowMacro[]
  /** Despesas sem macro categoria. */
  orphans: FlowEntry[]
}

export type FlowNodeKind =
  | "income"
  | "hub"
  | "macro"
  | "category"
  | "leftover"
  | "deficit"

export type FlowNode = {
  name: string
  value: number
  color: string
  kind: FlowNodeKind
}

export type FlowLink = {
  source: number
  target: number
  value: number
  color: string
}

export type FlowData = {
  nodes: FlowNode[]
  links: FlowLink[]
  totalReceitas: number
  totalDespesas: number
  /** Receitas - despesas. Positivo vira "Sobra", negativo vira "Déficit". */
  sobra: number
  /** Nós na coluna mais à direita — usado para dimensionar a altura do gráfico. */
  leafCount: number
}
