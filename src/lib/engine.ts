// ─────────────────────────────────────────────────────────────────────────────
// PixForge — motor BR Code (Pix Copia e Cola) puro, sem dependências de React.
//
// Implementa o padrão EMV® MPM (Merchant-Presented Mode) usado pelo arranjo Pix
// do Banco Central. Tudo aqui é determinístico e testável de forma isolada.
//
// Estrutura de um campo (TLV):  id(2) + len(2, zero-pad) + valor
//   - id  : identificador de 2 dígitos
//   - len : tamanho do valor em 2 dígitos (ex.: valor de 5 chars → "05")
//   - valor: o conteúdo (que pode conter, recursivamente, outros TLVs)
//
// CRC: CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF, sem reflexão, xorout 0),
// calculado sobre todo o payload já incluindo o cabeçalho "6304" do campo 63,
// e anexado em 4 dígitos hexadecimais MAIÚSCULOS.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  BRCodeDecodificado,
  CampoValidado,
  Cobranca,
  CobrancaNormalizada,
  GerarParams,
  TipoChave,
  TLVNode,
} from "../types";

// ── IDs do payload Pix ───────────────────────────────────────────────────────
export const IDS = {
  PAYLOAD_FORMAT: "00",
  MERCHANT_ACCOUNT: "26", // conta do recebedor (GUI + chave + descrição)
  MERCHANT_CATEGORY: "52",
  CURRENCY: "53",
  AMOUNT: "54",
  COUNTRY: "58",
  MERCHANT_NAME: "59",
  MERCHANT_CITY: "60",
  ADDITIONAL_DATA: "62", // campo adicional (txid)
  CRC: "63",
} as const;

// Subcampos do 26 (Merchant Account Information) e do 62 (Additional Data).
export const SUB_IDS = {
  GUI: "00", // "br.gov.bcb.pix"
  CHAVE: "01",
  DESCRICAO: "02",
  TXID: "05",
} as const;

export const GUI_PIX = "br.gov.bcb.pix";

// Rótulos amigáveis exibidos no validador.
const ROTULOS: Record<string, string> = {
  "00": "Payload Format Indicator",
  "26": "Conta do recebedor (Pix)",
  "26.00": "GUI",
  "26.01": "Chave Pix",
  "26.02": "Descrição",
  "52": "Merchant Category Code",
  "53": "Moeda (986 = BRL)",
  "54": "Valor",
  "58": "País",
  "59": "Nome do recebedor",
  "60": "Cidade",
  "62": "Dados adicionais",
  "62.05": "TXID",
  "63": "CRC16",
};

/** IDs cujo valor é, ele próprio, uma sequência de TLVs. */
const COMPOSTOS = new Set<string>([IDS.MERCHANT_ACCOUNT, IDS.ADDITIONAL_DATA]);

// ─────────────────────────────────────────────────────────────────────────────
// CRC16 / CCITT-FALSE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CRC16/CCITT-FALSE sobre `str` (interpretada como bytes Latin-1/ASCII).
 * poly 0x1021, init 0xFFFF, sem reflexão de entrada/saída, xorout 0x0000.
 * Retorna o valor numérico (0..0xFFFF).
 */
export function crc16(str: string): number {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return crc & 0xffff;
}

/** CRC16 já formatado em 4 hex MAIÚSCULOS (ex.: "29B1"). */
export function crc16Hex(str: string): string {
  return crc16(str).toString(16).toUpperCase().padStart(4, "0");
}

// ─────────────────────────────────────────────────────────────────────────────
// Construção de TLV
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Monta um campo TLV: id + len(2, zero-pad) + valor.
 *
 * O comprimento é codificado em 2 dígitos (EMV MPM): valores acima de 99
 * caracteres estourariam o campo de tamanho e corromperiam todo o payload.
 * Por segurança, truncamos em 99 — os campos do Pix já são normalizados bem
 * abaixo desse limite, então isto é apenas uma guarda contra entradas extremas.
 */
export function tlv(id: string, valor: string): string {
  const v = valor.length > 99 ? valor.slice(0, 99) : valor;
  const len = v.length.toString().padStart(2, "0");
  return `${id}${len}${v}`;
}

