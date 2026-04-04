# Tarefas — Feed Level SaaS

> Referência: [docs/PLAN.md](PLAN.md) para detalhes completos de cada tarefa.

## Status

- [x] Tarefa 1: Setup Next.js + Supabase Client
- [x] Tarefa 2: Autenticação (Supabase Auth)
- [x] Tarefa 3: Vincular Auth → Client + habilitar RLS
- [ ] Tarefa 4: UI Shell — Layout, Sidebar, Tema Dark
- [ ] Tarefa 5: CRUD de Instituições
- [ ] Tarefa 6: CRUD de Renda Fixa
- [ ] Tarefa 7: CRUD de Renda Variável
- [ ] Tarefa 8: CRUD de Imóveis
- [ ] Tarefa 9: CRUD de Veículos
- [ ] Tarefa 10: CRUD de Passivos + Pagamentos
- [ ] Tarefa 11: CRUD de Transações, Contas e Categorias
- [ ] Tarefa 12: Dashboard — Visão Geral do Patrimônio
- [ ] Tarefa 13: Deploy na Vercel

## Dependências

```
T1 (Setup) ──→ T2 (Auth) ──→ T3 (Auth→Client + RLS)
  │                                   │
  └──→ T4 (UI Shell) ────────────────┤
                                      │
                        T5 (Instituições)
                         │    │    │
              ┌──────────┘    │    └──────────┐
              ▼               ▼               ▼
        T6 (Renda Fixa) T7 (Renda Var.)  T11 (Transações)
              │               │
              │    T8 (Imóveis)
              │    T9 (Veículos)
              │         │         │
              │         └────┬────┘
              │              ▼
              │      T10 (Passivos)
              │              │
              └──────┬───────┘
                     ▼
              T12 (Dashboard)
                     │
                     ▼
              T13 (Deploy)
```

---

## Detalhes por Tarefa

### Tarefa 3: Vincular Auth → Client + habilitar RLS
**Status:** Concluída ✓
**O que foi feito (migration `task_03_auth_client_rls`):**
- Coluna `auth_user_id uuid UNIQUE` adicionada em `finance.client` → referencia `auth.users(id)`
- Função `finance.handle_new_user()` criada — insere `finance.client` automaticamente no registro
- Trigger `on_auth_user_created` em `auth.users` AFTER INSERT
- Função `finance.current_client_id()` — retorna `client_id` do usuário autenticado (SECURITY DEFINER)
- RLS habilitado nas 12 tabelas do schema `finance`
- Policies FOR ALL criadas em todas as tabelas:
  - `client`: `auth.uid() = auth_user_id`
  - Tabelas com `client_id` direto: `client_id = finance.current_client_id()`
  - `transaction`: via subquery em `finance.account`
  - `re_category_transaction`: via subquery em `finance.transaction → finance.account`

**Supabase project:** `npnjuwgjookorrqcspej`

---

### Tarefa 4: UI Shell — Layout, Sidebar, Tema Dark
**O que fazer:**
1. `npx shadcn@latest init` (dark mode, zinc, src/components/ui)
2. Instalar componentes: button, card, input, form, table, dialog, sheet, select, badge, separator, dropdown-menu, avatar, tooltip
3. Criar `src/components/sidebar.tsx` com navegação:
   - Dashboard, Investimentos (Renda Fixa, Renda Variável), Patrimônio (Imóveis, Veículos), Passivos, Transações, Instituições
4. Criar `src/components/header.tsx` — nome do usuário + logout
5. Criar `src/components/page-header.tsx` — título + ação
6. Atualizar `src/app/(app)/layout.tsx` com sidebar + header
7. Responsivo: Sheet em mobile para sidebar

---

### Tarefa 5: CRUD de Instituições
**Arquivos:**
- `src/app/(app)/institutions/page.tsx` — listagem (tabela)
- `src/app/(app)/institutions/actions.ts` — server actions
- `src/app/(app)/institutions/components/institution-form.tsx` — dialog criar/editar

**Tabela:** `finance.institution` (institution_id, client_id, name, type, notes)
**Enum:** `institution_type` = bank, broker, fintech, other

---

