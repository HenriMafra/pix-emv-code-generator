import { useMemo, useState } from "react";
import { ShieldCheck, ShieldAlert, ClipboardPaste, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { TLVNode } from "../types";
import { decodificarBRCode, resumoDecodificado } from "../lib/engine";
import { moneyFromPayload, ROTULO_TIPO } from "../lib/format";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";

function TLVLinha({ node, nivel = 0 }: { node: TLVNode; nivel?: number }) {
  return (
    <>
      <div
        className="flex items-start gap-2 py-1 font-mono text-[11px]"
        style={{ paddingLeft: nivel * 16 }}
      >
        <span className="w-7 shrink-0 rounded bg-white/5 px-1 text-center text-brand-300">
          {node.id}
        </span>
        <span className="w-7 shrink-0 text-slate-600">{node.len}</span>
        <span className="flex-1 break-all text-slate-200">
          {node.filhos ? (
            <span className="text-slate-500">{node.nome ?? "—"}</span>
          ) : (
            node.valor || <span className="text-slate-600">(vazio)</span>
          )}
          {node.nome && !node.filhos && (
            <span className="ml-2 text-[10px] text-slate-600">{node.nome}</span>
          )}
        </span>
      </div>
      {node.filhos?.map((f, i) => (
        <TLVLinha key={`${f.id}-${i}`} node={f} nivel={nivel + 1} />
      ))}
    </>
  );
}

function inferirTipo(chave?: string): string {
  if (!chave) return "—";
  if (chave.includes("@")) return ROTULO_TIPO.email;
  if (chave.startsWith("+")) return ROTULO_TIPO.telefone;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(chave)) return ROTULO_TIPO.aleatoria;
  if (/^\d{11}$/.test(chave)) return ROTULO_TIPO.cpf;
  if (/^\d{14}$/.test(chave)) return ROTULO_TIPO.cnpj;
  return "Chave";
}

export function Validador({ inicial = "" }: { inicial?: string }) {
  const [texto, setTexto] = useState(inicial);
  const reduzirMovimento = usePrefersReducedMotion();

  const decodificado = useMemo(
    () => (texto.trim() ? decodificarBRCode(texto) : null),
    [texto]
  );
  const resumo = useMemo(
    () => (decodificado ? resumoDecodificado(decodificado.nodes) : null),
    [decodificado]
  );

  async function colar() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setTexto(t.trim());
    } catch {
      /* clipboard bloqueado — usuário cola manualmente */
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="label">Cole um Pix Copia e Cola</span>
          <div className="flex gap-1">
            <button
              onClick={colar}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
            >
              <ClipboardPaste size={12} /> Colar
            </button>
            {texto && (
              <button
                onClick={() => setTexto("")}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400 hover:bg-white/10"
                title="Limpar"
                aria-label="Limpar campo de validação"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="00020126…6304XXXX"
          spellCheck={false}
          className="h-24 w-full resize-none rounded-xl border border-white/10 bg-ink-900/60 p-3 font-mono text-[11px] leading-relaxed text-slate-200 outline-none transition focus:border-brand-500/60"
          aria-label="Código Pix para validar"
        />
      </div>

      {!decodificado && (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-slate-500">
          Cole acima para ver a árvore de campos e checar o CRC.
        </p>
      )}

      {decodificado && decodificado.erro && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <ShieldAlert size={14} /> {decodificado.erro}
          </div>
        </div>
      )}

      {decodificado && !decodificado.erro && (
        <motion.div
          initial={reduzirMovimento ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {/* selo CRC */}
          {decodificado.crcOk ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
              <ShieldCheck size={16} /> CRC válido ({decodificado.crcLido})
            </div>
          ) : (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert size={16} /> CRC inválido
              </div>
              <p className="mt-1 font-mono text-[11px] text-rose-200/90">
                lido: {decodificado.crcLido || "—"} · esperado:{" "}
                {decodificado.crcEsperado || "—"}
              </p>
            </div>
          )}

          {/* resumo extraído */}
          {resumo && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Resumo titulo="Chave" valor={resumo.chave} extra={inferirTipo(resumo.chave)} />
              <Resumo titulo="Valor" valor={moneyFromPayload(resumo.valor)} />
              <Resumo titulo="Recebedor" valor={resumo.nome} />
              <Resumo titulo="Cidade" valor={resumo.cidade} />
              {resumo.descricao && <Resumo titulo="Descrição" valor={resumo.descricao} />}
              {resumo.txid && <Resumo titulo="TXID" valor={resumo.txid} />}
            </div>
          )}

          {/* árvore TLV */}
          <div className="rounded-xl border border-white/10 bg-ink-900/40 p-3">
            <div className="mb-1 flex gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
              <span className="w-7 text-center">id</span>
              <span className="w-7">len</span>
              <span className="flex-1">valor</span>
            </div>
            <div className="divide-y divide-white/5">
              {decodificado.nodes.map((n, i) => (
                <TLVLinha key={`${n.id}-${i}`} node={n} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Resumo({
  titulo,
  valor,
  extra,
}: {
  titulo: string;
  valor?: string;
  extra?: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-600">{titulo}</p>
      <p className="break-all text-slate-200">{valor || "—"}</p>
      {extra && extra !== "—" && <p className="text-[10px] text-brand-300/80">{extra}</p>}
    </div>
  );
}
