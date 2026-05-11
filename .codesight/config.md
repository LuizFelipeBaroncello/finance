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
