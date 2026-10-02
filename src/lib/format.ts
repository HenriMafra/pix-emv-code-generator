// ── Formatação (PT-BR) ───────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/** Formata um número como moeda BRL (ex.: 10.5 → "R$ 10,50"). */
export function money(value: number): string {
  return BRL.format(value);
}

/**
 * Formata o valor do payload ("10.50") como BRL para exibição.
 * Sem valor → "Sem valor definido".
 */
export function moneyFromPayload(valor: string | undefined): string {
  if (!valor) return "Sem valor definido";
  const n = Number(valor);
  if (!Number.isFinite(n)) return valor;
  return money(n);
}

/** Data/hora curtas em PT-BR a partir de um timestamp (ms). */
export function dataCurta(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Mascara uma chave para o histórico, preservando o tipo legível. */
export function mascararChave(chave: string): string {
  if (!chave) return "—";
  // e-mail: f***@dominio.com
  if (chave.includes("@")) {
    const [user, dom] = chave.split("@");
    const head = user.slice(0, 1);
    return `${head}${"*".repeat(Math.max(1, user.length - 1))}@${dom}`;
  }
  // telefone E.164
  if (chave.startsWith("+")) {
    return `${chave.slice(0, 5)}…${chave.slice(-2)}`;
  }
  // uuid (chave aleatória)
  if (/^[0-9a-f]{8}-/.test(chave)) {
    return `${chave.slice(0, 8)}…${chave.slice(-4)}`;
  }
  // CPF/CNPJ (só dígitos): mostra os 3 últimos
  if (/^\d+$/.test(chave)) {
    return `${"•".repeat(Math.max(0, chave.length - 3))}${chave.slice(-3)}`;
  }
  return chave;
}

/** Rótulo legível do tipo de chave. */
export const ROTULO_TIPO: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Aleatória (EVP)",
};
