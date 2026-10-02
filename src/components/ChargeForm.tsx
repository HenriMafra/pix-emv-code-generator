import { AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import type { CobrancaNormalizada, Cobranca } from "../types";
import { TIPOS_CHAVE, TIPO_POR_ID } from "../data/chaves";
import { usePix } from "../lib/store";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";

function Aviso({ tipo, texto }: { tipo: "erro" | "aviso"; texto: string }) {
  const erro = tipo === "erro";
  const Icon = erro ? AlertCircle : Info;
  return (
    <p
      className={`mt-1 flex items-start gap-1.5 text-[11px] ${
        erro ? "text-rose-300" : "text-amber-300/90"
      }`}
    >
      <Icon size={13} className="mt-0.5 shrink-0" />
      <span>{texto}</span>
    </p>
  );
}

function Campo({
  label,
  children,
  dica,
}: {
  label: string;
  children: React.ReactNode;
  dica?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="label">{label}</span>
        {dica && <span className="text-[10px] text-slate-600">{dica}</span>}
      </div>
      {children}
    </div>
  );
}

export function ChargeForm({ norm }: { norm: CobrancaNormalizada }) {
  const cobranca = usePix((s) => s.cobranca);
  const setCampo = usePix((s) => s.setCampo);
  const setTipoChave = usePix((s) => s.setTipoChave);
  const reduzirMovimento = usePrefersReducedMotion();

  const meta = TIPO_POR_ID[cobranca.tipoChave];

  const up =
    (campo: keyof Cobranca) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCampo(campo, e.target.value);

  return (
    <div className="space-y-4">
      {/* tipo de chave */}
      <Campo label="Tipo de chave Pix">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_CHAVE.map((t) => {
            const ativo = t.id === cobranca.tipoChave;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipoChave(t.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  ativo
                    ? "border-brand-500/60 bg-brand-500/15 text-brand-200"
                    : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {t.rotulo}
              </button>
            );
          })}
        </div>
      </Campo>

      {/* chave */}
      <Campo label="Chave" dica={`ex.: ${meta.exemplo}`}>
        <div className="relative">
          <input
            className="field pr-9"
            inputMode={meta.inputMode}
            placeholder={meta.exemplo}
            value={cobranca.chave}
            onChange={up("chave")}
            aria-label="Chave Pix"
            spellCheck={false}
            autoComplete="off"
          />
          {cobranca.chave && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {norm.chave.ok ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
              ) : (
                <AlertCircle size={16} className="text-rose-400" />
              )}
            </span>
          )}
        </div>
        {cobranca.chave && !norm.chave.ok && norm.chave.erro ? (
          <Aviso tipo="erro" texto={norm.chave.erro} />
        ) : (
          <p className="mt-1 text-[11px] text-slate-600">{meta.ajuda}</p>
        )}
        {norm.chave.ok && norm.chave.aviso && <Aviso tipo="aviso" texto={norm.chave.aviso} />}
      </Campo>

      {/* nome + cidade */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nome do recebedor" dica="máx. 25">
          <input
            className="field"
            placeholder="Nome de quem recebe"
            value={cobranca.nome}
            onChange={up("nome")}
            maxLength={60}
            aria-label="Nome do recebedor"
          />
          {cobranca.nome && norm.nome.erro && <Aviso tipo="erro" texto={norm.nome.erro} />}
          {norm.nome.aviso && <Aviso tipo="aviso" texto={norm.nome.aviso} />}
        </Campo>

        <Campo label="Cidade" dica="máx. 15">
          <input
            className="field uppercase"
            placeholder="CIDADE"
            value={cobranca.cidade}
            onChange={up("cidade")}
            maxLength={40}
            aria-label="Cidade do recebedor"
          />
          {cobranca.cidade && norm.cidade.erro && (
            <Aviso tipo="erro" texto={norm.cidade.erro} />
          )}
          {norm.cidade.aviso && <Aviso tipo="aviso" texto={norm.cidade.aviso} />}
        </Campo>
      </div>

      {/* valor + txid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Valor (opcional)" dica="R$">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              R$
            </span>
            <input
              className="field pl-9"
              inputMode="decimal"
              placeholder="0,00"
              value={cobranca.valor}
              onChange={up("valor")}
              aria-label="Valor da cobrança"
            />
          </div>
          {cobranca.valor && norm.valor.erro && <Aviso tipo="erro" texto={norm.valor.erro} />}
          {!cobranca.valor && (
            <p className="mt-1 text-[11px] text-slate-600">
              Deixe em branco para o pagador definir o valor.
            </p>
          )}
        </Campo>

        <Campo label="TXID" dica="a-z 0-9 · máx. 25">
          <input
            className="field"
            placeholder="***"
            value={cobranca.txid}
            onChange={up("txid")}
            maxLength={40}
            aria-label="Identificador da transação (TXID)"
            spellCheck={false}
          />
          {norm.txid.aviso && <Aviso tipo="aviso" texto={norm.txid.aviso} />}
        </Campo>
      </div>

      {/* descrição */}
      <Campo label="Descrição (opcional)" dica="máx. 40">
        <input
          className="field"
          placeholder="Ex.: Pedido #1234"
          value={cobranca.descricao}
          onChange={up("descricao")}
          maxLength={80}
          aria-label="Descrição da cobrança"
        />
        {norm.descricao.aviso && <Aviso tipo="aviso" texto={norm.descricao.aviso} />}
      </Campo>

      {/* selo de status do formulário */}
      <motion.div
        initial={reduzirMovimento ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
          norm.valido
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            : "border-white/10 bg-white/5 text-slate-400"
        }`}
      >
        {norm.valido ? (
          <>
            <CheckCircle2 size={14} /> Cobrança válida — QR pronto ao lado.
          </>
        ) : (
          <>
            <Info size={14} /> Preencha chave, nome e cidade para gerar o QR.
          </>
        )}
      </motion.div>
    </div>
  );
}
