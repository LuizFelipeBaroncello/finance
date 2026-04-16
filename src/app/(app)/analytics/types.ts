export type Transaction = {
  trans_id: number
  account_id: number
  date: string
  description: string
  amount: number
  type: "debit" | "credit" | "transfer"
  account: { account_name: string } | null
  re_category_transaction: Array<{
    category_id: number
    category: { category_name: string } | null
  }>
}

export type CategoryFilterMode = "include" | "exclude"

export type CategoryFilter = {
  mode: CategoryFilterMode
  selected: Set<string>
}
