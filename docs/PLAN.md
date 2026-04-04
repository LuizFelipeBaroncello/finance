# Plano Mestre: SaaS de Gestão de Patrimônio

## Visão Geral
Construir um SaaS de gestão de patrimônio pessoal usando Next.js (App Router) + Supabase (auth + banco) + Vercel (deploy). O banco já existe no schema `finance` com tabelas de transações e patrimônio.

## Banco de Dados (Supabase)
- **Projeto:** `npnjuwgjookorrqcspej` (sa-east-1)
- **Schema:** `finance`
- **Tabelas existentes:** client, account, category, transaction, re_category_transaction, institution, fixed_income, variable_income, real_estate, vehicle, liability, liability_payment
- **Auth:** Supabase Auth — precisa vincular `auth.users` → `finance.client`
- **RLS:** Desabilitado atualmente — precisa habilitar

---

## Tarefas

### Tarefa 1: Setup do Projeto Next.js + Supabase
**Objetivo:** Criar projeto Next.js, instalar dependências, configurar Supabase client, linkar na Vercel.

**Passos:**
1. `npx create-next-app@latest feed-level --typescript --tailwind --app --src-dir`
2. Instalar dependências: `@supabase/supabase-js`, `@supabase/ssr`
3. Criar utilitários Supabase:
   - `src/lib/supabase/client.ts` — browser client (`createBrowserClient`)
   - `src/lib/supabase/server.ts` — server client (`createServerClient` com cookies)
   - `src/lib/supabase/middleware.ts` — middleware client para refresh de sessão
4. Configurar `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Gerar tipos TypeScript do Supabase: `npx supabase gen types typescript`
6. Configurar `src/lib/supabase/types.ts` com os tipos gerados

**Arquivos principais:**
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/middleware.ts`
- `src/lib/supabase/types.ts`

---

### Tarefa 2: Autenticação (Supabase Auth)
**Objetivo:** Login, registro, recuperação de senha, proteção de rotas.

**Dependências:** Tarefa 1

**Passos:**
1. Habilitar email/password no Supabase Dashboard (Auth → Providers)
2. Criar páginas de auth:
   - `src/app/(auth)/login/page.tsx` — formulário de login
   - `src/app/(auth)/register/page.tsx` — formulário de registro
   - `src/app/(auth)/forgot-password/page.tsx` — recuperação
   - `src/app/(auth)/auth/callback/route.ts` — callback OAuth/magic link
3. Criar `src/middleware.ts` que:
   - Faz refresh da sessão em cada request
   - Redireciona não-autenticados para `/login`
   - Redireciona autenticados de `/login` para `/dashboard`
4. Criar layout de auth: `src/app/(auth)/layout.tsx` — layout limpo sem sidebar
5. Criar Server Actions para auth em `src/app/(auth)/actions.ts`

