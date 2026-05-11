# feed-level-temp — AI Context Map

> **Stack:** next-app | none | react | typescript

> 1 routes | 0 models | 50 components | 8 lib files | 5 env vars | 1 middleware
> **Token savings:** this file is ~3,200 tokens. Without it, AI exploration would cost ~28,900 tokens. **Saves ~25,700 tokens per conversation.**
> **Last scanned:** 2026-05-09 02:11 — re-run after significant changes

---

# Routes

- `GET` `/auth/callback` [auth]

---

# Components

- **AccountForm** [client] — props: account, institutions — `src/app/(app)/accounts/components/account-form.tsx`
- **AccountsPage** — `src/app/(app)/accounts/page.tsx`
- **AccountChart** [client] — props: data — `src/app/(app)/analytics/components/account-chart.tsx`
- **AnalyticsDashboard** [client] — props: transactions, categories, granularity — `src/app/(app)/analytics/components/analytics-dashboard.tsx`
- **CategoryChart** [client] — props: data — `src/app/(app)/analytics/components/category-chart.tsx`
- **EvolutionChart** [client] — props: data — `src/app/(app)/analytics/components/evolution-chart.tsx`
- **PeriodFilter** [client] — props: startDate, endDate, granularity, basePath — `src/app/(app)/analytics/components/period-filter.tsx`
- **SeriesEvolutionChart** [client] — props: data, seriesKeys — `src/app/(app)/analytics/components/series-evolution-chart.tsx`
- **TransactionList** [client] — props: transactions, categories, search, onSearchChange, categoryFilter, onCategoryFilterChange, hiddenIds, onToggleHidden, onClearHidden — `src/app/(app)/analytics/components/transaction-list.tsx`
- **TypeChart** [client] — props: data — `src/app/(app)/analytics/components/type-chart.tsx`
- **AnalyticsPage** — props: searchParams — `src/app/(app)/analytics/page.tsx`
- **FinancialReportTable** [client] — props: rows — `src/app/(app)/analytics/report/components/financial-report-table.tsx`
- **AnalyticsReportPage** — props: searchParams — `src/app/(app)/analytics/report/page.tsx`
- **CategoryForm** [client] — props: category, categories — `src/app/(app)/categories/components/category-form.tsx`
- **CategoriesPage** — `src/app/(app)/categories/page.tsx`
- **RuleForm** [client] — props: rule, categories, triggerLabel — `src/app/(app)/classification-rules/components/rule-form.tsx`
- **RulesTable** [client] — props: rules, categories — `src/app/(app)/classification-rules/components/rules-table.tsx`
- **ClassificationRulesPage** — `src/app/(app)/classification-rules/page.tsx`
- **DashboardPage** — `src/app/(app)/dashboard/page.tsx`
- **PatrimonyChart** [client] — props: data — `src/app/(app)/dashboard/patrimony-chart.tsx`
- **FixedIncomeForm** [client] — props: fixedIncome, institutions — `src/app/(app)/fixed-income/components/fixed-income-form.tsx`
- **FixedIncomePage** — `src/app/(app)/fixed-income/page.tsx`
- **InstitutionForm** [client] — props: institution — `src/app/(app)/institutions/components/institution-form.tsx`
- **InstitutionsPage** — `src/app/(app)/institutions/page.tsx`
- **AppLayout** — `src/app/(app)/layout.tsx`
- **ProfilePage** — `src/app/(app)/profile/page.tsx`
- **RealEstateForm** [client] — props: realEstate — `src/app/(app)/real-estate/components/real-estate-form.tsx`
- **RealEstatePage** — `src/app/(app)/real-estate/page.tsx`
- **MonthPicker** [client] — props: value — `src/app/(app)/transactions/components/month-picker.tsx`
- **TransactionForm** [client] — props: transaction, accounts, categories — `src/app/(app)/transactions/components/transaction-form.tsx`
- **ImportWizard** [client] — props: accounts, categories, initialRules — `src/app/(app)/transactions/import/components/import-wizard.tsx`
- **ImportTransactionsPage** — `src/app/(app)/transactions/import/page.tsx`
- **TransactionsPage** — props: searchParams — `src/app/(app)/transactions/page.tsx`
- **ReviewClient** [client] — props: initialRows, categories, accounts, rules — `src/app/(app)/transactions/review/components/review-client.tsx`
- **ReviewPage** — `src/app/(app)/transactions/review/page.tsx`
- **VariableIncomeForm** [client] — props: variableIncome, institutions — `src/app/(app)/variable-income/components/variable-income-form.tsx`
- **VariableIncomePage** — `src/app/(app)/variable-income/page.tsx`
- **VehicleForm** [client] — props: vehicle — `src/app/(app)/vehicles/components/vehicle-form.tsx`
- **VehiclesPage** — `src/app/(app)/vehicles/page.tsx`
- **ForgotPasswordPage** [client] — `src/app/(auth)/forgot-password/page.tsx`
- **AuthLayout** — `src/app/(auth)/layout.tsx`
- **LoginPage** [client] — `src/app/(auth)/login/page.tsx`
- **RegisterPage** [client] — `src/app/(auth)/register/page.tsx`
- **RootLayout** — `src/app/layout.tsx`
- **Home** — `src/app/page.tsx`
- **Header** [client] — props: userName, userEmail — `src/components/header.tsx`
- **PageHeader** — props: title, description, action, className — `src/components/page-header.tsx`
- **Providers** [client] — `src/components/providers.tsx`
- **ProvisionalBanner** — props: count — `src/components/provisional-banner.tsx`
- **ClassificationTable** [client] — props: rows, categories, onChange, onCreateRule — `src/components/transactions/classification-table.tsx`

