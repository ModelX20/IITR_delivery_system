import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SIGNUP_CODE, type SignupStarted, type User } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Spinner';
import { MailIcon } from '../components/icons';

/** Errors after which this sign-up can't continue and the form must be submitted again. */
const RESTART_PATTERN = /fill in the form again/;

/** Step 2 of sign-up: enter the 6-digit code that was emailed. */
export function VerifyEmailStep({
  started,
  onVerified,
  onEditDetails,
}: {
  started: SignupStarted;
  onVerified: (user: User) => void;
  onEditDetails: () => void;
}) {
  const { verifySignup } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [mustRestart, setMustRestart] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(started.resendAfterSeconds);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(value: string) {
    if (value.length !== SIGNUP_CODE.length || verifying) return;
    setVerifying(true);
    setError('');
    setNotice('');
    try {
      onVerified(await verifySignup(started.email, value));
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      setMustRestart(RESTART_PATTERN.test(message));
      setCode('');
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    setResending(true);
    setError('');
    setNotice('');
    try {
      const next = await api<SignupStarted>('/auth/register/resend', { method: 'POST', body: { email: started.email } });
      setCooldown(next.resendAfterSeconds);
      setNotice('A new code is on its way. The previous code no longer works.');
      setCode('');
      inputRef.current?.focus();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      setMustRestart(RESTART_PATTERN.test(message));
    } finally {
      setResending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== SIGNUP_CODE.length) return setError('Enter the 6-digit code from the email');
    submit(code);
  }

  return (
    <div>
      <div className="mb-6 flex items-start gap-3 rounded-lg bg-brand-50 p-4 text-sm text-brand-900">
        <MailIcon className="mt-0.5 size-5 shrink-0 text-brand-700" />
        <p>
          We've sent a {SIGNUP_CODE.length}-digit code to <strong className="break-words">{started.email}</strong>. It expires in{' '}
          {started.expiresInMinutes} minutes. Check your spam folder if you don't see it.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-slate-700">
            Verification code
          </label>
          <input
            ref={inputRef}
            id="code"
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            maxLength={SIGNUP_CODE.length}
            placeholder="••••••"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'code-error' : undefined}
            disabled={mustRestart}
            className="input py-3 text-center font-mono text-2xl tracking-[0.5em]"
            value={code}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, SIGNUP_CODE.length);
              setCode(digits);
              setError('');
              // Submit as soon as the last digit is typed or pasted.
              if (digits.length === SIGNUP_CODE.length) submit(digits);
            }}
          />
        </div>

        {error && (
          <p id="code-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{notice}</p>}

        {mustRestart ? (
          <button type="button" className="btn-primary w-full py-3" onClick={onEditDetails}>
            Fill in the form again
          </button>
        ) : (
          <button type="submit" className="btn-primary w-full py-3" disabled={verifying}>
            {verifying && <Spinner className="size-4" />}
            {verifying ? 'Verifying…' : 'Verify and create account'}
          </button>
        )}
      </form>

      {!mustRestart && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
          <button type="button" className="font-medium text-brand-700 hover:underline" onClick={onEditDetails}>
            ← Edit details
          </button>
          <button
            type="button"
            className="font-medium text-brand-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            onClick={resend}
            disabled={cooldown > 0 || resending}
          >
            {resending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      )}
    </div>
  );
}
