"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createVehicle(formData: FormData) {
  const supabase = await createClient()
  const { data: client } = await supabase.from("client").select("client_id").single()
  if (!client) return { error: "Não autorizado" }

  const isFinanced = formData.get("is_financed") === "true"
  const isSold = formData.get("is_sold") === "true"
  const brand = formData.get("brand") as string
  const model = formData.get("model") as string
  const yearStr = formData.get("year") as string
  const currentEstimatedValue = formData.get("current_estimated_value") as string
  const sellDate = formData.get("sell_date") as string
  const sellPrice = formData.get("sell_price") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase.from("vehicle").insert({
    client_id: client.client_id,
    name: formData.get("name") as string,
    vehicle_type: formData.get("vehicle_type") as string,
    brand: brand || null,
    model: model || null,
    year: yearStr ? Number(yearStr) : null,
    purchase_date: formData.get("purchase_date") as string,
    purchase_price: Number(formData.get("purchase_price")),
    current_estimated_value: currentEstimatedValue ? Number(currentEstimatedValue) : null,
    is_financed: isFinanced,
    is_sold: isSold,
    sell_date: isSold && sellDate ? sellDate : null,
    sell_price: isSold && sellPrice ? Number(sellPrice) : null,
    notes: notes || null,
  } as any)

  if (error) return { error: error.message }
  revalidatePath("/vehicles")
}

export async function updateVehicle(id: number, formData: FormData) {
  const supabase = await createClient()

  const isFinanced = formData.get("is_financed") === "true"
  const isSold = formData.get("is_sold") === "true"
  const brand = formData.get("brand") as string
  const model = formData.get("model") as string
  const yearStr = formData.get("year") as string
  const currentEstimatedValue = formData.get("current_estimated_value") as string
  const sellDate = formData.get("sell_date") as string
  const sellPrice = formData.get("sell_price") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase
    .from("vehicle")
    .update({
      name: formData.get("name") as string,
      vehicle_type: formData.get("vehicle_type") as string,
      brand: brand || null,
      model: model || null,
      year: yearStr ? Number(yearStr) : null,
      purchase_date: formData.get("purchase_date") as string,
      purchase_price: Number(formData.get("purchase_price")),
      current_estimated_value: currentEstimatedValue ? Number(currentEstimatedValue) : null,
      is_financed: isFinanced,
      is_sold: isSold,
      sell_date: isSold && sellDate ? sellDate : null,
      sell_price: isSold && sellPrice ? Number(sellPrice) : null,
      notes: notes || null,
    } as any)
    .eq("vehicle_id", id)

  if (error) return { error: error.message }
  revalidatePath("/vehicles")
}

export async function deleteVehicle(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("vehicle").delete().eq("vehicle_id", id)
  if (error) return { error: error.message }
  revalidatePath("/vehicles")
}
