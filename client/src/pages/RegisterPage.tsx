import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BHAWANS, registerSchema, type RegisterInput } from '@iitr/shared';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Field, fieldProps } from '../components/Field';
import { PasswordInput } from '../components/PasswordInput';
import { Spinner } from '../components/Spinner';
import { validate, type FieldErrors } from '../lib/forms';
import { AuthLayout } from './AuthLayout';

type FormValues = Record<keyof RegisterInput, string>;

const INITIAL: FormValues = { name: '', email: '', enrollmentNo: '', bhawan: '', phone: '', password: '' };

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors<RegisterInput>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof FormValues) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const { data, errors } = validate(registerSchema, values);
    if (errors) return setErrors(errors);

    setSubmitting(true);
    try {
      const user = await register(data);
      toast.success(`Welcome to IITR Delivery, ${user.name.split(' ')[0]}!`);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Only @iitr.ac.in email addresses can register.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {formError}
          </div>
        )}
        <Field id="name" label="Full name" error={errors.name}>
          <input {...fieldProps('name', errors.name)} autoComplete="name" className="input" value={values.name} onChange={set('name')} />
        </Field>
        <Field id="email" label="IITR email" error={errors.email}>
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
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
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
        <Field id="password" label="Password" error={errors.password} hint="At least 8 characters.">
          <PasswordInput
            {...fieldProps('password', errors.password)}
            autoComplete="new-password"
            value={values.password}
            onChange={set('password')}
          />
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
          {submitting && <Spinner className="size-4" />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
