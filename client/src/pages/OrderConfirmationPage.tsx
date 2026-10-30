import { Link, useParams } from 'react-router-dom';
import { PAYMENT_METHOD_LABEL } from '@iitr/shared';
import { useOrder } from '../hooks/useOrder';
import { EmptyState } from '../components/EmptyState';
import { OrderBreakdown } from '../components/OrderBreakdown';
import { FullPageSpinner } from '../components/Spinner';
import { MapPinIcon, WalletIcon } from '../components/icons';
import { formatDateTime, formatPrice, shortOrderId } from '../lib/format';
import { PHOTOS, unsplash } from '../lib/photos';

// Confetti kept to the left and right edges so it never covers the text.
const CONFETTI = [
  { emoji: '🎉', left: 6, top: 12 },
  { emoji: '✨', left: 18, top: 34 },
  { emoji: '⭐', left: 8, top: 58 },
  { emoji: '🎊', left: 86, top: 10 },
  { emoji: '✨', left: 78, top: 32 },
  { emoji: '🥳', left: 88, top: 56 },
];

export function OrderConfirmationPage() {
  const { id } = useParams();
  const { order, loading, error } = useOrder(id);

  if (loading) return <FullPageSpinner />;
  if (error || !order) {
    return (
      <EmptyState
        emoji="🔎"
        title="Order not found"
        message={error}
        action={
          <Link to="/orders" className="btn-primary">
            My orders
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="card overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-fresh-500 to-teal-600 px-6 pt-10 pb-8 text-center text-white">
          <img src={unsplash(PHOTOS.hero, 1200, 500)} alt="" className="absolute inset-0 size-full object-cover opacity-30 mix-blend-overlay" />
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="absolute animate-float text-xl opacity-80 sm:text-2xl"
              style={{ left: `${c.left}%`, top: `${c.top}%`, animationDelay: `${i * 0.4}s` }}
              aria-hidden="true"
            >
              {c.emoji}
            </span>
          ))}
          <div className="relative mx-auto flex size-20 animate-pop items-center justify-center rounded-full bg-white shadow-xl">
            <svg viewBox="0 0 24 24" className="size-11 text-fresh-500" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h1 className="relative mt-5 text-2xl font-extrabold sm:text-3xl">Order placed!</h1>
          <p className="relative mt-1 text-white/90">
            {shortOrderId(order.id)} · {formatPrice(order.total)} · {formatDateTime(order.createdAt)}
          </p>
          <p className="relative mx-auto mt-4 w-fit rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur">
            🛵 Track every step from Your orders
          </p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
              <MapPinIcon className="mt-0.5 size-5 shrink-0 text-brand-500" />
              <div>
                <p className="font-extrabold text-ink">Delivering to</p>
                <p className="text-slate-600">
                  Room {order.roomNo}, {order.bhawan} Bhawan
                </p>
                {order.note && <p className="mt-1 text-slate-500 italic">“{order.note}”</p>}
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
              <WalletIcon className="mt-0.5 size-5 shrink-0 text-fresh-600" />
              <div>
                <p className="font-extrabold text-ink">Payment</p>
                <p className="text-slate-600">{PAYMENT_METHOD_LABEL}</p>
              </div>
            </div>
          </div>

          <OrderBreakdown order={order} />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={`/orders/${order.id}`} className="btn-primary flex-1 py-3">
              Track order
            </Link>
            <Link to="/" className="btn-secondary flex-1 py-3">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