---

# Libraries

- `src/lib/supabase/client.ts` — function createClient: () => void
- `src/lib/supabase/middleware.ts` — function updateSession: (request) => void
- `src/lib/supabase/server.ts` — function createClient: () => void
- `src/lib/transactions/classifier.ts`
  - function classifyRows: (rows, source, targetAccountId) => Promise<ClassifiedRow[]>
  - function classifyExistingRows: (rows) => Promise<ProvisionalRow[]>
  - type ExistingRow
- `src/lib/transactions/parsers/index.ts` — function parseCsvContent: (source, content) => ParsedRow[], const BANK_SOURCE_LABELS: Record<BankSource, string>
- `src/lib/transactions/parsers/pdf.ts` — function extractBradescoCreditCsv: (pdfBuffer, year) => Promise<
- `src/lib/utils.ts` — function cn: (...inputs) => void
- `src/proxy.ts` — function proxy: (request) => void, const config

---

# Config

## Environment Variables

- `NEXT_PUBLIC_SITE_URL` (has default) — .env.example
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (has default) — .env.local
- `NEXT_PUBLIC_SUPABASE_URL` (has default) — .env.local
- `SUPABASE_JAVA_CLASSIFIER` **required** — scripts/seed-classification-rules.mjs
- `SUPABASE_SERVICE_KEY` **required** — scripts/seed-classification-rules.mjs

## Config Files

- `.env.example`
- `next.config.ts`
- `tsconfig.json`
- `vercel.json`

## Key Dependencies

- @supabase/supabase-js: ^2.101.1
- next: 16.2.2
- react: 19.2.4

---

# Middleware

