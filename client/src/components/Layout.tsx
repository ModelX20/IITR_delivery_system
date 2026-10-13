import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Navbar, type NavItem } from './Navbar';
import { CartIcon, PackageIcon, StoreIcon, TruckIcon } from './icons';

function Shell({ items, children }: { items: NavItem[]; children?: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Navbar items={items} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children ?? <Outlet />}</main>
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
