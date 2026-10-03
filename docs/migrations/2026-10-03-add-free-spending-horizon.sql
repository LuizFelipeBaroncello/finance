-- Horizonte de uso livre: projeção dia a dia do saldo destinado a gastos livres.
-- free_spending_plan: configuração (1 por client) — aporte mensal, dia do aporte,
--   gasto diário estimado, limiar de alerta e quais macros/categorias contam como uso livre.
-- free_spending_month: aporte de um mês específico (sobrescreve o valor padrão do plano).
-- free_spending_planned: gastos pontuais planejados em datas futuras.

CREATE TABLE finance.free_spending_plan (
  free_spending_plan_id bigserial PRIMARY KEY,
  client_id         bigint NOT NULL UNIQUE REFERENCES finance.client(client_id) ON DELETE CASCADE,
  start_date        date NOT NULL,
  monthly_amount    numeric(14,2) NOT NULL CHECK (monthly_amount >= 0),
  pay_day           int NOT NULL CHECK (pay_day BETWEEN 1 AND 31),
  daily_estimate    numeric(14,2) NOT NULL DEFAULT 0 CHECK (daily_estimate >= 0),
  warning_pct       numeric(5,2) NOT NULL DEFAULT 20 CHECK (warning_pct >= 0 AND warning_pct <= 100),
  macro_category_ids bigint[] NOT NULL DEFAULT '{}',
  category_ids      bigint[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE finance.free_spending_month (
  free_spending_month_id bigserial PRIMARY KEY,
  client_id  bigint NOT NULL REFERENCES finance.client(client_id) ON DELETE CASCADE,
  month      date NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
  amount     numeric(14,2) NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, month)
);

CREATE TABLE finance.free_spending_planned (
  free_spending_planned_id bigserial PRIMARY KEY,
  client_id   bigint NOT NULL REFERENCES finance.client(client_id) ON DELETE CASCADE,
  date        date NOT NULL,
  description text NOT NULL,
  amount      numeric(14,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX free_spending_planned_client_date_idx
  ON finance.free_spending_planned (client_id, date);

GRANT SELECT, INSERT, UPDATE, DELETE ON finance.free_spending_plan TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON finance.free_spending_month TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON finance.free_spending_planned TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE finance.free_spending_plan_free_spending_plan_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE finance.free_spending_month_free_spending_month_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE finance.free_spending_planned_free_spending_planned_id_seq TO authenticated;

ALTER TABLE finance.free_spending_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.free_spending_month ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.free_spending_planned ENABLE ROW LEVEL SECURITY;

CREATE POLICY free_spending_plan_own ON finance.free_spending_plan
  FOR ALL TO authenticated
  USING (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));

CREATE POLICY free_spending_month_own ON finance.free_spending_month
  FOR ALL TO authenticated
  USING (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));

CREATE POLICY free_spending_planned_own ON finance.free_spending_planned
  FOR ALL TO authenticated
  USING (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT client_id FROM finance.client WHERE auth_user_id = auth.uid()));
