import { PAYMENT_METHOD_LABEL } from '@iitr/shared';
import { WalletIcon } from './icons';

export function PaymentNote({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-sm text-slate-600 ${className}`}>
      <WalletIcon className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <span>
        Payment: <span className="font-medium text-slate-800">{PAYMENT_METHOD_LABEL}</span>
      </span>
    </p>
  );
}
