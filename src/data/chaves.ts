import type { TipoChave, Cobranca } from "../types";

export interface TipoChaveMeta {
  id: TipoChave;
  rotulo: string;
  exemplo: string;
  ajuda: string;
  /** dica de teclado para o input */
  inputMode?: "text" | "numeric" | "email" | "tel";
}

export const TIPOS_CHAVE: TipoChaveMeta[] = [
  {
    id: "cpf",
    rotulo: "CPF",
    exemplo: "529.982.247-25",
    ajuda: "11 dígitos. Validamos os dígitos verificadores; a máscara é opcional.",
    inputMode: "numeric",
  },
  {
    id: "cnpj",
    rotulo: "CNPJ",
    exemplo: "11.222.333/0001-81",
    ajuda: "14 dígitos. Validamos os dígitos verificadores; a máscara é opcional.",
    inputMode: "numeric",
  },
  {
    id: "email",
    rotulo: "E-mail",
    exemplo: "voce@exemplo.com",
    ajuda: "Convertido para minúsculas automaticamente.",
    inputMode: "email",
  },
  {
    id: "telefone",
    rotulo: "Telefone",
    exemplo: "(61) 99999-8888",
    ajuda: "Normalizado para o formato internacional +55DDDXXXXXXXXX.",
    inputMode: "tel",
  },
  {
    id: "aleatoria",
    rotulo: "Aleatória (EVP)",
    exemplo: "123e4567-e89b-12d3-a456-426614174000",
    ajuda: "Chave aleatória no formato UUID gerada pelo seu banco.",
    inputMode: "text",
  },
];

export const TIPO_POR_ID: Record<TipoChave, TipoChaveMeta> = Object.fromEntries(
  TIPOS_CHAVE.map((t) => [t.id, t])
) as Record<TipoChave, TipoChaveMeta>;

/** Cobrança em branco usada ao iniciar / limpar. */
export const COBRANCA_VAZIA: Cobranca = {
  tipoChave: "email",
  chave: "",
  nome: "",
  cidade: "",
  valor: "",
  txid: "",
  descricao: "",
};

/** Cobrança de exemplo (botão "Exemplo"). */
export const COBRANCA_EXEMPLO: Cobranca = {
  tipoChave: "email",
  chave: "loja@exemplo.com",
  nome: "Loja do João",
  cidade: "São Paulo",
  valor: "49,90",
  txid: "PEDIDO12345",
  descricao: "Pedido #12345",
};
