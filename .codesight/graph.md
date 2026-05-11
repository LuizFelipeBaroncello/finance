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
