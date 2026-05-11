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
