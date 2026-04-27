"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { RuleForm } from "./rule-form";
import { deleteRulesBulk } from "../actions";

type Rule = {
  rule_id: number;
  pattern: string;
  category_id: number;
  priority: number;
};

type Category = {
  category_id: number;
  category_name: string;
  type: string;
};

const TYPE_LABELS: Record<string, string> = {
  debit: "Despesa",
  credit: "Receita",
  transfer: "Transferência",
};

const TYPE_VARIANTS: Record<string, "destructive" | "default" | "secondary"> = {
  debit: "destructive",
  credit: "default",
  transfer: "secondary",
};

export function RulesTable({
  rules,
  categories,
}: {
  rules: Rule[];
  categories: Category[];
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.category_id, c])),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (categoryFilter !== "all" && String(r.category_id) !== categoryFilter) {
        return false;
      }
      if (q && !r.pattern.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rules, search, categoryFilter]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every((r) => selected.has(r.rule_id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of filtered) next.delete(r.rule_id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of filtered) next.add(r.rule_id);
        return next;
      });
    }
  }

  function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} regra(s)?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteRulesBulk(ids);
      if (res?.error) setError(res.error);
      else setSelected(new Set());
    });
  }

  const allChecked =
    filtered.length > 0 && filtered.every((r) => selected.has(r.rule_id));

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          placeholder="Buscar por padrão..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v ?? "all")}
        >
          <SelectTrigger className="sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.category_id} value={String(c.category_id)}>
                {c.category_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground sm:ml-auto">
          {filtered.length} de {rules.length} regra(s)
        </div>
        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={handleBulkDelete}
          >
            Excluir {selected.size} selecionada(s)
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-[90px]">Prioridade</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma regra encontrada
                </TableCell>
              </TableRow>
            )}
            {filtered.map((rule) => {
              const cat = categoryById.get(rule.category_id);
              return (
                <TableRow key={rule.rule_id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(rule.rule_id)}
                      onChange={() => toggle(rule.rule_id)}
                      aria-label={`Selecionar ${rule.pattern}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{rule.pattern}</TableCell>
                  <TableCell>{cat?.category_name ?? "—"}</TableCell>
                  <TableCell>
                    {cat && (
                      <Badge variant={TYPE_VARIANTS[cat.type] ?? "secondary"}>
                        {TYPE_LABELS[cat.type] ?? cat.type}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{rule.priority}</TableCell>
                  <TableCell>
                    <RuleForm rule={rule} categories={categories} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