### Tarefa 6: CRUD de Renda Fixa
**Arquivos:**
- `src/app/(app)/fixed-income/page.tsx`
- `src/app/(app)/fixed-income/actions.ts`
- `src/app/(app)/fixed-income/components/fixed-income-form.tsx`

**Tabela:** `finance.fixed_income`
**Enums:** `fixed_income_type`, `rate_type` (pre, pre_ipca, pos_cdi, pos_ipca, pos_selic)
**Features:** Cards de resumo, badges tipo/status, campos condicionais de resgate, select de instituição

---

### Tarefa 7: CRUD de Renda Variável
**Arquivos:**
- `src/app/(app)/variable-income/page.tsx`
- `src/app/(app)/variable-income/actions.ts`
- `src/app/(app)/variable-income/components/variable-income-form.tsx`

**Tabela:** `finance.variable_income`
**Enum:** `asset_type` = stock, fii, etf, crypto, bdr, other
**Features:** Filtro por tipo, cards resumo por tipo, quantity com 8 decimais para cripto

---

### Tarefa 8: CRUD de Imóveis
**Arquivos:**
- `src/app/(app)/real-estate/page.tsx`
- `src/app/(app)/real-estate/actions.ts`
- `src/app/(app)/real-estate/components/real-estate-form.tsx`

**Tabela:** `finance.real_estate`
**Enum:** `property_type` = apartment, house, land, commercial, other

---

### Tarefa 9: CRUD de Veículos
**Arquivos:**
- `src/app/(app)/vehicles/page.tsx`
- `src/app/(app)/vehicles/actions.ts`
- `src/app/(app)/vehicles/components/vehicle-form.tsx`

**Tabela:** `finance.vehicle`
**Enum:** `vehicle_type` = car, motorcycle, truck, other

---

### Tarefa 10: CRUD de Passivos + Pagamentos
**Arquivos:**
- `src/app/(app)/liabilities/page.tsx` — listagem
- `src/app/(app)/liabilities/actions.ts`
- `src/app/(app)/liabilities/components/liability-form.tsx`
- `src/app/(app)/liabilities/[id]/page.tsx` — detalhe + pagamentos
- `src/app/(app)/liabilities/[id]/components/payment-form.tsx`

**Tabelas:** `finance.liability`, `finance.liability_payment`
**Enums:** `liability_type`, `rate_period`
**Features:** Select de imóvel/veículo vinculado, tabela de pagamentos, registro de parcelas (principal + juros)

---

### Tarefa 11: CRUD de Transações, Contas e Categorias
**Arquivos:**
- `src/app/(app)/transactions/page.tsx`
- `src/app/(app)/transactions/actions.ts`
- `src/app/(app)/transactions/components/transaction-form.tsx`
- `src/app/(app)/accounts/page.tsx`
- `src/app/(app)/categories/page.tsx`

**Tabelas:** `finance.transaction`, `finance.account`, `finance.category`, `finance.re_category_transaction`
**Enum:** `transaction_type` = debit, credit, transfer
**Features:** Filtros por conta/tipo/período, multi-select categorias, categorias hierárquicas

---

### Tarefa 12: Dashboard — Visão Geral do Patrimônio
**Arquivos:**
- `src/app/(app)/dashboard/page.tsx` (atualizar placeholder existente)

**Features:**
- Cards: patrimônio total (ativos - passivos), renda fixa, renda variável, imóveis, veículos, passivos
- Gráfico composição (recharts — `npm install recharts`)
- Últimas transações
- Queries agregadas server-side

---

### Tarefa 13: Deploy na Vercel
**Passos:**
1. `npm i -g vercel`
2. `vercel link`
3. Configurar env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Configurar redirect URLs no Supabase Auth Dashboard
5. `vercel deploy` → preview
6. `vercel --prod` → produção

---

## Contexto Técnico

- **Next.js 16.2.2** — usa `proxy.ts` (não middleware.ts), request APIs async
- **Schema `finance`** — todos os clients Supabase usam `db: { schema: "finance" }`
- **Tipos:** `src/lib/supabase/types.ts` com todas as 12 tabelas e 9 enums
- **Auth:** Supabase Auth com `@supabase/ssr`, session refresh via proxy
- **Supabase project:** `npnjuwgjookorrqcspej` (sa-east-1)
