"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassificationTable } from "@/components/transactions/classification-table";
import type { ProvisionalRow } from "@/lib/transactions/types";
import { confirmProvisionalReview, createRuleAction, type ConfirmRow } from "../actions";

type Category = { category_id: number; category_name: string; type: string };
type Account = { account_id: number; account_name: string };

export function ReviewClient({
  initialRows,
  categories,
  accounts,
}: {
  initialRows: ProvisionalRow[];
  categories: Category[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ProvisionalRow[]>(initialRows);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<{ transId: number; message: string }[]>([]);

  const groups = accounts
    .map((a) => ({
      account: a,
      rows: rows.filter((r) => r.accountId === a.account_id),
    }))
    .filter((g) => g.rows.length > 0);

  const onSubmit = () => {
    const payload: ConfirmRow[] = rows.map((r) => ({
      transId: r.transId,
      date: r.date,
      description: r.description,
      amount: r.amount,
      type: r.suggestedType,
      categoryId: r.suggestedCategoryId,
      ignored: r.ignored ?? false,
    }));

    startTransition(async () => {
      const result = await confirmProvisionalReview(payload);
      if (result.errors.length === 0) {
        router.push("/transactions");
        return;
      }
      setErrors(result.errors);
      const failedIds = new Set(result.errors.map((e) => e.transId));
      setRows((prev) => prev.filter((r) => failedIds.has(r.transId)));
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Revisar transações provisórias</h1>
        <Button onClick={onSubmit} disabled={pending || rows.length === 0}>
          {pending ? "Confirmando..." : "Confirmar tudo"}
        </Button>
      </div>

      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Erros</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 text-sm">
              {errors.map((e, i) => (
                <li key={i}>
                  #{e.transId}: {e.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {groups.map((g) => (
        <Card key={g.account.account_id}>
          <CardHeader>
            <CardTitle>{g.account.account_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassificationTable<ProvisionalRow>
              rows={g.rows}
              categories={categories}
              onChange={(updated) => {
                const updatedById = new Map(updated.map((u) => [u.transId, u]));
                setRows((prev) =>
                  prev.map((r) =>
                    r.accountId === g.account.account_id && updatedById.has(r.transId)
                      ? updatedById.get(r.transId)!
                      : r,
                  ),
                );
              }}
              onCreateRule={async (pattern, categoryId) => {
                const res = await createRuleAction(pattern, categoryId);
                if (res.error) throw new Error(res.error);
              }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
