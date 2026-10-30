import type { ReactNode } from 'react';
import { Logo } from '../components/Logo';
import { PHOTOS, unsplash } from '../lib/photos';

const HIGHLIGHTS = [
  { emoji: '⚡', text: 'Quick delivery anywhere on campus' },
  { emoji: '🏠', text: 'Straight to your bhawan room' },
  { emoji: '🎉', text: 'Free delivery on orders above ₹300' },
];

/** Login/register: a full-bleed food photo with the form floating on top (a bottom sheet on phones). */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-ink lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:px-12 lg:py-10">
      <img src={unsplash(PHOTOS.auth, 1920, 1280)} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/80 lg:bg-gradient-to-r lg:from-black/85 lg:via-black/60 lg:to-black/30" aria-hidden="true" />

      {/* Brand pitch */}
      <aside className="relative px-6 pt-8 pb-16 text-white lg:max-w-xl lg:flex-1 lg:p-0">
        <span className="inline-flex rounded-2xl bg-white px-3 py-2 shadow-lg">
          <Logo />
        </span>
        <p className="mt-10 text-xs font-extrabold tracking-[0.2em] text-brand-300 uppercase lg:mt-16">IIT Roorkee · Campus delivery</p>
        <h2 className="mt-2 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl xl:text-6xl">
          Hungry at 2&nbsp;AM?
          <br />
          <span className="text-white/85">We deliver to your bhawan.</span>
        </h2>
        <ul className="mt-8 hidden space-y-3 lg:block">
          {HIGHLIGHTS.map((h) => (
            <li key={h.text} className="flex items-center gap-3 font-semibold text-white/90">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-lg backdrop-blur" aria-hidden="true">
                {h.emoji}
              </span>
              {h.text}
            </li>
          ))}
        </ul>
        <p className="mt-12 hidden text-xs text-white/50 lg:block">A student project for the IIT Roorkee community.</p>
      </aside>

      {/* Form: floating card on desktop, bottom sheet on phones */}
      <main className="relative -mt-8 flex flex-1 justify-center rounded-t-[2rem] bg-white px-5 pt-8 pb-10 sm:px-8 lg:mt-0 lg:w-full lg:max-w-md lg:flex-none lg:rounded-3xl lg:p-9 lg:shadow-2xl">
        <div className="w-full max-w-md animate-slide-up">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
