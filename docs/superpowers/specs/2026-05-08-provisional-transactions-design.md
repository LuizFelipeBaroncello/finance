# Provisional Transactions Review

## Context

An external integration will start writing transactions directly into the `transaction` table via SQL. These rows must be marked provisional and the user must classify them inside the app — same UX as the existing import wizard's classification step (rules pre-fill suggestions, user can edit type/category/raw fields, create rules inline, ignore rows).

On app open, if the user has provisional transactions, the app redirects them once per session to a review page. After that, a persistent banner reminds them.

## Goals

- Provisional rows live in `transaction` with a flag, not in a separate table.
- Existing reads (lists, dashboard, analytics, report) ignore provisional rows.
- Classification UX is shared between import and review (one component, two consumers).
- Confirming a row updates it in place (preserves `trans_id`); ignoring deletes it.

## Non-goals

- No background job, no notifications, no admin UI for the integration.
- No changes to the import wizard's parser/upload steps.
- No detection of duplicates between two provisional rows (only provisional vs confirmed).

## Schema

Add to `transaction`:

- `is_provisional boolean NOT NULL DEFAULT false`
- Partial index: `CREATE INDEX transaction_provisional_idx ON transaction (account_id) WHERE is_provisional = true`

Integration contract (documented, not enforced):

- Insert with `is_provisional = true`.
- Fill `type` with a guess: `credit` if `amount > 0`, else `debit`.
- Do not insert into `re_category_transaction`.

## Read-side audit

All queries that aggregate or list confirmed transactions must add `.eq("is_provisional", false)`. Audited surfaces (list to be confirmed in the implementation plan):

- `/transactions` list
- Dashboard widgets
- `/analytics` queries
- Report view
- `flagDuplicates` in import (already filters by account/date — must also filter `is_provisional=false` so a provisional row is not counted as a duplicate of itself).

## Classifier refactor

`classifyRows` today takes `ParsedRow[]` and a `BankSource`. For review, input comes from the DB and carries `trans_id`.

- Generalize input to any `{ date, description, rawAmount }`. Pass `trans_id` through when present.
- New type: `ProvisionalRow = ClassifiedRow & { transId: number; accountId: number }`.
- For review, classifier runs without a strict `BankSource` — it respects the `type` guess the integration inserted and only applies rule matching + self-transfer detection. Source-based heuristics (credit-card always debit, sign-based for debit accounts) are skipped.

## Shared classification component

Extract from `src/app/(app)/transactions/import/components/import-wizard.tsx` the classification step into:

`src/components/transactions/classification-table.tsx`

Props:

```ts
type Props = {
  rows: ClassifiedRow[];
  categories: Category[];
  onChange: (rows: ClassifiedRow[]) => void;
  onCreateRule: (pattern: string, categoryId: number) => Promise<void>;
};
```

Behavior owned by this component:

- Editable date/description/amount per row.
- Type picker (debit/credit/transfer).
- Category picker.
- Inline "create rule from this row".
- Ignore toggle.
- Duplicate badge rendering.

Both `import-wizard.tsx` and the new review page consume it. No behavioral changes for the import flow.

## Review page

Route: `src/app/(app)/transactions/review/page.tsx` (Server Component).

Server-side load:

1. Fetch all provisional rows for the current client:
   `SELECT trans_id, account_id, date, description, amount, type FROM transaction WHERE is_provisional = true`
   (RLS or explicit `client_id` filter — verify in plan).
2. Group by `account_id`. For each group, run the (refactored) classifier to get rule-based suggestions and self-transfer detection.
3. Run duplicate detection against confirmed rows: same `account_id`, `date`, `description`, `abs(amount)`, `is_provisional = false`. Mark matches `duplicate=true, ignored=true`.
4. Fetch categories and rules for inline rule creation.
5. Render `<ReviewClient />` (client component) with grouped rows and shared `<ClassificationTable />` per group.
6. On mount (server), set cookie `provisional_review_seen=1` (httpOnly, sameSite=lax, no maxAge → session cookie).

Confirm action: `confirmProvisionalReview(rows: ProvisionalRow[])` (server action).

For each row:

- If `ignored` (manual or duplicate): `DELETE FROM transaction WHERE trans_id = ?`.
- Otherwise: `UPDATE transaction SET type, date, description, amount, is_provisional=false WHERE trans_id = ?` + `INSERT INTO re_category_transaction (trans_id, category_id)` if `categoryId != null`.

Returns `{ confirmed: number, deleted: number, errors: { transId: number, message: string }[] }`.

After action: `revalidatePath('/transactions')`, `revalidatePath('/transactions/review')`. Client shows toast; rows that errored stay on screen for retry.

## Gate

Implemented in `src/app/(app)/layout.tsx` (Server Component).

```ts
const cookieStore = await cookies();
const dismissed = cookieStore.has("provisional_review_seen");
const pathname = headers().get("x-pathname") ?? "";
const onReviewPage = pathname.startsWith("/transactions/review");

const { count } = await supabase
  .from("transaction")
  .select("trans_id", { count: "exact", head: true })
  .eq("is_provisional", true);

if ((count ?? 0) > 0 && !dismissed && !onReviewPage) {
  redirect("/transactions/review");
}
```

Pathname header: middleware sets `x-pathname` on request headers (standard Next.js pattern). Required to avoid redirect loop.

Persistent banner: `<ProvisionalBanner count={count} />` rendered in the same layout whenever `count > 0`, independent of the cookie. Links to `/transactions/review`. Hidden when count is 0.

Cost: one partial-index `count(*)` per `(app)` pageview. Acceptable.

## Edge cases

- **Multiple accounts in review**: visual grouping by account name; classifier runs per group.
- **Partial errors on confirm**: server action returns per-row errors; failed rows remain visible for retry.
- **No category selected**: allowed (mirrors import). Only `type` and flag are updated.
- **Integration inserts during review**: after confirm, redirect to `/transactions`. New provisionals inserted mid-review trigger banner (cookie already set this session, so no forced redirect). Acceptable.
- **New session / cookie cleared**: gate fires again. Expected.
- **RLS / multi-tenant**: gate count, review fetch, confirm update/delete must respect client scope. Verify RLS on `transaction` covers all three; otherwise add explicit `client_id` filter.

## Files touched (preliminary)

- Migration: add `is_provisional` + partial index to `transaction`.
- `src/lib/transactions/classifier.ts` — generalize input, optional `trans_id` passthrough.
- `src/lib/transactions/types.ts` — add `ProvisionalRow`.
- `src/components/transactions/classification-table.tsx` — new shared component (extracted).
- `src/app/(app)/transactions/import/components/import-wizard.tsx` — consume shared component.
- `src/app/(app)/transactions/review/page.tsx` — new route.
- `src/app/(app)/transactions/review/actions.ts` — `confirmProvisionalReview`.
- `src/app/(app)/transactions/review/components/review-client.tsx` — client wrapper.
- `src/app/(app)/layout.tsx` — gate + banner mount.
- `src/components/provisional-banner.tsx` — new banner component.
- `src/middleware.ts` — set `x-pathname` header.
- All read sites that aggregate/list `transaction` — add `.eq("is_provisional", false)`.

## Out of scope

- Decomposing `BankSource`/`account.source` mapping if missing — handled in plan if discovered.
- Auth changes.
- Any UI rework outside the classification table extraction.
