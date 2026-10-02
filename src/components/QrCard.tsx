import { useEffect, useState } from "react";
import { Copy, Check, Download, QrCode as QrIcon, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { qrDataUrl, qrPng, baixarDataUrl } from "../lib/qr";
import { moneyFromPayload } from "../lib/format";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";

export function QrCard({
  payload,
  valor,
  pronto,
}: {
  payload: string; // BR Code (copia e cola) — "" quando inválido
  valor: string; // valor do payload ("" sem valor)
  pronto: boolean; // cobrança válida?
}) {
  const [img, setImg] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [baixando, setBaixando] = useState<256 | 512 | null>(null);
  const [baixado, setBaixado] = useState<256 | 512 | null>(null);
  const reduzirMovimento = usePrefersReducedMotion();

  // (Re)gera a imagem do QR sempre que o payload muda.
  useEffect(() => {
    let vivo = true;
    if (pronto && payload) {
      void qrDataUrl(payload, 360).then((url) => {
        if (vivo) setImg(url);
      });
    } else {
      setImg("");
    }
    return () => {
      vivo = false;
    };
  }, [payload, pronto]);

  useEffect(() => setCopiado(false), [payload]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard bloqueado */
    }
  }

  async function baixar(size: 256 | 512) {
    setBaixando(size);
    try {
      const url = await qrPng(payload, size);
      baixarDataUrl(url, `pixforge-qr-${size}.png`);
      setBaixado(size);
      setTimeout(() => setBaixado((s) => (s === size ? null : s)), 2000);
    } catch {
      /* falha ao gerar PNG — mantém a tela estável */
    } finally {
      setBaixando(null);
    }
  }

  if (!pronto || !payload) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-dashed border-white/15 text-slate-600">
          <QrIcon size={28} />
        </div>
        <p className="text-sm font-semibold text-slate-300">Seu QR aparece aqui</p>
        <p className="max-w-[15rem] text-xs text-slate-500">
          Preencha a chave, o nome do recebedor e a cidade para gerar o Pix Copia e Cola.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={reduzirMovimento ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      <div className="flex flex-col items-center gap-4 p-5">
        {/* QR grande */}
        <div className="rounded-2xl bg-white p-3 shadow-glow">
          {img ? (
            <img
              src={img}
              alt="QR Code da cobrança Pix"
              width={232}
              height={232}
              className="block h-[232px] w-[232px]"
            />
          ) : (
            <div className="h-[232px] w-[232px] animate-pulse rounded-lg bg-slate-200" />
          )}
        </div>

        <div className="text-center">
          <p className="text-2xl font-extrabold text-white">{moneyFromPayload(valor)}</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <ShieldCheck size={12} /> BR Code estático com CRC válido
          </p>
        </div>

        {/* copia e cola */}
        <div className="w-full">
          <div className="mb-1 flex items-center justify-between">
            <span className="label">Pix Copia e Cola</span>
            <span className="text-[10px] text-slate-600">{payload.length} caracteres</span>
          </div>
          <div className="flex items-stretch gap-2">
            <textarea
              readOnly
              value={payload}
              onFocus={(e) => e.currentTarget.select()}
              className="h-20 flex-1 resize-none rounded-xl border border-white/10 bg-ink-900/60 p-2.5 font-mono text-[11px] leading-relaxed text-slate-300 outline-none"
              aria-label="Código Pix Copia e Cola"
            />
          </div>
        </div>

        {/* ações */}
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
          <button onClick={copiar} className="btn-primary !py-2 text-sm">
            {copiado ? <Check size={15} /> : <Copy size={15} />}
            {copiado ? "Copiado!" : "Copiar código"}
          </button>
          <button
            onClick={() => baixar(256)}
            disabled={baixando !== null}
            className="btn-ghost !py-2 text-sm"
            aria-label="Baixar QR Code em PNG de 256 pixels"
          >
            {baixado === 256 ? (
              <Check size={15} className="text-emerald-400" />
            ) : (
              <Download size={15} />
            )}
            {baixado === 256 ? "Baixado!" : "PNG 256"}
          </button>
          <button
            onClick={() => baixar(512)}
            disabled={baixando !== null}
            className="btn-ghost !py-2 text-sm"
            aria-label="Baixar QR Code em PNG de 512 pixels"
          >
            {baixado === 512 ? (
              <Check size={15} className="text-emerald-400" />
            ) : (
              <Download size={15} />
            )}
            {baixado === 512 ? "Baixado!" : "PNG 512"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
