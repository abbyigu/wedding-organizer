// Small line illustrations for the Private space. Decorative only.
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function Envelope({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden {...S}>
      <rect x="10" y="20" width="100" height="62" rx="4" />
      <path d="M10 24l50 34 50-34" />
      <path d="M10 80l38-30M110 80L72 50" />
      <circle cx="60" cy="58" r="8" fill="currentColor" fillOpacity="0.15" />
      <path d="M56 58l3 3 5-6" />
    </svg>
  );
}

export function Ribbon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden {...S}>
      <path d="M60 40c-16-22-40-14-34 2 4 10 24 6 34-2zM60 40c16-22 40-14 34 2-4 10-24 6-34-2z" />
      <circle cx="60" cy="42" r="5" />
      <path d="M56 46c-6 14-14 22-22 26M64 46c6 14 14 22 22 26" />
    </svg>
  );
}

export function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 120" className={className} aria-hidden {...S}>
      <path d="M45 116C43 84 45 52 58 10" />
      <path d="M45 96c-14-2-22-12-22-22 12 0 20 8 22 22zM46 76c12-2 22-12 22-24-12 2-20 10-22 24zM50 52c-12-2-20-10-20-20 10 0 18 6 20 20zM56 34c10-2 16-10 16-18-10 2-14 8-16 18z" />
    </svg>
  );
}

export function Gift({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden {...S}>
      <rect x="14" y="40" width="72" height="46" rx="3" />
      <rect x="10" y="28" width="80" height="14" rx="3" />
      <path d="M50 28v58M50 28c-8-16-26-16-24-6 2 8 18 6 24 6zM50 28c8-16 26-16 24-6-2 8-18 6-24 6z" />
    </svg>
  );
}
