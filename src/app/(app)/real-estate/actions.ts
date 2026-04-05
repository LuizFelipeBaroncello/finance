"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createRealEstate(formData: FormData) {
  const supabase = await createClient()
  const { data: client } = await supabase.from("client").select("client_id").single()
  if (!client) return { error: "Não autorizado" }

  const isFinanced = formData.get("is_financed") === "true"
  const isRental = formData.get("is_rental") === "true"
  const isSold = formData.get("is_sold") === "true"
  const address = formData.get("address") as string
  const currentEstimatedValue = formData.get("current_estimated_value") as string
  const monthlyRentalIncome = formData.get("monthly_rental_income") as string
  const sellDate = formData.get("sell_date") as string
  const sellPrice = formData.get("sell_price") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase.from("real_estate").insert({
    client_id: client.client_id,
    name: formData.get("name") as string,
    property_type: formData.get("property_type") as string,
    address: address || null,
    purchase_date: formData.get("purchase_date") as string,
    purchase_price: Number(formData.get("purchase_price")),
    current_estimated_value: currentEstimatedValue ? Number(currentEstimatedValue) : null,
    is_financed: isFinanced,
    is_rental: isRental,
    monthly_rental_income: isRental && monthlyRentalIncome ? Number(monthlyRentalIncome) : null,
    is_sold: isSold,
    sell_date: isSold && sellDate ? sellDate : null,
    sell_price: isSold && sellPrice ? Number(sellPrice) : null,
    notes: notes || null,
  } as any)

  if (error) return { error: error.message }
  revalidatePath("/real-estate")
}

export async function updateRealEstate(id: number, formData: FormData) {
  const supabase = await createClient()

  const isFinanced = formData.get("is_financed") === "true"
  const isRental = formData.get("is_rental") === "true"
  const isSold = formData.get("is_sold") === "true"
  const address = formData.get("address") as string
  const currentEstimatedValue = formData.get("current_estimated_value") as string
  const monthlyRentalIncome = formData.get("monthly_rental_income") as string
  const sellDate = formData.get("sell_date") as string
  const sellPrice = formData.get("sell_price") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase
    .from("real_estate")
    .update({
      name: formData.get("name") as string,
      property_type: formData.get("property_type") as string,
      address: address || null,
      purchase_date: formData.get("purchase_date") as string,
      purchase_price: Number(formData.get("purchase_price")),
      current_estimated_value: currentEstimatedValue ? Number(currentEstimatedValue) : null,
      is_financed: isFinanced,
      is_rental: isRental,
      monthly_rental_income: isRental && monthlyRentalIncome ? Number(monthlyRentalIncome) : null,
      is_sold: isSold,
      sell_date: isSold && sellDate ? sellDate : null,
      sell_price: isSold && sellPrice ? Number(sellPrice) : null,
      notes: notes || null,
    } as any)
    .eq("real_estate_id", id)

  if (error) return { error: error.message }
  revalidatePath("/real-estate")
}

export async function deleteRealEstate(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("real_estate").delete().eq("real_estate_id", id)
  if (error) return { error: error.message }
  revalidatePath("/real-estate")
}
