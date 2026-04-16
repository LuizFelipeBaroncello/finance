# feed-level-temp — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**feed-level-temp** is a typescript project built with next-app.

## Scale

1 API routes · 39 UI components · 5 library files · 1 middleware layers · 3 environment variables

## Subsystems

- **[Auth](./auth.md)** — 1 routes — touches: auth

**UI:** 39 components (react) — see [ui.md](./ui.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `src/lib/supabase/server.ts` — imported by **22** files
- `src/lib/utils.ts` — imported by **17** files
- `src/components/ui/button.tsx` — imported by **14** files
- `src/components/ui/input.tsx` — imported by **9** files
- `src/components/page-header.tsx` — imported by **8** files
- `src/components/ui/badge.tsx` — imported by **8** files

---
_Back to [index.md](./index.md) · Generated 2026-04-16_