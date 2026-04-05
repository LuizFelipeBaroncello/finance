"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createFixedIncome(formData: FormData) {
  const supabase = await createClient()
  const { data: client } = await supabase.from("client").select("client_id").single()
  if (!client) return { error: "Não autorizado" }

  const isRedeemed = formData.get("is_redeemed") === "true"
  const institutionId = formData.get("institution_id") as string
  const maturityDate = formData.get("maturity_date") as string
  const expectedReturn = formData.get("expected_return") as string
  const redemptionDate = formData.get("redemption_date") as string
  const redemptionAmount = formData.get("redemption_amount") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase.from("fixed_income").insert({
    client_id: client.client_id,
    name: formData.get("name") as string,
    type: formData.get("type") as string,
    institution_id: institutionId ? Number(institutionId) : null,
    invested_amount: Number(formData.get("invested_amount")),
    rate_type: formData.get("rate_type") as string,
    rate_value: Number(formData.get("rate_value")),
    investment_date: formData.get("investment_date") as string,
    maturity_date: maturityDate || null,
    expected_return: expectedReturn ? Number(expectedReturn) : null,
    is_redeemed: isRedeemed,
    redemption_date: isRedeemed && redemptionDate ? redemptionDate : null,
    redemption_amount: isRedeemed && redemptionAmount ? Number(redemptionAmount) : null,
    notes: notes || null,
  } as any)

  if (error) return { error: error.message }
  revalidatePath("/fixed-income")
}

export async function updateFixedIncome(id: number, formData: FormData) {
  const supabase = await createClient()

  const isRedeemed = formData.get("is_redeemed") === "true"
  const institutionId = formData.get("institution_id") as string
  const maturityDate = formData.get("maturity_date") as string
  const expectedReturn = formData.get("expected_return") as string
  const redemptionDate = formData.get("redemption_date") as string
  const redemptionAmount = formData.get("redemption_amount") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase
    .from("fixed_income")
    .update({
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      institution_id: institutionId ? Number(institutionId) : null,
      invested_amount: Number(formData.get("invested_amount")),
      rate_type: formData.get("rate_type") as string,
      rate_value: Number(formData.get("rate_value")),
      investment_date: formData.get("investment_date") as string,
      maturity_date: maturityDate || null,
      expected_return: expectedReturn ? Number(expectedReturn) : null,
      is_redeemed: isRedeemed,
      redemption_date: isRedeemed && redemptionDate ? redemptionDate : null,
      redemption_amount: isRedeemed && redemptionAmount ? Number(redemptionAmount) : null,
      notes: notes || null,
    } as any)
    .eq("fixed_income_id", id)

  if (error) return { error: error.message }
  revalidatePath("/fixed-income")
}

export async function deleteFixedIncome(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("fixed_income").delete().eq("fixed_income_id", id)
  if (error) return { error: error.message }
  revalidatePath("/fixed-income")
}
