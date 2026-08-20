'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, Mail, ShieldCheck, User } from 'lucide-react';
import { FreshGuardLogo } from '@/components/layout/freshguard-logo';
import { PortalRole } from '@/types';

type Mode = 'signin' | 'signup' | 'forgot';
type ForgotStep = 'request' | 'reset' | 'done';

const inputClass = 'w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-brand-dark';
const iconInputClass = `${inputClass} pl-11`;

export const LoginGateway = () => {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [role, setRole] = useState<PortalRole>('admin');

  // Sign in
  const [email, setEmail] = useState('admin@freshguard.io');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Sign up
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password
  const [forgotStep, setForgotStep] = useState<ForgotStep>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setMessage('');
    setError('');
  };

  const switchMode = (next: Mode) => {
    resetMessages();
    setMode(next);
    if (next === 'forgot') setForgotStep('request');
  };

  const onSignIn = async () => {
    resetMessages();
    if (!email || !password) return setError('Enter your email and password.');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) });
      const data = await res.json();
      if (!data.success) return setError(data.message);
      if (rememberMe) localStorage.setItem('freshguard-auth', JSON.stringify({ email, role }));
      router.push(role === 'admin' ? '/admin' : '/driver');
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async () => {
    resetMessages();
    if (!name || !signupEmail || !signupPassword) return setError('Fill in all fields.');
    if (signupPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (signupPassword !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email: signupEmail, password: signupPassword, role }) });
      const data = await res.json();
      if (!data.success) return setError(data.message);
      setMessage('Account created! Check your email, then sign in below.');
      setEmail(signupEmail);
      setMode('signin');
    } finally {
      setLoading(false);
    }
  };

  const onRequestReset = async () => {
    resetMessages();
    if (!forgotEmail) return setError('Enter your account email.');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: forgotEmail }) });
      const data = await res.json();
      setMessage(data.message);
      setForgotStep('reset');
    } finally {
      setLoading(false);
    }
  };

  const onConfirmReset = async () => {
    resetMessages();
    if (!resetCode || !newPassword) return setError('Enter the code and a new password.');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword }) });
      const data = await res.json();
      if (!data.success) return setError(data.message);
      setForgotStep('done');
      setMessage('Password updated. You can sign in now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-hero bg-cover bg-center px-6 py-12 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="rounded-[2rem] border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
          <FreshGuardLogo />
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/80">
            Industrial predictive cold-chain command intelligence for fleet health, gas anomaly detection, route telemetry, and cargo spoilage prevention.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {['Sensor-rich telemetry', 'Predictive trend analytics', 'Enterprise logistics continuity'].map((item) => (
              <div key={item} className="rounded-xl border border-white/15 bg-white/5 p-4">
                <ShieldCheck className="mb-2.5 h-5 w-5 text-brand-accent" />
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/85">{item}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-6 flex min-h-[16rem] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/15 bg-gradient-to-br from-white/15 to-transparent p-7">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_30%,rgba(76,175,80,0.4),transparent_16%),radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.28),transparent_18%),radial-gradient(circle_at_50%_75%,rgba(76,175,80,0.22),transparent_14%)]" />
            <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-brand-dark/70 to-transparent" />
            <div className="max-w-lg">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/65">Bio Sentinel Engineering Team</p>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-[2.25rem]">Unified access for admin & driver operations</h1>
            </div>
            <div className="mt-5 self-start rounded-xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">Cold-chain transport network</p>
              <p className="mt-1 text-sm text-white/90">Dark green industrial enterprise login gateway</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-[2rem] border border-white/50 bg-white/70 p-8 text-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-dark">Secure Portal Access</p>

          {mode !== 'forgot' && (
            <>
              <div className="mt-5 flex gap-2 rounded-full bg-white p-1.5 shadow-sm">
                <button
                  onClick={() => switchMode('signin')}
                  className={`flex-1 rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${mode === 'signin' ? 'bg-brand-dark text-white' : 'text-brand-dark/60 hover:text-brand-dark'}`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => switchMode('signup')}
                  className={`flex-1 rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${mode === 'signup' ? 'bg-brand-dark text-white' : 'text-brand-dark/60 hover:text-brand-dark'}`}
                >
                  Sign up
                </button>
              </div>

              <div className="mt-4 flex gap-2 rounded-full bg-brand-surface p-1.5">
                {(['admin', 'driver'] as PortalRole[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setRole(item)}
                    className={`flex-1 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${role === item ? 'bg-brand-dark text-white' : 'text-brand-dark/70 hover:text-brand-dark'}`}
                  >
                    {item} portal
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === 'signin' && (
            <div className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/50" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className={iconInputClass} placeholder="you@company.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/50" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={iconInputClass} placeholder="••••••••" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="accent-brand-dark" /> Remember me
                </label>
                <button onClick={() => switchMode('forgot')} className="font-semibold text-brand-dark hover:underline">Forgot password?</button>
              </div>
              {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
              {message && <p className="rounded-xl bg-brand-surface px-4 py-3 text-sm text-brand-dark">{message}</p>}
              <button onClick={onSignIn} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60">
                {loading ? 'Signing in…' : <>Enter {role === 'admin' ? 'Command Center' : 'Driver Portal'} <ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="text-center text-sm text-slate-500">
                New here? <button onClick={() => switchMode('signup')} className="font-semibold text-brand-dark hover:underline">Create an account</button>
              </p>
            </div>
          )}

          {mode === 'signup' && (
            <div className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Full name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/50" />
                  <input value={name} onChange={(e) => setName(e.target.value)} className={iconInputClass} placeholder="Jane Doe" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/50" />
                  <input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className={iconInputClass} placeholder="you@company.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/50" />
                  <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className={iconInputClass} placeholder="At least 8 characters" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Confirm password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/50" />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={iconInputClass} placeholder="Re-enter password" />
                </div>
              </div>
              {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
              {message && <p className="rounded-xl bg-brand-surface px-4 py-3 text-sm text-brand-dark">{message}</p>}
              <button onClick={onSignUp} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60">
                {loading ? 'Creating account…' : <>Create {role} account <ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="text-center text-sm text-slate-500">
                Already have an account? <button onClick={() => switchMode('signin')} className="font-semibold text-brand-dark hover:underline">Sign in</button>
              </p>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mt-6 space-y-5">
              <p className="text-sm text-slate-600">
                {forgotStep === 'request' && 'Enter your account email and we\u2019ll send a reset code.'}
                {forgotStep === 'reset' && 'Enter the code we emailed you and choose a new password.'}
                {forgotStep === 'done' && 'All set — your password has been updated.'}
              </p>

              {forgotStep === 'request' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/50" />
                    <input value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className={iconInputClass} placeholder="you@company.com" />
                  </div>
                </div>
              )}

              {forgotStep === 'reset' && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reset code</label>
                    <input value={resetCode} onChange={(e) => setResetCode(e.target.value)} className={inputClass} placeholder="6-digit code" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">New password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="At least 8 characters" />
                  </div>
                </>
              )}

              {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
              {message && <p className="rounded-xl bg-brand-surface px-4 py-3 text-sm text-brand-dark">{message}</p>}

              {forgotStep === 'request' && (
                <button onClick={onRequestReset} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-60">
                  {loading ? 'Sending…' : 'Send reset code'}
                </button>
              )}
              {forgotStep === 'reset' && (
                <button onClick={onConfirmReset} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-60">
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              )}
              {forgotStep === 'done' && (
                <button onClick={() => switchMode('signin')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  Back to sign in
                </button>
              )}

              {forgotStep !== 'done' && (
                <p className="text-center text-sm text-slate-500">
                  <button onClick={() => switchMode('signin')} className="font-semibold text-brand-dark hover:underline">Back to sign in</button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
