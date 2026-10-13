import { Route, Routes } from 'react-router-dom';
import { DeliveryLayout, StudentLayout } from './components/Layout';
import { PublicOnlyRoute, RequireRole } from './components/RouteGuards';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminItemsPage } from './pages/admin/AdminItemsPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOrderDetailPage } from './pages/admin/AdminOrderDetailPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { DeliveryHomePage } from './pages/delivery/DeliveryHomePage';
import { CartPage } from './pages/CartPage';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      {/* Reachable logged in or out: the link arrives by email. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireRole roles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="items" element={<AdminItemsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={['DELIVERY_PARTNER']} />}>
        <Route path="/delivery" element={<DeliveryLayout />}>
          <Route index element={<DeliveryHomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={['STUDENT']} />}>
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route element={<StudentLayout />}>
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
