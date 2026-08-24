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
