import type { ParsedRow, TransactionKind } from "@/lib/transactions/types";

export type PluggyTransactionLike = {
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  date: string;
};

export type MappedRow = ParsedRow & { type: TransactionKind };

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateWindow(days: number, now: Date = new Date()): { from: string; to: string } {
  const to = isoDate(now);
  const fromDate = new Date(now);
  fromDate.setUTCDate(fromDate.getUTCDate() - days);
  return { from: isoDate(fromDate), to };
}

export function mapPluggyTransaction(tx: PluggyTransactionLike): MappedRow {
  const abs = Math.abs(tx.amount);
  const isDebit = tx.type === "DEBIT";
  return {
    date: tx.date.slice(0, 10),
    description: tx.description,
    amount: abs,
    rawAmount: isDebit ? -abs : abs,
    type: isDebit ? "debit" : "credit",
  };
}
