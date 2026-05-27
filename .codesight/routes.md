# Routes

- `GET` `/auth/callback` [auth]
- `POST` `/api/pluggy/connect-token` → out: { error } [auth]
- `POST` `/api/pluggy/sync` → out: { error } [auth, db, cache]
