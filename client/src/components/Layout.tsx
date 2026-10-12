import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
