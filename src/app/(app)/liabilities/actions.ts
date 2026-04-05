"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createLiability(formData: FormData) {
  const supabase = await createClient()
  const { data: client } = await supabase.from("client").select("client_id").single()
  if (!client) return { error: "Não autorizado" }

  const institutionId = formData.get("institution_id") as string
  const totalInstallments = formData.get("total_installments") as string
  const installmentAmount = formData.get("installment_amount") as string
  const interestRate = formData.get("interest_rate") as string
  const interestRatePeriod = formData.get("interest_rate_period") as string
  const endDate = formData.get("end_date") as string
  const realEstateId = formData.get("real_estate_id") as string
  const vehicleId = formData.get("vehicle_id") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase.from("liability").insert({
    client_id: client.client_id,
    name: formData.get("name") as string,
    type: formData.get("type") as string,
    institution_id: institutionId ? Number(institutionId) : null,
    original_amount: Number(formData.get("original_amount")),
    outstanding_balance: Number(formData.get("outstanding_balance")),
    interest_rate: interestRate ? Number(interestRate) : null,
    interest_rate_period: interestRatePeriod || null,
    total_installments: totalInstallments ? Number(totalInstallments) : null,
    paid_installments: Number(formData.get("paid_installments") ?? 0),
    installment_amount: installmentAmount ? Number(installmentAmount) : null,
    start_date: formData.get("start_date") as string,
    end_date: endDate || null,
    real_estate_id: realEstateId ? Number(realEstateId) : null,
    vehicle_id: vehicleId ? Number(vehicleId) : null,
    is_paid_off: formData.get("is_paid_off") === "true",
    notes: notes || null,
  } as any)

  if (error) return { error: error.message }
  revalidatePath("/liabilities")
}

export async function updateLiability(id: number, formData: FormData) {
  const supabase = await createClient()

  const institutionId = formData.get("institution_id") as string
  const totalInstallments = formData.get("total_installments") as string
  const installmentAmount = formData.get("installment_amount") as string
  const interestRate = formData.get("interest_rate") as string
  const interestRatePeriod = formData.get("interest_rate_period") as string
  const endDate = formData.get("end_date") as string
  const realEstateId = formData.get("real_estate_id") as string
  const vehicleId = formData.get("vehicle_id") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase
    .from("liability")
    .update({
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      institution_id: institutionId ? Number(institutionId) : null,
      original_amount: Number(formData.get("original_amount")),
      outstanding_balance: Number(formData.get("outstanding_balance")),
      interest_rate: interestRate ? Number(interestRate) : null,
      interest_rate_period: interestRatePeriod || null,
      total_installments: totalInstallments ? Number(totalInstallments) : null,
      paid_installments: Number(formData.get("paid_installments") ?? 0),
      installment_amount: installmentAmount ? Number(installmentAmount) : null,
      start_date: formData.get("start_date") as string,
      end_date: endDate || null,
      real_estate_id: realEstateId ? Number(realEstateId) : null,
      vehicle_id: vehicleId ? Number(vehicleId) : null,
      is_paid_off: formData.get("is_paid_off") === "true",
      notes: notes || null,
    } as any)
    .eq("liability_id", id)

  if (error) return { error: error.message }
  revalidatePath("/liabilities")
  revalidatePath(`/liabilities/${id}`)
}

export async function deleteLiability(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("liability").delete().eq("liability_id", id)
  if (error) return { error: error.message }
  revalidatePath("/liabilities")
}

export async function createPayment(liabilityId: number, formData: FormData) {
  const supabase = await createClient()
  const { data: client } = await supabase.from("client").select("client_id").single()
  if (!client) return { error: "Não autorizado" }

  const principal = formData.get("principal") as string
  const interest = formData.get("interest") as string
  const installmentNumber = formData.get("installment_number") as string
  const notes = formData.get("notes") as string

  const { error } = await supabase.from("liability_payment").insert({
    liability_id: liabilityId,
    client_id: client.client_id,
    payment_date: formData.get("payment_date") as string,
    amount: Number(formData.get("amount")),
    principal: principal ? Number(principal) : null,
    interest: interest ? Number(interest) : null,
    installment_number: installmentNumber ? Number(installmentNumber) : null,
    notes: notes || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/liabilities/${liabilityId}`)
}

export async function deletePayment(paymentId: number, liabilityId: number) {
  const supabase = await createClient()
  const { error } = await supabase.from("liability_payment").delete().eq("payment_id", paymentId)
  if (error) return { error: error.message }
  revalidatePath(`/liabilities/${liabilityId}`)
}
