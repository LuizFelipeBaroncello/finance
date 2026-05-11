import { test } from "node:test";
import assert from "node:assert/strict";
import { dateWindow, mapPluggyTransaction } from "./map";

test("dateWindow returns from = today - days and to = today, ISO date only", () => {
  const { from, to } = dateWindow(30, new Date("2026-05-11T12:00:00Z"));
  assert.equal(to, "2026-05-11");
  assert.equal(from, "2026-04-11");
});

test("dateWindow supports 20 days", () => {
  const { from, to } = dateWindow(20, new Date("2026-05-11T00:00:00Z"));
  assert.equal(from, "2026-04-21");
  assert.equal(to, "2026-05-11");
});

test("mapPluggyTransaction DEBIT -> negative rawAmount, type debit, abs amount", () => {
  const row = mapPluggyTransaction({
    description: "MERCADO X",
    amount: 50.5,
    type: "DEBIT",
    date: "2026-05-10T03:00:00.000Z",
  });
  assert.equal(row.description, "MERCADO X");
  assert.equal(row.amount, 50.5);
  assert.equal(row.rawAmount, -50.5);
  assert.equal(row.type, "debit");
  assert.equal(row.date, "2026-05-10");
});

test("mapPluggyTransaction CREDIT -> positive rawAmount, type credit", () => {
  const row = mapPluggyTransaction({
    description: "SALARIO",
    amount: 1000,
    type: "CREDIT",
    date: "2026-05-01",
  });
  assert.equal(row.rawAmount, 1000);
  assert.equal(row.type, "credit");
  assert.equal(row.date, "2026-05-01");
});

test("mapPluggyTransaction uses abs of given amount regardless of sign", () => {
  const row = mapPluggyTransaction({
    description: "X",
    amount: -42,
    type: "DEBIT",
    date: "2026-05-02",
  });
  assert.equal(row.amount, 42);
  assert.equal(row.rawAmount, -42);
});
