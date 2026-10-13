import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ROLE_HOME } from '@iitr/shared';
import { useAuth } from '../context/AuthContext';
import { Logo, LogoMark } from './Logo';
import { LogoutIcon } from './icons';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Only active on an exact match (for index routes). */
  end?: boolean;
  badge?: number;
  /** Badge colour: gold for counts, red for warnings. */
  badgeTone?: 'gold' | 'red';
}

const ROLE_LABEL = { STUDENT: null, DELIVERY_PARTNER: 'Delivery', ADMIN: 'Admin' } as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition sm:px-3 ${
    isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function Navbar({ items }: { items: NavItem[] }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const roleLabel = user ? ROLE_LABEL[user.role] : null;
  const compact = items.length > 3;

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-4 sm:gap-2">
        <Link to={user ? ROLE_HOME[user.role] : '/'} className="mr-auto flex shrink-0 items-center gap-2" aria-label="IITR Delivery home">
          {compact ? (
            <>
              <span className="sm:hidden">
                <LogoMark />
              </span>
              <span className="hidden sm:block">
                <Logo />
              </span>
            </>
          ) : (
            <Logo />
          )}
          {roleLabel && (
            <span className="hidden rounded-md bg-gold-400/20 px-2 py-0.5 text-xs font-semibold text-amber-800 md:inline">{roleLabel}</span>
          )}
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navLinkClass}
              aria-label={item.badge ? `${item.label} (${item.badge})` : item.label}
            >
              <span className={`relative ${item.badge ? 'mr-1.5' : ''}`}>
                {item.icon}
                {!!item.badge && (
                  <span
                    className={`absolute -top-2 -right-3 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                      item.badgeTone === 'red' ? 'bg-red-500 text-white' : 'bg-gold-400 text-brand-900'
                    }`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              <span className={compact ? 'hidden lg:inline' : 'hidden sm:inline'}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
          <span className="hidden max-w-32 truncate text-sm text-slate-600 md:inline" title={user?.email}>
            Hi, {user?.name.split(' ')[0]}
          </span>
          <button onClick={handleLogout} className="btn-ghost px-2.5" aria-label="Log out">
            <LogoutIcon />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
