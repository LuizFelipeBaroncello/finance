import type { Transaction } from "../types"

export const MONTH_NAMES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
]

function parseDate(date: string): Date {
  const iso = date.trim().replace(" ", "T")
  return new Date(iso)
}

export function getPeriodKey(
  date: string,
  granularity: string
): { label: string; order: string } {
  const raw = date.substring(0, 10)
  const [y, m, dd] = raw.split("-")

  if (granularity === "daily") {
    return { label: `${dd}/${m}`, order: raw }
  }
  if (granularity === "weekly") {
    const d = parseDate(date)
    const tmp = new Date(d)
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
    const week1 = new Date(tmp.getFullYear(), 0, 4)
    const weekNum =
      1 +
      Math.round(
        ((tmp.getTime() - week1.getTime()) / 86400000 -
          3 +
          ((week1.getDay() + 6) % 7)) /
          7
      )
    return {
      label: `S${weekNum}`,
      order: `${y}-W${String(weekNum).padStart(2, "0")}`,
    }
  }
  const monthIdx = parseInt(m, 10) - 1
  return { label: MONTH_NAMES[monthIdx], order: `${y}-${m}` }
}

export function getCategoryNames(t: Transaction): string[] {
  const rcs = t.re_category_transaction ?? []
  if (rcs.length === 0) return ["Sem categoria"]
  return rcs.map((rc) => rc.category?.category_name ?? "Sem categoria")
}

export function groupByPeriod(transactions: Transaction[], granularity: string) {
  const map = new Map<
    string,
    { label: string; receitas: number; despesas: number; saldo: number; order: string }
  >()

  for (const t of transactions) {
    const { label, order } = getPeriodKey(t.date, granularity)
    if (!map.has(label)) {
      map.set(label, { label, receitas: 0, despesas: 0, saldo: 0, order })
    }
    const entry = map.get(label)!
    const amount = Math.abs(t.amount)
    if (t.type === "credit") entry.receitas += amount
    else if (t.type === "debit") entry.despesas += amount
    entry.saldo = entry.receitas - entry.despesas
  }

  const sorted = Array.from(map.values()).sort((a, b) =>
    a.order.localeCompare(b.order)
  )
  let acumulado = 0
  return sorted.map(({ label, receitas, despesas, saldo }) => {
    acumulado += saldo
    return { label, receitas, despesas, saldo, acumulado }
  })
}

export function groupByCategory(transactions: Transaction[]) {
  const map = new Map<string, { name: string; debito: number; credito: number }>()

  for (const t of transactions) {
    if (t.type === "transfer") continue
    const names = getCategoryNames(t)
    const amount = Math.abs(t.amount)
    for (const name of names) {
      if (!map.has(name)) map.set(name, { name, debito: 0, credito: 0 })
      const entry = map.get(name)!
      if (t.type === "debit") entry.debito += amount
      else entry.credito += amount
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.debito + b.credito - (a.debito + a.credito))
    .slice(0, 10)
}

export function groupByAccount(transactions: Transaction[]) {
  const map = new Map<string, { name: string; debito: number; credito: number }>()

  for (const t of transactions) {
    const name = t.account?.account_name ?? "Conta desconhecida"
    const amount = Math.abs(t.amount)
    if (!map.has(name)) map.set(name, { name, debito: 0, credito: 0 })
    const entry = map.get(name)!
    if (t.type === "debit") entry.debito += amount
    else if (t.type === "credit") entry.credito += amount
  }

  return Array.from(map.values()).sort(
    (a, b) => b.debito + b.credito - (a.debito + a.credito)
  )
}

export function groupCategoryByPeriod(
  transactions: Transaction[],
  granularity: string,
  topN = 5
) {
  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === "transfer") continue
    for (const name of getCategoryNames(t)) {
      totals.set(name, (totals.get(name) ?? 0) + Math.abs(t.amount))
    }
  }
  const topCategories = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name)

  const map = new Map<
    string,
    { entry: Record<string, string | number>; order: string }
  >()
  for (const t of transactions) {
    if (t.type === "transfer") continue
    const { label, order } = getPeriodKey(t.date, granularity)
    if (!map.has(label)) {
      const entry: Record<string, string | number> = { label }
      for (const cat of topCategories) entry[cat] = 0
      map.set(label, { entry, order })
    }
    const { entry } = map.get(label)!
    for (const name of getCategoryNames(t)) {
      if (topCategories.includes(name)) {
        entry[name] = (entry[name] as number) + Math.abs(t.amount)
      }
    }
  }

  const data = Array.from(map.values())
    .sort((a, b) => a.order.localeCompare(b.order))
    .map(({ entry }) => entry)

  return { data, seriesKeys: topCategories }
}

export function groupAccountByPeriod(
  transactions: Transaction[],
  granularity: string
) {
  const accountNames = new Set<string>()
  for (const t of transactions) {
    accountNames.add(t.account?.account_name ?? "Conta desconhecida")
  }
  const accounts = Array.from(accountNames)

  const map = new Map<
    string,
    { entry: Record<string, string | number>; order: string }
  >()
  for (const t of transactions) {
    const { label, order } = getPeriodKey(t.date, granularity)
    if (!map.has(label)) {
      const entry: Record<string, string | number> = { label }
      for (const acc of accounts) entry[acc] = 0
      map.set(label, { entry, order })
    }
    const { entry } = map.get(label)!
    const name = t.account?.account_name ?? "Conta desconhecida"
    entry[name] = (entry[name] as number) + Math.abs(t.amount)
  }

  const data = Array.from(map.values())
    .sort((a, b) => a.order.localeCompare(b.order))
    .map(({ entry }) => entry)

  return { data, seriesKeys: accounts }
}
