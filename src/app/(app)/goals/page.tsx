import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { GoalsClient } from "./components/goals-client"

type RawTx = {
  trans_id: number
  date: string
  description: string
  amount: number
  type: "debit" | "credit" | "transfer"
  re_category_transaction: Array<{
    category_id: number
    category: {
      category_name: string
      macro_category_id: number | null
    } | null
  }>
}

type PeriodType = "quarter" | "semester" | "year"

function computeMonthRange(monthParam: string | undefined) {
  const today = new Date()
  const ok = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)
  const yyyy = ok ? Number(monthParam!.slice(0, 4)) : today.getFullYear()
  const monthIndex = ok ? Number(monthParam!.slice(5, 7)) - 1 : today.getMonth()
  const mm = String(monthIndex + 1).padStart(2, "0")
  const lastDay = new Date(yyyy, monthIndex + 1, 0).getDate()
  return {
    startDate: `${yyyy}-${mm}-01`,
    endDate: `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`,
    selectedMonth: `${yyyy}-${mm}`,
    monthLabel: `${mm}/${yyyy}`,
  }
}

function computePeriodRange(periodType: PeriodType, year: number, pidx: number | null) {
  let startMonth = 1
  let endMonth = 12
  if (periodType === "quarter") {
    const q = pidx ?? 1
    startMonth = (q - 1) * 3 + 1
    endMonth = startMonth + 2
  } else if (periodType === "semester") {
    const s = pidx ?? 1
    startMonth = (s - 1) * 6 + 1
    endMonth = startMonth + 5
  }
  const mm = String(startMonth).padStart(2, "0")
  const emm = String(endMonth).padStart(2, "0")
  const lastDay = new Date(year, endMonth, 0).getDate()
  const startDate = `${year}-${mm}-01`
  const endDate = `${year}-${emm}-${String(lastDay).padStart(2, "0")}`
  let label = `${year}`
  if (periodType === "quarter") label = `Q${pidx} ${year}`
  else if (periodType === "semester") label = `S${pidx} ${year}`
  return { startDate, endDate, label }
}

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string
    view?: string
    period?: string
    year?: string
    pidx?: string
  }>
}) {
  const supabase = await createClient()

  const { data: client } = await supabase
    .from("client")
    .select("client_id")
    .maybeSingle()
  const clientId = client?.client_id

  const params = await searchParams
  const view: "monthly" | "period" = params.view === "period" ? "period" : "monthly"

  const monthRange = computeMonthRange(params.month)

  const today = new Date()
  const periodType: PeriodType =
    params.period === "quarter" || params.period === "semester" || params.period === "year"
      ? params.period
      : "quarter"
  const year = params.year && /^\d{4}$/.test(params.year)
    ? Number(params.year)
    : today.getFullYear()
  const defaultPidx =
    periodType === "quarter"
      ? Math.floor(today.getMonth() / 3) + 1
      : periodType === "semester"
        ? today.getMonth() < 6 ? 1 : 2
        : null
  const pidx = periodType === "year"
    ? null
    : params.pidx
      ? Number(params.pidx)
      : defaultPidx
  const periodRange = computePeriodRange(periodType, year, pidx)

  const startDate = view === "period" ? periodRange.startDate : monthRange.startDate
  const endDate = view === "period" ? periodRange.endDate : monthRange.endDate

  const [macrosRes, goalsRes, periodGoalsRes, categoriesRes, txsRes] = await Promise.all([
    supabase.from("macro_category").select("*").order("display_order"),
    clientId
      ? supabase.from("goal").select("*").eq("client_id", clientId)
      : Promise.resolve({ data: [] as Array<{ macro_category_id: number; target_percentage: number }> }),
    clientId
      ? supabase.from("period_goal").select("*").eq("client_id", clientId)
      : Promise.resolve({ data: [] as Array<never> }),
    supabase.from("category").select("category_id, category_name, macro_category_id"),
    supabase
      .from("transaction")
      .select(
        "trans_id, date, description, amount, type, re_category_transaction(category_id, category(category_name, macro_category_id))"
      )
      .eq("is_provisional", false)
      .eq("type", "debit")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false }),
  ])

  const macros = (macrosRes.data ?? []).map((m) => ({
    macro_category_id: m.macro_category_id,
    name: m.name,
    slug: m.slug,
    display_order: m.display_order,
  }))

  const goals = (goalsRes.data ?? []).map((g) => ({
    macro_category_id: g.macro_category_id,
    target_percentage: Number(g.target_percentage),
  }))

  const periodGoals = (periodGoalsRes.data ?? []).map((g) => ({
    period_goal_id: g.period_goal_id,
    macro_category_id: g.macro_category_id,
    category_id: g.category_id,
    period_type: g.period_type as PeriodType,
    year: g.year,
    period_index: g.period_index,
    kind: g.kind as "cap" | "target",
    amount: Number(g.amount),
  }))

  const categories = (categoriesRes.data ?? []).map((c) => ({
    category_id: c.category_id,
    category_name: c.category_name,
    macro_category_id: c.macro_category_id,
  }))

  const txs = (txsRes.data ?? []) as unknown as RawTx[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas"
        description="Planeje e acompanhe a distribuição das suas saídas por macro categoria."
      />
      <GoalsClient
        macros={macros}
        goals={goals}
        periodGoals={periodGoals}
        categories={categories}
        transactions={txs.map((t) => ({
          trans_id: t.trans_id,
          date: t.date,
          description: t.description,
          amount: Number(t.amount),
          category_id: t.re_category_transaction?.[0]?.category_id ?? null,
          macro_category_id:
            t.re_category_transaction?.[0]?.category?.macro_category_id ?? null,
          category_name:
            t.re_category_transaction?.[0]?.category?.category_name ?? null,
        }))}
        monthLabel={monthRange.monthLabel}
        selectedMonth={monthRange.selectedMonth}
        view={view}
        periodType={periodType}
        periodYear={year}
        periodIndex={pidx}
        periodLabel={periodRange.label}
      />
    </div>
  )
}
