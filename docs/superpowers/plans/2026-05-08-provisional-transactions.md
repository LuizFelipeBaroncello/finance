# Provisional Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an external integration to insert provisional transactions directly into the database; force the user to classify them via a review screen that reuses the import wizard's classification UX.

**Architecture:** Add `is_provisional` boolean to `transaction`. New `/transactions/review` route loads provisionals, runs the rule classifier, and reuses an extracted `<ClassificationTable />` component. Layout-level gate redirects once per session via cookie; banner persists until count is zero. All confirmed-transaction reads filter `is_provisional=false`.

**Tech Stack:** Next.js 15 (App Router, Server Components, Server Actions), Supabase (Postgres + RLS + auth), TypeScript, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-05-08-provisional-transactions-design.md`

**Verification approach:** No test framework is configured in this project. Each task verifies via `pnpm lint`, `pnpm build`, and manual dev-server checks. When checks succeed, commit.

---

## Task 1: Migration — add `is_provisional` column and partial index

**Files:**
- Create: `docs/migrations/2026-05-08-add-is-provisional.sql`

- [ ] **Step 1: Write the migration SQL**

Create `docs/migrations/2026-05-08-add-is-provisional.sql`:

```sql
-- Add is_provisional flag to transaction table
ALTER TABLE transaction
  ADD COLUMN is_provisional boolean NOT NULL DEFAULT false;

-- Partial index: only provisional rows are indexed.
-- Used by gate count (per-pageview) and review-page fetch.
CREATE INDEX transaction_provisional_idx
  ON transaction (account_id)
  WHERE is_provisional = true;
```

- [ ] **Step 2: Run the migration in Supabase**

Apply via Supabase SQL editor (or `supabase db push` if CLI is configured). Verify:

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'transaction' AND column_name = 'is_provisional';
```

Expected: one row with `boolean`, default `false`, `NOT NULL`.

```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'transaction' AND indexname = 'transaction_provisional_idx';
```

Expected: one row.

- [ ] **Step 3: Commit**

```bash
git add docs/migrations/2026-05-08-add-is-provisional.sql
git commit -m "feat(db): add is_provisional flag to transaction"
```

---

## Task 2: Type additions in `src/lib/transactions/types.ts`

**Files:**
- Modify: `src/lib/transactions/types.ts`

- [ ] **Step 1: Add `ProvisionalRow` type**

Append to `src/lib/transactions/types.ts`:

```ts
export type ProvisionalRow = ClassifiedRow & {
  transId: number;
  accountId: number;
};
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors related to types.ts.

- [ ] **Step 3: Commit**

```bash
git add src/lib/transactions/types.ts
git commit -m "feat(transactions): add ProvisionalRow type"
```

---

## Task 3: Generalize `classifyRows` to skip source-based heuristic when needed

The current `classifyRows` (in `src/lib/transactions/classifier.ts`) hard-codes `BankSource` to decide `suggestedType`. For review, the integration already inserted a `type` guess; we want to respect it. Add a thin wrapper that accepts a pre-existing `type` per row and skips the source-based decision.

**Files:**
- Modify: `src/lib/transactions/classifier.ts`

- [ ] **Step 1: Add `classifyExistingRows` function**

Append to `src/lib/transactions/classifier.ts`:

```ts
export type ExistingRow = ParsedRow & {
  transId: number;
  accountId: number;
  existingType: TransactionKind;
};

