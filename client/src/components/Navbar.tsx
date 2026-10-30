import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ROLE_HOME } from '@iitr/shared';
import { useAuth } from '../context/AuthContext';
import { Logo, LogoMark } from './Logo';
import { ChevronDownIcon, LogoutIcon, MapPinIcon } from './icons';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Only active on an exact match (for index routes). */
  end?: boolean;
  badge?: number;
  /** Badge colour: brand for counts, red for warnings. */
  badgeTone?: 'gold' | 'red';
}

const ROLE_LABEL = { STUDENT: 'Student', DELIVERY_PARTNER: 'Delivery partner', ADMIN: 'Admin' } as const;

function Badge({ count, tone }: { count: number; tone?: NavItem['badgeTone'] }) {
  return (
    <span
      className={`absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold ring-2 ring-white ${
        tone === 'red' ? 'bg-red-500 text-white' : 'bg-brand-600 text-white'
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/** "Deliver to" address chip, like the location picker in delivery apps. */
function LocationChip({ bhawan }: { bhawan: string | null | undefined }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <MapPinIcon className="size-5 shrink-0 text-brand-500" />
      <div className="min-w-0 leading-tight">
        <p className="flex items-center gap-1 text-sm font-extrabold text-ink">
          <span className="truncate">{bhawan ? `${bhawan} Bhawan` : 'IIT Roorkee'}</span>
        </p>
        <p className="truncate text-xs text-slate-500">IIT Roorkee, Uttarakhand</p>
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!user) return null;

  async function handleLogout() {
    setOpen(false);
    await logout();
    toast.success('Logged out');
    navigate('/login', { replace: true });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 transition hover:bg-slate-100 md:pr-3"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-extrabold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden max-w-28 truncate text-sm font-semibold text-slate-700 md:inline">{user.name.split(' ')[0]}</span>
        <ChevronDownIcon className={`hidden size-4 text-slate-400 transition md:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 origin-top-right animate-pop overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-float"
        >
          <div className="bg-gradient-to-br from-brand-50 to-white px-4 py-4">
            <p className="truncate font-bold text-ink">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <span className="mt-2 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          <button
            role="menuitem"
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <LogoutIcon className="size-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function Navbar({ items, showLocation = false }: { items: NavItem[]; showLocation?: boolean }) {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const home = user ? ROLE_HOME[user.role] : '/';
  const roleTag = user && user.role !== 'STUDENT' ? ROLE_LABEL[user.role] : null;

  return (
    <>
      <header className={`sticky top-0 z-30 bg-white transition-shadow ${scrolled ? 'shadow-[0_2px_16px_-6px_rgb(0_0_0/0.15)]' : 'border-b border-slate-100'}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:h-[72px] md:gap-6">
          <Link to={home} className="flex shrink-0 items-center gap-2" aria-label="IITR Delivery home">
            <span className={showLocation ? 'md:hidden' : 'hidden'}>
              <LogoMark />
            </span>
            <span className={showLocation ? 'hidden md:block' : ''}>
              <Logo />
            </span>
          </Link>

          {roleTag && (
            <span className="hidden rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700 sm:inline">{roleTag}</span>
          )}

          {showLocation && (
            <div className="min-w-0 md:border-l md:border-slate-200 md:pl-6">
              <LocationChip bhawan={user?.bhawan} />
            </div>
          )}

          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                aria-label={item.badge ? `${item.label} (${item.badge})` : item.label}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold transition ${
                    isActive ? 'text-brand-600' : 'text-slate-600 hover:text-brand-600'
                  }`
                }
              >
                <span className={`relative ${item.badge ? 'mr-1.5' : ''}`}>
                  {item.icon}
                  {!!item.badge && <Badge count={item.badge} tone={item.badgeTone} />}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto md:ml-0">
            <UserMenu />
          </div>
        </div>
      </header>

      {/* App-style tab bar on phones */}
      {items.length > 1 && (
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Main"
      >
        <div className="mx-auto flex max-w-md">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.badge ? `${item.label} (${item.badge})` : item.label}
              className={({ isActive }) =>
                `relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-bold transition ${
                  isActive ? 'text-brand-600' : 'text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 h-[3px] w-10 rounded-b-full bg-brand-500" />}
                  <span className="relative [&_svg]:size-6">
                    {item.icon}
                    {!!item.badge && <Badge count={item.badge} tone={item.badgeTone} />}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      )}
    </>
  );
}
