# Feed Level — Gestão de Patrimônio

SaaS de gestão de patrimônio pessoal.

## Stack

- **Frontend:** Next.js (App Router) + shadcn/ui + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth)
- **Deploy:** Vercel

## Banco de Dados

Schema `finance` no Supabase com as seguintes tabelas:

### Existentes (controle financeiro)
- `client` — Usuários
- `account` — Contas bancárias
- `category` — Categorias hierárquicas (debit/credit/transfer)
- `transaction` — Transações financeiras
- `re_category_transaction` — Relação N:N transação-categoria

### Patrimônio (novas)
- `institution` — Instituições financeiras (banco, corretora, fintech)
- `fixed_income` — Renda fixa (CDB, LCI, Tesouro, etc.)
- `variable_income` — Renda variável (ações, FIIs, ETFs, cripto)
- `real_estate` — Imóveis
- `vehicle` — Veículos
- `liability` — Passivos (financiamentos, dívidas)
- `liability_payment` — Pagamentos de parcelas

## Plano de Implementação

Veja [docs/PLAN.md](docs/PLAN.md) para o plano detalhado com 13 tarefas.
