import type { CategoryFilter, Transaction } from "../types"

export function applyCategoryFilter(
  transactions: Transaction[],
  filter: CategoryFilter
): Transaction[] {
  if (filter.selected.size === 0) return transactions

  const matches = (t: Transaction) =>
    t.re_category_transaction.some((rc) => {
      const name = rc.category?.category_name
      return name ? filter.selected.has(name) : false
    })

  if (filter.mode === "include") {
    return transactions.filter(matches)
  }
  return transactions.filter((t) => !matches(t))
}
