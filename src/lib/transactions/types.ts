export type BankSource = "nubank_credit" | "nubank_debit" | "bradesco_credit";

export type TransactionKind = "debit" | "credit" | "transfer";

export type ParsedRow = {
  date: string;
  description: string;
  amount: number;
  rawAmount: number;
};

export type ClassificationReason = "rule" | "transfer-self" | "unclassified";

export type ClassifiedRow = ParsedRow & {
  suggestedCategoryId: number | null;
  suggestedType: TransactionKind;
  matchedRuleId: number | null;
  reason: ClassificationReason;
  ignored?: boolean;
};
