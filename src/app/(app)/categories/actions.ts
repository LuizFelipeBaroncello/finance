"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

function parseFkId(value: FormDataEntryValue | null): number | null {
  const v = typeof value === "string" ? value : ""
  if (!v || v === "none") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: client } = await supabase.from("client").select("client_id").single()
  if (!client) return { error: "Não autorizado" }

  const { error } = await supabase.from("category").insert({
    client_id: client.client_id,
    category_name: formData.get("category_name") as string,
    type: formData.get("type") as "debit" | "credit" | "transfer",
    parent_category_id: parseFkId(formData.get("parent_category_id")),
    macro_category_id: parseFkId(formData.get("macro_category_id")),
  })
  if (error) return { error: error.message }
  revalidatePath("/categories")
}

export async function updateCategory(id: number, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from("category").update({
    category_name: formData.get("category_name") as string,
    type: formData.get("type") as "debit" | "credit" | "transfer",
    parent_category_id: parseFkId(formData.get("parent_category_id")),
    macro_category_id: parseFkId(formData.get("macro_category_id")),
  }).eq("category_id", id)
  if (error) return { error: error.message }
  revalidatePath("/categories")
}

export async function deleteCategory(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("category").delete().eq("category_id", id)
  if (error) return { error: error.message }
  revalidatePath("/categories")
}

export async function updateCategoryMacro(id: number, macroId: number | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("category")
    .update({ macro_category_id: macroId })
    .eq("category_id", id)
  if (error) return { error: error.message }
  revalidatePath("/categories")
}
