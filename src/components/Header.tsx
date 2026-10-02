import { Sparkles, Eraser, Github } from "lucide-react";
import { Logo } from "./Logo";

export function Header({
  onExemplo,
  onLimpar,
  podeRegerar,
}: {
  onExemplo: () => void;
  onLimpar: () => void;
  podeRegerar: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-glow">
          <Logo size={20} />
        </div>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
            PixForge
            <span className="hidden rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
              cobranças Pix
            </span>
          </h1>
          <p className="hidden text-[11px] text-slate-500 sm:block">
            BR Code estático + QR · CRC16 verificado · 100% no seu navegador
          </p>
        </div>

        <button onClick={onExemplo} className="btn-ghost !py-1.5 !px-3 text-xs">
          <Sparkles size={14} className="text-neon-amber" />
          <span className="hidden sm:inline">Exemplo</span>
        </button>
        {podeRegerar && (
          <button
            onClick={onLimpar}
            className="btn !py-1.5 !px-3 text-xs text-rose-300 hover:bg-rose-500/10"
            title="Limpar formulário"
          >
            <Eraser size={14} />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        )}
        <a
          href="https://github.com/HenriMafra/pixforge"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost !p-2"
          title="Código no GitHub"
          aria-label="Código no GitHub (abre em nova aba)"
        >
          <Github size={16} />
        </a>
      </div>
    </header>
  );
}
