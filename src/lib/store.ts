import { create } from "zustand";
import type { Cobranca, TipoChave } from "../types";
import { COBRANCA_VAZIA } from "../data/chaves";
import { sanitizarCobranca } from "./engine";

const LS_KEY = "pixforge:state";

/** Uma cobrança salva no histórico. */
export interface ItemHistorico {
  id: string;
  criadoEm: number;
  cobranca: Cobranca; // os campos brutos, para duplicar/regerar
  payload: string; // o BR Code gerado
  chaveMascarada: string;
  valor: string; // valor formatado do payload ("" se sem valor)
  descricao: string;
}

interface PersistShape {
  cobranca: Cobranca;
  historico: ItemHistorico[];
}

interface PixState extends PersistShape {
  // mutações do formulário
  setCampo: <K extends keyof Cobranca>(campo: K, valor: Cobranca[K]) => void;
  setTipoChave: (t: TipoChave) => void;
  setCobranca: (c: Cobranca) => void;
  limparFormulario: () => void;
  // histórico
  adicionarHistorico: (item: ItemHistorico) => void;
  removerHistorico: (id: string) => void;
  limparHistorico: () => void;
}

/** Sanea um item de histórico vindo do localStorage; descarta se malformado. */
function saneItemHistorico(raw: unknown): ItemHistorico | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const cobranca = sanitizarCobranca(o.cobranca);
  if (
    typeof o.id !== "string" ||
    typeof o.payload !== "string" ||
    !cobranca
  ) {
    return null;
  }
  return {
    id: o.id,
    criadoEm: typeof o.criadoEm === "number" ? o.criadoEm : Date.now(),
    cobranca,
    payload: o.payload,
    chaveMascarada: typeof o.chaveMascarada === "string" ? o.chaveMascarada : "—",
    valor: typeof o.valor === "string" ? o.valor : "",
    descricao: typeof o.descricao === "string" ? o.descricao : "",
  };
}

function loadPersisted(): PersistShape {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { cobranca: { ...COBRANCA_VAZIA }, historico: [] };
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    // cobranca: usa só campos string conhecidos sobre o padrão (ignora lixo).
    const cobrancaSalva = sanitizarCobranca(parsed.cobranca);
    const cobranca = cobrancaSalva
      ? { ...COBRANCA_VAZIA, ...cobrancaSalva }
      : { ...COBRANCA_VAZIA };
    // historico: descarta itens malformados em vez de deixar a UI quebrar.
    const historico = Array.isArray(parsed.historico)
      ? parsed.historico
          .map(saneItemHistorico)
          .filter((i): i is ItemHistorico => i !== null)
      : [];
    return { cobranca, historico };
  } catch {
    return { cobranca: { ...COBRANCA_VAZIA }, historico: [] };
  }
}

function persist(state: PersistShape) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ cobranca: state.cobranca, historico: state.historico })
    );
  } catch {
    /* quota / modo privado */
  }
}

const inicial = loadPersisted();

export const usePix = create<PixState>((set, get) => ({
  cobranca: inicial.cobranca,
  historico: inicial.historico,

  setCampo: (campo, valor) => {
    const cobranca = { ...get().cobranca, [campo]: valor };
    set({ cobranca });
    persist({ cobranca, historico: get().historico });
  },

  setTipoChave: (t) => {
    // troca de tipo limpa a chave (formatos incompatíveis)
    const cobranca = { ...get().cobranca, tipoChave: t, chave: "" };
    set({ cobranca });
    persist({ cobranca, historico: get().historico });
  },

  setCobranca: (c) => {
    const cobranca = { ...c };
    set({ cobranca });
    persist({ cobranca, historico: get().historico });
  },

  limparFormulario: () => {
    const cobranca = { ...COBRANCA_VAZIA };
    set({ cobranca });
    persist({ cobranca, historico: get().historico });
  },

  adicionarHistorico: (item) => {
    // dedup: se já existe um item com o mesmo payload, sobe ele para o topo
    const semDuplicata = get().historico.filter((h) => h.payload !== item.payload);
    const historico = [item, ...semDuplicata].slice(0, 100);
    set({ historico });
    persist({ cobranca: get().cobranca, historico });
  },

  removerHistorico: (id) => {
    const historico = get().historico.filter((h) => h.id !== id);
    set({ historico });
    persist({ cobranca: get().cobranca, historico });
  },

  limparHistorico: () => {
    set({ historico: [] });
    persist({ cobranca: get().cobranca, historico: [] });
  },
}));
