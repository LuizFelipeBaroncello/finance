"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createInstitution(formData: FormData) {
  const supabase = await createClient()
  const { data: client } = await supabase.from("client").select("client_id").single()
  if (!client) return { error: "Não autorizado" }

  const { error } = await supabase.from("institution").insert({
    client_id: client.client_id,
    name: formData.get("name") as string,
    type: formData.get("type") as "bank" | "broker" | "fintech" | "other",
    notes: (formData.get("notes") as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath("/institutions")
}

export async function updateInstitution(id: number, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("institution")
    .update({
      name: formData.get("name") as string,
      type: formData.get("type") as "bank" | "broker" | "fintech" | "other",
      notes: (formData.get("notes") as string) || null,
    })
    .eq("institution_id", id)

  if (error) return { error: error.message }
  revalidatePath("/institutions")
}

export async function deleteInstitution(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("institution").delete().eq("institution_id", id)
  if (error) return { error: error.message }
  revalidatePath("/institutions")
}