/**
 * Gera o Pix Copia e Cola (BR Code estático) a partir dos parâmetros.
 * Os valores recebidos já devem estar normalizados (ver {@link normalizarCobranca}),
 * mas a função é tolerante: apenas concatena o que recebe.
 */
export function gerarBRCode(params: GerarParams): string {
  const { chave, nome, cidade } = params;
  const txid = params.txid && params.txid.length > 0 ? params.txid : "***";
  const descricao = params.descricao ?? "";
  const valor = formatarValor(params.valor);

  // Campo 26 — Merchant Account Information (GUI + chave + descrição opcional).
  let conta = tlv(SUB_IDS.GUI, GUI_PIX) + tlv(SUB_IDS.CHAVE, chave);
  if (descricao) conta += tlv(SUB_IDS.DESCRICAO, descricao);

  let payload =
    tlv(IDS.PAYLOAD_FORMAT, "01") +
    tlv(IDS.MERCHANT_ACCOUNT, conta) +
    tlv(IDS.MERCHANT_CATEGORY, "0000") +
    tlv(IDS.CURRENCY, "986");

  if (valor) payload += tlv(IDS.AMOUNT, valor);

  payload +=
    tlv(IDS.COUNTRY, "BR") +
    tlv(IDS.MERCHANT_NAME, nome) +
    tlv(IDS.MERCHANT_CITY, cidade) +
    tlv(IDS.ADDITIONAL_DATA, tlv(SUB_IDS.TXID, txid));

  // CRC: anexa "6304" e calcula sobre tudo, depois concatena o hex.
  payload += IDS.CRC + "04";
  return payload + crc16Hex(payload);
}

/** Teto de segurança para o valor (evita estouro de campo e notação científica). */
const VALOR_MAX = 9_999_999.99;

/**
 * Converte uma string monetária digitada (BR ou en-US) em número.
 * Decide o separador decimal pelo ÚLTIMO `.` ou `,` que aparecer, tratando o
 * outro como separador de milhar — assim "10,50", "10.50" e "1.234,56" todos
 * funcionam (e "10.5" vira 10.5, não 105).
 */
function parseValorTexto(bruto: string): number {
  const s = bruto.trim();
  const ultimaVirgula = s.lastIndexOf(",");
  const ultimoPonto = s.lastIndexOf(".");
  let limpo: string;
  if (ultimaVirgula >= 0 && ultimaVirgula > ultimoPonto) {
    // vírgula é o decimal → remove pontos (milhar) e troca vírgula por ponto
    limpo = s.replace(/\./g, "").replace(",", ".");
  } else if (ultimoPonto >= 0) {
    // ponto é o decimal → remove vírgulas (milhar)
    limpo = s.replace(/,/g, "");
  } else {
    limpo = s;
  }
  return Number(limpo);
}

