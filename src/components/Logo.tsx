/** Losango PIX estilizado — mesmo desenho do favicon, reaproveitável na UI. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g fill="currentColor">
        <path d="M32 9 41 18 32 27 23 18z" />
        <path d="M55 32 46 41 37 32 46 23z" />
        <path d="M32 55 23 46 32 37 41 46z" />
        <path d="M9 32 18 23 27 32 18 41z" />
      </g>
      <rect x="28.5" y="28.5" width="7" height="7" rx="1.5" fill="rgba(11,15,26,0.55)" />
    </svg>
  );
}