export async function classifyExistingRows(
  rows: ExistingRow[],
): Promise<(ClassifiedRow & { transId: number; accountId: number })[]> {
  const supabase = await createClient();

  const accountIds = Array.from(new Set(rows.map((r) => r.accountId)));

  const [{ data: rulesData }, { data: accountsData }] = await Promise.all([
    supabase
      .from("classification_rule")
      .select("rule_id, pattern, category_id, priority")
      .order("priority", { ascending: false }),
    supabase.from("account").select("account_id, transfer_keywords"),
  ]);

  const rules: Rule[] = rulesData ?? [];
  const allAccounts: AccountKeywords[] = (accountsData ?? []).map((a) => ({
    account_id: a.account_id,
    transfer_keywords: a.transfer_keywords ?? [],
  }));

  return rows.map((row) => {
    const otherAccounts = allAccounts.filter((a) => a.account_id !== row.accountId);
    const isTransferToOwn = otherAccounts.some((a) =>
      matchesAnyKeyword(row.description, a.transfer_keywords),
    );

    if (isTransferToOwn) {
      return {
        ...row,
        suggestedType: "transfer" as TransactionKind,
        suggestedCategoryId: null,
        matchedRuleId: null,
        reason: "transfer-self" as const,
      };
    }

    const rule = findRule(row.description, rules);
    if (rule) {
      return {
        ...row,
        suggestedType: row.existingType,
        suggestedCategoryId: rule.category_id,
        matchedRuleId: rule.rule_id,
        reason: "rule" as const,
      };
    }

    return {
      ...row,
      suggestedType: row.existingType,
      suggestedCategoryId: null,
      matchedRuleId: null,
      reason: "unclassified" as const,
    };
  });
}
```

Note: `Rule`, `AccountKeywords`, `matchesAnyKeyword`, and `findRule` are already defined at the top of the file; no need to redefine. The unused `accountIds` variable is omitted — remove it if you copy-paste it. Reuse `existingType` instead of computing from sign because the integration already set it.

- [ ] **Step 2: Lint and build**

Run: `pnpm lint && pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/transactions/classifier.ts
git commit -m "feat(transactions): add classifyExistingRows for provisional review"
```

---

## Task 4: Extract shared `<ClassificationTable />` component

The classification step inside `src/app/(app)/transactions/import/components/import-wizard.tsx` is 615 lines and bundles parsing, upload, classification, and confirmation. Extract only the classification table (rendering rows, editing date/description/amount/type/category, ignore toggle, inline rule creation, duplicate badges) into a reusable component. The import wizard continues to own state and orchestration; it passes rows + handlers to the new component.

**Files:**
- Create: `src/components/transactions/classification-table.tsx`
- Modify: `src/app/(app)/transactions/import/components/import-wizard.tsx`

- [ ] **Step 1: Read the wizard to identify the classification section**

Run: `wc -l src/app/(app)/transactions/import/components/import-wizard.tsx`

Locate the JSX that renders the rows table (Table/TableHeader/TableBody with one TableRow per `ClassifiedRow`, including the `Select` for type, the category picker, the ignore button, the duplicate badge, and the inline rule-creation Dialog). This block is the extraction target.

- [ ] **Step 2: Create `<ClassificationTable />` with the extracted JSX**

Create `src/components/transactions/classification-table.tsx`:

```tsx
"use client";

import { useState } from "react";
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
  DialogClose,
} from "@/components/ui/dialog";
import type { ClassifiedRow, TransactionKind } from "@/lib/transactions/types";

type Category = { category_id: number; category_name: string; type: string };

export type ClassificationTableProps = {
  rows: ClassifiedRow[];
  categories: Category[];
  onChange: (rows: ClassifiedRow[]) => void;
  onCreateRule: (pattern: string, categoryId: number) => Promise<void>;
};

