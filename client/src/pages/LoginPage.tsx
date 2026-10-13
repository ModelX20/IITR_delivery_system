import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ROLE_HOME, loginSchema, type AuthConfig, type LoginInput } from '@iitr/shared';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Field, fieldProps } from '../components/Field';
import { GoogleButton } from '../components/GoogleButton';
import { PasswordInput } from '../components/PasswordInput';
import { pathBelongsToRole } from '../components/RouteGuards';
import { Spinner } from '../components/Spinner';
import { useApi } from '../hooks/useApi';
import { validate, type FieldErrors } from '../lib/forms';
import { AuthLayout } from './AuthLayout';

/** Messages for the ?error= codes the Google callback redirects with. */
const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_state: 'Your Google sign-in session expired or was invalid. Please try again.',
  google_failed: "We couldn't complete Google sign-in. Please try again.",
  google_unverified: 'Your Google account email is not verified. Verify it with Google, then try again.',
  google_domain: 'Only @iitr.ac.in and @gmail.com Google accounts can sign in.',
  google_mismatch: 'This email is already linked to a different Google account. Sign in with that account or your password.',
  blocked: 'Your account has been blocked. Please contact the admin.',
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [params] = useSearchParams();
  const { data: config } = useApi<AuthConfig>('/auth/config');

  const [values, setValues] = useState<LoginInput>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginInput>>({});
  const [formError, setFormError] = useState(() => GOOGLE_ERRORS[params.get('error') ?? ''] ?? '');
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof LoginInput) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const { data, errors } = validate(loginSchema, values);
    if (errors) return setErrors(errors);

    setSubmitting(true);
    try {
      const user = await login(data);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      // Each role lands on its own dashboard, unless they were heading to a page in their own area.
      navigate(from && pathBelongsToRole(from, user.role) ? from : ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Log in" subtitle="Use your IITR email to continue.">
      {formError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {formError}
        </div>
      )}
      {config?.googleEnabled && (
        <>
          <GoogleButton />
          <p className="mt-2 text-center text-xs text-slate-500">@iitr.ac.in and @gmail.com accounts</p>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or use your password
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field id="email" label="Email" error={errors.email}>
          <input
            {...fieldProps('email', errors.email)}
            type="email"
            autoComplete="email"
            placeholder="yourname@iitr.ac.in"
            className="input"
            value={values.email}
            onChange={set('email')}
          />
        </Field>
        <div>
          <Field id="password" label="Password" error={errors.password}>
            <PasswordInput
              {...fieldProps('password', errors.password)}
              autoComplete="current-password"
              placeholder="••••••••"
              value={values.password}
              onChange={set('password')}
            />
          </Field>
          <Link to="/forgot-password" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
          {submitting && <Spinner className="size-4" />}
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{' '}
        <Link to="/register" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
