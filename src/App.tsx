import { useEffect, useMemo, useState } from "react";
import {
  QrCode,
  ShieldCheck,
  History as HistoryIcon,
  Share2,
  Check,
  Copy,
  Save,
  Lock,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  normalizarCobranca,
  gerarDeCobranca,
  coletarAvisos,
  sanitizarCobranca,
} from "./lib/engine";
import { mascararChave } from "./lib/format";
import { saveShare, loadShare } from "./lib/api";
import { usePix, type ItemHistorico } from "./lib/store";
import { COBRANCA_EXEMPLO } from "./data/chaves";
import { usePrefersReducedMotion } from "./lib/usePrefersReducedMotion";

import { Header } from "./components/Header";
import { ChargeForm } from "./components/ChargeForm";
import { QrCard } from "./components/QrCard";
import { Validador } from "./components/Validador";
import { Historico } from "./components/Historico";

type Tab = "qr" | "validar" | "historico";

const TABS: { id: Tab; label: string; icon: typeof QrCode }[] = [
  { id: "qr", label: "QR Code", icon: QrCode },
  { id: "validar", label: "Validador", icon: ShieldCheck },
  { id: "historico", label: "Histórico", icon: HistoryIcon },
];

function novoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const cobranca = usePix((s) => s.cobranca);
  const setCobranca = usePix((s) => s.setCobranca);
  const limparFormulario = usePix((s) => s.limparFormulario);
  const adicionarHistorico = usePix((s) => s.adicionarHistorico);

  const reduzirMovimento = usePrefersReducedMotion();
  const [tab, setTab] = useState<Tab>("qr");
  const [share, setShare] = useState<{ loading: boolean; url?: string; copied?: boolean }>({
    loading: false,
  });
  const [salvo, setSalvo] = useState(false);
  const [importado, setImportado] = useState(false);
  const [erroImport, setErroImport] = useState(false);

  // Normalização + geração derivadas (memoizadas).
  const norm = useMemo(() => normalizarCobranca(cobranca), [cobranca]);
  const payload = useMemo(() => (norm.valido ? gerarDeCobranca(norm) : ""), [norm]);
  const avisos = useMemo(() => coletarAvisos(norm), [norm]);

  const preenchido = useMemo(
    () => Object.values(cobranca).some((v) => v && v !== "email" && v.trim() !== ""),
    [cobranca]
  );

  // Limpa o formulário, confirmando antes quando há dados preenchidos.
  function limparComConfirmacao() {
    if (preenchido && !window.confirm("Limpar todos os campos do formulário?")) {
      return;
    }
    limparFormulario();
  }

  // Importa uma cobrança compartilhada via ?c=CODE ao carregar.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("c");
    if (!code) return;
    void loadShare<unknown>(code)
      .then((c) => {
        const sanitizada = sanitizarCobranca(c);
        if (sanitizada) {
          setCobranca(sanitizada);
          setTab("qr");
          setImportado(true);
          setTimeout(() => setImportado(false), 6000);
        } else if (c !== null) {
          // veio algo, mas com forma inválida → avisa em vez de quebrar
          setErroImport(true);
          setTimeout(() => setErroImport(false), 8000);
        }
      })
      .catch(() => {
        setErroImport(true);
        setTimeout(() => setErroImport(false), 8000);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Qualquer mudança invalida o link/estado de "salvo" anteriores.
  useEffect(() => {
    setShare({ loading: false });
    setSalvo(false);
  }, [payload]);

  function itemDaCobranca(): ItemHistorico {
    return {
      id: novoId(),
      criadoEm: Date.now(),
      cobranca: { ...cobranca },
      payload,
      chaveMascarada: mascararChave(norm.chave.valor),
      valor: norm.valor.valor,
      descricao: norm.descricao.valor,
    };
  }

  function salvar() {
    if (!norm.valido || !payload) return;
    adicionarHistorico(itemDaCobranca());
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  async function compartilhar() {
    if (!norm.valido) return;
    setShare({ loading: true });
    try {
      const code = await saveShare(cobranca);
      const url = `${window.location.origin}/?c=${code}`;
      window.history.replaceState(null, "", `/?c=${code}`);
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        /* clipboard bloqueado */
      }
      // também guarda no histórico para não se perder
      adicionarHistorico(itemDaCobranca());
      setShare({ loading: false, url, copied });
    } catch {
      setShare({ loading: false });
    }
  }

  function regerar(item: ItemHistorico) {
    setCobranca(item.cobranca);
    setTab("qr");
  }

  function duplicar(item: ItemHistorico) {
    setCobranca(item.cobranca);
    setTab("qr");
  }

  return (
    <div className="min-h-screen pb-10">
      <Header
        onExemplo={() => setCobranca(COBRANCA_EXEMPLO)}
        onLimpar={limparComConfirmacao}
        podeRegerar={preenchido}
      />

      {/* hero */}
      <section className="mx-auto max-w-7xl px-4 pt-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Gere e valide cobranças Pix.
          </h2>
          <p className="max-w-2xl text-sm text-slate-400">
            Monte um <span className="text-brand-300">BR Code estático</span> com{" "}
            <span className="text-emerald-300">CRC verificado</span>, baixe o{" "}
            <span className="text-neon-cyan">QR Code</span> e{" "}
            <span className="text-amber-300">valide</span> qualquer Pix Copia e Cola — tudo no
            navegador.
          </p>
        </div>
      </section>

      {/* aviso de importação por link */}
      {importado && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
            <Info size={14} /> Cobrança aberta a partir de um link compartilhado. Confira os
            dados antes de pagar.
          </div>
        </div>
      )}

      {/* aviso de link inválido/corrompido */}
      {erroImport && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <Info size={14} /> Não foi possível abrir o link compartilhado (código inválido ou
            dados corrompidos). Preencha a cobrança manualmente.
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-6 xl:grid-cols-12">
        {/* formulário */}
        <div className="xl:col-span-7">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Dados da cobrança
              </h3>
              <span className="chip">
                <Lock size={12} className="text-brand-400" /> fica no seu navegador
              </span>
            </div>
            <ChargeForm norm={norm} />
          </div>

          {/* avisos de normalização */}
          {avisos.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300/90">
                <Info size={12} /> Ajustes aplicados
              </p>
              <ul className="space-y-0.5 text-[11px] text-amber-200/80">
                {avisos.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* painel lateral */}
        <div className="xl:col-span-5">
          <div className="space-y-4 xl:sticky xl:top-20">
            {/* ações */}
            <div className="flex gap-2">
              <button
                onClick={salvar}
                disabled={!norm.valido}
                className="btn-ghost flex-1 !py-2 text-sm"
              >
                {salvo ? <Check size={15} className="text-emerald-400" /> : <Save size={15} />}
                {salvo ? "Salvo!" : "Salvar"}
              </button>
              <button
                onClick={compartilhar}
                disabled={!norm.valido || share.loading}
                className="btn-primary flex-1 !py-2 text-sm"
              >
                {share.copied ? <Check size={15} /> : <Share2 size={15} />}
                {share.loading
                  ? "Gerando…"
                  : share.copied
                  ? "Link copiado!"
                  : "Compartilhar"}
              </button>
            </div>

            {share.url && (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-900/60 px-2.5 py-1.5">
                <input
                  readOnly
                  value={share.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 bg-transparent text-[11px] text-slate-300 outline-none"
                  aria-label="Link de compartilhamento"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(share.url!);
                    setShare((s) => ({ ...s, copied: true }));
                  }}
                  className="text-slate-400 hover:text-white"
                  title="Copiar link"
                  aria-label="Copiar link de compartilhamento"
                >
                  <Copy size={13} />
                </button>
              </div>
            )}

            {/* abas */}
            <div className="card overflow-hidden">
              <div className="flex border-b border-white/5">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`relative flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold transition ${
                        active ? "text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Icon size={14} />
                      <span>{t.label}</span>
                      {active && (
                        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-400" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="p-4">
                {tab === "qr" && <QrCard payload={payload} valor={norm.valor.valor} pronto={norm.valido} />}
                {tab === "validar" && <Validador inicial={payload} />}
                {tab === "historico" && <Historico onRegerar={regerar} onDuplicar={duplicar} />}
              </div>
            </div>

            {/* disclaimer fixo */}
            <motion.p
              initial={reduzirMovimento ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-slate-500"
            >
              <ShieldCheck size={12} className="mr-1 inline text-brand-400" />
              PIX estático — confira no app do seu banco; nenhum dado sai do seu navegador
              (exceto ao compartilhar).
            </motion.p>
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-[11px] text-slate-600">
        PixForge · React + Cloudflare Pages + D1
      </footer>
    </div>
  );
}