export function ClassificationTable({
  rows,
  categories,
  onChange,
  onCreateRule,
}: ClassificationTableProps) {
  const [ruleDialogIndex, setRuleDialogIndex] = useState<number | null>(null);
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategoryId, setRuleCategoryId] = useState<number | null>(null);

  const updateRow = (index: number, patch: Partial<ClassifiedRow>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i} className={row.ignored ? "opacity-50" : ""}>
            <TableCell>
              <Input
                type="date"
                value={row.date}
                onChange={(e) => updateRow(i, { date: e.target.value })}
              />
            </TableCell>
            <TableCell>
              <Input
                value={row.description}
                onChange={(e) => updateRow(i, { description: e.target.value })}
              />
              {row.duplicate && <Badge variant="secondary">duplicada</Badge>}
              {row.reason === "rule" && <Badge variant="outline">regra</Badge>}
              {row.reason === "transfer-self" && <Badge variant="outline">transferência</Badge>}
            </TableCell>
            <TableCell>
              <Input
                type="number"
                step="0.01"
                value={row.amount}
                onChange={(e) =>
                  updateRow(i, { amount: parseFloat(e.target.value) || 0 })
                }
              />
            </TableCell>
            <TableCell>
              <Select
                value={row.suggestedType}
                onValueChange={(v) =>
                  updateRow(i, { suggestedType: v as TransactionKind })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Select
                value={row.suggestedCategoryId?.toString() ?? ""}
                onValueChange={(v) =>
                  updateRow(i, { suggestedCategoryId: v ? Number(v) : null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.category_id} value={c.category_id.toString()}>
                      {c.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell className="flex gap-2">
              <Button
                size="sm"
                variant={row.ignored ? "default" : "outline"}
                onClick={() => updateRow(i, { ignored: !row.ignored })}
              >
                {row.ignored ? "Restaurar" : "Ignorar"}
              </Button>
              <Dialog
                open={ruleDialogIndex === i}
                onOpenChange={(open) => {
                  if (open) {
                    setRuleDialogIndex(i);
                    setRulePattern(row.description);
                    setRuleCategoryId(row.suggestedCategoryId);
                  } else {
                    setRuleDialogIndex(null);
                  }
                }}
              >
                <Button size="sm" variant="ghost" onClick={() => setRuleDialogIndex(i)}>
                  + regra
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar regra</DialogTitle>
                  </DialogHeader>
                  <Input
                    value={rulePattern}
                    onChange={(e) => setRulePattern(e.target.value)}
                    placeholder="padrão"
                  />
                  <Select
                    value={ruleCategoryId?.toString() ?? ""}
                    onValueChange={(v) => setRuleCategoryId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.category_id} value={c.category_id.toString()}>
                          {c.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button
                      onClick={async () => {
                        if (!ruleCategoryId || !rulePattern) return;
                        await onCreateRule(rulePattern, ruleCategoryId);
                        setRuleDialogIndex(null);
                      }}
                    >
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

Note: this intentionally mirrors the existing wizard's table behavior. If the wizard has additional row-level features (e.g., pre-existing rule preview, custom badges) that must survive the refactor, adapt the component to match before committing — but keep the prop shape `(rows, categories, onChange, onCreateRule)`.

- [ ] **Step 3: Replace the wizard's inline classification block with the component**

In `src/app/(app)/transactions/import/components/import-wizard.tsx`, replace the JSX block identified in Step 1 with:

```tsx
<ClassificationTable
  rows={rows}
  categories={categories}
  onChange={setRows}
  onCreateRule={async (pattern, categoryId) => {
    await createRuleFromRow(pattern, categoryId);
  }}
/>
```

Add the import at the top:

```ts
import { ClassificationTable } from "@/components/transactions/classification-table";
```

Remove now-unused imports from the wizard (Table*, Dialog*, Select*, Badge, Input — check carefully; the wizard may still need some of these for its other steps).

- [ ] **Step 4: Lint, build, and dev-test the import flow**

Run: `pnpm lint && pnpm build`
Expected: clean build.

Run: `pnpm dev` and walk through `/transactions/import`: upload a sample CSV, classify rows, edit a row, create a rule, ignore a row, confirm. Behavior must match the pre-refactor wizard.

- [ ] **Step 5: Commit**

```bash
git add src/components/transactions/classification-table.tsx src/app/\(app\)/transactions/import/components/import-wizard.tsx
git commit -m "refactor(transactions): extract ClassificationTable for reuse"
```

---

## Task 5: Pathname header in middleware

**Files:**
- Create: `src/middleware.ts` (if not present at repo root) — actual location follows Next.js convention. Check `find . -name 'middleware.ts' -not -path '*/node_modules/*'` first; if a root middleware exists, modify it. The repo currently only has `src/lib/supabase/middleware.ts` which is a helper, not the Next.js middleware.

- [ ] **Step 1: Locate or create the Next.js middleware**

Run: `find . -name "middleware.ts" -not -path "*/node_modules/*"`

If only `src/lib/supabase/middleware.ts` exists, you need to create `src/middleware.ts` (Next.js looks here when `src/` directory is used).

Create `src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

If an existing root `middleware.ts` is found, only add the `response.headers.set("x-pathname", ...)` line before the return.

- [ ] **Step 2: Verify pathname header is set**

Run: `pnpm dev`. Open DevTools Network tab, navigate to `/dashboard`. The document response should have an `x-pathname: /dashboard` response header (visible in Network → Headers).

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(middleware): expose x-pathname header for layout gate"
```

---

## Task 6: Layout gate — count provisionals and redirect once per session

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Add gate logic to layout**

Replace the body of `AppLayout` in `src/app/(app)/layout.tsx`. After the existing `client` upsert and before computing `userName`, insert:

```ts
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
// ... existing imports

// inside AppLayout, after client upsert:
const cookieStore = await cookies();
const headerStore = await headers();
const dismissed = cookieStore.has("provisional_review_seen");
const pathname = headerStore.get("x-pathname") ?? "";
const onReviewPage = pathname.startsWith("/transactions/review");

const { count: provisionalCount } = await supabase
  .from("transaction")
  .select("trans_id", { count: "exact", head: true })
  .eq("is_provisional", true);

if ((provisionalCount ?? 0) > 0 && !dismissed && !onReviewPage) {
  redirect("/transactions/review");
}
```

- [ ] **Step 2: Lint and build**

Run: `pnpm lint && pnpm build`
Expected: clean. The route `/transactions/review` does not exist yet (created in Task 8) — Next.js will not statically analyze the `redirect` target, so build should pass. If `pnpm dev` produces a runtime error, that's expected until Task 8.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/layout.tsx
git commit -m "feat(layout): gate app on provisional transactions"
```

---

## Task 7: Provisional banner component, mounted in layout

**Files:**
- Create: `src/components/provisional-banner.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create the banner**

Create `src/components/provisional-banner.tsx`:

```tsx
import Link from "next/link";

export function ProvisionalBanner({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="bg-amber-100 text-amber-900 px-4 py-2 text-sm flex items-center justify-between border-b border-amber-200">
      <span>
        Você tem {count} {count === 1 ? "transação" : "transações"} para classificar.
      </span>
      <Link href="/transactions/review" className="underline font-medium">
        Revisar agora
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Mount in layout**

In `src/app/(app)/layout.tsx`, import the banner and render above `<Header>`:

```tsx
import { ProvisionalBanner } from "@/components/provisional-banner";
// ...
<div className="flex flex-1 flex-col overflow-hidden">
  <ProvisionalBanner count={provisionalCount ?? 0} />
  <Header userName={userName} userEmail={userEmail} />
  <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
</div>
```

- [ ] **Step 3: Lint and build**

Run: `pnpm lint && pnpm build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/provisional-banner.tsx src/app/\(app\)/layout.tsx
git commit -m "feat(layout): show banner while provisionals exist"
```

---

## Task 8: Review page — server action and client wrapper

**Files:**
- Create: `src/app/(app)/transactions/review/page.tsx`
- Create: `src/app/(app)/transactions/review/actions.ts`
- Create: `src/app/(app)/transactions/review/components/review-client.tsx`

- [ ] **Step 1: Create the server action**

Create `src/app/(app)/transactions/review/actions.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TransactionKind } from "@/lib/transactions/types";

export type ConfirmRow = {
  transId: number;
  date: string;
  description: string;
  amount: number;
  type: TransactionKind;
  categoryId: number | null;
  ignored: boolean;
};

export type ConfirmResult = {
  confirmed: number;
  deleted: number;
  errors: { transId: number; message: string }[];
};

export async function confirmProvisionalReview(
  rows: ConfirmRow[],
): Promise<ConfirmResult> {
  const supabase = await createClient();
  let confirmed = 0;
  let deleted = 0;
  const errors: { transId: number; message: string }[] = [];

  for (const row of rows) {
    if (row.ignored) {
      const { error } = await supabase
        .from("transaction")
        .delete()
        .eq("trans_id", row.transId);
      if (error) {
        errors.push({ transId: row.transId, message: error.message });
      } else {
        deleted += 1;
      }
      continue;
    }

    const { error: updErr } = await supabase
      .from("transaction")
      .update({
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        is_provisional: false,
      })
      .eq("trans_id", row.transId);

    if (updErr) {
      errors.push({ transId: row.transId, message: updErr.message });
      continue;
    }

    if (row.categoryId != null) {
      const { error: linkErr } = await supabase
        .from("re_category_transaction")
        .insert({ trans_id: row.transId, category_id: row.categoryId });
      if (linkErr) {
        errors.push({ transId: row.transId, message: `categoria: ${linkErr.message}` });
        continue;
      }
    }

    confirmed += 1;
  }

  revalidatePath("/transactions");
  revalidatePath("/transactions/review");
  return { confirmed, deleted, errors };
}

export async function createRuleAction(
  pattern: string,
  categoryId: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: category, error: catErr } = await supabase
    .from("category")
    .select("client_id")
    .eq("category_id", categoryId)
    .single();
  if (catErr || !category) return { error: catErr?.message ?? "Categoria não encontrada" };

  const { error } = await supabase.from("classification_rule").insert({
    pattern,
    category_id: categoryId,
    client_id: category.client_id,
  });
  if (error) return { error: error.message };
  return {};
}
```

- [ ] **Step 2: Create the page (Server Component)**

Create `src/app/(app)/transactions/review/page.tsx`:

```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classifyExistingRows, type ExistingRow } from "@/lib/transactions/classifier";
import { ReviewClient } from "./components/review-client";
import type { TransactionKind } from "@/lib/transactions/types";

export default async function ReviewPage() {
  const cookieStore = await cookies();
  cookieStore.set("provisional_review_seen", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  const supabase = await createClient();

  const { data: provisional } = await supabase
    .from("transaction")
    .select("trans_id, account_id, date, description, amount, type")
    .eq("is_provisional", true)
    .order("date", { ascending: true });

  if (!provisional || provisional.length === 0) {
    redirect("/transactions");
  }

  const existing: ExistingRow[] = provisional.map((r) => ({
    transId: r.trans_id,
    accountId: r.account_id,
    date: r.date,
    description: r.description,
    amount: Math.abs(Number(r.amount)),
    rawAmount: Number(r.amount),
    existingType: r.type as TransactionKind,
  }));

  const classified = await classifyExistingRows(existing);

  // Duplicate detection vs confirmed transactions in the same account/date window
  const minDate = existing.reduce((a, b) => (a.date < b.date ? a : b)).date;
  const maxDate = existing.reduce((a, b) => (a.date > b.date ? a : b)).date;
  const accountIds = Array.from(new Set(existing.map((r) => r.accountId)));

  const { data: confirmed } = await supabase
    .from("transaction")
    .select("account_id, date, description, amount")
    .in("account_id", accountIds)
    .gte("date", minDate)
    .lte("date", maxDate)
    .eq("is_provisional", false);

  const key = (accountId: number, date: string, description: string, amount: number) =>
    `${accountId}|${date.slice(0, 10)}|${description.trim()}|${Math.abs(amount).toFixed(2)}`;

  const confirmedKeys = new Set(
    (confirmed ?? []).map((c) =>
      key(c.account_id, c.date, c.description, Number(c.amount)),
    ),
  );

  const withDuplicates = classified.map((r) => {
    const dupKey = key(r.accountId, r.date, r.description, r.amount);
    if (confirmedKeys.has(dupKey)) {
      return { ...r, duplicate: true, ignored: true };
    }
    return r;
  });

  const { data: categories } = await supabase
    .from("category")
    .select("category_id, category_name, type")
    .order("category_name");

  const { data: accounts } = await supabase
    .from("account")
    .select("account_id, account_name");

  return (
    <ReviewClient
      initialRows={withDuplicates}
      categories={categories ?? []}
      accounts={accounts ?? []}
    />
  );
}
```

- [ ] **Step 3: Create the client wrapper**

Create `src/app/(app)/transactions/review/components/review-client.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassificationTable } from "@/components/transactions/classification-table";
import type { ClassifiedRow } from "@/lib/transactions/types";
import { confirmProvisionalReview, createRuleAction, type ConfirmRow } from "../actions";

type ProvisionalRow = ClassifiedRow & { transId: number; accountId: number };
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
            <ClassificationTable
              rows={g.rows}
              categories={categories}
              onChange={(updated) => {
                setRows((prev) => {
                  const updatedById = new Map(
                    (updated as ProvisionalRow[]).map((u) => [u.transId, u]),
                  );
                  return prev.map((r) =>
                    r.accountId === g.account.account_id && updatedById.has(r.transId)
                      ? updatedById.get(r.transId)!
                      : r,
                  );
                });
              }}
              onCreateRule={async (pattern, categoryId) => {
                await createRuleAction(pattern, categoryId);
              }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

Note: `ClassificationTable` must preserve unknown extra fields on each row (`transId`, `accountId`) when emitting `onChange`. The component above uses spread (`{ ...r, ...patch }`), so extras pass through automatically.

- [ ] **Step 4: Lint and build**

Run: `pnpm lint && pnpm build`
Expected: clean build.

- [ ] **Step 5: Manual test**

Insert a test provisional row directly via Supabase SQL editor:

```sql
INSERT INTO transaction (account_id, date, description, amount, type, is_provisional)
VALUES (<your_account_id>, current_date, 'TESTE PROVISORIA', -42.50, 'debit', true);
```

Run `pnpm dev`, log in, navigate to any `/dashboard`-style page. Expect redirect to `/transactions/review`. Verify:
- The test row appears under the correct account.
- Editing date/description/amount/type/category works.
- Ignoring marks the row visually muted.
- Clicking "Confirmar tudo" returns to `/transactions` and the row appears with `is_provisional=false`.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/transactions/review/
git commit -m "feat(transactions): provisional review page and confirm action"
```

---

## Task 9: Filter `is_provisional=false` in all read sites

The spec mandates that confirmed-transaction reads exclude provisionals. Audit and patch every query against the `transaction` table outside the review and import flows.

**Files (preliminary — verify with grep):**
- Modify: any file matching `from\("transaction"\)` outside `transactions/import` and `transactions/review`.

- [ ] **Step 1: Find every read of `transaction`**

Run: `grep -rn 'from("transaction")' src/ --include="*.ts" --include="*.tsx"`

List every match. Categorize each as:
- **Skip** — already in `transactions/import` or `transactions/review` flow (these intentionally interact with provisionals).
- **Patch** — a read used for display, aggregation, listing, or analytics. Must add `.eq("is_provisional", false)`.
- **Patch (write)** — `UPDATE`/`DELETE`/`INSERT` calls don't need the filter, but their preceding selects often do.

- [ ] **Step 2: Patch each read site**

For each file in the "Patch" list, add `.eq("is_provisional", false)` to the `.from("transaction")` query chain. Examples to look for (verify by grep):

- `src/app/(app)/transactions/page.tsx` (or wherever the list is rendered)
- `src/app/(app)/dashboard/...` widgets
- `src/app/(app)/analytics/...` queries
- `src/app/(app)/transactions/import/actions.ts` `flagDuplicates` — must filter `is_provisional=false` so a provisional row is not used as a duplicate target. Add `.eq("is_provisional", false)` to the existing query at lines 23-27.
- Any report view queries

- [ ] **Step 3: Lint, build, dev-verify**

Run: `pnpm lint && pnpm build`
Expected: clean.

Run `pnpm dev`. With the test provisional still inserted (or re-insert via Step 5 of Task 8):
- `/transactions` list does NOT show the provisional row.
- Dashboard totals do NOT include the provisional amount.
- `/transactions/review` DOES show it.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(transactions): exclude provisional rows from confirmed reads"
```

---

## Task 10: End-to-end verification

- [ ] **Step 1: Reset cookie and provisional state**

In DevTools → Application → Cookies, delete `provisional_review_seen`. Ensure at least one provisional row exists.

- [ ] **Step 2: Verify gate on cold session**

Log out, log in. Land on `/dashboard` → expect immediate redirect to `/transactions/review`. Browser URL ends at `/transactions/review`.

- [ ] **Step 3: Verify cookie set after visiting review**

In DevTools, confirm `provisional_review_seen=1` cookie exists, httpOnly. Navigate manually to `/dashboard` — no redirect this session.

- [ ] **Step 4: Verify banner persists with count > 0**

Banner should show "Você tem N transações para classificar" on every `(app)` page until count reaches zero.

- [ ] **Step 5: Verify confirm + delete paths**

In review screen:
- Mark one row as ignored. Confirm.
- Verify ignored row is DELETEd from `transaction` (check via SQL).
- Verify non-ignored row has `is_provisional=false` and a row exists in `re_category_transaction` if a category was set.

- [ ] **Step 6: Verify duplicate detection**

Insert a confirmed row, then insert a provisional row with the same `account_id`/`date`/`description`/`amount`. Open review. Provisional row should appear with the "duplicada" badge and be auto-marked ignored.

- [ ] **Step 7: Verify count-to-zero hides banner and skips redirect**

After confirming the last provisional, banner disappears. Navigate around — no redirect, no banner.

- [ ] **Step 8: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(transactions): adjustments from e2e verification"
```

(Skip if nothing changed.)

---

## Spec coverage check

| Spec section | Tasks |
|---|---|
| Schema (`is_provisional` + index) | Task 1 |
| Integration contract (documented) | Task 1 (SQL comment) — no code |
| Read-side audit | Task 9 |
| Classifier refactor (`classifyExistingRows`) | Task 3 |
| `ProvisionalRow` type | Task 2 |
| Shared `<ClassificationTable />` | Task 4 |
| Review page (load + classify + duplicate detection) | Task 8 |
| Cookie set on review page | Task 8, Step 2 |
| `confirmProvisionalReview` action | Task 8, Step 1 |
| Layout gate | Task 6 |
| `x-pathname` middleware header | Task 5 |
| Persistent banner | Task 7 |
| End-to-end edge cases | Task 10 |
