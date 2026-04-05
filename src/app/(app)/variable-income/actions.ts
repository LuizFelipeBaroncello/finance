"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createVariableIncome(formData: FormData) {
  const supabase = await createClient()
  const { data: client } = await supabase.from("client").select("client_id").single()
  if (!client) return { error: "Não autorizado" }

  const institutionId = formData.get("institution_id") as string
  const isSold = formData.get("is_sold") === "true"
  const sellDate = formData.get("sell_date") as string
  const sellPrice = formData.get("sell_price") as string
  const sellTotal = formData.get("sell_total") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase.from("variable_income").insert({
    client_id: client.client_id,
    asset_type: formData.get("asset_type") as string,
    ticker: (formData.get("ticker") as string).toUpperCase(),
    name: formData.get("name") as string,
    institution_id: institutionId ? Number(institutionId) : null,
    quantity: Number(formData.get("quantity")),
    avg_price: Number(formData.get("avg_price")),
    total_invested: Number(formData.get("total_invested")),
    investment_date: formData.get("investment_date") as string,
    is_sold: isSold,
    sell_date: isSold && sellDate ? sellDate : null,
    sell_price: isSold && sellPrice ? Number(sellPrice) : null,
    sell_total: isSold && sellTotal ? Number(sellTotal) : null,
    notes: notes || null,
  } as any)

  if (error) return { error: error.message }
  revalidatePath("/variable-income")
}

export async function updateVariableIncome(id: number, formData: FormData) {
  const supabase = await createClient()

  const institutionId = formData.get("institution_id") as string
  const isSold = formData.get("is_sold") === "true"
  const sellDate = formData.get("sell_date") as string
  const sellPrice = formData.get("sell_price") as string
  const sellTotal = formData.get("sell_total") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase
    .from("variable_income")
    .update({
      asset_type: formData.get("asset_type") as string,
      ticker: (formData.get("ticker") as string).toUpperCase(),
      name: formData.get("name") as string,
      institution_id: institutionId ? Number(institutionId) : null,
      quantity: Number(formData.get("quantity")),
      avg_price: Number(formData.get("avg_price")),
      total_invested: Number(formData.get("total_invested")),
      investment_date: formData.get("investment_date") as string,
      is_sold: isSold,
      sell_date: isSold && sellDate ? sellDate : null,
      sell_price: isSold && sellPrice ? Number(sellPrice) : null,
      sell_total: isSold && sellTotal ? Number(sellTotal) : null,
      notes: notes || null,
    } as any)
    .eq("variable_income_id", id)

  if (error) return { error: error.message }
  revalidatePath("/variable-income")
}

export async function deleteVariableIncome(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("variable_income").delete().eq("variable_income_id", id)
  if (error) return { error: error.message }
  revalidatePath("/variable-income")
}
