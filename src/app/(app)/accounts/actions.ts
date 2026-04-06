"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createAccount(formData: FormData) {
  const supabase = await createClient()
  const { data: client } = await supabase.from("client").select("client_id").single()
  if (!client) return { error: "Não autorizado" }

  const { error } = await supabase.from("account").insert({
    client_id: client.client_id,
    account_name: formData.get("account_name") as string,
    description: (formData.get("description") as string) || "",
    institution_id: Number(formData.get("institution_id")),
  })
  if (error) return { error: error.message }
  revalidatePath("/accounts")
}

export async function updateAccount(id: number, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from("account").update({
    account_name: formData.get("account_name") as string,
    description: (formData.get("description") as string) || "",
    institution_id: Number(formData.get("institution_id")),
  }).eq("account_id", id)
  if (error) return { error: error.message }
  revalidatePath("/accounts")
}

export async function deleteAccount(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("account").delete().eq("account_id", id)
  if (error) return { error: error.message }
  revalidatePath("/accounts")
}
