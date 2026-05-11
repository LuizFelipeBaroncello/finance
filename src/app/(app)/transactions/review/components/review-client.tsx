"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ClassificationTable } from "@/components/transactions/classification-table";
import { RulesTable } from "@/app/(app)/classification-rules/components/rules-table";
import { RuleForm } from "@/app/(app)/classification-rules/components/rule-form";
import type { ProvisionalRow } from "@/lib/transactions/types";
import { confirmProvisionalReview, createRuleAction, type ConfirmRow } from "../actions";

type Category = { category_id: number; category_name: string; type: string };
type Account = { account_id: number; account_name: string };
type Rule = { rule_id: number; pattern: string; category_id: number; priority: number };

export function ReviewClient({
  initialRows,
  categories,
  accounts,
  rules,
}: {
  initialRows: ProvisionalRow[];
  categories: Category[];
  accounts: Account[];
  rules: Rule[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ProvisionalRow[]>(initialRows);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<{ transId: number; message: string }[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);

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

  function handleRulesDialogChange(open: boolean) {
    setRulesOpen(open);
    if (!open) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Revisar transações provisórias</h1>
        <div className="flex items-center gap-2">
          <Dialog open={rulesOpen} onOpenChange={handleRulesDialogChange}>
            <DialogTrigger render={<Button variant="outline" />}>
              Gerenciar regras
            </DialogTrigger>
            <DialogContent className="!max-w-4xl">
              <DialogHeader>
                <DialogTitle>Regras de classificação</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                Ao fechar, as transações provisórias serão re-classificadas com as regras
                atuais. Edições manuais nas linhas serão sobrescritas.
              </p>
              <div className="flex justify-end">
                <RuleForm categories={categories} />
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <RulesTable rules={rules} categories={categories} />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" type="button" />}>
                  Fechar e re-classificar
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={onSubmit} disabled={pending || rows.length === 0}>
            {pending ? "Confirmando..." : "Confirmar tudo"}
          </Button>
        </div>
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
