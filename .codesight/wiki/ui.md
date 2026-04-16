# UI

> **Navigation aid.** Component inventory and prop signatures extracted via AST. Read the source files before adding props or modifying component logic.

**39 components** (react)

## Client Components

- **AccountForm** — props: account, institutions — `src/app/(app)/accounts/components/account-form.tsx`
- **AccountChart** — props: data — `src/app/(app)/analytics/components/account-chart.tsx`
- **AnalyticsDashboard** — props: transactions, categories, granularity — `src/app/(app)/analytics/components/analytics-dashboard.tsx`
- **CategoryChart** — props: data — `src/app/(app)/analytics/components/category-chart.tsx`
- **EvolutionChart** — props: data — `src/app/(app)/analytics/components/evolution-chart.tsx`
- **PeriodFilter** — props: startDate, endDate, granularity — `src/app/(app)/analytics/components/period-filter.tsx`
- **SeriesEvolutionChart** — props: data, seriesKeys — `src/app/(app)/analytics/components/series-evolution-chart.tsx`
- **TransactionList** — props: transactions, categories, search, onSearchChange, categoryFilter, onCategoryFilterChange, hiddenIds, onToggleHidden, onClearHidden — `src/app/(app)/analytics/components/transaction-list.tsx`
- **TypeChart** — props: data — `src/app/(app)/analytics/components/type-chart.tsx`
- **CategoryForm** — props: category, categories — `src/app/(app)/categories/components/category-form.tsx`
- **PatrimonyChart** — props: data — `src/app/(app)/dashboard/patrimony-chart.tsx`
- **FixedIncomeForm** — props: fixedIncome, institutions — `src/app/(app)/fixed-income/components/fixed-income-form.tsx`
- **InstitutionForm** — props: institution — `src/app/(app)/institutions/components/institution-form.tsx`
- **RealEstateForm** — props: realEstate — `src/app/(app)/real-estate/components/real-estate-form.tsx`
- **MonthPicker** — props: value — `src/app/(app)/transactions/components/month-picker.tsx`
- **TransactionForm** — props: transaction, accounts, categories — `src/app/(app)/transactions/components/transaction-form.tsx`
- **VariableIncomeForm** — props: variableIncome, institutions — `src/app/(app)/variable-income/components/variable-income-form.tsx`
- **VehicleForm** — props: vehicle — `src/app/(app)/vehicles/components/vehicle-form.tsx`
- **ForgotPasswordPage** — `src/app/(auth)/forgot-password/page.tsx`
- **LoginPage** — `src/app/(auth)/login/page.tsx`
- **RegisterPage** — `src/app/(auth)/register/page.tsx`
- **Header** — props: userName, userEmail — `src/components/header.tsx`
- **Providers** — `src/components/providers.tsx`

## Components

- **AccountsPage** — `src/app/(app)/accounts/page.tsx`
- **AnalyticsPage** — props: searchParams — `src/app/(app)/analytics/page.tsx`
- **CategoriesPage** — `src/app/(app)/categories/page.tsx`
- **DashboardPage** — `src/app/(app)/dashboard/page.tsx`
- **FixedIncomePage** — `src/app/(app)/fixed-income/page.tsx`
- **InstitutionsPage** — `src/app/(app)/institutions/page.tsx`
- **AppLayout** — `src/app/(app)/layout.tsx`
- **ProfilePage** — `src/app/(app)/profile/page.tsx`
- **RealEstatePage** — `src/app/(app)/real-estate/page.tsx`
- **TransactionsPage** — props: searchParams — `src/app/(app)/transactions/page.tsx`
- **VariableIncomePage** — `src/app/(app)/variable-income/page.tsx`
- **VehiclesPage** — `src/app/(app)/vehicles/page.tsx`
- **AuthLayout** — `src/app/(auth)/layout.tsx`
- **RootLayout** — `src/app/layout.tsx`
- **Home** — `src/app/page.tsx`
- **PageHeader** — props: title, description, action, className — `src/components/page-header.tsx`

---
_Back to [overview.md](./overview.md)_