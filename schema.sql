-- PixForge — Cloudflare D1 schema
-- Apply with:  npm run db:schema        (remote)
--              npm run db:schema:local  (local dev)

-- Shareable charges: a short code maps to the serialized charge form, so a
-- cobrança can be reopened (with its QR ready) from a `?c=CODE` link.
CREATE TABLE IF NOT EXISTS shares (
  code        TEXT PRIMARY KEY,
  payload     TEXT NOT NULL,        -- JSON of the charge fields (chave, valor, ...)
  created_at  TEXT NOT NULL
);
