import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BHAWANS, ROLE_HOME, registerSchema, type RegisterInput, type SignupRole, type SignupStarted, type User } from '@iitr/shared';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Field, fieldProps } from '../components/Field';
import { PasswordInput } from '../components/PasswordInput';
import { Spinner } from '../components/Spinner';
import { StoreIcon, TruckIcon } from '../components/icons';
import { validate, type FieldErrors } from '../lib/forms';
import { AuthLayout } from './AuthLayout';
import { VerifyEmailStep } from './VerifyEmailStep';

type FormValues = Record<Exclude<keyof RegisterInput, 'role'>, string> & { role: SignupRole };

const INITIAL: FormValues = { role: 'STUDENT', name: '', email: '', enrollmentNo: '', bhawan: '', phone: '', password: '' };

const ROLE_OPTIONS: { value: SignupRole; title: string; description: string; icon: ReactNode }[] = [
  { value: 'STUDENT', title: 'I want to order', description: 'Shop and get items delivered to my room', icon: <StoreIcon /> },
  { value: 'DELIVERY_PARTNER', title: 'I want to deliver', description: 'Deliver orders on campus (needs admin approval)', icon: <TruckIcon /> },
];

export function RegisterPage() {
  const { startSignup } = useAuth();
  const navigate = useNavigate();
  // Set once the code has been emailed: the page then shows the code step.
  const [started, setStarted] = useState<SignupStarted | null>(null);

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
      setStarted(await startSignup(data));
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function onVerified(user: User) {
    toast.success(
      user.role === 'DELIVERY_PARTNER'
        ? 'Email verified and account created! An admin will review your delivery partner request.'
        : `Email verified. Welcome to IITR Delivery, ${user.name.split(' ')[0]}!`,
      { duration: 5000 },
    );
    navigate(ROLE_HOME[user.role], { replace: true });
  }

  if (started) {
    return (
      <AuthLayout title="Verify your email" subtitle="One last step to create your account.">
        <VerifyEmailStep started={started} onVerified={onVerified} onEditDetails={() => setStarted(null)} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Only @iitr.ac.in email addresses can register.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {formError}
          </div>
        )}
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700">I'm signing up to…</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLE_OPTIONS.map((option) => {
              const selected = values.role === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                    selected ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selected}
                    onChange={() => setValues((v) => ({ ...v, role: option.value }))}
                    className="sr-only"
                  />
                  <span className={`mt-0.5 shrink-0 [&_svg]:size-5 ${selected ? 'text-brand-700' : 'text-slate-400'}`}>{option.icon}</span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{option.title}</span>
                    <span className="block text-xs text-slate-500">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
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
        <p className="text-xs text-slate-500">We'll email you a 6-digit code to confirm it's your address.</p>
        <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
          {submitting && <Spinner className="size-4" />}
          {submitting ? 'Sending verification code…' : 'Continue'}
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
