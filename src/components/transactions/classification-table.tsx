"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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
import type { ClassifiedRow, TransactionKind } from "@/lib/transactions/types";

type Category = { category_id: number; category_name: string; type: string };

export type ClassificationTableProps<T extends ClassifiedRow = ClassifiedRow> = {
  rows: T[];
  categories: Category[];
  onChange: (rows: T[]) => void;
  onCreateRule: (pattern: string, categoryId: number) => Promise<void>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function ClassificationTable<T extends ClassifiedRow = ClassifiedRow>({
  rows,
  categories,
  onChange,
  onCreateRule,
}: ClassificationTableProps<T>) {
  function updateRow(index: number, patch: Partial<ClassifiedRow>) {
    onChange(
      rows.map((r, i) => (i === index ? ({ ...r, ...patch } as T) : r)),
    );
  }

  return (
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
          {rows.map((row, index) => (
            <ClassificationRow
              key={index}
              row={row}
              categories={categories}
              onChange={(patch) => updateRow(index, patch)}
              onCreateRule={onCreateRule}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ClassificationRow({
  row,
  categories,
  onChange,
  onCreateRule,
}: {
  row: ClassifiedRow;
  categories: Category[];
  onChange: (patch: Partial<ClassifiedRow>) => void;
  onCreateRule: (pattern: string, categoryId: number) => Promise<void>;
}) {
  const filtered = categories.filter((c) => c.type === row.suggestedType);
  const rowClass = row.duplicate
    ? "opacity-40 bg-muted/40 line-through"
    : row.ignored
      ? "opacity-40"
      : row.reason === "unclassified"
        ? "bg-yellow-500/5"
        : row.reason === "transfer-self"
          ? "bg-blue-500/5"
          : "";

  return (
    <TableRow
      className={`${rowClass} cursor-pointer`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!e.currentTarget.contains(target)) return;
        if (
          target.closest(
            'input, select, button, a, label, [role="combobox"], [role="dialog"], [data-slot="select-trigger"]',
          )
        ) {
          return;
        }
        onChange({ ignored: !row.ignored });
      }}
    >
      <TableCell>
        <input
          type="checkbox"
          checked={!row.ignored}
          onChange={(e) => onChange({ ignored: !e.target.checked })}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Input
          type="date"
          value={row.date}
          onChange={(e) => onChange({ date: e.target.value })}
          className="w-[140px]"
        />
      </TableCell>
      <TableCell className="max-w-[300px]">
        <Input
          value={row.description}
          onChange={(e) => onChange({ description: e.target.value })}
          title={row.description}
        />
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
        {row.duplicate && (
          <Badge variant="outline" className="border-orange-500/50 text-orange-600">
            Duplicada
          </Badge>
        )}
        {!row.duplicate && row.reason === "rule" && <Badge variant="secondary">Regra</Badge>}
        {!row.duplicate && row.reason === "transfer-self" && (
          <Badge variant="secondary">Transf.</Badge>
        )}
        {!row.duplicate && row.reason === "unclassified" && (
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">
            Sem regra
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {row.suggestedCategoryId != null && row.reason === "unclassified" && (
          <CreateRuleButton
            description={row.description}
            categoryId={row.suggestedCategoryId}
            onCreateRule={onCreateRule}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

function CreateRuleButton({
  description,
  categoryId,
  onCreateRule,
}: {
  description: string;
  categoryId: number;
  onCreateRule: (pattern: string, categoryId: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pattern, setPattern] = useState(description);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setErr(null);
    startTransition(async () => {
      try {
        await onCreateRule(pattern.trim(), categoryId);
        setOpen(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro ao salvar regra.");
      }
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
