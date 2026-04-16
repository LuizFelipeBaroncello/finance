# Project Context

This is a typescript project using next-app.

The API has 1 routes. See .codesight/routes.md for the full route map with methods, paths, and tags.
The UI has 39 components. See .codesight/components.md for the full list with props.
Middleware includes: auth.

High-impact files (most imported, changes here affect many other files):
- src/lib/supabase/server.ts (imported by 22 files)
- src/lib/utils.ts (imported by 17 files)
- src/components/ui/button.tsx (imported by 14 files)
- src/components/ui/input.tsx (imported by 9 files)
- src/components/page-header.tsx (imported by 8 files)
- src/components/ui/badge.tsx (imported by 8 files)
- src/components/ui/card.tsx (imported by 7 files)
- src/app/(app)/analytics/types.ts (imported by 4 files)

Read .codesight/wiki/index.md for orientation (WHERE things live). Then read actual source files before implementing. Wiki articles are navigation aids, not implementation guides.
Read .codesight/CODESIGHT.md for the complete AI context map including all routes, schema, components, libraries, config, middleware, and dependency graph.
