import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPluggyClient } from "@/lib/pluggy/client";
import { dateWindow, mapPluggyTransaction } from "@/lib/pluggy/map";
import { classifyRows } from "@/lib/transactions/classifier";
import type { BankSource, ParsedRow } from "@/lib/transactions/types";

const ALLOWED_DAYS = new Set([20, 30]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { itemId?: string; accountId?: number; days?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const { itemId, accountId } = body;
  const days = body.days ?? 30;
  if (!itemId || typeof accountId !== "number" || !ALLOWED_DAYS.has(days)) {
    return NextResponse.json(
      { error: "Parâmetros inválidos: itemId (string), accountId (number), days (20 ou 30)" },
      { status: 400 },
    );
  }

  const { from } = dateWindow(days);
  let inserted = 0;
  const errors: string[] = [];

  try {
    const pluggy = getPluggyClient();
    const accountsResp = await pluggy.fetchAccounts(itemId);
    const pluggyAccounts = accountsResp.results ?? [];

    for (const pa of pluggyAccounts) {
      const isCredit = pa.type === "CREDIT";
      const transactions = await pluggy.fetchAllTransactions(pa.id, { dateFrom: from });
      const rows: ParsedRow[] = transactions.map((tx) => {
        const mapped = mapPluggyTransaction({
          description: tx.description,
          amount: tx.amount,
          type: tx.type === "CREDIT" ? "CREDIT" : "DEBIT",
          date: tx.date instanceof Date ? tx.date.toISOString() : String(tx.date),
        });
        return {
          date: mapped.date,
          description: mapped.description,
          amount: mapped.rawAmount, // mantém sinal para gravar
          rawAmount: mapped.rawAmount,
        };
      });

      if (rows.length === 0) continue;

      const source: BankSource = isCredit ? "nubank_credit" : "nubank_debit";
      const classified = await classifyRows(rows, source, accountId);

      for (const row of classified) {
        const { data: tx, error: insErr } = await supabase
          .from("transaction")
          .insert({
            account_id: accountId,
            date: row.date,
            description: row.description,
            amount: row.rawAmount,
            type: row.suggestedType,
            is_provisional: true,
          })
          .select("trans_id")
          .single();
        if (insErr || !tx) {
          errors.push(`${row.description}: ${insErr?.message ?? "insert falhou"}`);
          continue;
        }
        if (row.suggestedCategoryId != null) {
          const { error: linkErr } = await supabase
            .from("re_category_transaction")
            .insert({ trans_id: tx.trans_id, category_id: row.suggestedCategoryId });
          if (linkErr) errors.push(`${row.description}: categoria ${linkErr.message}`);
        }
        inserted += 1;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao sincronizar com Pluggy";
    return NextResponse.json({ inserted, errors, error: message }, { status: 500 });
  }

  revalidatePath("/transactions");
  revalidatePath("/transactions/review");
  return NextResponse.json({ inserted, errors });
}
