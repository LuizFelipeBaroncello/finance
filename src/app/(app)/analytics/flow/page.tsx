import { createClient } from "@/lib/supabase/server"
import { PeriodFilter } from "../components/period-filter"
import { FlowDashboard } from "./components/flow-dashboard"
import { aggregateFlowTotals } from "./lib/flow-aggregations"
import type { FlowCategory, FlowTransaction } from "./types"

const TRANSACTION_SELECT =
  "trans_id, amount, type, re_category_transaction(category_id)"

/** PostgREST devolve no máximo 1000 linhas por request; períodos longos precisam de paginação. */
const PAGE_SIZE = 1000

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * As categorias (algumas dezenas) são carregadas à parte e indexadas por id:
 * fica mais barato do que aninhar categoria + macro em cada transação.
 */
async function fetchCategories(supabase: SupabaseClient) {
  const [categories, macros] = await Promise.all([
    supabase.from("category").select("category_id, category_name, macro_category_id"),
    supabase.from("macro_category").select("macro_category_id, name, display_order"),
  ])

  const error = categories.error ?? macros.error
  if (error) return { byId: new Map<number, FlowCategory>(), error: error.message }

  const macroById = new Map(
    (macros.data ?? []).map((m) => [m.macro_category_id, m])
  )

  const byId = new Map<number, FlowCategory>(
    (categories.data ?? []).map((c) => {
      const macro =
        c.macro_category_id != null ? macroById.get(c.macro_category_id) : undefined
      return [
        c.category_id,
        {
          category_name: c.category_name,
          macro_name: macro?.name ?? null,
          macro_order: macro?.display_order ?? null,
        },
      ]
    })
  )

  return { byId, error: null }
}

async function fetchTransactions(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<{ transactions: FlowTransaction[]; error: string | null }> {
  const transactions: FlowTransaction[] = []

  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE
    const { data, error } = await supabase
      .from("transaction")
      .select(TRANSACTION_SELECT)
      .eq("is_provisional", false)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("trans_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) return { transactions, error: error.message }

    const rows = (data ?? []) as unknown as FlowTransaction[]
    transactions.push(...rows)
    if (rows.length < PAGE_SIZE) break
  }

  return { transactions, error: null }
}

export default async function AnalyticsFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}) {
  const params = await searchParams
  const yyyy = new Date().getFullYear()
  const startDate = params.startDate ?? `${yyyy}-01-01`
  const endDate = params.endDate ?? `${yyyy}-12-31`

  const supabase = await createClient()
  const [categories, txs] = await Promise.all([
    fetchCategories(supabase),
    fetchTransactions(supabase, startDate, endDate),
  ])

  const error = categories.error ?? txs.error
  const totals = aggregateFlowTotals(txs.transactions, categories.byId)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fluxo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Para onde vai o dinheiro: receitas → macro categorias → categorias.
            Desmarque uma categoria na lista abaixo do gráfico para tirá-la da
            conta.
          </p>
        </div>
        <PeriodFilter
          startDate={startDate}
          endDate={endDate}
          granularity="monthly"
          basePath="/analytics/flow"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar os dados: {error}
        </p>
      ) : (
        // A chave força um estado de seleção novo sempre que o período muda.
        <FlowDashboard key={`${startDate}:${endDate}`} totals={totals} />
      )}
    </div>
  )
}