**Arquivos principais:**
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/auth/callback/route.ts`
- `src/app/(auth)/actions.ts`
- `src/middleware.ts`

---

### Tarefa 3: Vincular Auth → Client + RLS
**Objetivo:** Criar trigger que insere um `finance.client` automaticamente quando um usuário se registra. Adicionar coluna `auth_user_id` à tabela client. Habilitar RLS.

**Dependências:** Tarefa 2

**Passos (migration SQL via MCP):**
1. Adicionar coluna `auth_user_id uuid UNIQUE` em `finance.client` referenciando `auth.users(id)`
2. Criar função `finance.handle_new_user()` que insere em `finance.client` com dados do `auth.users`
3. Criar trigger `on_auth_user_created` no schema `auth` que dispara a função
4. Habilitar RLS em todas as tabelas do schema `finance`
5. Criar policies de acesso baseadas em `auth.uid()` = `finance.client.auth_user_id`:
   - Para `client`: `auth.uid() = auth_user_id`
   - Para demais tabelas: subquery `client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid())`
6. Criar helper view ou function `finance.current_client_id()` para simplificar policies

**Arquivos principais:**
- Migration SQL (via MCP Supabase)

---

### Tarefa 4: UI Shell — Layout, Sidebar, Tema
**Objetivo:** Criar o layout principal da aplicação (dashboard shell) com sidebar, header, e tema dark.

**Dependências:** Tarefa 1

**Passos:**
1. Instalar shadcn/ui: `npx shadcn@latest init`
2. Instalar componentes base: button, card, input, form, table, dialog, sheet, select, badge, separator, dropdown-menu, avatar, tooltip
3. Criar layout protegido: `src/app/(app)/layout.tsx`
   - Sidebar com navegação: Dashboard, Investimentos (Renda Fixa, Renda Variável), Patrimônio (Imóveis, Veículos), Passivos, Transações, Instituições
   - Header com nome do usuário + logout
   - Responsivo: sidebar collapsa em mobile (Sheet)
4. Configurar tema dark como padrão, fonte Geist Sans/Mono
5. Criar componentes reutilizáveis:
   - `src/components/sidebar.tsx`
   - `src/components/header.tsx`
   - `src/components/page-header.tsx` — título + ação (botão "Novo")

**Arquivos principais:**
- `src/app/(app)/layout.tsx`
- `src/components/sidebar.tsx`
- `src/components/header.tsx`
- `src/components/page-header.tsx`
- `tailwind.config.ts` / `globals.css`

---

### Tarefa 5: CRUD de Instituições
**Objetivo:** Gerenciar instituições financeiras (banco, corretora, fintech).

**Dependências:** Tarefas 3, 4

**Passos:**
1. Criar página de listagem: `src/app/(app)/institutions/page.tsx`
   - Tabela com nome, tipo, ações (editar, excluir)
2. Criar dialog/modal para adicionar/editar: `src/app/(app)/institutions/components/institution-form.tsx`
3. Server Actions: `src/app/(app)/institutions/actions.ts`
   - `createInstitution`, `updateInstitution`, `deleteInstitution`
4. Queries server-side com Supabase client

**Arquivos principais:**
- `src/app/(app)/institutions/page.tsx`
- `src/app/(app)/institutions/actions.ts`
- `src/app/(app)/institutions/components/institution-form.tsx`

---

### Tarefa 6: CRUD de Renda Fixa
**Objetivo:** Gerenciar investimentos de renda fixa.

**Dependências:** Tarefa 5 (precisa de instituições)

**Passos:**
1. Listagem: `src/app/(app)/fixed-income/page.tsx`
   - Tabela com nome, tipo, instituição, valor investido, taxa, data, vencimento, status
   - Badges para tipo de rendimento e status (ativo/resgatado)
2. Formulário: `src/app/(app)/fixed-income/components/fixed-income-form.tsx`
   - Select de tipo (CDB, LCI, Tesouro, etc.)
   - Select de instituição (da tabela institution)
   - Campos de taxa (tipo + valor)
   - Campos condicionais de resgate
3. Server Actions: `src/app/(app)/fixed-income/actions.ts`
4. Cards de resumo no topo: total investido, total esperado, quantidade de investimentos

**Arquivos principais:**
- `src/app/(app)/fixed-income/page.tsx`
- `src/app/(app)/fixed-income/actions.ts`
- `src/app/(app)/fixed-income/components/fixed-income-form.tsx`

---

### Tarefa 7: CRUD de Renda Variável
**Objetivo:** Gerenciar ações, FIIs, ETFs, cripto, BDRs.

**Dependências:** Tarefa 5

**Passos:**
1. Listagem: `src/app/(app)/variable-income/page.tsx`
   - Tabela com ticker, nome, tipo, quantidade, preço médio, total investido, instituição
   - Badges para tipo de ativo
   - Filtro por tipo de ativo (tabs ou select)
2. Formulário: `src/app/(app)/variable-income/components/variable-income-form.tsx`
3. Server Actions: `src/app/(app)/variable-income/actions.ts`
4. Cards de resumo: total por tipo de ativo, total geral

**Arquivos principais:**
- `src/app/(app)/variable-income/page.tsx`
- `src/app/(app)/variable-income/actions.ts`
- `src/app/(app)/variable-income/components/variable-income-form.tsx`

---

### Tarefa 8: CRUD de Imóveis
**Objetivo:** Gerenciar imóveis com informações de financiamento e aluguel.

**Dependências:** Tarefa 4

**Passos:**
1. Listagem: `src/app/(app)/real-estate/page.tsx`
   - Cards ou tabela com nome, tipo, valor compra, valor atual, financiado?, aluguel?
2. Formulário: `src/app/(app)/real-estate/components/real-estate-form.tsx`
3. Server Actions: `src/app/(app)/real-estate/actions.ts`

---

### Tarefa 9: CRUD de Veículos
**Objetivo:** Gerenciar veículos.

**Dependências:** Tarefa 4

**Passos:**
1. Listagem: `src/app/(app)/vehicles/page.tsx`
2. Formulário: `src/app/(app)/vehicles/components/vehicle-form.tsx`
3. Server Actions: `src/app/(app)/vehicles/actions.ts`

---

### Tarefa 10: CRUD de Passivos (Financiamentos/Dívidas)
**Objetivo:** Gerenciar passivos com detalhes de parcelas, juros e vínculo com ativos.

**Dependências:** Tarefas 5, 8, 9 (precisa de instituições, imóveis, veículos)

**Passos:**
1. Listagem: `src/app/(app)/liabilities/page.tsx`
   - Tabela com nome, tipo, instituição, saldo devedor, parcelas pagas/total, ativo vinculado
2. Detalhe: `src/app/(app)/liabilities/[id]/page.tsx`
   - Informações do financiamento
   - Tabela de pagamentos (liability_payment)
   - Botão "Registrar pagamento"
3. Formulário de passivo: `src/app/(app)/liabilities/components/liability-form.tsx`
   - Select de instituição
   - Select de imóvel ou veículo vinculado (opcional)
4. Formulário de pagamento: `src/app/(app)/liabilities/[id]/components/payment-form.tsx`
5. Server Actions: `src/app/(app)/liabilities/actions.ts`

---

### Tarefa 11: CRUD de Transações (tabelas existentes)
**Objetivo:** Interface para as transações que já existem no banco (172 rows).

**Dependências:** Tarefa 5

**Passos:**
1. Listagem: `src/app/(app)/transactions/page.tsx`
   - Tabela com data, descrição, valor, tipo (debit/credit/transfer), conta, categorias
   - Filtros por conta, tipo, período
2. Formulário: `src/app/(app)/transactions/components/transaction-form.tsx`
   - Select de conta (finance.account)
   - Multi-select de categorias
3. CRUD de contas: `src/app/(app)/accounts/page.tsx` (listagem simples + form)
4. CRUD de categorias: `src/app/(app)/categories/page.tsx` (hierárquica)
5. Server Actions: `src/app/(app)/transactions/actions.ts`

---

### Tarefa 12: Dashboard — Visão Geral do Patrimônio
**Objetivo:** Página principal com resumo de patrimônio líquido e composição.

**Dependências:** Tarefas 6-10 (precisa dos CRUDs prontos para ter dados)

**Passos:**
1. Página: `src/app/(app)/dashboard/page.tsx`
2. Cards de resumo:
   - Patrimônio total (ativos - passivos)
   - Total em renda fixa
   - Total em renda variável
   - Total em imóveis
   - Total em veículos
   - Total de passivos (saldo devedor)
3. Gráfico de composição (pizza/donut) — distribuição do patrimônio por tipo
4. Lista de últimas transações
5. Queries agregadas no server component
6. Instalar biblioteca de gráficos (recharts ou similar)

---

### Tarefa 13: Deploy na Vercel
**Objetivo:** Configurar e deployar o projeto na Vercel.

**Dependências:** Todas as tarefas anteriores (ou quando MVP estiver pronto)

**Passos:**
1. `npm i -g vercel` (instalar CLI)
2. `vercel link` → conectar ao projeto
3. Configurar env vars na Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Configurar Supabase Auth redirect URLs para o domínio Vercel
5. `vercel deploy` → preview
6. `vercel --prod` → produção
7. Configurar domínio customizado (se houver)

---

## Ordem de Execução Recomendada

```
Tarefa 1 (Setup) ──→ Tarefa 2 (Auth) ──→ Tarefa 3 (Auth→Client + RLS)
      │                                          │
      └──→ Tarefa 4 (UI Shell) ─────────────────┤
                                                  │
                                    Tarefa 5 (Instituições)
                                     │    │    │
                          ┌──────────┘    │    └──────────┐
                          ▼               ▼               ▼
                   Tarefa 6          Tarefa 7        Tarefa 11
                  (Renda Fixa)    (Renda Var.)    (Transações)
                          │               │
                          │    Tarefa 8 (Imóveis)
                          │    Tarefa 9 (Veículos)
                          │         │         │
                          │         └────┬────┘
                          │              ▼
                          │      Tarefa 10 (Passivos)
                          │              │
                          └──────┬───────┘
                                 ▼
                          Tarefa 12 (Dashboard)
                                 │
                                 ▼
                          Tarefa 13 (Deploy)
```
