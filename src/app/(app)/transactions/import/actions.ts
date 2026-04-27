"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { classifyRows } from "@/lib/transactions/classifier";
import { parseCsvContent } from "@/lib/transactions/parsers";
import type { BankSource, ClassifiedRow, TransactionKind } from "@/lib/transactions/types";

export async function classifyCsvAction(
  source: BankSource,
  accountId: number,
  csvContent: string,
): Promise<{ rows?: ClassifiedRow[]; error?: string }> {
  try {
    const parsed = parseCsvContent(source, csvContent);
    const rows = await classifyRows(parsed, source, accountId);
    return { rows };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

type RuleListItem = {
  rule_id: number;
  pattern: string;
  category_id: number;
  priority: number;
};

export async function reclassifyAction(
  source: BankSource,
  accountId: number,
  csvContent: string,
): Promise<{ rows?: ClassifiedRow[]; rules?: RuleListItem[]; error?: string }> {
  try {
    const parsed = parseCsvContent(source, csvContent);
    const rows = await classifyRows(parsed, source, accountId);
    const supabase = await createClient();
    const { data: rules, error } = await supabase
      .from("classification_rule")
      .select("rule_id, pattern, category_id, priority")
      .order("priority", { ascending: false })
      .order("pattern", { ascending: true });
    if (error) return { error: error.message };
    return { rows, rules: rules ?? [] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

type RowToInsert = {
  date: string;
  description: string;
  amount: number;
  type: TransactionKind;
  categoryId: number | null;
};

export async function insertTransactionsBatch(
  accountId: number,
  rows: RowToInsert[],
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const { data: existing, error: selErr } = await supabase
      .from("transaction")
      .select("trans_id")
      .eq("account_id", accountId)
      .eq("date", row.date)
      .eq("description", row.description)
      .eq("amount", row.amount)
      .eq("type", row.type)
      .limit(1);

    if (selErr) {
      errors.push(`${row.description}: ${selErr.message}`);
      continue;
    }
    if (existing && existing.length > 0) {
      skipped += 1;
      continue;
    }

    const { data: tx, error: insErr } = await supabase
      .from("transaction")
      .insert({
        account_id: accountId,
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
      })
      .select("trans_id")
      .single();

    if (insErr || !tx) {
      errors.push(`${row.description}: ${insErr?.message ?? "insert falhou"}`);
      continue;
    }

    if (row.categoryId != null) {
      const { error: linkErr } = await supabase
        .from("re_category_transaction")
        .insert({ trans_id: tx.trans_id, category_id: row.categoryId });
      if (linkErr) errors.push(`${row.description}: categoria ${linkErr.message}`);
    }

    inserted += 1;
  }

  revalidatePath("/transactions");
  return { inserted, skipped, errors };
}

export async function createRuleFromRow(
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
