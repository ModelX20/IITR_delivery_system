import type { ReactNode } from 'react';
import { Logo, LogoMark } from '../components/Logo';

const HIGHLIGHTS = [
  'Snacks, stationery and essentials from campus shops',
  'Delivered to your bhawan room',
  'Free delivery on orders above ₹300',
];

/** Split layout for login/register: branded panel on large screens, centred card everywhere. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="relative hidden w-[44%] overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-gold-400/10 blur-3xl" />

        <div className="relative">
          <Logo light />
        </div>
        <div className="relative mt-auto mb-auto">
          <p className="text-sm font-semibold tracking-widest text-gold-400 uppercase">IIT Roorkee</p>
          <h2 className="mt-3 text-4xl leading-tight font-bold">
            Campus essentials,
            <br />
            delivered to your door.
          </h2>
          <ul className="mt-8 space-y-3 text-brand-100">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-gold-400/15 text-gold-400">✓</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-300">A student project for the IIT Roorkee community.</p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <LogoMark className="size-12" />
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-900">
              IITR <span className="text-gold-500">Delivery</span>
            </p>
          </div>
          <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
