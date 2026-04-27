import Papa from "papaparse";
import type { BankSource, ParsedRow } from "../types";

function parseCsv(content: string, expectQuotes: boolean): string[][] {
  const result = Papa.parse<string[]>(content.trim(), {
    skipEmptyLines: true,
    quoteChar: expectQuotes ? '"' : "",
  });
  return result.data;
}

function ddmmyyyyToIso(d: string): string {
  const [day, month, year] = d.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseAmount(raw: string): number {
  return Number(raw.replace(",", "."));
}

function parseNubankCredit(content: string): ParsedRow[] {
  const rows = parseCsv(content, false);
  const [header, ...data] = rows;
  if (!header || header[0].toLowerCase() !== "date") {
    throw new Error(`Nubank crédito: cabeçalho inesperado: ${header?.join(",")}`);
  }
  return data
    .filter((r) => r.length >= 4)
    .filter((r) => !r[2].toLowerCase().includes("pagamento recebido"))
    .map((r) => {
      const raw = parseAmount(r[3]);
      return {
        date: r[0],
        description: r[2],
        amount: Math.abs(raw),
        rawAmount: raw,
      };
    });
}

function parseNubankDebit(content: string): ParsedRow[] {
  const rows = parseCsv(content, false);
  const [header, ...data] = rows;
  if (!header || header[0].toLowerCase() !== "data") {
    throw new Error(`Nubank débito: cabeçalho inesperado: ${header?.join(",")}`);
  }
  return data
    .filter((r) => r.length >= 4)
    .map((r) => {
      const raw = parseAmount(r[1]);
      return {
        date: ddmmyyyyToIso(r[0]),
        description: r[3],
        amount: Math.abs(raw),
        rawAmount: raw,
      };
    });
}

function parseBradescoCredit(content: string): ParsedRow[] {
  const rows = parseCsv(content, true);
  const [header, ...data] = rows;
  if (!header || header[0].toLowerCase() !== "data") {
    throw new Error(`Bradesco crédito: cabeçalho inesperado: ${header?.join(",")}`);
  }
  return data
    .filter((r) => r.length >= 4)
    .map((r) => {
      const raw = parseAmount(r[3]);
      return {
        date: ddmmyyyyToIso(r[0]),
        description: r[2],
        amount: Math.abs(raw),
        rawAmount: raw,
      };
    });
}

export function parseCsvContent(source: BankSource, content: string): ParsedRow[] {
  switch (source) {
    case "nubank_credit":
      return parseNubankCredit(content);
    case "nubank_debit":
      return parseNubankDebit(content);
    case "bradesco_credit":
      return parseBradescoCredit(content);
  }
}

export const BANK_SOURCE_LABELS: Record<BankSource, string> = {
  nubank_credit: "Nubank — cartão de crédito",
  nubank_debit: "Nubank — conta (débito)",
  bradesco_credit: "Bradesco — cartão de crédito",
};
