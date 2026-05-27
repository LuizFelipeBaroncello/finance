"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateGoals(
  targets: Array<{ macro_category_id: number; target_percentage: number }>
) {
  const supabase = await createClient()
  const { data: client } = await supabase
    .from("client")
    .select("client_id")
    .single()
  if (!client) return { error: "Não autorizado" }

  const total = targets.reduce((sum, t) => sum + t.target_percentage, 0)
  if (Math.round(total * 100) / 100 !== 100) {
    return { error: `A soma das porcentagens deve ser 100% (atual: ${total}%)` }
  }

  const rows = targets.map((t) => ({
    client_id: client.client_id,
    macro_category_id: t.macro_category_id,
    target_percentage: t.target_percentage,
  }))

  const { error } = await supabase
    .from("goal")
    .upsert(rows, { onConflict: "client_id,macro_category_id" })

  if (error) return { error: error.message }

  revalidatePath("/goals")
  return { success: true }
}

export type PeriodType = "quarter" | "semester" | "year"
export type GoalKind = "cap" | "target"
export type GoalScope = "macro" | "category"

export type UpsertPeriodGoalInput = {
  periodGoalId?: number
  scope: GoalScope
  macroCategoryId?: number | null
  categoryId?: number | null
  periodType: PeriodType
  year: number | null
  periodIndex: number | null
  kind: GoalKind
  amount: number
}

function validatePeriodGoal(input: UpsertPeriodGoalInput): string | null {
  if (input.amount < 0) return "Valor não pode ser negativo."
  if (input.scope === "macro") {
    if (!input.macroCategoryId) return "Selecione uma macro categoria."
    if (input.categoryId) return "Escopo inválido (macro + categoria)."
  } else {
    if (!input.categoryId) return "Selecione uma categoria."
    if (input.macroCategoryId) return "Escopo inválido (macro + categoria)."
  }
  if (input.periodType === "year") {
    if (input.periodIndex !== null) return "Ano não usa índice de período."
  } else if (input.periodType === "quarter") {
    if (!input.periodIndex || input.periodIndex < 1 || input.periodIndex > 4)
      return "Trimestre deve estar entre 1 e 4."
  } else if (input.periodType === "semester") {
    if (!input.periodIndex || input.periodIndex < 1 || input.periodIndex > 2)
      return "Semestre deve estar entre 1 e 2."
  }
  return null
}

export async function upsertPeriodGoal(input: UpsertPeriodGoalInput) {
  const validationError = validatePeriodGoal(input)
  if (validationError) return { error: validationError }

  const supabase = await createClient()
  const { data: client } = await supabase
    .from("client")
    .select("client_id")
    .single()
  if (!client) return { error: "Não autorizado" }

  const row = {
    client_id: client.client_id,
    macro_category_id: input.scope === "macro" ? input.macroCategoryId! : null,
    category_id: input.scope === "category" ? input.categoryId! : null,
    period_type: input.periodType,
    year: input.year,
    period_index: input.periodIndex,
    kind: input.kind,
    amount: input.amount,
  }

  if (input.periodGoalId) {
    const { error } = await supabase
      .from("period_goal")
      .update(row)
      .eq("period_goal_id", input.periodGoalId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from("period_goal").insert(row)
    if (error) return { error: error.message }
  }

  revalidatePath("/goals")
  return { success: true }
}

export async function deletePeriodGoal(periodGoalId: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("period_goal")
    .delete()
    .eq("period_goal_id", periodGoalId)
  if (error) return { error: error.message }
  revalidatePath("/goals")
  return { success: true }
}
