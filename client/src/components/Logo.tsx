export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-brand-800" />
      <path
        d="M8 12.5 16 8l8 4.5v8L16 25l-8-4.5zM8 12.5 16 17l8-4.5M16 17v8"
        fill="none"
        stroke="#f5b82e"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-brand-900'}`}>
        IITR <span className="text-gold-500">Delivery</span>
      </span>
    </span>
  );
}
