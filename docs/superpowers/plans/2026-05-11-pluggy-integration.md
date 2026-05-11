# Integração Pluggy (Open Finance) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar uma instituição via Pluggy Connect e importar transações de contas e cartões dos últimos 20/30 dias como transações provisórias, visíveis na tela de consolidação (`/transactions/review`).

**Architecture:** Dois Route Handlers (`/api/pluggy/connect-token` cria o Connect Token; `/api/pluggy/sync` busca via `pluggy-sdk` e insere linhas com `is_provisional = true` na conta escolhida pelo usuário). Um client component (`PluggyImportButton`) abre o widget `react-pluggy-connect` e dispara o sync. Botão exibido em `/transactions` e no wizard `/transactions/import`. Sem migração de schema.

**Tech Stack:** Next.js 16 (App Router, Route Handlers), TypeScript, Supabase JS, `pluggy-sdk`, `react-pluggy-connect`, Node 22 `node --test` para testes de unidade de funções puras.

**Spec:** `docs/superpowers/specs/2026-05-11-pluggy-integration-design.md`

---

## File Structure

- Create `src/lib/pluggy/client.ts` — factory `getPluggyClient()` que lê `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET` e instancia `PluggyClient`; lança erro claro se ausentes.
- Create `src/lib/pluggy/map.ts` — funções puras: `dateWindow(days)` e `mapPluggyTransaction(tx)` → `ParsedRow & { type: TransactionKind }`.
- Create `src/lib/pluggy/map.test.ts` — testes com `node --test`.
- Create `src/app/api/pluggy/connect-token/route.ts` — `POST` cria Connect Token.
- Create `src/app/api/pluggy/sync/route.ts` — `POST` busca e insere transações provisórias.
- Create `src/components/transactions/pluggy-import-button.tsx` — client component (dialog + widget).
- Modify `src/app/(app)/transactions/page.tsx` — renderizar `<PluggyImportButton>` ao lado de "Importar CSV".
- Modify `src/app/(app)/transactions/import/components/import-wizard.tsx` — seção "Pluggy (Open Finance)" com `<PluggyImportButton>`.

---

## Task 1: Instalar dependências e documentar env vars

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env.example` (criar se não existir)

- [ ] **Step 1: Instalar pacotes**

Run:
```bash
npm install pluggy-sdk react-pluggy-connect
```
Expected: ambos adicionados em `dependencies` sem erros de peer.

- [ ] **Step 2: Documentar env vars**

Criar/editar `.env.example` adicionando ao final:
```
# Pluggy (Open Finance) — credenciais do dashboard https://dashboard.pluggy.ai
PLUGGY_CLIENT_ID=
PLUGGY_CLIENT_SECRET=
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add pluggy-sdk and react-pluggy-connect deps"
```

---

## Task 2: Funções puras de mapeamento (TDD)

**Files:**
- Create: `src/lib/pluggy/map.ts`
- Test: `src/lib/pluggy/map.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/lib/pluggy/map.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { dateWindow, mapPluggyTransaction } from "./map.ts";

test("dateWindow returns from = today - days and to = today, ISO date only", () => {
  const { from, to } = dateWindow(30, new Date("2026-05-11T12:00:00Z"));
  assert.equal(to, "2026-05-11");
  assert.equal(from, "2026-04-11");
});

test("dateWindow supports 20 days", () => {
  const { from, to } = dateWindow(20, new Date("2026-05-11T00:00:00Z"));
  assert.equal(from, "2026-04-21");
  assert.equal(to, "2026-05-11");
});

test("mapPluggyTransaction DEBIT -> negative rawAmount, type debit, abs amount", () => {
  const row = mapPluggyTransaction({
    description: "MERCADO X",
    amount: 50.5,
    type: "DEBIT",
    date: "2026-05-10T03:00:00.000Z",
  });
  assert.equal(row.description, "MERCADO X");
  assert.equal(row.amount, 50.5);
  assert.equal(row.rawAmount, -50.5);
  assert.equal(row.type, "debit");
  assert.equal(row.date, "2026-05-10");
});

test("mapPluggyTransaction CREDIT -> positive rawAmount, type credit", () => {
  const row = mapPluggyTransaction({
    description: "SALARIO",
    amount: 1000,
    type: "CREDIT",
    date: "2026-05-01",
  });
  assert.equal(row.rawAmount, 1000);
  assert.equal(row.type, "credit");
  assert.equal(row.date, "2026-05-01");
});

