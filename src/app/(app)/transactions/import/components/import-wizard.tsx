"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { BANK_SOURCE_LABELS } from "@/lib/transactions/parsers";
import type { BankSource, ClassifiedRow } from "@/lib/transactions/types";
import {
  classifyCsvAction,
  classifyPdfAction,
  createRuleFromRow,
  insertTransactionsBatch,
  reclassifyAction,
} from "../actions";
import { RulesTable } from "@/app/(app)/classification-rules/components/rules-table";
import { RuleForm } from "@/app/(app)/classification-rules/components/rule-form";
import { ClassificationTable } from "@/components/transactions/classification-table";
import { PluggyImportButton } from "@/components/transactions/pluggy-import-button";

type Account = { account_id: number; account_name: string };
type Category = { category_id: number; category_name: string; type: string };
type Rule = {
  rule_id: number;
  pattern: string;
  category_id: number;
  priority: number;
};

type Step = "upload" | "review" | "confirm";

type EditableRow = ClassifiedRow & { id: number };

const BANK_OPTIONS: BankSource[] = [
  "nubank_debit",
  "nubank_credit",
  "bradesco_credit",
];

export function ImportWizard({
  accounts,
  categories,
  initialRules,
}: {
  accounts: Account[];
  categories: Category[];
  initialRules: Rule[];
}) {
  const [step, setStep] = useState<Step>("upload");

  const [source, setSource] = useState<BankSource>("nubank_debit");
  const [accountId, setAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [pdfYear, setPdfYear] = useState<number>(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [csvContent, setCsvContent] = useState<string>("");
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [result, setResult] = useState<
    { inserted: number; skipped: number; errors: string[] } | null
  >(null);

  const [isPending, startTransition] = useTransition();

  const summary = useMemo(() => {
    const active = rows.filter((r) => !r.ignored);
    return {
      total: rows.length,
      active: active.length,
      ignored: rows.length - active.length,
      duplicates: rows.filter((r) => r.duplicate).length,
      byType: {
        debit: active.filter((r) => r.suggestedType === "debit").length,
        credit: active.filter((r) => r.suggestedType === "credit").length,
        transfer: active.filter((r) => r.suggestedType === "transfer").length,
      },
      unclassified: active.filter(
        (r) => r.reason === "unclassified" && r.suggestedCategoryId == null,
      ).length,
    };
  }, [rows]);

  const isPdf =
    !!file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name));

  async function handleUpload() {
    setError(null);
    if (!file || !accountId) {
      setError("Selecione conta, tipo de arquivo e um arquivo.");
      return;
    }
    if (isPdf && source !== "bradesco_credit") {
      setError("Importação de PDF disponível apenas para Bradesco — cartão de crédito.");
      return;
    }
    startTransition(async () => {
      if (isPdf) {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const base64 = btoa(binary);
        const res = await classifyPdfAction(Number(accountId), base64, pdfYear);
        if (res.error || !res.rows) {
          setError(res.error ?? "Falha ao classificar.");
          return;
        }
        if (res.csvContent) setCsvContent(res.csvContent);
        setRows(res.rows.map((r, i) => ({ ...r, id: i })));
        setStep("review");
        return;
      }
      const content = await file.text();
      setCsvContent(content);
      const res = await classifyCsvAction(source, Number(accountId), content);
      if (res.error || !res.rows) {
        setError(res.error ?? "Falha ao classificar.");
        return;
      }
      setRows(res.rows.map((r, i) => ({ ...r, id: i })));
      setStep("review");
    });
  }

  function handleRulesDialogChange(open: boolean) {
    setRulesOpen(open);
    if (!open && csvContent && accountId) {
      startTransition(async () => {
        const res = await reclassifyAction(source, Number(accountId), csvContent);
        if (res.error) {
          setError(res.error);
          return;
        }
        if (res.rows) setRows(res.rows.map((r, i) => ({ ...r, id: i })));
        if (res.rules) setRules(res.rules);
      });
    }
  }

  function handleConfirm() {
    setError(null);
    const payload = rows
      .filter((r) => !r.ignored)
      .map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        type: r.suggestedType,
        categoryId: r.suggestedCategoryId,
      }));
    startTransition(async () => {
      const res = await insertTransactionsBatch(Number(accountId), payload);
      setResult(res);
      setStep("confirm");
    });
  }

  return (
    <div className="space-y-4">
      <Steps current={step} />

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>1. Upload do extrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Conta de destino</label>
                <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.account_id} value={String(a.account_id)}>
                        {a.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo do arquivo</label>
                <Select value={source} onValueChange={(v) => v && setSource(v as BankSource)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {BANK_SOURCE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Arquivo (CSV ou PDF)</label>
              <Input
                type="file"
                accept=".csv,text/csv,.pdf,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                PDF suportado apenas para Bradesco — cartão de crédito.
              </p>
            </div>
            {isPdf && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Ano de referência</label>
                <Input
                  type="number"
                  value={pdfYear}
                  onChange={(e) => setPdfYear(Number(e.target.value) || pdfYear)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Ano aplicado às datas DD/MM extraídas do PDF.
                </p>
              </div>
            )}
            <Button onClick={handleUpload} disabled={isPending || !file || !accountId}>
              {isPending ? "Processando..." : "Classificar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Pluggy (Open Finance)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Conecte sua instituição e importe as transações dos últimos 20 ou 30 dias
              (contas e cartões). Elas aparecerão na tela de consolidação para revisão.
            </p>
            <PluggyImportButton accounts={accounts} />
          </CardContent>
        </Card>
      )}

      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>2. Revisar classificações</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-normal text-muted-foreground">
                  {summary.active}/{summary.total} selecionadas · {summary.unclassified} sem categoria · {summary.duplicates} duplicadas
                </span>
                <Dialog open={rulesOpen} onOpenChange={handleRulesDialogChange}>
                  <DialogTrigger render={<Button variant="outline" size="sm" />}>
                    Gerenciar regras
                  </DialogTrigger>
                  <DialogContent className="!max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Regras de classificação</DialogTitle>
                    </DialogHeader>
                    <p className="text-xs text-muted-foreground">
                      Ao fechar, a importação atual será re-classificada com as regras
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
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ClassificationTable
              rows={rows}
              categories={categories}
              onChange={setRows}
              onCreateRule={async (pattern, categoryId) => {
                const res = await createRuleFromRow(pattern, categoryId);
                if (res.error) throw new Error(res.error);
              }}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={isPending || summary.active === 0}>
                {isPending ? "Enviando..." : `Enviar ${summary.active} transações`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && result && (
        <Card>
          <CardHeader>
            <CardTitle>3. Resultado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              <strong>{result.inserted}</strong> transações inseridas ·{" "}
              <strong>{result.skipped}</strong> puladas (duplicatas).
            </p>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {result.errors.length} erros:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 max-h-60 overflow-auto">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRows([]);
                  setFile(null);
                  setResult(null);
                  setStep("upload");
                }}
              >
                Nova importação
              </Button>
              <a href="/transactions">
                <Button>Ver transações</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const items: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "review", label: "Revisar" },
    { key: "confirm", label: "Confirmar" },
  ];
  return (
    <div className="flex gap-2 text-sm">
      {items.map((item, i) => {
        const isActive = item.key === current;
        const isPast = items.findIndex((x) => x.key === current) > i;
        return (
          <div
            key={item.key}
            className={`px-3 py-1 rounded-full border ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : isPast
                  ? "border-border text-muted-foreground"
                  : "border-border text-muted-foreground/60"
            }`}
          >
            {i + 1}. {item.label}
          </div>
        );
      })}
    </div>
  );
}

