export const TYPE_LABELS: Record<string, string> = {
  debit: "Despesa",
  credit: "Receita",
  transfer: "Transferência",
}

export const TYPE_VARIANTS: Record<string, "destructive" | "default" | "secondary"> = {
  debit: "destructive",
  credit: "default",
  transfer: "secondary",
}

export const TYPE_ORDER = ["debit", "credit", "transfer"] as const

export type CategoryType = (typeof TYPE_ORDER)[number]
