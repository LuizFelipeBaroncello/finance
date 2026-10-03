"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/

async function getClientId() {
  const supabase = await createClient()
  const { data: client } = await supabase
    .from("client")
    .select("client_id")
    .single()
  return { supabase, clientId: client?.client_id ?? null }
}

export type SavePlanInput = {
  startDate: string
  monthlyAmount: number
  payDay: number
  dailyEstimate: number
  warningPct: number
  macroCategoryIds: number[]
  categoryIds: number[]
}

function validatePlan(input: SavePlanInput): string | null {
  if (!ISO_DATE.test(input.startDate)) return "Data de início inválida."
  if (!Number.isFinite(input.monthlyAmount) || input.monthlyAmount < 0)
    return "Aporte mensal inválido."
  if (!Number.isInteger(input.payDay) || input.payDay < 1 || input.payDay > 31)
    return "Dia do aporte deve estar entre 1 e 31."
  if (!Number.isFinite(input.dailyEstimate) || input.dailyEstimate < 0)
    return "Gasto diário inválido."
  if (!Number.isFinite(input.warningPct) || input.warningPct < 0 || input.warningPct > 100)
    return "Alerta deve estar entre 0% e 100%."
  if (input.macroCategoryIds.length === 0 && input.categoryIds.length === 0)
    return "Selecione ao menos uma macro ou categoria de uso livre."
  return null
}

export async function savePlan(input: SavePlanInput) {
  const validationError = validatePlan(input)
  if (validationError) return { error: validationError }

  const { supabase, clientId } = await getClientId()
  if (!clientId) return { error: "Não autorizado" }

  const { error } = await supabase.from("free_spending_plan").upsert(
    {
      client_id: clientId,
      start_date: input.startDate,
      monthly_amount: input.monthlyAmount,
      pay_day: input.payDay,
      daily_estimate: input.dailyEstimate,
      warning_pct: input.warningPct,
      macro_category_ids: input.macroCategoryIds,
      category_ids: input.categoryIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" }
  )
  if (error) return { error: error.message }

  revalidatePath("/horizon")
  return { success: true }
}

/** Define o aporte de um mês específico; `amount = null` volta ao valor padrão. */
export async function setMonthAmount(month: string, amount: number | null) {
  if (!MONTH_KEY.test(month)) return { error: "Mês inválido." }
  if (amount !== null && (!Number.isFinite(amount) || amount < 0))
    return { error: "Valor inválido." }

  const { supabase, clientId } = await getClientId()
  if (!clientId) return { error: "Não autorizado" }

  const monthDate = `${month}-01`
  const { error } =
    amount === null
      ? await supabase
          .from("free_spending_month")
          .delete()
          .eq("client_id", clientId)
          .eq("month", monthDate)
      : await supabase.from("free_spending_month").upsert(
          {
            client_id: clientId,
            month: monthDate,
            amount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,month" }
        )
  if (error) return { error: error.message }

  revalidatePath("/horizon")
  return { success: true }
}

export async function addPlannedExpense(input: {
  date: string
  description: string
  amount: number
}) {
  if (!ISO_DATE.test(input.date)) return { error: "Data inválida." }
  if (!input.description.trim()) return { error: "Informe uma descrição." }
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    return { error: "Valor deve ser maior que zero." }

  const { supabase, clientId } = await getClientId()
  if (!clientId) return { error: "Não autorizado" }

  const { error } = await supabase.from("free_spending_planned").insert({
    client_id: clientId,
    date: input.date,
    description: input.description.trim(),
    amount: input.amount,
  })
  if (error) return { error: error.message }

  revalidatePath("/horizon")
  return { success: true }
}

export async function deletePlannedExpense(id: number) {
  const { supabase } = await getClientId()
  const { error } = await supabase
    .from("free_spending_planned")
    .delete()
    .eq("free_spending_planned_id", id)
  if (error) return { error: error.message }

  revalidatePath("/horizon")
  return { success: true }
}
