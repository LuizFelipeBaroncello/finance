"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TransactionKind } from "@/lib/transactions/types";

export type ConfirmRow = {
  transId: number;
  date: string;
  description: string;
  amount: number;
  type: TransactionKind;
  categoryId: number | null;
  ignored: boolean;
};

export type ConfirmResult = {
  confirmed: number;
  deleted: number;
  errors: { transId: number; message: string }[];
};

export async function confirmProvisionalReview(
  rows: ConfirmRow[],
): Promise<ConfirmResult> {
  const supabase = await createClient();
  let confirmed = 0;
  let deleted = 0;
  const errors: { transId: number; message: string }[] = [];

  for (const row of rows) {
    if (row.ignored) {
      const { error } = await supabase
        .from("transaction")
        .delete()
        .eq("trans_id", row.transId);
      if (error) {
        errors.push({ transId: row.transId, message: error.message });
      } else {
        deleted += 1;
      }
      continue;
    }

    const { error: updErr } = await supabase
      .from("transaction")
      .update({
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        is_provisional: false,
      })
      .eq("trans_id", row.transId);

    if (updErr) {
      errors.push({ transId: row.transId, message: updErr.message });
      continue;
    }

    // A importação (Pluggy) já cria um vínculo com a categoria sugerida ao
    // inserir a transação provisória. Removemos os vínculos existentes antes de
    // gravar a categoria escolhida na revisão, senão a transação fica com duas
    // categorias (a sugerida + a confirmada).
    const { error: delErr } = await supabase
      .from("re_category_transaction")
      .delete()
      .eq("trans_id", row.transId);
    if (delErr) {
      errors.push({ transId: row.transId, message: `categoria: ${delErr.message}` });
      continue;
    }

    if (row.categoryId != null) {
      const { error: linkErr } = await supabase
        .from("re_category_transaction")
        .insert({ trans_id: row.transId, category_id: row.categoryId });
      if (linkErr) {
        errors.push({ transId: row.transId, message: `categoria: ${linkErr.message}` });
        continue;
      }
    }

    confirmed += 1;
  }

  revalidatePath("/transactions");
  revalidatePath("/transactions/review");
  return { confirmed, deleted, errors };
}

export async function createRuleAction(
  pattern: string,
  categoryId: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: category, error: catErr } = await supabase
    .from("category")
    .select("client_id")
    .eq("category_id", categoryId)
    .single();
  if (catErr || !category) return { error: catErr?.message ?? "Categoria não encontrada" };

  const { error } = await supabase.from("classification_rule").insert({
    pattern,
    category_id: categoryId,
    client_id: category.client_id,
  });
  if (error) return { error: error.message };
  return {};
}