test("mapPluggyTransaction uses abs of given amount regardless of sign", () => {
  const row = mapPluggyTransaction({
    description: "X",
    amount: -42,
    type: "DEBIT",
    date: "2026-05-02",
  });
  assert.equal(row.amount, 42);
  assert.equal(row.rawAmount, -42);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-strip-types --test src/lib/pluggy/map.test.ts` (Node < 22.6: instalar `tsx` e rodar `npx tsx --test src/lib/pluggy/map.test.ts`).
Expected: FAIL — `Cannot find module './map.ts'`.

- [ ] **Step 3: Implementar**

Criar `src/lib/pluggy/map.ts`:
```ts
import type { ParsedRow, TransactionKind } from "@/lib/transactions/types";

export type PluggyTransactionLike = {
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  date: string;
};

export type MappedRow = ParsedRow & { type: TransactionKind };

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateWindow(days: number, now: Date = new Date()): { from: string; to: string } {
  const to = isoDate(now);
  const fromDate = new Date(now);
  fromDate.setUTCDate(fromDate.getUTCDate() - days);
  return { from: isoDate(fromDate), to };
}

export function mapPluggyTransaction(tx: PluggyTransactionLike): MappedRow {
  const abs = Math.abs(tx.amount);
  const isDebit = tx.type === "DEBIT";
  return {
    date: tx.date.slice(0, 10),
    description: tx.description,
    amount: abs,
    rawAmount: isDebit ? -abs : abs,
    type: isDebit ? "debit" : "credit",
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --experimental-strip-types --test src/lib/pluggy/map.test.ts` (ou `npx tsx --test ...`).
Expected: PASS — 5 testes ok.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pluggy/map.ts src/lib/pluggy/map.test.ts
git commit -m "feat(pluggy): pure helpers for date window and transaction mapping"
```

---

## Task 3: Factory do PluggyClient

**Files:**
- Create: `src/lib/pluggy/client.ts`

- [ ] **Step 1: Implementar**

Criar `src/lib/pluggy/client.ts`:
```ts
import { PluggyClient } from "pluggy-sdk";

export function getPluggyClient(): PluggyClient {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET precisam estar definidos no ambiente.",
    );
  }
  return new PluggyClient({ clientId, clientSecret });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a este arquivo. (Se `pluggy-sdk` não exporta tipos compatíveis, ajustar import conforme a doc do pacote — `import { PluggyClient } from "pluggy-sdk"` é a forma oficial.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/pluggy/client.ts
git commit -m "feat(pluggy): client factory reading env credentials"
```

---

## Task 4: Route handler `POST /api/pluggy/connect-token`

**Files:**
- Create: `src/app/api/pluggy/connect-token/route.ts`

- [ ] **Step 1: Implementar**

Criar `src/app/api/pluggy/connect-token/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPluggyClient } from "@/lib/pluggy/client";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const pluggy = getPluggyClient();
    const connectToken = await pluggy.createConnectToken({ clientUserId: user.id });
    return NextResponse.json({ accessToken: connectToken.accessToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao criar connect token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Verificação manual (após o usuário definir as env vars)**

Run: `npm run dev` e em outro terminal:
```bash
curl -i -X POST http://localhost:3000/api/pluggy/connect-token
```
Expected: `401` se não logado (sem cookies). Com sessão válida (via browser), retorna `{ "accessToken": "..." }`. Sem env vars → `500` com a mensagem do erro.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/pluggy/connect-token/route.ts
git commit -m "feat(pluggy): connect-token route handler"
```

---

## Task 5: Route handler `POST /api/pluggy/sync`

**Files:**
- Create: `src/app/api/pluggy/sync/route.ts`

- [ ] **Step 1: Implementar**

Criar `src/app/api/pluggy/sync/route.ts`:
```ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPluggyClient } from "@/lib/pluggy/client";
import { dateWindow, mapPluggyTransaction } from "@/lib/pluggy/map";
import { classifyRows } from "@/lib/transactions/classifier";
import type { BankSource, ParsedRow } from "@/lib/transactions/types";

const ALLOWED_DAYS = new Set([20, 30]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { itemId?: string; accountId?: number; days?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const { itemId, accountId } = body;
  const days = body.days ?? 30;
  if (!itemId || typeof accountId !== "number" || !ALLOWED_DAYS.has(days)) {
    return NextResponse.json(
      { error: "Parâmetros inválidos: itemId (string), accountId (number), days (20 ou 30)" },
      { status: 400 },
    );
  }

  const { from, to } = dateWindow(days);
  let inserted = 0;
  const errors: string[] = [];

  try {
    const pluggy = getPluggyClient();
    const accountsResp = await pluggy.fetchAccounts(itemId);
    const pluggyAccounts = accountsResp.results ?? [];

    for (const pa of pluggyAccounts) {
      // paginação de transações
      let page = 1;
      let totalPages = 1;
      const rows: ParsedRow[] = [];
      let isCredit = pa.type === "CREDIT";
      do {
        const txResp = await pluggy.fetchTransactions(pa.id, { from, to, page, pageSize: 500 });
        totalPages = txResp.totalPages ?? 1;
        for (const tx of txResp.results ?? []) {
          const mapped = mapPluggyTransaction({
            description: tx.description,
            amount: tx.amount,
            type: tx.type === "CREDIT" ? "CREDIT" : "DEBIT",
            date: typeof tx.date === "string" ? tx.date : new Date(tx.date).toISOString(),
          });
          rows.push({
            date: mapped.date,
            description: mapped.description,
            amount: mapped.rawAmount, // mantém sinal para gravar
            rawAmount: mapped.rawAmount,
          });
        }
        page += 1;
      } while (page <= totalPages);

      if (rows.length === 0) continue;

      const source: BankSource = isCredit ? "nubank_credit" : "nubank_debit";
      const classified = await classifyRows(rows, source, accountId);

      for (const row of classified) {
        const { data: tx, error: insErr } = await supabase
          .from("transaction")
          .insert({
            account_id: accountId,
            date: row.date,
            description: row.description,
            amount: row.rawAmount,
            type: row.suggestedType,
            is_provisional: true,
          })
          .select("trans_id")
          .single();
        if (insErr || !tx) {
          errors.push(`${row.description}: ${insErr?.message ?? "insert falhou"}`);
          continue;
        }
        if (row.suggestedCategoryId != null) {
          const { error: linkErr } = await supabase
            .from("re_category_transaction")
            .insert({ trans_id: tx.trans_id, category_id: row.suggestedCategoryId });
          if (linkErr) errors.push(`${row.description}: categoria ${linkErr.message}`);
        }
        inserted += 1;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao sincronizar com Pluggy";
    return NextResponse.json({ inserted, errors, error: message }, { status: 500 });
  }

  revalidatePath("/transactions");
  revalidatePath("/transactions/review");
  return NextResponse.json({ inserted, errors });
}
```

> Nota de implementação: confira na doc do `pluggy-sdk` os nomes exatos — `fetchAccounts(itemId)`, `fetchTransactions(accountId, { from, to, page, pageSize })`. Se a versão instalada usar `accountId` como string, mantenha `pa.id` como veio. Se `txResp` não tiver `totalPages`, parar quando `results.length < pageSize`.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros. Ajustar tipos do SDK conforme necessário (usar `as` pontual se os tipos do pacote forem frouxos).

- [ ] **Step 3: Verificação manual**

Após conectar um item via widget (Task 6), o `onSuccess` chama esta rota. Verificar no Supabase que apareceram linhas com `is_provisional = true` na `account` escolhida e datas dentro da janela. Em `/transactions/review` essas linhas devem aparecer; duplicatas contra confirmadas são marcadas automaticamente pela tela.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/pluggy/sync/route.ts
git commit -m "feat(pluggy): sync route inserts last-N-days transactions as provisional"
```

---

## Task 6: Client component `PluggyImportButton`

**Files:**
- Create: `src/components/transactions/pluggy-import-button.tsx`

- [ ] **Step 1: Implementar**

Criar `src/components/transactions/pluggy-import-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PluggyConnect } from "react-pluggy-connect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Account = { account_id: number; account_name: string };

export function PluggyImportButton({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState<string>("");
  const [days, setDays] = useState<"20" | "30">("30");
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "tokenizing" | "connecting" | "syncing">("idle");
  const [error, setError] = useState<string | null>(null);

  async function startConnect() {
    setError(null);
    if (!accountId) {
      setError("Selecione a conta de destino.");
      return;
    }
    setStatus("tokenizing");
    try {
      const res = await fetch("/api/pluggy/connect-token", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao obter connect token");
      setConnectToken(json.accessToken);
      setStatus("connecting");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("idle");
    }
  }

  async function handleSuccess(itemData: { item: { id: string } }) {
    setConnectToken(null);
    setStatus("syncing");
    try {
      const res = await fetch("/api/pluggy/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: itemData.item.id, accountId: Number(accountId), days: Number(days) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha na sincronização");
      setOpen(false);
      setStatus("idle");
      router.push("/transactions/review");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("idle");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Importar do Pluggy</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar via Pluggy (Open Finance)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Conta de destino</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.account_id} value={String(a.account_id)}>
                      {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Período</label>
              <Select value={days} onValueChange={(v) => setDays(v as "20" | "30")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">Últimos 20 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={startConnect} disabled={status !== "idle"}>
              {status === "idle" && "Conectar com Pluggy"}
              {status === "tokenizing" && "Preparando..."}
              {status === "connecting" && "Abrindo Pluggy..."}
              {status === "syncing" && "Importando transações..."}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          onSuccess={handleSuccess}
          onError={(e: unknown) => {
            setConnectToken(null);
            setStatus("idle");
            setError(e instanceof Error ? e.message : "Erro no Pluggy Connect");
          }}
          onClose={() => {
            setConnectToken(null);
            if (status === "connecting") setStatus("idle");
          }}
        />
      )}
    </>
  );
}
```

> Nota: confirme na doc de `react-pluggy-connect` a assinatura do `onSuccess` (atual: `(itemData) => void` com `itemData.item.id`). Ajuste o tipo se a versão instalada diferir. Verifique também que `@/components/ui/select` e `@/components/ui/dialog` exportam os subcomponentes usados (já são usados em `import-wizard.tsx`).

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/transactions/pluggy-import-button.tsx
git commit -m "feat(pluggy): PluggyImportButton client component"
```

---

## Task 7: Exibir o botão em `/transactions`

**Files:**
- Modify: `src/app/(app)/transactions/page.tsx`

- [ ] **Step 1: Importar e renderizar**

Em `src/app/(app)/transactions/page.tsx`, adicionar o import no topo:
```tsx
import { PluggyImportButton } from "@/components/transactions/pluggy-import-button"
```
E onde hoje fica o link "Importar CSV" (perto da linha 100), adicionar ao lado dele:
```tsx
<PluggyImportButton accounts={accounts ?? []} />
```
(O componente `accounts` já é carregado nesta página com `account_id, account_name`.)

- [ ] **Step 2: Typecheck + verificação visual**

Run: `npx tsc --noEmit && npm run dev`
Abrir `http://localhost:3000/transactions` — o botão "Importar do Pluggy" aparece ao lado de "Importar CSV". Abrir o dialog: select de conta populado, select de período com 20/30.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/transactions/page.tsx"
git commit -m "feat(pluggy): show import button on transactions page"
```

---

## Task 8: Adicionar opção Pluggy no wizard de importação

**Files:**
- Modify: `src/app/(app)/transactions/import/components/import-wizard.tsx`

- [ ] **Step 1: Importar e renderizar uma seção**

Em `src/app/(app)/transactions/import/components/import-wizard.tsx`:
- Adicionar import:
```tsx
import { PluggyImportButton } from "@/components/transactions/pluggy-import-button";
```
- No passo inicial (`step === "upload"`), abaixo das opções de banco/CSV existentes, adicionar um bloco:
```tsx
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
```
(`accounts`, `Card`, `CardHeader`, `CardTitle`, `CardContent` já estão importados/disponíveis neste arquivo.)

- [ ] **Step 2: Typecheck + verificação visual**

Run: `npx tsc --noEmit && npm run dev`
Abrir `http://localhost:3000/transactions/import` — a seção "Pluggy (Open Finance)" aparece com o botão.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/transactions/import/components/import-wizard.tsx"
git commit -m "feat(pluggy): add Pluggy option to import wizard"
```

---

## Task 9: Verificação fim-a-fim e build

**Files:** nenhum (verificação)

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: build conclui sem erros de tipo/lint.

- [ ] **Step 2: Rodar testes de unidade**

Run: `node --experimental-strip-types --test src/lib/pluggy/map.test.ts` (ou `npx tsx --test ...`).
Expected: PASS.

- [ ] **Step 3: Smoke manual (requer env vars reais do usuário)**

Com `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET` no `.env.local`:
1. `npm run dev`, logar no app.
2. `/transactions` → "Importar do Pluggy" → escolher conta + 30 dias → "Conectar com Pluggy".
3. Concluir o fluxo Pluggy Connect (sandbox).
4. Verificar redirect para `/transactions/review` com as transações provisórias listadas.
5. Conferir no Supabase: linhas com `is_provisional = true`, `account_id` correto, datas dentro de [hoje-30, hoje], incluindo transações de conta e de cartão.

- [ ] **Step 4: Commit (se houver ajustes)**

```bash
git add -A
git commit -m "chore(pluggy): end-to-end verification fixes"
```

---

## Notas para quem executa

- O usuário **deve** preencher `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` no ambiente — não invente nem hardcode credenciais.
- Os nomes de método do `pluggy-sdk` e a assinatura de `react-pluggy-connect` devem ser confirmados contra a versão instalada; ajuste imports/tipos conforme a doc oficial sem mudar o comportamento descrito.
- `classifyRows` exige um `BankSource`; usamos `"nubank_credit"`/`"nubank_debit"` apenas como proxy de classificação (regras + transferência própria). Não há significado de banco real nisso.
