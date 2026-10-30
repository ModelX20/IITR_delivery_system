import type { ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { Logo } from './Logo';
import { Navbar, type NavItem } from './Navbar';
import { CartIcon, ChevronRightIcon, HomeIcon, PackageIcon, TruckIcon } from './icons';

function Footer() {
  return (
    <footer className="mt-12 hidden bg-ink text-slate-400 md:block">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Late-night cravings, last-minute stationery and daily essentials, delivered to your bhawan at IIT Roorkee.
          </p>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Why order with us</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>⚡ Quick delivery on campus</li>
            <li>🎉 Free delivery above ₹300</li>
            <li>💵 Pay with cash on delivery</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Delivering to</p>
          <p className="mt-3 text-sm leading-relaxed">All bhawans and hostels across the IIT Roorkee campus, Uttarakhand.</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs">© {new Date().getFullYear()} IITR Delivery · A student project for the IIT Roorkee community · Photos from{' '}
          <a href="https://unsplash.com/?utm_source=iitr_delivery&utm_medium=referral" className="underline hover:text-white" target="_blank" rel="noreferrer">
            Unsplash
          </a>
        </p>
      </div>
    </footer>
  );
}

function Shell({ items, children, showLocation = false, overlay }: { items: NavItem[]; children?: ReactNode; showLocation?: boolean; overlay?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar items={items} showLocation={showLocation} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 sm:pt-6 md:pb-10">{children ?? <Outlet />}</main>
      {overlay}
      <Footer />
    </div>
  );
}

/** Sticky "View cart" bar shown while shopping, like the bar at the bottom of a restaurant menu. */
function FloatingCartBar() {
  const { cart } = useCart();
  const { pathname } = useLocation();
  if (cart.itemCount === 0 || pathname !== '/') return null;

  const free = Number(cart.deliveryFee) === 0;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-20 px-3 md:bottom-6">
      <Link
        to="/cart"
        className="pointer-events-auto mx-auto flex max-w-xl animate-slide-up items-center justify-between gap-3 rounded-2xl bg-brand-600 px-4 py-3 text-white shadow-float transition hover:bg-brand-700"
      >
        <span className="min-w-0">
          <span className="block text-sm font-extrabold">
            {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} added · {formatPrice(cart.subtotal)}
          </span>
          <span className="block truncate text-xs text-white/85">{free ? '🎉 You unlocked FREE delivery' : 'Free delivery above ₹300'}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-extrabold">
          <CartIcon className="size-5" />
          View cart
          <ChevronRightIcon className="size-4" />
        </span>
      </Link>
    </div>
  );
}

export function StudentLayout() {
  const { cart } = useCart();
  return (
    <Shell
      showLocation
      overlay={<FloatingCartBar />}
      items={[
        { to: '/', label: 'Home', icon: <HomeIcon />, end: true },
        { to: '/orders', label: 'Orders', icon: <PackageIcon /> },
        { to: '/cart', label: 'Cart', icon: <CartIcon />, badge: cart.itemCount },
      ]}
    />
  );
}

export function DeliveryLayout() {
  return <Shell items={[{ to: '/delivery', label: 'Deliveries', icon: <TruckIcon />, end: true }]} />;
}

export { Shell };
