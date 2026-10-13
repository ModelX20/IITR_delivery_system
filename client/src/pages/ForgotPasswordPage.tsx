import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordSchema } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { Field, fieldProps } from '../components/Field';
import { Spinner } from '../components/Spinner';
import { MailIcon } from '../components/icons';
import { validate } from '../lib/forms';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { data, errors } = validate(forgotPasswordSchema, { email });
    if (errors) return setError(errors.email ?? 'Enter a valid email address');

    setSubmitting(true);
    try {
      const { message } = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: data });
      setSentMessage(message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sentMessage) {
    return (
      <AuthLayout title="Check your email" subtitle="">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <MailIcon />
          </div>
          <p className="text-sm text-slate-600">{sentMessage}</p>
          <p className="mt-3 text-xs text-slate-500">Don't see it? Check your spam folder, or try again in a minute.</p>
          <Link to="/login" className="btn-primary mt-6 w-full">
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your account email and we'll send you a link to set a new one.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field id="email" label="Email" error={error}>
          <input
            {...fieldProps('email', error)}
            type="email"
            autoComplete="email"
            placeholder="yourname@iitr.ac.in"
            className="input"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
          />
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
          {submitting && <Spinner className="size-4" />}
          Send reset link
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
