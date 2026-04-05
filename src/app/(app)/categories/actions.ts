"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: client } = await supabase.from("client").select("client_id").single()
  if (!client) return { error: "Não autorizado" }

  const parentId = formData.get("parent_category_id") as string

  const { error } = await supabase.from("category").insert({
    client_id: client.client_id,
    category_name: formData.get("category_name") as string,
    type: formData.get("type") as "debit" | "credit" | "transfer",
    parent_category_id: parentId && parentId !== "none" ? Number(parentId) : null,
  })
  if (error) return { error: error.message }
  revalidatePath("/categories")
}

export async function updateCategory(id: number, formData: FormData) {
  const supabase = await createClient()
  const parentId = formData.get("parent_category_id") as string
  const { error } = await supabase.from("category").update({
    category_name: formData.get("category_name") as string,
    type: formData.get("type") as "debit" | "credit" | "transfer",
    parent_category_id: parentId && parentId !== "none" ? Number(parentId) : null,
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
