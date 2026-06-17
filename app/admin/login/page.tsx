'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUserRaw, setStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../components/ConfirmModal';
import { Mail, Lock, Loader2, Eye, EyeOff, Shield, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const defaultFooterText = '© 2026 LinkForex. Protected by 256-bit encryption.';
  const genericLoginError = 'Invalid login credentials.';
  const [loading, setLoading] = React.useState(false);
  const [confirmModal, setConfirmModal] = React.useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'danger' | 'warning' | 'success',
    isAlert: true
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [identifierValue, setIdentifierValue] = React.useState('');
  const [footerText, setFooterText] = React.useState(defaultFooterText);
  const [require2FA, setRequire2FA] = React.useState(false);
  const [twofaEmail, setTwofaEmail] = React.useState('');
  const [twofaCode, setTwofaCode] = React.useState('');

  // Check if already logged in
  React.useEffect(() => {
    const user = getStoredUserRaw();
    if (user) {
      router.replace('/admin/dashboard');
    }

    const savedGeneral = localStorage.getItem('generalSettings');
    if (savedGeneral) {
      try {
        const parsed = JSON.parse(savedGeneral);
        if (typeof parsed?.footerText === 'string' && parsed.footerText.trim()) {
          setFooterText(parsed.footerText.trim());
        }
      } catch {
        // keep default footer text
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const identifier = String(formData.get('identifier') || '').trim();
    const password = String(formData.get('password') || '');

    try {
      const response = await fetch(ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: identifier,
          username: identifier,
          password
        })
      });

      const data = await response.json();

      if (response.status === 202 && data.require_2fa) {
        setRequire2FA(true);
        setTwofaEmail(data.email || identifier);
        setLoading(false);
        return;
      }

      if (response.ok) {
        setStoredUser(data.user, true);
        // Redirect
        router.push('/admin/dashboard');
      } else {
        setConfirmModal({
          isOpen: true,
          title: 'Login failed',
          message: data?.message || genericLoginError,
          type: 'danger',
          isAlert: true
        });
      }
    } catch (err) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: 'Network error',
        message: genericLoginError,
        type: 'danger',
        isAlert: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(ENDPOINTS.AUTH.VERIFY_2FA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: twofaEmail,
          code: twofaCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStoredUser(data.user, true);
        router.push('/admin/dashboard');
      } else {
        setConfirmModal({
          isOpen: true,
          title: 'Verification failed',
          message: data?.message || 'Invalid 2FA code.',
          type: 'danger',
          isAlert: true
        });
      }
    } catch (err) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: 'Network error',
        message: 'Could not connect to the server.',
        type: 'danger',
        isAlert: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-900">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type as any}
        isAlert={confirmModal.isAlert}
        confirmText="OK"
      />
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-teal-50 via-teal-50 to-teal-50 dark:from-teal-950 dark:via-teal-950 dark:to-teal-900 -z-10"></div>

      {/* Floating Orbs Animation */}
      <div className="fixed inset-0 overflow-hidden -z-5 opacity-20 mix-blend-multiply dark:mix-blend-soft-light pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-teal-300 dark:bg-teal-500/20 rounded-full blur-[80px] animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-300 dark:bg-teal-500/20 rounded-full blur-[80px] animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md px-6 animate-fade-in-up z-10">

        {/* Logo & Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-teal-500 blur-2xl opacity-20 dark:opacity-40 rounded-full"></div>
            <Image
              src="/logo-removebg-preview.png"
              alt="LinkForex"
              width={220}
              height={64}
              className="h-16 w-auto object-contain relative z-10 drop-shadow-sm dark:hidden"
              priority
            />
            <Image
              src="/logo-dark-theme.png"
              alt="LinkForex"
              width={220}
              height={64}
              className="hidden h-16 w-auto object-contain relative z-10 drop-shadow-sm dark:block"
              priority
            />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            {require2FA ? 'Two-Factor Verification' : 'Welcome'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {require2FA ? 'Enter the 6-digit verification code from your authenticator app.' : 'Sign in to your dashboard to continue'}
          </p>
        </div>

        {/* Card Container */}
        <div className="glass-effect-strong rounded-[2.5rem] shadow-2xl p-8 border border-white/60 dark:border-slate-700/60 hover-lift backdrop-blur-3xl">
          {!require2FA ? (
            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="identifier" className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                  Email or Username
                </label>
                <div className="relative input-icon group">
                  <span className="input-icon-left">
                    <Mail className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    name="identifier"
                    placeholder="Email or username"
                    className="input-glass w-full py-3.5 text-base font-medium shadow-inner"
                    autoComplete="username"
                    value={identifierValue}
                    onChange={(e) => setIdentifierValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label htmlFor="password" className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                    Password
                  </label>
                </div>
                <div className="relative input-icon group">
                  <span className="input-icon-left">
                    <Lock className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    className="input-glass w-full py-3.5 pr-12 text-base font-medium shadow-inner"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-200 hover:text-teal-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                    <span>Signing in...</span>
                  </span>
                ) : 'Sign In'}
              </button>

              <div className="text-center pt-2">
                <Link href="/admin/forgot-password" className="text-sm font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerify2FA}>
              {/* OTP Code Input */}
              <div className="space-y-2">
                <label htmlFor="twofaCode" className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                  6-Digit Authenticator Code
                </label>
                <div className="relative input-icon group">
                  <span className="input-icon-left">
                    <Shield className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                  </span>
                  <input
                    id="twofaCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    className="input-glass w-full py-3.5 text-center tracking-[0.5em] text-lg font-bold shadow-inner"
                    value={twofaCode}
                    onChange={(e) => setTwofaCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || twofaCode.length !== 6}
                className="btn-primary w-full py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                    <span>Verifying...</span>
                  </span>
                ) : 'Verify & Sign In'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRequire2FA(false);
                    setTwofaCode('');
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 animate-fade-in">
          {footerText}
        </p>
      </div>
    </div>
  );
}
