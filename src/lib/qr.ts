import QRCode from "qrcode";

// Wrapper fino sobre a lib `qrcode`. Mantém os parâmetros do Pix (ECC M,
// margem 2) e cores que combinam com o tema do PixForge.

const OPCOES_BASE = {
  errorCorrectionLevel: "M" as const,
  margin: 2,
  color: {
    dark: "#0b0f1a",
    light: "#ffffff",
  },
};

/** Gera um data URL PNG do QR para exibição (escala adaptável). */
export async function qrDataUrl(texto: string, width = 320): Promise<string> {
  return QRCode.toDataURL(texto, { ...OPCOES_BASE, width });
}

/** Gera um PNG do QR em um tamanho fixo (para download em 256/512). */
export async function qrPng(texto: string, size: number): Promise<string> {
  return QRCode.toDataURL(texto, { ...OPCOES_BASE, width: size });
}

/** Dispara o download de um data URL como arquivo. */
export function baixarDataUrl(dataUrl: string, nome: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
