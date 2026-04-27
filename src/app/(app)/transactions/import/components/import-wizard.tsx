"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import type {
  BankSource,
  ClassifiedRow,
  TransactionKind,
} from "@/lib/transactions/types";
import {
  classifyCsvAction,
  createRuleFromRow,
  insertTransactionsBatch,
  reclassifyAction,
} from "../actions";
import { RulesTable } from "@/app/(app)/classification-rules/components/rules-table";
import { RuleForm } from "@/app/(app)/classification-rules/components/rule-form";

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

const TYPE_LABELS: Record<TransactionKind, string> = {
  debit: "Despesa",
  credit: "Receita",
  transfer: "Transferência",
};

const BANK_OPTIONS: BankSource[] = [
  "nubank_debit",
  "nubank_credit",
  "bradesco_credit",
];

function formatIsoDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

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

  async function handleUpload() {
    setError(null);
    if (!file || !accountId) {
      setError("Selecione conta, tipo de arquivo e um CSV.");
      return;
    }
    const content = await file.text();
    setCsvContent(content);
    startTransition(async () => {
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

  function updateRow(id: number, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
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
              <label className="text-sm font-medium">Arquivo CSV</label>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button onClick={handleUpload} disabled={isPending || !file || !accountId}>
              {isPending ? "Processando..." : "Classificar"}
            </Button>
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
                  {summary.active}/{summary.total} selecionadas · {summary.unclassified} sem categoria
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
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Incl.</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <ReviewRow
                      key={row.id}
                      row={row}
                      categories={categories}
                      onChange={(patch) => updateRow(row.id, patch)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
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

function ReviewRow({
  row,
  categories,
  onChange,
}: {
  row: EditableRow;
  categories: Category[];
  onChange: (patch: Partial<EditableRow>) => void;
}) {
  const filtered = categories.filter((c) => c.type === row.suggestedType);
  const rowClass = row.ignored
    ? "opacity-40"
    : row.reason === "unclassified"
      ? "bg-yellow-500/5"
      : row.reason === "transfer-self"
        ? "bg-blue-500/5"
        : "";

  return (
    <TableRow className={rowClass}>
      <TableCell>
        <input
          type="checkbox"
          checked={!row.ignored}
          onChange={(e) => onChange({ ignored: !e.target.checked })}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {formatIsoDateBR(row.date)}
      </TableCell>
      <TableCell className="max-w-[300px] truncate" title={row.description}>
        {row.description}
      </TableCell>
      <TableCell className="whitespace-nowrap">{formatCurrency(row.amount)}</TableCell>
      <TableCell>
        <Select
          value={row.suggestedType}
          onValueChange={(v) =>
            onChange({
              suggestedType: v as TransactionKind,
              suggestedCategoryId: null,
            })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="debit">Despesa</SelectItem>
            <SelectItem value="credit">Receita</SelectItem>
            <SelectItem value="transfer">Transferência</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {row.suggestedType === "transfer" ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <Select
            value={row.suggestedCategoryId != null ? String(row.suggestedCategoryId) : ""}
            onValueChange={(v) => onChange({ suggestedCategoryId: Number(v) })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Classificar...">
                {(value) => {
                  if (!value) return "Classificar...";
                  const cat = categories.find(
                    (c) => String(c.category_id) === String(value),
                  );
                  return cat
                    ? `${cat.category_id} - ${cat.category_name}`
                    : String(value);
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filtered.map((c) => (
                <SelectItem key={c.category_id} value={String(c.category_id)}>
                  {c.category_id} - {c.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell>
        {row.reason === "rule" && <Badge variant="secondary">Regra</Badge>}
        {row.reason === "transfer-self" && <Badge variant="secondary">Transf.</Badge>}
        {row.reason === "unclassified" && (
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">
            Sem regra
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {row.suggestedCategoryId != null && row.reason === "unclassified" && (
          <CreateRuleButton description={row.description} categoryId={row.suggestedCategoryId} />
        )}
      </TableCell>
    </TableRow>
  );
}

function CreateRuleButton({
  description,
  categoryId,
}: {
  description: string;
  categoryId: number;
}) {
  const [open, setOpen] = useState(false);
  const [pattern, setPattern] = useState(description);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setErr(null);
    startTransition(async () => {
      const res = await createRuleFromRow(pattern.trim(), categoryId);
      if (res.error) setErr(res.error);
      else setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        + regra
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar regra de classificação</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm">
            Padrão (substring em descrições futuras que deve cair nesta categoria):
          </label>
          <Input value={pattern} onChange={(e) => setPattern(e.target.value)} />
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancelar
          </DialogClose>
          <Button onClick={save} disabled={isPending || !pattern.trim()}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
