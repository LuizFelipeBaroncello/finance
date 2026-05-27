"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "fl-values-hidden";

/** Placeholder shown in place of a monetary value when visibility is off. */
export const MASK = "R$ ••••";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Format a number as Brazilian Real (e.g. R$ 1.234,56). */
export function formatBRL(value: number) {
  return brlFormatter.format(value);
}

// External store backing the global visibility toggle, persisted in
// localStorage so the preference survives reloads and syncs across tabs.
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// Default to hidden: values stay masked until the user explicitly reveals
// them (stored as "0"). Any other state — including no stored preference — is
// treated as hidden.
function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) !== "0";
}

function getServerSnapshot() {
  return true;
}

function toggleHidden() {
  const next = window.localStorage.getItem(STORAGE_KEY) === "0";
  window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  emit();
}

/**
 * Kept for provider-tree compatibility. State lives in an external store, so no
 * actual context is needed — this simply renders its children.
 */
export function CurrencyVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function useCurrencyVisibility() {
  const hidden = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return { hidden, toggle: toggleHidden };
}

/**
 * Format a BRL value, returning the mask when global visibility is off.
 * Useful inside recharts formatters where <Money> can't be rendered.
 */
export function useFormatBRL() {
  const { hidden } = useCurrencyVisibility();
  return (value: number) => (hidden ? MASK : formatBRL(value));
}

/** Renders a monetary value, masking it when global visibility is off. */
export function Money({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const { hidden } = useCurrencyVisibility();
  return (
    <span className={className}>{hidden ? MASK : formatBRL(value)}</span>
  );
}