/** Normaliza um valor monetário para o formato exigido ("10.50"). "" se vazio. */
export function formatarValor(valor: number | string | undefined | null): string {
  if (valor === undefined || valor === null || valor === "") return "";
  let n: number;
  if (typeof valor === "number") {
    n = valor;
  } else {
    n = parseValorTexto(valor);
  }
  if (!Number.isFinite(n) || n <= 0) return "";
  // Limita ao teto para nunca gerar notação científica ("1e+21") no payload.
  if (n > VALOR_MAX) n = VALOR_MAX;
  return n.toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Decodificação
// ─────────────────────────────────────────────────────────────────────────────

function parseTLVs(input: string, prefixo = ""): TLVNode[] {
  const nodes: TLVNode[] = [];
  let i = 0;
  while (i + 4 <= input.length) {
    const id = input.slice(i, i + 2);
    const lenStr = input.slice(i + 2, i + 4);
    const len = parseInt(lenStr, 10);
    if (Number.isNaN(len)) break; // payload corrompido
    const valor = input.slice(i + 4, i + 4 + len);
    const caminho = prefixo ? `${prefixo}.${id}` : id;
    const node: TLVNode = { id, len, valor, nome: ROTULOS[caminho] };
    if (COMPOSTOS.has(id) && valor.length === len) {
      node.filhos = parseTLVs(valor, id);
    }
    nodes.push(node);
    i += 4 + len;
    if (len === 0 && valor.length === 0 && id === "") break;
  }
  return nodes;
}

/**
 * Decodifica um Pix Copia e Cola em uma árvore de TLVs, valida o CRC e
 * informa o CRC lido e o esperado.
 */
export function decodificarBRCode(payload: string): BRCodeDecodificado {
  const limpo = (payload ?? "").trim();
  try {
    const nodes = parseTLVs(limpo);

    // CRC declarado = últimos 4 chars; CRC esperado = recálculo sobre tudo menos
    // esses 4 chars (que já inclui o cabeçalho "6304").
    let crcLido = "";
    let crcEsperado = "";
    let crcOk = false;
    const idxCRC = limpo.lastIndexOf(IDS.CRC + "04");
    if (idxCRC >= 0 && idxCRC + 8 <= limpo.length) {
      crcLido = limpo.slice(idxCRC + 4, idxCRC + 8).toUpperCase();
      crcEsperado = crc16Hex(limpo.slice(0, idxCRC + 4));
      crcOk = crcLido === crcEsperado;
    }

    // Nenhum campo legível ou sem o campo 63 → payload provavelmente inválido.
    const erro =
      nodes.length === 0
        ? "Não foi possível ler nenhum campo — o código não parece um Pix Copia e Cola."
        : idxCRC < 0
        ? "Campo CRC (63) não encontrado — código incompleto ou malformado."
        : undefined;

    return { nodes, crcOk, crcLido, crcEsperado, erro };
  } catch {
    // Salvaguarda: qualquer entrada extrema nunca deve quebrar a tela.
    return {
      nodes: [],
      crcOk: false,
      crcLido: "",
      crcEsperado: "",
      erro: "Não foi possível decodificar o código informado.",
    };
  }
}

/** Acha um node por id na raiz (ou em um conjunto de filhos). */
export function acharNode(nodes: TLVNode[], id: string): TLVNode | undefined {
  return nodes.find((n) => n.id === id);
}

/** Extrai os campos mais úteis de uma árvore decodificada (para a UI). */
export function resumoDecodificado(nodes: TLVNode[]): {
  chave?: string;
  descricao?: string;
  valor?: string;
  nome?: string;
  cidade?: string;
  txid?: string;
} {
  const conta = acharNode(nodes, IDS.MERCHANT_ACCOUNT);
  const adicional = acharNode(nodes, IDS.ADDITIONAL_DATA);
  return {
    chave: conta?.filhos && acharNode(conta.filhos, SUB_IDS.CHAVE)?.valor,
    descricao: conta?.filhos && acharNode(conta.filhos, SUB_IDS.DESCRICAO)?.valor,
    valor: acharNode(nodes, IDS.AMOUNT)?.valor,
    nome: acharNode(nodes, IDS.MERCHANT_NAME)?.valor,
    cidade: acharNode(nodes, IDS.MERCHANT_CITY)?.valor,
    txid: adicional?.filhos && acharNode(adicional.filhos, SUB_IDS.TXID)?.valor,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalização de texto (nome / cidade)
// ─────────────────────────────────────────────────────────────────────────────

/** Remove acentos/diacríticos preservando as letras base (João → Joao). */
export function removerAcentos(texto: string): string {
  // ̀-ͯ = bloco "Combining Diacritical Marks" do Unicode.
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Normaliza um texto livre para os campos do BR Code:
 *  - remove acentos
 *  - remove caracteres fora de [A-Za-z0-9 espaço e pontuação básica]
 *  - colapsa espaços
 *  - (opcional) força MAIÚSCULAS
 *  - trunca em `max` caracteres
 * Retorna o valor + avisos de acentuação/truncamento.
 */
export function normalizarTexto(
  bruto: string,
  max: number,
  opts: { upper?: boolean; obrigatorio?: boolean; rotulo?: string } = {}
): CampoValidado {
  const rotulo = opts.rotulo ?? "campo";
  const original = (bruto ?? "").trim();
  let v = removerAcentos(original);
  // Houve acentuação se o texto base (sem diacríticos) difere do original.
  const houveAcento = v !== original;

  // mantém letras, dígitos, espaço e pontuação comum de nomes/cidades
  v = v.replace(/[^A-Za-z0-9 .,'&/-]/g, "");
  v = v.replace(/\s+/g, " ").trim();
  if (opts.upper) v = v.toUpperCase();

  let aviso: string | undefined;
  let truncou = false;
  if (v.length > max) {
    v = v.slice(0, max).trim();
    truncou = true;
  }

  const avisos: string[] = [];
  if (houveAcento) avisos.push("acentos removidos");
  if (truncou) avisos.push(`truncado em ${max} caracteres`);
  if (avisos.length) aviso = `${rotulo}: ${avisos.join(" · ")}`;

  let erro: string | undefined;
  if (opts.obrigatorio && v.length === 0) erro = `${rotulo} é obrigatório`;

  return { valor: v, ok: !erro, erro, aviso };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validação de chave Pix por tipo
// ─────────────────────────────────────────────────────────────────────────────

const apenasDigitos = (s: string) => (s ?? "").replace(/\D/g, "");

/** Valida CPF pelos dois dígitos verificadores reais. */
export function cpfValido(cpf: string): boolean {
  const d = apenasDigitos(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // todos iguais

  const calc = (qtd: number) => {
    let soma = 0;
    for (let i = 0; i < qtd; i++) soma += Number(d[i]) * (qtd + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** Valida CNPJ pelos dois dígitos verificadores reais. */
export function cnpjValido(cnpj: string): boolean {
  const d = apenasDigitos(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const calc = (qtd: number) => {
    const pesos =
      qtd === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < qtd; i++) soma += Number(d[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Valida e normaliza a chave conforme o tipo:
 *  - cpf/cnpj  → só dígitos, com verificação real dos dígitos verificadores
 *  - telefone  → +55DDDXXXXXXXXX (E.164)
 *  - email     → minúsculas, formato básico
 *  - aleatoria → UUID v4 (formato 8-4-4-4-12)
 */
export function normalizarChave(tipo: TipoChave, bruto: string): CampoValidado {
  const original = (bruto ?? "").trim();
  switch (tipo) {
    case "cpf": {
      const d = apenasDigitos(original);
      if (d.length !== 11) return invalido(d, "CPF deve ter 11 dígitos");
      if (!cpfValido(d)) return invalido(d, "CPF inválido (dígito verificador)");
      return { valor: d, ok: true };
    }
    case "cnpj": {
      const d = apenasDigitos(original);
      if (d.length !== 14) return invalido(d, "CNPJ deve ter 14 dígitos");
      if (!cnpjValido(d)) return invalido(d, "CNPJ inválido (dígito verificador)");
      return { valor: d, ok: true };
    }
    case "telefone": {
      let d = apenasDigitos(original);
      // remove 0 de DDD discado e 55 repetido na frente
      if (d.startsWith("0")) d = d.replace(/^0+/, "");
      if (d.startsWith("55") && d.length > 11) d = d.slice(2);
      if (d.length < 10 || d.length > 11) {
        return invalido(original, "Telefone deve ter DDD + número (10 ou 11 dígitos)");
      }
      return { valor: `+55${d}`, ok: true };
    }
    case "email": {
      const e = original.toLowerCase();
      if (!RE_EMAIL.test(e)) return invalido(e, "E-mail inválido");
      if (e.length > 77) return invalido(e, "E-mail excede 77 caracteres");
      const aviso = e !== original ? "e-mail convertido para minúsculas" : undefined;
      return { valor: e, ok: true, aviso };
    }
    case "aleatoria": {
      const u = original.toLowerCase();
      if (!RE_UUID.test(u)) {
        return invalido(original, "Chave aleatória deve ser um UUID (8-4-4-4-12)");
      }
      return { valor: u, ok: true };
    }
    default:
      return invalido(original, "Tipo de chave desconhecido");
  }
}

function invalido(valor: string, erro: string): CampoValidado {
  return { valor, ok: false, erro };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalização da cobrança inteira
// ─────────────────────────────────────────────────────────────────────────────

/** Valida e normaliza todos os campos de uma cobrança. */
export function normalizarCobranca(c: Cobranca): CobrancaNormalizada {
  const chave = normalizarChave(c.tipoChave, c.chave);
  const nome = normalizarTexto(c.nome, 25, {
    obrigatorio: true,
    rotulo: "Nome do recebedor",
  });
  const cidade = normalizarTexto(c.cidade, 15, {
    upper: true,
    obrigatorio: true,
    rotulo: "Cidade",
  });
  const valor = validarValor(c.valor);
  const txid = validarTxid(c.txid);
  const descricao = normalizarTexto(c.descricao, 40, { rotulo: "Descrição" });

  const valido =
    chave.ok && nome.ok && cidade.ok && valor.ok && txid.ok && descricao.ok;

  return { tipoChave: c.tipoChave, chave, nome, cidade, valor, txid, descricao, valido };
}

/** Valida valor opcional (R$, 2 casas). Vazio é válido (cobrança sem valor). */
export function validarValor(bruto: string): CampoValidado {
  const original = (bruto ?? "").trim();
  if (original === "") return { valor: "", ok: true };
  const formatado = formatarValor(original);
  if (formatado === "") return invalido(original, "Valor inválido (use, ex.: 10,50)");
  return { valor: formatado, ok: true };
}

/** TXID: a-zA-Z0-9, até 25 chars, default "***". */
export function validarTxid(bruto: string): CampoValidado {
  const original = (bruto ?? "").trim();
  if (original === "" || original === "***") return { valor: "***", ok: true };
  const limpo = original.replace(/[^A-Za-z0-9]/g, "");
  let aviso: string | undefined;
  const avisos: string[] = [];
  if (limpo !== original) avisos.push("caracteres não permitidos removidos");
  let v = limpo;
  if (v.length > 25) {
    v = v.slice(0, 25);
    avisos.push("truncado em 25 caracteres");
  }
  if (v.length === 0) return { valor: "***", ok: true };
  if (avisos.length) aviso = `TXID: ${avisos.join(" · ")}`;
  return { valor: v, ok: true, aviso };
}

/** Gera o BR Code diretamente a partir de uma cobrança normalizada válida. */
export function gerarDeCobranca(n: CobrancaNormalizada): string {
  return gerarBRCode({
    chave: n.chave.valor,
    nome: n.nome.valor,
    cidade: n.cidade.valor,
    valor: n.valor.valor,
    txid: n.txid.valor,
    descricao: n.descricao.valor,
  });
}

/** Coleta todos os avisos (não bloqueantes) de uma cobrança normalizada. */
export function coletarAvisos(n: CobrancaNormalizada): string[] {
  return [n.chave, n.nome, n.cidade, n.valor, n.txid, n.descricao]
    .map((f) => f.aviso)
    .filter((a): a is string => Boolean(a));
}

/** Coleta todos os erros (bloqueantes) de uma cobrança normalizada. */
export function coletarErros(n: CobrancaNormalizada): string[] {
  return [n.chave, n.nome, n.cidade, n.valor, n.txid, n.descricao]
    .map((f) => f.erro)
    .filter((e): e is string => Boolean(e));
}

// ─────────────────────────────────────────────────────────────────────────────
// Saneamento de dados externos (import por JSON / link compartilhado / storage)
// ─────────────────────────────────────────────────────────────────────────────

const TIPOS_CHAVE_VALIDOS: ReadonlySet<TipoChave> = new Set<TipoChave>([
  "cpf",
  "cnpj",
  "email",
  "telefone",
  "aleatoria",
]);

/** Coerção tolerante de um valor desconhecido em string ("" se não for string). */
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Valida e sanea um objeto desconhecido (vindo de `?c=CODE`, import JSON ou
 * localStorage) em uma {@link Cobranca} segura. Retorna `null` quando o objeto
 * não tem a forma mínima esperada — assim a UI mostra um aviso amigável em vez
 * de quebrar a tela com dados malformados.
 */
export function sanitizarCobranca(entrada: unknown): Cobranca | null {
  if (!entrada || typeof entrada !== "object") return null;
  const obj = entrada as Record<string, unknown>;
  const tipo = obj.tipoChave;
  if (typeof tipo !== "string" || !TIPOS_CHAVE_VALIDOS.has(tipo as TipoChave)) {
    return null;
  }
  return {
    tipoChave: tipo as TipoChave,
    chave: asString(obj.chave),
    nome: asString(obj.nome),
    cidade: asString(obj.cidade),
    valor: asString(obj.valor),
    txid: asString(obj.txid),
    descricao: asString(obj.descricao),
  };
}
