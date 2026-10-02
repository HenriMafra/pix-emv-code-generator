// ── Compartilhamento por código (?c=CODE) com fallback em localStorage ───────
//
// Espelha o padrão do PCForge: tenta a Pages Function; se ela não existir
// (vite dev puro) ou não houver D1 (503), guarda localmente sob um código curto.

const LOCAL_PREFIX = "pixforge:share:";

/** Salva um payload serializável e retorna o código de compartilhamento. */
export async function saveShare(payload: unknown): Promise<string> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { code: string };
    return data.code;
  } catch {
    // Fallback local: código curto determinístico + armazenamento no navegador.
    const code = localCode(JSON.stringify(payload));
    try {
      localStorage.setItem(LOCAL_PREFIX + code, JSON.stringify(payload));
    } catch {
      /* quota / modo privado */
    }
    return code;
  }
}

/** Carrega um payload pelo código, tentando a API e depois o localStorage. */
export async function loadShare<T = unknown>(code: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/share?code=${encodeURIComponent(code)}`);
    if (res.ok) {
      const data = (await res.json()) as { payload: T };
      return data.payload;
    }
  } catch {
    /* cai no fallback local */
  }
  try {
    const local = localStorage.getItem(LOCAL_PREFIX + code);
    return local ? (JSON.parse(local) as T) : null;
  } catch {
    return null;
  }
}

/** Hash djb2 → base36 (7 chars) para o código de fallback. */
function localCode(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return (h >>> 0).toString(36).slice(0, 7).toUpperCase();
}
