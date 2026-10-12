import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import { CartPage } from './pages/CartPage';
import { CatalogPage } from './pages/CatalogPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrdersPage } from './pages/OrdersPage';
import { RegisterPage } from './pages/RegisterPage';

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/orders/:id/confirmation" element={<OrderConfirmationPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
