-- Add is_provisional flag to transaction table
ALTER TABLE transaction
  ADD COLUMN is_provisional boolean NOT NULL DEFAULT false;

-- Partial index: only provisional rows are indexed.
-- Used by gate count (per-pageview) and review-page fetch.
CREATE INDEX transaction_provisional_idx
  ON transaction (account_id)
  WHERE is_provisional = true;
