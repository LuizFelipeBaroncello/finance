"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()

  const categoryIds = formData.getAll("category_ids") as string[]

  const { data: transaction, error } = await supabase.from("transaction").insert({
    account_id: Number(formData.get("account_id")),
    date: formData.get("date") as string,
    description: formData.get("description") as string,
    amount: Math.abs(Number(formData.get("amount"))),
    type: formData.get("type") as "debit" | "credit" | "transfer",
  }).select("trans_id").single()

  if (error) return { error: error.message }

  if (categoryIds.length > 0 && transaction) {
    await supabase.from("re_category_transaction").insert(
      categoryIds.map(catId => ({
        trans_id: transaction.trans_id,
        category_id: Number(catId),
      }))
    )
  }

  revalidatePath("/transactions")
}

export async function updateTransaction(id: number, formData: FormData) {
  const supabase = await createClient()

  const categoryIds = formData.getAll("category_ids") as string[]

  const { error } = await supabase.from("transaction").update({
    account_id: Number(formData.get("account_id")),
    date: formData.get("date") as string,
    description: formData.get("description") as string,
    amount: Math.abs(Number(formData.get("amount"))),
    type: formData.get("type") as "debit" | "credit" | "transfer",
  }).eq("trans_id", id)

  if (error) return { error: error.message }

  // Atualiza categorias: deleta as antigas e insere as novas
  await supabase.from("re_category_transaction").delete().eq("trans_id", id)
  if (categoryIds.length > 0) {
    await supabase.from("re_category_transaction").insert(
      categoryIds.map(catId => ({
        trans_id: id,
        category_id: Number(catId),
      }))
    )
  }

  revalidatePath("/transactions")
}

export async function deleteTransaction(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("transaction").delete().eq("trans_id", id)
  if (error) return { error: error.message }
  revalidatePath("/transactions")
}
