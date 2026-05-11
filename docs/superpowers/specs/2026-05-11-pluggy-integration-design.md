# Integração Pluggy (Open Finance) — Design

Data: 2026-05-11

## Objetivo

Permitir que o usuário conecte uma instituição financeira via Pluggy Connect e
importe as transações dos últimos 20 ou 30 dias (contas bancárias **e** cartões
de crédito) como transações provisórias, que aparecem na tela de consolidação
(`/transactions/review`, a mesma que exibe transações não confirmadas).

## Decisões tomadas (brainstorming)

- Escopo: backend completo (`connect-token` + `sync`) + botão de importação no frontend.
- Mapeamento de contas: o usuário escolhe uma `account` já cadastrada como destino;
  todas as transações do item Pluggy vão para essa conta. Sem migração de schema.
- Duplicatas: inserir tudo como provisório; a tela de revisão já marca/ignora as que
  batem com transações confirmadas (comportamento atual de `review-client`).
- Período selecionável pelo usuário: 20 dias ou 30 dias.
- Botão de importação aparece em dois lugares: `/transactions` (lista principal) e
  no wizard `/transactions/import`.

## Dependências novas

- `pluggy-sdk` — cliente server-side da API Pluggy.
- `react-pluggy-connect` — widget Pluggy Connect no browser.

## Variáveis de ambiente

Preenchidas pelo usuário no `process.env` (nunca expostas ao browser):

- `PLUGGY_CLIENT_ID`
- `PLUGGY_CLIENT_SECRET`

(Nomes com prefixo `PLUGGY_` para não colidir com outras variáveis; substitui o
`CLIENT_ID`/`CLIENT_SECRET` genérico do snippet original.)

## API routes — `src/app/api/pluggy/`

### `POST /api/pluggy/connect-token`

1. Exige sessão Supabase autenticada (`supabase.auth.getUser()`); 401 se não houver.
2. `new PluggyClient({ clientId, clientSecret })` a partir das env vars.
3. `pluggy.createConnectToken({ clientUserId: user.id })`.
4. Retorna `{ accessToken }`.
5. Erros: credenciais ausentes ou falha Pluggy → 500 com mensagem clara.

### `POST /api/pluggy/sync`

Body: `{ itemId: string; accountId: number; days: 20 | 30 }`.

1. Exige sessão Supabase autenticada.
2. `from = hoje - days`, `to = hoje` (formato `YYYY-MM-DD`).
3. `pluggy.fetchAccounts(itemId)` → lista de contas do item (tipo `BANK` e `CREDIT`).
4. Para cada conta Pluggy: `pluggy.fetchTransactions(pluggyAccountId, { from, to })`
   (pagina enquanto houver `page < totalPages`).
5. Mapeia cada transação Pluggy → `ParsedRow`-like:
   - `date`: `transaction.date` truncada para `YYYY-MM-DD`.
   - `description`: `transaction.description`.
   - `amount`: valor absoluto.
   - `rawAmount`: valor com sinal — negativo para `type === "DEBIT"`, positivo para `"CREDIT"`.
   - `type` (`TransactionKind`): `"debit"` se `type === "DEBIT"`, senão `"credit"`.
6. Passa pelas regras de classificação existentes via `classifyRows(rows, source, accountId)`,
   usando `source = "nubank_credit"` para contas Pluggy do tipo `CREDIT` e
   `"nubank_debit"` caso contrário (apenas como proxy para herdar regras de
   classificação e detecção de transferência para conta própria).
7. Insere todas as linhas em `transaction` com `account_id = accountId`,
   `is_provisional = true`, `date`, `description`, `amount` (com sinal de `rawAmount`),
   `type`. Sem dedup no insert. Se `suggestedCategoryId != null`, insere também em
   `re_category_transaction`.
8. `revalidatePath("/transactions")` e `revalidatePath("/transactions/review")`.
9. Retorna `{ inserted: number; errors: string[] }`.
10. Erros: falha Pluggy → `{ inserted: 0, error }`; erro de insert por linha → acumula em `errors`.

> Nota: como o `sync` é um POST com efeitos colaterais e usa server actions/`createClient`,
> pode ser implementado como Route Handler (`src/app/api/pluggy/sync/route.ts`) que
> reusa helpers de `src/lib/transactions/`.

## Frontend

### `src/components/transactions/pluggy-import-button.tsx` (client component)

- Props: `accounts: { account_id: number; account_name: string }[]`.
- UI: `Dialog` com:
  - `Select` de conta de destino (obrigatório).
  - `Select`/toggle de período: "Últimos 20 dias" / "Últimos 30 dias" (default 30).
  - Botão "Conectar com Pluggy".
- Fluxo ao clicar em "Conectar":
  1. `fetch("/api/pluggy/connect-token", { method: "POST" })` → `{ accessToken }`.
  2. Renderiza `<PluggyConnect connectToken={accessToken} onSuccess={(itemData) => ...} onError={...} onClose={...} />`.
  3. `onSuccess`: `fetch("/api/pluggy/sync", { method: "POST", body: JSON.stringify({ itemId: itemData.item.id, accountId, days }) })`.
  4. Ao concluir: fecha o dialog, `router.push("/transactions/review")`, `router.refresh()`.
- Estados: loading (gerando token / sincronizando), erro (exibe mensagem do response).

### Onde o botão aparece

- `src/app/(app)/transactions/page.tsx`: ao lado do link "Importar CSV", adicionar
  `<PluggyImportButton accounts={accounts ?? []} />` (a página já carrega `accounts`).
- `src/app/(app)/transactions/import/components/import-wizard.tsx`: adicionar uma
  seção/opção "Pluggy (Open Finance)" que renderiza o mesmo `PluggyImportButton`
  (o wizard já recebe `accounts`).

## Schema

Nenhuma migração necessária. (Futuro opcional, fora do escopo: coluna
`pluggy_item_id` em `account` para re-sync incremental.)

## Testes

- Unit: função de mapeamento Pluggy-transaction → `ParsedRow` (sinal de `rawAmount`,
  truncamento de data, `type`).
- Unit: cálculo da janela de datas para `days ∈ {20, 30}`.
- Integração (manual / com mock do `pluggy-sdk`): `sync` insere N linhas provisórias
  e elas aparecem em `/transactions/review`.
- Verificação manual: rota `connect-token` retorna 401 sem sessão; 500 sem env vars.
