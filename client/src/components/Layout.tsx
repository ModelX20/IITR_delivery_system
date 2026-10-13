import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Navbar, type NavItem } from './Navbar';
import { CartIcon, PackageIcon, StoreIcon, TruckIcon } from './icons';

function Shell({ items, children }: { items: NavItem[]; children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar items={items} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children ?? <Outlet />}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500">
          <span>
            <span className="font-semibold text-brand-900">IITR Delivery</span> · Campus delivery for IIT Roorkee
          </span>
          <span>Cash on Delivery · Free delivery above ₹300</span>
        </div>
      </footer>
    </div>
  );
}

export function StudentLayout() {
  const { cart } = useCart();
  return (
    <Shell
      items={[
        { to: '/', label: 'Shop', icon: <StoreIcon />, end: true },
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
