import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BHAWANS, completeProfileSchema, type CompleteProfileInput } from '@iitr/shared';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Field, fieldProps } from '../components/Field';
import { Spinner } from '../components/Spinner';
import { validate, type FieldErrors } from '../lib/forms';
import { AuthLayout } from './AuthLayout';

type FormValues = Record<keyof CompleteProfileInput, string>;

/** Shown after a first Google sign-in: the student must add these before they can order. */
export function CompleteProfilePage() {
  const { user, completeProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>({ enrollmentNo: '', bhawan: '', phone: '' });
  const [errors, setErrors] = useState<FieldErrors<CompleteProfileInput>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (user.profileComplete) return <Navigate to="/" replace />;

  const set = (key: keyof FormValues) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const { data, errors } = validate(completeProfileSchema, values);
    if (errors) return setErrors(errors);

    setSubmitting(true);
    try {
      await completeProfile(data);
      toast.success("You're all set! Happy ordering.");
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title={`Welcome, ${user.name.split(' ')[0]}!`} subtitle="A few details so we can deliver to you.">
      <p className="mb-5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Signed in as <span className="font-medium text-slate-900">{user.email}</span>
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {formError}
          </div>
        )}
        <Field id="enrollmentNo" label="Enrollment number" error={errors.enrollmentNo}>
          <input
            {...fieldProps('enrollmentNo', errors.enrollmentNo)}
            inputMode="numeric"
            placeholder="e.g. 21114001"
            className="input"
            value={values.enrollmentNo}
            onChange={set('enrollmentNo')}
          />
        </Field>
        <Field id="bhawan" label="Hostel / Bhawan" error={errors.bhawan}>
          <select {...fieldProps('bhawan', errors.bhawan)} className="input" value={values.bhawan} onChange={set('bhawan')}>
            <option value="" disabled>
              Select your bhawan
            </option>
            {BHAWANS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        <Field id="phone" label="Phone number" error={errors.phone}>
          <input
            {...fieldProps('phone', errors.phone)}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit mobile"
            className="input"
            value={values.phone}
            onChange={set('phone')}
          />
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
          {submitting && <Spinner className="size-4" />}
          Save and continue
        </button>
      </form>
      <button
        type="button"
        className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
        onClick={() => logout().then(() => navigate('/login', { replace: true }))}
      >
        Not you? Log out
      </button>
    </AuthLayout>
  );
}
