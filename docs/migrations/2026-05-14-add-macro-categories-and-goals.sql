-- Macro categorias (6 fixas, globais) + meta de % por client + FK opcional em category.

CREATE TABLE finance.macro_category (
  macro_category_id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  display_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO finance.macro_category (name, slug, display_order) VALUES
  ('Liberdade Financeira', 'liberdade_financeira', 1),
  ('Custos Fixos',         'custos_fixos',         2),
  ('Conforto',             'conforto',             3),
  ('Metas',                'metas',                4),
  ('Prazeres',             'prazeres',             5),
  ('Conhecimento',         'conhecimento',         6);

ALTER TABLE finance.category
  ADD COLUMN macro_category_id bigint
  REFERENCES finance.macro_category(macro_category_id) ON DELETE SET NULL;

CREATE INDEX category_macro_idx ON finance.category(macro_category_id);

CREATE TABLE finance.goal (
  goal_id bigserial PRIMARY KEY,
  client_id bigint NOT NULL REFERENCES finance.client(client_id) ON DELETE CASCADE,
  macro_category_id bigint NOT NULL REFERENCES finance.macro_category(macro_category_id) ON DELETE CASCADE,
  target_percentage numeric(5,2) NOT NULL CHECK (target_percentage >= 0 AND target_percentage <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, macro_category_id)
);

CREATE INDEX goal_client_idx ON finance.goal(client_id);

-- Grants para PostgREST (Supabase) acessar as tabelas.
GRANT USAGE ON SCHEMA finance TO authenticated, anon;
GRANT SELECT ON finance.macro_category TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON finance.goal TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE finance.goal_goal_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE finance.macro_category_macro_category_id_seq TO authenticated;

-- RLS: macro_category é lookup global; goal é por client.
ALTER TABLE finance.macro_category ENABLE ROW LEVEL SECURITY;
CREATE POLICY macro_category_read_all ON finance.macro_category
  FOR SELECT TO authenticated USING (true);

ALTER TABLE finance.goal ENABLE ROW LEVEL SECURITY;
CREATE POLICY goal_select_own ON finance.goal
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));
CREATE POLICY goal_insert_own ON finance.goal
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));
CREATE POLICY goal_update_own ON finance.goal
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));
CREATE POLICY goal_delete_own ON finance.goal
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));
