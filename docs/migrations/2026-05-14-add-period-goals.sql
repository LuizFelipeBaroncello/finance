-- Metas em R$ por período (trimestre, semestre, ano) com suporte a template + override.
-- Escopo exclusivo: macro categoria OU categoria específica.
-- Semântica: cap (teto de gasto) ou target (alvo de acúmulo).

CREATE TABLE finance.period_goal (
  period_goal_id    bigserial PRIMARY KEY,
  client_id         bigint NOT NULL REFERENCES finance.client(client_id) ON DELETE CASCADE,

  macro_category_id bigint REFERENCES finance.macro_category(macro_category_id) ON DELETE CASCADE,
  category_id       bigint REFERENCES finance.category(category_id) ON DELETE CASCADE,

  period_type   text NOT NULL CHECK (period_type IN ('quarter','semester','year')),
  year          int,
  period_index  int,
  kind          text NOT NULL CHECK (kind IN ('cap','target')),
  amount        numeric(14,2) NOT NULL CHECK (amount >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT period_goal_scope_xor
    CHECK ((macro_category_id IS NOT NULL) <> (category_id IS NOT NULL)),
  CONSTRAINT period_goal_year_index_consistency
    CHECK (
      (period_type = 'year'    AND period_index IS NULL) OR
      (period_type = 'quarter' AND period_index BETWEEN 1 AND 4) OR
      (period_type = 'semester' AND period_index BETWEEN 1 AND 2)
    )
);

CREATE UNIQUE INDEX period_goal_unique_idx ON finance.period_goal (
  client_id,
  COALESCE(macro_category_id, 0),
  COALESCE(category_id, 0),
  period_type,
  COALESCE(year, 0),
  COALESCE(period_index, 0),
  kind
);

CREATE INDEX period_goal_client_idx ON finance.period_goal(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON finance.period_goal TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE finance.period_goal_period_goal_id_seq TO authenticated;

ALTER TABLE finance.period_goal ENABLE ROW LEVEL SECURITY;

CREATE POLICY period_goal_select_own ON finance.period_goal
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));

CREATE POLICY period_goal_insert_own ON finance.period_goal
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));

CREATE POLICY period_goal_update_own ON finance.period_goal
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));

CREATE POLICY period_goal_delete_own ON finance.period_goal
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));
