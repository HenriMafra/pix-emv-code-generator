/// <reference types="@cloudflare/workers-types" />

// Pages Function: share (cobranças compartilháveis por código)
//   POST /api/share      body { payload: {...} }   -> { code }
//   GET  /api/share?code=XXXXXX                     -> { payload }
//
// Sem binding DB → responde 503 para o cliente cair no fallback localStorage.

interface Env {
  DB?: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: { payload?: unknown };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const payload = body.payload;
  if (payload === undefined || payload === null || typeof payload !== "object") {
    return json({ error: "payload obrigatório" }, 400);
  }

  // No DB bound → tell the client so it falls back to localStorage (keeps the
  // share feature working in pure `vite dev` / no-D1 deploys).
  if (!ctx.env.DB) return json({ error: "persistência indisponível" }, 503);

  const code = genCode();
  try {
    await ctx.env.DB.prepare(
      "INSERT INTO shares (code, payload, created_at) VALUES (?, ?, ?)"
    )
      .bind(code, JSON.stringify(payload), new Date().toISOString())
      .run();
  } catch (e) {
    return json({ error: "falha ao salvar", detail: String(e) }, 500);
  }
  return json({ code });
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get("code");
  if (!code) return json({ error: "code obrigatório" }, 400);

  if (ctx.env.DB) {
    const row = await ctx.env.DB.prepare("SELECT payload FROM shares WHERE code = ?")
      .bind(code)
      .first<{ payload: string }>();
    if (row) {
      try {
        return json({ payload: JSON.parse(row.payload) as unknown });
      } catch {
        // linha corrompida no banco → não derruba a função com 500
        return json({ error: "registro corrompido" }, 422);
      }
    }
  }
  return json({ error: "não encontrado" }, 404);
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });

// 6-char URL-safe code (no ambiguous chars), seeded by crypto.
function genCode(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
