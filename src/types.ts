// ── Domain types shared across the PixForge engine and UI ────────────────────

/** Supported PIX key kinds (BACEN). */
export type TipoChave = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";

/** A charge as entered in the form (raw, before normalization). */
export interface Cobranca {
  tipoChave: TipoChave;
  chave: string;
  nome: string;
  cidade: string;
  valor: string; // free text "10,50" / "10.50"; empty = no amount
  txid: string;
  descricao: string;
}

/** Result of validating + normalizing a single field. */
export interface CampoValidado {
  valor: string; // the normalized value that goes into the payload
  ok: boolean;
  erro?: string; // blocking problem (invalid)
  aviso?: string; // non-blocking note (e.g. accents stripped, truncated)
}

/** Fully validated/normalized charge ready to be encoded. */
export interface CobrancaNormalizada {
  tipoChave: TipoChave;
  chave: CampoValidado;
  nome: CampoValidado;
  cidade: CampoValidado;
  valor: CampoValidado; // valor.valor = "" when there is no amount
  txid: CampoValidado;
  descricao: CampoValidado;
  /** true when every field is ok (no blocking error). */
  valido: boolean;
}

/** A decoded EMV TLV node. */
export interface TLVNode {
  id: string; // 2-digit id, e.g. "26"
  len: number; // declared length
  valor: string; // raw value (for composite fields, the concatenated children)
  nome?: string; // friendly label for the validator UI
  filhos?: TLVNode[]; // sub-TLVs for composite fields (26, 62, ...)
}

/** Output of {@link decodificarBRCode}. */
export interface BRCodeDecodificado {
  nodes: TLVNode[];
  crcOk: boolean;
  crcLido: string; // CRC found in the payload (field 63)
  crcEsperado: string; // CRC recomputed over the payload
  erro?: string; // mensagem amigável quando o payload não pôde ser lido
}

/** Parameters accepted by {@link gerarBRCode}. */
export interface GerarParams {
  chave: string;
  nome: string;
  cidade: string;
  valor?: number | string; // optional amount
  txid?: string; // defaults to "***"
  descricao?: string;
}
