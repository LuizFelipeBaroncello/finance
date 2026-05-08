"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { classifyRows } from "@/lib/transactions/classifier";
import { parseCsvContent } from "@/lib/transactions/parsers";
import { extractBradescoCreditCsv } from "@/lib/transactions/parsers/pdf";
import type { BankSource, ClassifiedRow, TransactionKind } from "@/lib/transactions/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function flagDuplicates(
  supabase: SupabaseClient,
  accountId: number,
  rows: ClassifiedRow[],
): Promise<ClassifiedRow[]> {
  if (rows.length === 0) return rows;
  const dates = rows.map((r) => r.date);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));

  const { data: existing, error } = await supabase
    .from("transaction")
    .select("date, description, amount")
    .eq("account_id", accountId)
    .eq("is_provisional", false)
    .gte("date", minDate)
    .lte("date", maxDate);

  console.log("[flagDuplicates]", {
    accountId,
    rowsCount: rows.length,
    minDate,
    maxDate,
    existingCount: existing?.length ?? 0,
    error: error?.message,
    sampleExisting: existing?.slice(0, 3),
    sampleRow: rows[0]
      ? { date: rows[0].date, description: rows[0].description, amount: rows[0].amount }
      : null,
  });

  if (error || !existing) return rows;

  const normDate = (d: string) => d.slice(0, 10);
  const key = (date: string, description: string, amount: number) =>
    `${normDate(date)}|${description.trim()}|${Math.abs(amount).toFixed(2)}`;

  const existingKeys = new Set(
    existing.map((e) => key(e.date, e.description, Number(e.amount))),
  );

  return rows.map((r) => {
    const isDup = existingKeys.has(key(r.date, r.description, r.amount));
    if (!isDup) return r;
    return { ...r, duplicate: true, ignored: true };
  });
}

export async function classifyCsvAction(
  source: BankSource,
  accountId: number,
  csvContent: string,
): Promise<{ rows?: ClassifiedRow[]; error?: string }> {
  try {
    const parsed = parseCsvContent(source, csvContent);
    const rows = await classifyRows(parsed, source, accountId);
    const supabase = await createClient();
    const flagged = await flagDuplicates(supabase, accountId, rows);
    return { rows: flagged };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function classifyPdfAction(
  accountId: number,
  pdfBase64: string,
  year: number,
): Promise<{ rows?: ClassifiedRow[]; csvContent?: string; error?: string }> {
  try {
    const binary = Buffer.from(pdfBase64, "base64");
    const buf = new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength);
    const { csv, ignoredDescriptions } = await extractBradescoCreditCsv(buf, year);
    const parsed = parseCsvContent("bradesco_credit", csv);
    const rows = await classifyRows(parsed, "bradesco_credit", accountId);
    const supabase = await createClient();
    const flagged = await flagDuplicates(supabase, accountId, rows);
    const ignoredSet = new Set(ignoredDescriptions.map((d) => d.trim()));
    const finalRows = flagged.map((r) =>
      ignoredSet.has(r.description.trim()) ? { ...r, ignored: true } : r,
    );
    return { rows: finalRows, csvContent: csv };
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
    const flagged = await flagDuplicates(supabase, accountId, rows);
    const { data: rules, error } = await supabase
      .from("classification_rule")
      .select("rule_id, pattern, category_id, priority")
      .order("priority", { ascending: false })
      .order("pattern", { ascending: true });
    if (error) return { error: error.message };
    return { rows: flagged, rules: rules ?? [] };
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
      .select("trans_id, description, amount")
      .eq("account_id", accountId)
      .eq("date", row.date)
      .eq("is_provisional", false);

    if (selErr) {
      errors.push(`${row.description}: ${selErr.message}`);
      continue;
    }
    const targetDesc = row.description.trim();
    const targetAbs = Math.abs(row.amount).toFixed(2);
    const isDup = (existing ?? []).some(
      (e) =>
        e.description.trim() === targetDesc &&
        Math.abs(Number(e.amount)).toFixed(2) === targetAbs,
    );
    if (isDup) {
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
