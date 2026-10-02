import { Copy, RefreshCw, Trash2, Check, Receipt } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { ItemHistorico } from "../lib/store";
import { usePix } from "../lib/store";
import { money, moneyFromPayload, dataCurta, ROTULO_TIPO } from "../lib/format";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";

function totalDoDia(itens: ItemHistorico[]): number {
  const hoje = new Date();
  return itens
    .filter((i) => {
      const d = new Date(i.criadoEm);
      return (
        d.getDate() === hoje.getDate() &&
        d.getMonth() === hoje.getMonth() &&
        d.getFullYear() === hoje.getFullYear()
      );
    })
    .reduce((s, i) => s + (Number(i.valor) || 0), 0);
}

function totalDoMes(itens: ItemHistorico[]): number {
  const hoje = new Date();
  return itens
    .filter((i) => {
      const d = new Date(i.criadoEm);
      return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    })
    .reduce((s, i) => s + (Number(i.valor) || 0), 0);
}

export function Historico({
  onRegerar,
  onDuplicar,
}: {
  /** carrega a cobrança no formulário e gera o QR. */
  onRegerar: (item: ItemHistorico) => void;
  /** carrega a cobrança no formulário para edição (sem salvar de novo). */
  onDuplicar: (item: ItemHistorico) => void;
}) {
  const historico = usePix((s) => s.historico);
  const remover = usePix((s) => s.removerHistorico);
  const limpar = usePix((s) => s.limparHistorico);
  const [confirmando, setConfirmando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const reduzirMovimento = usePrefersReducedMotion();

  async function copiar(item: ItemHistorico) {
    try {
      await navigator.clipboard.writeText(item.payload);
      setCopiado(item.id);
      setTimeout(() => setCopiado((c) => (c === item.id ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  }

  if (historico.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-white/15 text-slate-600">
          <Receipt size={24} />
        </div>
        <p className="text-sm font-semibold text-slate-300">Nenhuma cobrança ainda</p>
        <p className="max-w-[16rem] text-xs text-slate-500">
          Gere um QR e ele aparece aqui para você duplicar, regerar ou copiar depois.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* totais */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">Total hoje</p>
          <p className="text-lg font-extrabold text-white">{money(totalDoDia(historico))}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">Total do mês</p>
          <p className="text-lg font-extrabold text-white">{money(totalDoMes(historico))}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          {historico.length} {historico.length === 1 ? "cobrança" : "cobranças"}
        </span>
        {confirmando ? (
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Apagar tudo?</span>
            <button
              onClick={() => {
                limpar();
                setConfirmando(false);
              }}
              className="rounded-md bg-rose-500/20 px-2 py-0.5 font-semibold text-rose-300 hover:bg-rose-500/30"
            >
              Sim
            </button>
            <button
              onClick={() => setConfirmando(false)}
              className="rounded-md bg-white/5 px-2 py-0.5 text-slate-300 hover:bg-white/10"
            >
              Não
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmando(true)}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-300"
          >
            <Trash2 size={12} /> Limpar histórico
          </button>
        )}
      </div>

      {/* lista */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {historico.map((item) => (
            <motion.div
              key={item.id}
              layout={!reduzirMovimento}
              initial={reduzirMovimento ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
              className="rounded-xl border border-white/5 bg-ink-900/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {item.descricao || "Cobrança sem descrição"}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                    <span className="font-semibold text-brand-300">
                      {moneyFromPayload(item.valor)}
                    </span>
                    <span className="font-mono">{item.chaveMascarada}</span>
                    <span className="chip !px-1.5 !py-0 !text-[10px]">
                      {ROTULO_TIPO[item.cobranca.tipoChave]}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{dataCurta(item.criadoEm)}</p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  onClick={() => onRegerar(item)}
                  className="inline-flex items-center gap-1 rounded-lg border border-brand-500/30 bg-brand-500/10 px-2 py-1 text-[11px] font-semibold text-brand-200 hover:bg-brand-500/20"
                  title="Carregar e mostrar o QR"
                >
                  <RefreshCw size={12} /> Regerar
                </button>
                <button
                  onClick={() => onDuplicar(item)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                  title="Carregar no formulário para editar"
                >
                  <Copy size={12} /> Duplicar
                </button>
                <button
                  onClick={() => copiar(item)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                  title="Copiar o Pix Copia e Cola"
                >
                  {copiado === item.id ? <Check size={12} /> : <Copy size={12} />}
                  {copiado === item.id ? "Copiado" : "Copia e Cola"}
                </button>
                <button
                  onClick={() => remover(item.id)}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                  title="Excluir"
                  aria-label="Excluir esta cobrança do histórico"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
