import { createRequire } from "node:module";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

if (!GlobalWorkerOptions.workerSrc) {
  const require = createRequire(import.meta.url);
  GlobalWorkerOptions.workerSrc = require.resolve(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
  );
}

const Y_TOLERANCE = 3;

const NOISE_PATTERNS: RegExp[] = [
  /^Aplicativo Bradesco/i,
  /^Data:\s/i,
  /^Situa[cç][aã]o do Extrato/i,
  /^LUIZ\s+F\s+R\s+BARONCELLO/i,
  /^Data\s+Hist[oó]rico/i,
  /^Moeda de/i,
  /^Cota[cç][aã]o/i,
  /^Total para/i,
  /^Total da Fatura/i,
  /^X{4}\.X{4}/,
  /^US\$$/i,
  /^R\$$/i,
  /^origem$/i,
  /^[.\s]*$/,
];

const IGNORED_DESCRIPTION_PATTERNS: RegExp[] = [
  /^SALDO ANTERIOR$/i,
  /^PAGTO\.?\s*POR DEB EM C\/C$/i,
];

const COMPLETE_REGEX = /^(\d{2}\/\d{2})\s+(.+?)\s+(-?[\d.]+,\d{2})$/;
const DATE_AMOUNT_REGEX = /^(\d{2}\/\d{2})\s+(-?[\d.]+,\d{2})$/;
const DATE_PARTIAL_REGEX = /^(\d{2}\/\d{2})\s+(.+)$/;
const TRAILING_AMOUNT_REGEX = /^(.+?)\s+(-?[\d.]+,\d{2})$/;

type Token =
  | { kind: "complete"; date: string; description: string; amount: string }
  | { kind: "date_amount"; date: string; amount: string }
  | { kind: "date_partial"; date: string; description: string }
  | { kind: "text_amount"; description: string; amount: string }
  | { kind: "text"; text: string }
  | { kind: "noise" };

type RawTxn = { date: string; description: string; amount: string };

function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(line));
}

function isIgnored(description: string): boolean {
  const trimmed = description.trim();
  return IGNORED_DESCRIPTION_PATTERNS.some((re) => re.test(trimmed));
}

function classify(line: string): Token {
  if (isNoise(line)) return { kind: "noise" };
  let m = line.match(COMPLETE_REGEX);
  if (m) return { kind: "complete", date: m[1], description: m[2].trim(), amount: m[3] };
  m = line.match(DATE_AMOUNT_REGEX);
  if (m) return { kind: "date_amount", date: m[1], amount: m[2] };
  m = line.match(DATE_PARTIAL_REGEX);
  if (m) return { kind: "date_partial", date: m[1], description: m[2].trim() };
  m = line.match(TRAILING_AMOUNT_REGEX);
  if (m) return { kind: "text_amount", description: m[1].trim(), amount: m[2] };
  return { kind: "text", text: line };
}

async function extractLines(pdfBuffer: Uint8Array): Promise<string[]> {
  const doc = await getDocument({ data: pdfBuffer, disableFontFace: true }).promise;
  const allLines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.filter((i): i is TextItem => "str" in i && "transform" in i);

    const groups: { y: number; items: TextItem[] }[] = [];
    for (const item of items) {
      const y = item.transform[5];
      let group = groups.find((g) => Math.abs(g.y - y) < Y_TOLERANCE);
      if (!group) {
        group = { y, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    groups.sort((a, b) => b.y - a.y);
    for (const g of groups) {
      g.items.sort((a, b) => a.transform[4] - b.transform[4]);
      const line = g.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
      if (line) allLines.push(line);
    }
  }
  return allLines;
}

function joinDesc(...parts: string[]): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function stitch(tokens: Token[]): RawTxn[] {
  const txns: RawTxn[] = [];
  const used = new Set<number>();

  const findBackText = (i: number): { idx: number; text: string } | null => {
    for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
      const t = tokens[j];
      if (used.has(j)) continue;
      if (t.kind === "noise") continue;
      if (t.kind === "text") return { idx: j, text: t.text };
      return null;
    }
    return null;
  };

  const findForwardText = (i: number): { idx: number; text: string } | null => {
    for (let j = i + 1; j < tokens.length && j <= i + 3; j++) {
      const t = tokens[j];
      if (used.has(j)) continue;
      if (t.kind === "noise") continue;
      if (t.kind === "text") return { idx: j, text: t.text };
      return null;
    }
    return null;
  };

  for (let i = 0; i < tokens.length; i++) {
    if (used.has(i)) continue;
    const t = tokens[i];
    if (t.kind === "complete") {
      txns.push({ date: t.date, description: t.description, amount: t.amount });
      used.add(i);
      continue;
    }
    if (t.kind === "date_amount") {
      const back = findBackText(i);
      const fwd = findForwardText(i);
      const description = joinDesc(back?.text ?? "", fwd?.text ?? "");
      if (description) {
        txns.push({ date: t.date, description, amount: t.amount });
        used.add(i);
        if (back) used.add(back.idx);
        if (fwd) used.add(fwd.idx);
      }
      continue;
    }
    if (t.kind === "date_partial") {
      // amount lives on a following line (text_amount or text then amount)
      for (let j = i + 1; j < tokens.length && j <= i + 3; j++) {
        const next = tokens[j];
        if (used.has(j)) continue;
        if (next.kind === "noise") continue;
        if (next.kind === "text_amount") {
          txns.push({
            date: t.date,
            description: joinDesc(t.description, next.description),
            amount: next.amount,
          });
          used.add(i);
          used.add(j);
          break;
        }
        break;
      }
      continue;
    }
  }
  return txns;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function extractBradescoCreditCsv(
  pdfBuffer: ArrayBuffer | Uint8Array,
  year: number,
): Promise<{ csv: string; ignoredDescriptions: string[] }> {
  const buf = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
  const lines = await extractLines(buf);
  const tokens = lines.map(classify);
  const txns = stitch(tokens);

  const ignoredDescriptions: string[] = [];
  const csvLines: string[] = ["data,moeda,descricao,valor"];
  for (const t of txns) {
    const fullDate = `${t.date}/${year}`;
    csvLines.push(
      [csvEscape(fullDate), csvEscape(""), csvEscape(t.description), csvEscape(t.amount)].join(","),
    );
    if (isIgnored(t.description)) {
      ignoredDescriptions.push(t.description.trim());
    }
  }

  return { csv: csvLines.join("\n"), ignoredDescriptions };
}
