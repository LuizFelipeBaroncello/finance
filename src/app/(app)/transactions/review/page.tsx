import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classifyExistingRows, type ExistingRow } from "@/lib/transactions/classifier";
import { ReviewClient } from "./components/review-client";
import type { TransactionKind } from "@/lib/transactions/types";

export default async function ReviewPage() {
  const supabase = await createClient();

  const { data: provisional } = await supabase
    .from("transaction")
    .select("trans_id, account_id, date, description, amount, type")
    .eq("is_provisional", true)
    .order("date", { ascending: true });

  if (!provisional || provisional.length === 0) {
    redirect("/transactions");
  }

  const existing: ExistingRow[] = provisional.map((r) => ({
    transId: r.trans_id,
    accountId: r.account_id,
    date: String(r.date).slice(0, 10),
    description: r.description,
    amount: Math.abs(Number(r.amount)),
    rawAmount: Number(r.amount),
    existingType: r.type as TransactionKind,
  }));

  const classified = await classifyExistingRows(existing);

  // Importações (Pluggy) podem trazer a transação com ±1 dia de diferença por
  // fuso horário; toleramos isso ao detectar duplicatas contra as confirmadas.
  const DUP_DAY_TOLERANCE = 1;
  const shiftDate = (isoDate: string, deltaDays: number): string => {
    const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
  };

  const minDate = shiftDate(
    existing.reduce((a, b) => (a.date < b.date ? a : b)).date,
    -DUP_DAY_TOLERANCE,
  );
  const maxDate = shiftDate(
    existing.reduce((a, b) => (a.date > b.date ? a : b)).date,
    DUP_DAY_TOLERANCE,
  );
  const accountIds = Array.from(new Set(existing.map((r) => r.accountId)));

  const { data: confirmed } = await supabase
    .from("transaction")
    .select("account_id, date, description, amount")
    .in("account_id", accountIds)
    .gte("date", minDate)
    .lte("date", maxDate)
    .eq("is_provisional", false);

  const key = (accountId: number, date: string, description: string, amount: number) =>
    `${accountId}|${date.slice(0, 10)}|${description.trim()}|${Math.abs(amount).toFixed(2)}`;

  const confirmedKeys = new Set<string>();
  for (const c of confirmed ?? []) {
    for (let delta = -DUP_DAY_TOLERANCE; delta <= DUP_DAY_TOLERANCE; delta++) {
      confirmedKeys.add(key(c.account_id, shiftDate(c.date, delta), c.description, Number(c.amount)));
    }
  }

  const withDuplicates = classified.map((r) => {
    const dupKey = key(r.accountId, r.date, r.description, r.amount);
    if (confirmedKeys.has(dupKey)) {
      return { ...r, duplicate: true, ignored: true };
    }
    return r;
  });

  const { data: categories } = await supabase
    .from("category")
    .select("category_id, category_name, type")
    .order("category_name");

  const { data: accounts } = await supabase
    .from("account")
    .select("account_id, account_name");

  const { data: rules } = await supabase
    .from("classification_rule")
    .select("rule_id, pattern, category_id, priority")
    .order("priority", { ascending: false });

  return (
    <ReviewClient
      initialRows={withDuplicates}
      categories={categories ?? []}
      accounts={accounts ?? []}
      rules={rules ?? []}
    />
  );
}
