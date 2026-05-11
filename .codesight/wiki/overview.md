# feed-level-temp — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**feed-level-temp** is a typescript project built with next-app.

## Scale

1 API routes · 50 UI components · 8 library files · 1 middleware layers · 5 environment variables

## Subsystems

- **[Auth](./auth.md)** — 1 routes — touches: auth

**UI:** 50 components (react) — see [ui.md](./ui.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `src/lib/supabase/server.ts` — imported by **30** files
- `src/components/ui/button.tsx` — imported by **19** files
- `src/lib/utils.ts` — imported by **18** files
- `src/components/ui/input.tsx` — imported by **13** files
- `src/components/page-header.tsx` — imported by **10** files
- `src/components/ui/card.tsx` — imported by **10** files

## Required Environment Variables

- `SUPABASE_JAVA_CLASSIFIER` — `scripts/seed-classification-rules.mjs`
- `SUPABASE_SERVICE_KEY` — `scripts/seed-classification-rules.mjs`

---
_Back to [index.md](./index.md) · Generated 2026-05-09_