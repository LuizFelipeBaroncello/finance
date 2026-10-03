import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { HorizonClient } from "./components/horizon-client"
import { addDays } from "./lib/projection"
import type { FreeSpendingPlan, PlannedExpense, RealTransaction } from "./types"

/** PostgREST devolve no máximo 1000 linhas por request; janelas longas precisam de paginação. */
const PAGE_SIZE = 1000
/** Janela usada para sugerir o gasto diário estimado a partir do histórico. */
const HISTORY_DAYS = 90

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type RawTx = {
  trans_id: number
  date: string
  description: string
  amount: number
  type: "debit" | "credit" | "transfer"
  re_category_transaction: Array<{ category_id: number }>
}

/** "Hoje" no fuso do usuário — o servidor pode estar em UTC. */
function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())
}

async function fetchTransactions(supabase: SupabaseClient, startDate: string, endDate: string) {
  const rows: RawTx[] = []
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE
    const { data, error } = await supabase
      .from("transaction")
      .select("trans_id, date, description, amount, type, re_category_transaction(category_id)")
      .eq("is_provisional", false)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("trans_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { rows, error: error.message }
    const batch = (data ?? []) as unknown as RawTx[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return { rows, error: null }
}

/**
 * Gasto líquido de uso livre de uma transação: saídas consomem saldo, entradas
 * (estornos) devolvem. Com várias categorias, só a fração das que são de uso livre conta.
 */
function freeSpendOf(tx: RawTx, isFree: (categoryId: number) => boolean) {
  const cats = tx.re_category_transaction ?? []
  if (cats.length === 0) return 0
  const matched = cats.filter((c) => isFree(c.category_id)).length
  if (matched === 0) return 0
  const amount = Number(tx.amount)
  const isOutflow = tx.type === "transfer" ? amount < 0 : tx.type === "debit"
  const value = Math.abs(amount) * (matched / cats.length)
  return isOutflow ? value : -value
}

export default async function HorizonPage() {
  const supabase = await createClient()
  const today = todayInBrazil()

  const { data: client } = await supabase.from("client").select("client_id").maybeSingle()
  const clientId = client?.client_id

  const [planRes, monthsRes, plannedRes, macrosRes, categoriesRes] = await Promise.all([
    clientId
      ? supabase.from("free_spending_plan").select("*").eq("client_id", clientId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    clientId
      ? supabase.from("free_spending_month").select("month, amount").eq("client_id", clientId)
      : Promise.resolve({ data: [], error: null }),
    clientId
      ? supabase
          .from("free_spending_planned")
          .select("free_spending_planned_id, date, description, amount")
          .eq("client_id", clientId)
          .order("date")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("macro_category").select("macro_category_id, name").order("display_order"),
    supabase
      .from("category")
      .select("category_id, category_name, macro_category_id")
      .order("category_name"),
  ])

  const loadError =
    planRes.error?.message ??
    monthsRes.error?.message ??
    plannedRes.error?.message ??
    null

  const plan: FreeSpendingPlan | null = planRes.data
    ? {
        start_date: planRes.data.start_date,
        monthly_amount: Number(planRes.data.monthly_amount),
        pay_day: planRes.data.pay_day,
        daily_estimate: Number(planRes.data.daily_estimate),
        warning_pct: Number(planRes.data.warning_pct),
        macro_category_ids: (planRes.data.macro_category_ids ?? []).map(Number),
        category_ids: (planRes.data.category_ids ?? []).map(Number),
      }
    : null

  const monthOverrides: Record<string, number> = {}
  for (const m of monthsRes.data ?? []) {
    monthOverrides[m.month.slice(0, 7)] = Number(m.amount)
  }

  const planned: PlannedExpense[] = (plannedRes.data ?? []).map((p) => ({
    free_spending_planned_id: p.free_spending_planned_id,
    date: p.date,
    description: p.description,
    amount: Number(p.amount),
  }))

  const categories = categoriesRes.data ?? []
  const macros = macrosRes.data ?? []

  let realTransactions: RealTransaction[] = []
  let txError: string | null = null

  if (plan) {
    const freeMacros = new Set(plan.macro_category_ids)
    const freeCategories = new Set(plan.category_ids)
    const categoryById = new Map(categories.map((c) => [c.category_id, c]))
    const isFree = (id: number) => {
      const cat = categoryById.get(id)
      return (
        freeCategories.has(id) ||
        (cat?.macro_category_id != null && freeMacros.has(cat.macro_category_id))
      )
    }

    const historyStart = addDays(today, -HISTORY_DAYS)
    const windowStart = plan.start_date < historyStart ? plan.start_date : historyStart
    const { rows, error } = await fetchTransactions(supabase, windowStart, today)
    txError = error

    realTransactions = rows
      .map((tx) => {
        const spend = freeSpendOf(tx, isFree)
        const firstFree = tx.re_category_transaction.find((c) => isFree(c.category_id))
        return {
          trans_id: tx.trans_id,
          date: tx.date,
          description: tx.description,
          category_name: firstFree ? categoryById.get(firstFree.category_id)?.category_name ?? null : null,
          spend,
        }
      })
      .filter((t) => t.spend !== 0)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horizonte"
        description="Quanto você pode gastar do dinheiro de uso livre, dia a dia, e se a simulação está batendo com a realidade."
      />
      {(loadError || txError) && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Erro ao carregar dados: {loadError ?? txError}
        </p>
      )}
      <HorizonClient
        plan={plan}
        monthOverrides={monthOverrides}
        planned={planned}
        realTransactions={realTransactions}
        macros={macros}
        categories={categories}
        today={today}
      />
    </div>
  )
}
