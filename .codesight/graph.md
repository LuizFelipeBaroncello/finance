# Dependency Graph

## Most Imported Files (change these carefully)

- `src/lib/supabase/server.ts` — imported by **22** files
- `src/lib/utils.ts` — imported by **17** files
- `src/components/ui/button.tsx` — imported by **14** files
- `src/components/ui/input.tsx` — imported by **9** files
- `src/components/page-header.tsx` — imported by **8** files
- `src/components/ui/badge.tsx` — imported by **8** files
- `src/components/ui/card.tsx` — imported by **7** files
- `src/app/(app)/analytics/types.ts` — imported by **4** files
- `src/app/(auth)/actions.ts` — imported by **4** files
- `src/components/sidebar.tsx` — imported by **2** files
- `src/lib/supabase/types.ts` — imported by **2** files
- `src/app/(app)/accounts/actions.ts` — imported by **1** files
- `src/app/(app)/accounts/components/account-form.tsx` — imported by **1** files
- `src/app/(app)/analytics/components/evolution-chart.tsx` — imported by **1** files
- `src/app/(app)/analytics/components/category-chart.tsx` — imported by **1** files
- `src/app/(app)/analytics/components/type-chart.tsx` — imported by **1** files
- `src/app/(app)/analytics/components/account-chart.tsx` — imported by **1** files
- `src/app/(app)/analytics/components/series-evolution-chart.tsx` — imported by **1** files
- `src/app/(app)/analytics/components/transaction-list.tsx` — imported by **1** files
- `src/app/(app)/analytics/components/period-filter.tsx` — imported by **1** files

## Import Map (who imports what)

- `src/lib/supabase/server.ts` ← `src/app/(app)/accounts/actions.ts`, `src/app/(app)/accounts/page.tsx`, `src/app/(app)/analytics/page.tsx`, `src/app/(app)/categories/actions.ts`, `src/app/(app)/categories/page.tsx` +17 more
- `src/lib/utils.ts` ← `src/app/(app)/analytics/components/period-filter.tsx`, `src/components/page-header.tsx`, `src/components/sidebar.tsx`, `src/components/ui/avatar.tsx`, `src/components/ui/badge.tsx` +12 more
- `src/components/ui/button.tsx` ← `src/app/(app)/accounts/components/account-form.tsx`, `src/app/(app)/analytics/components/period-filter.tsx`, `src/app/(app)/analytics/components/transaction-list.tsx`, `src/app/(app)/categories/components/category-form.tsx`, `src/app/(app)/fixed-income/components/fixed-income-form.tsx` +9 more
- `src/components/ui/input.tsx` ← `src/app/(app)/accounts/components/account-form.tsx`, `src/app/(app)/analytics/components/transaction-list.tsx`, `src/app/(app)/categories/components/category-form.tsx`, `src/app/(app)/fixed-income/components/fixed-income-form.tsx`, `src/app/(app)/institutions/components/institution-form.tsx` +4 more
- `src/components/page-header.tsx` ← `src/app/(app)/accounts/page.tsx`, `src/app/(app)/categories/page.tsx`, `src/app/(app)/fixed-income/page.tsx`, `src/app/(app)/institutions/page.tsx`, `src/app/(app)/real-estate/page.tsx` +3 more
- `src/components/ui/badge.tsx` ← `src/app/(app)/analytics/components/transaction-list.tsx`, `src/app/(app)/categories/page.tsx`, `src/app/(app)/fixed-income/page.tsx`, `src/app/(app)/institutions/page.tsx`, `src/app/(app)/real-estate/page.tsx` +3 more
- `src/components/ui/card.tsx` ← `src/app/(app)/analytics/components/analytics-dashboard.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/fixed-income/page.tsx`, `src/app/(app)/real-estate/page.tsx`, `src/app/(app)/transactions/page.tsx` +2 more
- `src/app/(app)/analytics/types.ts` ← `src/app/(app)/analytics/components/analytics-dashboard.tsx`, `src/app/(app)/analytics/components/transaction-list.tsx`, `src/app/(app)/analytics/lib/aggregations.ts`, `src/app/(app)/analytics/page.tsx`
- `src/app/(auth)/actions.ts` ← `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/components/header.tsx`
- `src/components/sidebar.tsx` ← `src/app/(app)/layout.tsx`, `src/components/header.tsx`
