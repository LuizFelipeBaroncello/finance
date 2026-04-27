import { createClient } from "@/lib/supabase/server";
import type { BankSource, ClassifiedRow, ParsedRow, TransactionKind } from "./types";

type Rule = { rule_id: number; pattern: string; category_id: number };
type AccountKeywords = { account_id: number; transfer_keywords: string[] };

function isCreditSource(source: BankSource): boolean {
  return source === "nubank_credit" || source === "bradesco_credit";
}

function matchesAnyKeyword(description: string, keywords: string[]): boolean {
  const lower = description.toLowerCase();
  return keywords.some((kw) => kw && lower.includes(kw.toLowerCase()));
}

function findRule(description: string, rules: Rule[]): Rule | null {
  const lower = description.toLowerCase();
  for (const rule of rules) {
    if (rule.pattern && lower.includes(rule.pattern.toLowerCase())) {
      return rule;
    }
  }
  return null;
}

export async function classifyRows(
  rows: ParsedRow[],
  source: BankSource,
  targetAccountId: number,
): Promise<ClassifiedRow[]> {
  const supabase = await createClient();

  const [{ data: rulesData }, { data: accountsData }] = await Promise.all([
    supabase
      .from("classification_rule")
      .select("rule_id, pattern, category_id, priority")
      .order("priority", { ascending: false }),
    supabase.from("account").select("account_id, transfer_keywords"),
  ]);

  const rules: Rule[] = rulesData ?? [];
  const otherAccounts: AccountKeywords[] = (accountsData ?? [])
    .filter((a) => a.account_id !== targetAccountId)
    .map((a) => ({
      account_id: a.account_id,
      transfer_keywords: a.transfer_keywords ?? [],
    }));

  const credit = isCreditSource(source);

  return rows.map((row): ClassifiedRow => {
    const isTransferToOwn = otherAccounts.some((a) =>
      matchesAnyKeyword(row.description, a.transfer_keywords),
    );

    if (isTransferToOwn) {
      return {
        ...row,
        suggestedType: "transfer",
        suggestedCategoryId: null,
        matchedRuleId: null,
        reason: "transfer-self",
      };
    }

    const suggestedType: TransactionKind = credit
      ? "debit"
      : row.rawAmount > 0
        ? "credit"
        : "debit";

    const rule = findRule(row.description, rules);
    if (rule) {
      return {
        ...row,
        suggestedType,
        suggestedCategoryId: rule.category_id,
        matchedRuleId: rule.rule_id,
        reason: "rule",
      };
    }

    return {
      ...row,
      suggestedType,
      suggestedCategoryId: null,
      matchedRuleId: null,
      reason: "unclassified",
    };
  });
}