## auth
- middleware — `src/lib/supabase/middleware.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `src/lib/supabase/server.ts` — imported by **30** files
- `src/components/ui/button.tsx` — imported by **19** files
- `src/lib/utils.ts` — imported by **18** files
- `src/components/ui/input.tsx` — imported by **13** files
- `src/components/page-header.tsx` — imported by **10** files
- `src/components/ui/card.tsx` — imported by **10** files
- `src/components/ui/badge.tsx` — imported by **10** files
- `src/lib/transactions/types.ts` — imported by **7** files
- `src/app/(app)/analytics/types.ts` — imported by **5** files
- `src/app/(app)/classification-rules/components/rule-form.tsx` — imported by **4** files
- `src/app/(auth)/actions.ts` — imported by **4** files
- `src/app/(app)/classification-rules/components/rules-table.tsx` — imported by **3** files
- `src/app/(app)/analytics/lib/category-filter.ts` — imported by **2** files
- `src/app/(app)/analytics/components/period-filter.tsx` — imported by **2** files
- `src/app/(app)/analytics/report/types.ts` — imported by **2** files
- `src/app/(app)/classification-rules/actions.ts` — imported by **2** files
- `src/components/sidebar.tsx` — imported by **2** files
- `src/lib/transactions/classifier.ts` — imported by **2** files
- `src/lib/transactions/parsers/index.ts` — imported by **2** files
- `src/components/transactions/classification-table.tsx` — imported by **2** files

## Import Map (who imports what)

- `src/lib/supabase/server.ts` ← `src/app/(app)/accounts/actions.ts`, `src/app/(app)/accounts/page.tsx`, `src/app/(app)/analytics/page.tsx`, `src/app/(app)/analytics/report/page.tsx`, `src/app/(app)/categories/actions.ts` +25 more
- `src/components/ui/button.tsx` ← `src/app/(app)/accounts/components/account-form.tsx`, `src/app/(app)/analytics/components/period-filter.tsx`, `src/app/(app)/analytics/components/transaction-list.tsx`, `src/app/(app)/categories/components/category-form.tsx`, `src/app/(app)/classification-rules/components/rule-form.tsx` +14 more
- `src/lib/utils.ts` ← `src/app/(app)/analytics/components/period-filter.tsx`, `src/app/(app)/analytics/report/components/financial-report-table.tsx`, `src/components/page-header.tsx`, `src/components/sidebar.tsx`, `src/components/ui/avatar.tsx` +13 more
- `src/components/ui/input.tsx` ← `src/app/(app)/accounts/components/account-form.tsx`, `src/app/(app)/analytics/components/transaction-list.tsx`, `src/app/(app)/categories/components/category-form.tsx`, `src/app/(app)/classification-rules/components/rule-form.tsx`, `src/app/(app)/classification-rules/components/rules-table.tsx` +8 more
- `src/components/page-header.tsx` ← `src/app/(app)/accounts/page.tsx`, `src/app/(app)/categories/page.tsx`, `src/app/(app)/classification-rules/page.tsx`, `src/app/(app)/fixed-income/page.tsx`, `src/app/(app)/institutions/page.tsx` +5 more
- `src/components/ui/card.tsx` ← `src/app/(app)/analytics/components/analytics-dashboard.tsx`, `src/app/(app)/analytics/report/components/financial-report-table.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/fixed-income/page.tsx`, `src/app/(app)/real-estate/page.tsx` +5 more
- `src/components/ui/badge.tsx` ← `src/app/(app)/analytics/components/transaction-list.tsx`, `src/app/(app)/categories/page.tsx`, `src/app/(app)/classification-rules/components/rules-table.tsx`, `src/app/(app)/fixed-income/page.tsx`, `src/app/(app)/institutions/page.tsx` +5 more
- `src/lib/transactions/types.ts` ← `src/app/(app)/transactions/import/actions.ts`, `src/app/(app)/transactions/import/components/import-wizard.tsx`, `src/app/(app)/transactions/review/actions.ts`, `src/app/(app)/transactions/review/components/review-client.tsx`, `src/app/(app)/transactions/review/page.tsx` +2 more
- `src/app/(app)/analytics/types.ts` ← `src/app/(app)/analytics/components/analytics-dashboard.tsx`, `src/app/(app)/analytics/components/transaction-list.tsx`, `src/app/(app)/analytics/lib/aggregations.ts`, `src/app/(app)/analytics/lib/category-filter.ts`, `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/classification-rules/components/rule-form.tsx` ← `src/app/(app)/classification-rules/components/rules-table.tsx`, `src/app/(app)/classification-rules/page.tsx`, `src/app/(app)/transactions/import/components/import-wizard.tsx`, `src/app/(app)/transactions/review/components/review-client.tsx`

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_