"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRule, updateRule, deleteRule } from "../actions";

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

interface RuleFormProps {
  rule?: Rule;
  categories: Category[];
  triggerLabel?: string;
}

const TYPE_LABELS: Record<string, string> = {
  debit: "Despesa",
  credit: "Receita",
  transfer: "Transferência",
};

export function RuleForm({ rule, categories, triggerLabel }: RuleFormProps) {
  const isEditing = !!rule;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>(
    rule?.category_id != null ? String(rule.category_id) : "",
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    if (!categoryId) {
      setError("Selecione uma categoria.");
      return;
    }
    startTransition(async () => {
      const result = isEditing
        ? await updateRule(rule!.rule_id, formData)
        : await createRule(formData);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  function handleDelete() {
    if (!isEditing) return;
    startTransition(async () => {
      const result = await deleteRule(rule!.rule_id);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={<Button variant={isEditing ? "outline" : "default"} size="sm" />}
        >
          {triggerLabel ?? (isEditing ? "Editar" : "Nova regra")}
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar regra" : "Nova regra de classificação"}
            </DialogTitle>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Padrão (substring)</label>
              <Input
                name="pattern"
                defaultValue={rule?.pattern ?? ""}
                placeholder='Ex: "IFOOD", "UBER", "CONDOMINIO"'
                required
              />
              <p className="text-xs text-muted-foreground">
                Match case-insensitive em qualquer parte da descrição da transação.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Categoria</label>
              <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.category_id} value={String(c.category_id)}>
                      {c.category_name} ({TYPE_LABELS[c.type] ?? c.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="category_id" value={categoryId} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prioridade</label>
              <Input
                name="priority"
                type="number"
                defaultValue={rule?.priority ?? 0}
                required
              />
              <p className="text-xs text-muted-foreground">
                Maior prioridade é avaliada antes (útil para resolver ambiguidades).
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              {isEditing && (
                <Button
                  variant="destructive"
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  Excluir
                </Button>
              )}
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
