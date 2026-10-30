export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" className="text-brand-500" />
      {/* A location pin carrying a shopping bag */}
      <path d="M16 5.5c-4.6 0-8.3 3.5-8.3 8 0 6 8.3 13 8.3 13s8.3-7 8.3-13c0-4.5-3.7-8-8.3-8z" fill="#fff" />
      <path d="M12.6 12.2h6.8l-.6 5.3h-5.6z" fill="currentColor" className="text-brand-500" />
      <path d="M14.3 12.2v-1a1.7 1.7 0 0 1 3.4 0v1" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-brand-500" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className={`flex flex-col leading-none ${light ? 'text-white' : 'text-ink'}`}>
        <span className="text-lg font-extrabold tracking-tight">
          IITR<span className={light ? 'text-white/80' : 'text-brand-500'}>Delivery</span>
        </span>
        <span className={`mt-0.5 text-[10px] font-semibold tracking-[0.18em] uppercase ${light ? 'text-white/70' : 'text-slate-400'}`}>
          Campus in minutes
        </span>
      </span>
    </span>
  );
}
