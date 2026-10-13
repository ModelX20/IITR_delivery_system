import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPasswordSchema } from '@iitr/shared';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Field, fieldProps } from '../components/Field';
import { PasswordInput } from '../components/PasswordInput';
import { Spinner } from '../components/Spinner';
import { AuthLayout } from './AuthLayout';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link" subtitle="This link is missing its token.">
        <Link to="/forgot-password" className="btn-primary w-full">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const { data, errors } = validate();
    if (!data) return setErrors(errors);

    setSubmitting(true);
    try {
      const { message } = await api<{ message: string }>('/auth/reset-password', { method: 'POST', body: data });
      // Every session was revoked on the server; drop ours too.
      if (user) await logout().catch(() => {});
      toast.success(message, { duration: 5000 });
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function validate() {
    const result = resetPasswordSchema.safeParse({ token, password });
    const errors: { password?: string; confirm?: string } = {};
    if (!result.success) errors.password = result.error.issues.find((i) => i.path[0] === 'password')?.message;
    if (password !== confirm) errors.confirm = "Passwords don't match";
    return result.success && !errors.confirm ? { data: result.data, errors } : { data: null, errors };
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="This will log you out on every device.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {formError}{' '}
            <Link to="/forgot-password" className="font-semibold underline">
              Request a new link
            </Link>
          </div>
        )}
        <Field id="password" label="New password" error={errors.password} hint="At least 8 characters.">
          <PasswordInput
            {...fieldProps('password', errors.password)}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((x) => ({ ...x, password: undefined }));
            }}
          />
        </Field>
        <Field id="confirm" label="Confirm new password" error={errors.confirm}>
          <PasswordInput
            {...fieldProps('confirm', errors.confirm)}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setErrors((x) => ({ ...x, confirm: undefined }));
            }}
          />
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
          {submitting && <Spinner className="size-4" />}
          Set new password
        </button>
      </form>
    </AuthLayout>
  );
}
