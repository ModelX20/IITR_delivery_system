import { Link, NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Logo } from './Logo';
import { CartIcon, LogoutIcon, PackageIcon, StoreIcon } from './icons';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link to="/" className="mr-auto shrink-0" aria-label="IITR Delivery home">
          <Logo />
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <StoreIcon />
            <span className="hidden sm:inline">Shop</span>
          </NavLink>
          <NavLink to="/orders" className={navLinkClass}>
            <PackageIcon />
            <span className="hidden sm:inline">Orders</span>
          </NavLink>
          <NavLink to="/cart" className={navLinkClass} aria-label={`Cart, ${cart.itemCount} items`}>
            <span className={`relative ${cart.itemCount > 0 ? 'mr-1.5' : ''}`}>
              <CartIcon />
              {cart.itemCount > 0 && (
                <span className="absolute -top-2 -right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-400 px-1 text-[11px] font-bold text-brand-900">
                  {cart.itemCount > 99 ? '99+' : cart.itemCount}
                </span>
              )}
            </span>
            <span className="hidden sm:inline">Cart</span>
          </NavLink>
        </nav>

        <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
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
