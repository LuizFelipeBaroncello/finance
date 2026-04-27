#!/usr/bin/env node
/**
 * Seed finance.classification_rule from the legacy Java classifier.
 *
 * Usage:
 *   node scripts/seed-classification-rules.mjs --client-id <id>            # dry run, prints JSON
 *   node scripts/seed-classification-rules.mjs --client-id <id> --apply    # inserts
 *
 * Env required for --apply:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (or a service key)
 *
 * Requires SUPABASE_JAVA_CLASSIFIER env var OR the default path below to resolve
 * to TransactionClassifier.java.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_JAVA =
  process.env.SUPABASE_JAVA_CLASSIFIER ??
  resolve(
    __dirname,
    "../../finances2/finances_app/src/main/java/dev/baroncello/finances/TransactionClassifier.java",
  );

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const emitSql = args.includes("--sql");
const clientIdIdx = args.indexOf("--client-id");
const clientId = clientIdIdx >= 0 ? Number(args[clientIdIdx + 1]) : null;
const categoryMapIdx = args.indexOf("--category-map");
const categoryMapJson = categoryMapIdx >= 0 ? args[categoryMapIdx + 1] : null;

if (!clientId) {
  console.error("Missing --client-id <number>");
  process.exit(1);
}

/**
 * Category name mapping: Java label → finance.category.category_name.
 * Add aliases here when the seed can't find a category match.
 */
const CATEGORY_ALIASES = {
  "Transferencia enviada": "Transferencia enviada",
};

// Category labels the Java code emits but we intentionally don't map to a rule.
// Fatura cartão = pagamento entre contas próprias; handled as 'transfer' in the flow.
const SKIP_CATEGORIES = new Set([
  "Fatura cartao de credito",
  "Transferencia contas (minhas entradas)",
]);

function extractRules(javaSource) {
  const lines = javaSource.split("\n");
  // Credit card classifier uses values[2] for desc / values[1] for category.
  // Debit helper methods use values[3] for desc / values[2] for category.
  const containsRe = /values\[[23]\]\.contains\("([^"]+)"\)/;
  const assignRe = /values\[[12]\]\s*=\s*"([^"]+)"/;

  const rules = [];
  let pending = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cm = line.match(containsRe);
    if (cm) {
      // skip negated guards (e.g. if (!values[2].contains("Pagamento recebido")))
      const beforeMatch = line.slice(0, line.indexOf("values["));
      if (/![\s]*$/.test(beforeMatch)) continue;
      pending.push(cm[1]);
      continue;
    }
    const am = line.match(assignRe);
    if (am && pending.length > 0) {
      const category = am[1];
      for (const pattern of pending) rules.push({ pattern, category });
      pending = [];
    }
  }

  // Deduplicate (pattern, category) pairs
  const seen = new Set();
  const deduped = [];
  for (const r of rules) {
    const key = `${r.pattern}||${r.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }
  return deduped;
}

const javaSource = readFileSync(DEFAULT_JAVA, "utf8");
const rules = extractRules(javaSource);

const byCategory = rules.reduce((acc, r) => {
  (acc[r.category] ??= []).push(r.pattern);
  return acc;
}, {});

console.error(
  `Extracted ${rules.length} rules across ${Object.keys(byCategory).length} categories.`,
);
for (const [cat, pats] of Object.entries(byCategory)) {
  console.error(`  ${cat.padEnd(35)} ${pats.length}`);
}

if (emitSql) {
  if (!categoryMapJson) {
    console.error("--sql requires --category-map '<json>' mapping java category name -> category_id");
    process.exit(1);
  }
  const map = JSON.parse(categoryMapJson);
  const values = [];
  for (const r of rules) {
    if (SKIP_CATEGORIES.has(r.category)) continue;
    const alias = CATEGORY_ALIASES[r.category] ?? r.category;
    const id = map[alias];
    if (!id) {
      console.error(`skip: no category_id for "${r.category}" (alias "${alias}")`);
      continue;
    }
    const esc = r.pattern.replace(/'/g, "''");
    values.push(`('${esc}', ${id}, ${clientId}, 0)`);
  }
  console.log(
    `insert into finance.classification_rule (pattern, category_id, client_id, priority) values\n${values.join(",\n")};`,
  );
  process.exit(0);
}

if (!apply) {
  console.log(JSON.stringify(byCategory, null, 2));
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and/or key env var.");
  process.exit(1);
}

const supabase = createClient(url, key, { db: { schema: "finance" } });

const { data: categories, error: catErr } = await supabase
  .from("category")
  .select("category_id, category_name")
  .eq("client_id", clientId);

if (catErr) {
  console.error("Failed to load categories:", catErr.message);
  process.exit(1);
}

const byName = new Map(
  (categories ?? []).map((c) => [c.category_name.toLowerCase(), c.category_id]),
);

const toInsert = [];
const missing = new Set();

for (const r of rules) {
  const mapped = CATEGORY_ALIASES[r.category] ?? r.category;
  const id = byName.get(mapped.toLowerCase());
  if (!id) {
    missing.add(r.category);
    continue;
  }
  toInsert.push({
    pattern: r.pattern,
    category_id: id,
    client_id: clientId,
    priority: 0,
  });
}

if (missing.size > 0) {
  console.error(
    `Categories not found in finance.category (create them first, or add aliases): ${[...missing].join(", ")}`,
  );
}

console.error(`Inserting ${toInsert.length} rules...`);

const CHUNK = 500;
for (let i = 0; i < toInsert.length; i += CHUNK) {
  const chunk = toInsert.slice(i, i + CHUNK);
  const { error } = await supabase.from("classification_rule").insert(chunk);
  if (error) {
    console.error(`Chunk ${i} failed:`, error.message);
    process.exit(1);
  }
}

console.error("Done.");
