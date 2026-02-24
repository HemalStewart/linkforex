'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUserRaw, setStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../components/ConfirmModal';
import { Mail, Lock, Loader2, Check, Eye, EyeOff } from 'lucide-react';

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
  const [rememberMe, setRememberMe] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [identifierValue, setIdentifierValue] = React.useState('');
  const [footerText, setFooterText] = React.useState(defaultFooterText);

  // Check if already logged in
  React.useEffect(() => {
    const user = getStoredUserRaw();
    if (user) {
      router.replace('/admin/dashboard');
    }

    const rememberedLogin = localStorage.getItem('remembered_login') || localStorage.getItem('remembered_email');
    if (rememberedLogin) {
      setIdentifierValue(rememberedLogin);
      setRememberMe(true);
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

      if (response.ok) {
        setStoredUser(data.user, rememberMe);
        if (rememberMe) {
          localStorage.setItem('remembered_login', identifier);
        } else {
          localStorage.removeItem('remembered_login');
        }
        // Redirect
        router.push('/admin/dashboard');
      } else {
        setConfirmModal({
          isOpen: true,
          title: 'Login failed',
          message: genericLoginError,
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
              className="h-16 w-auto object-contain relative z-10 drop-shadow-sm"
              priority
            />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Sign in to your dashboard to continue</p>
        </div>

        {/* Card Container */}
        <div className="glass-effect-strong rounded-[2.5rem] shadow-2xl p-8 border border-white/60 dark:border-slate-700/60 hover-lift backdrop-blur-3xl">
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
              <label htmlFor="password" className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                Password
              </label>
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1 px-1">
              <label className="flex items-center space-x-2.5 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 peer-checked:bg-teal-500 peer-checked:border-teal-500 transition-all"></div>
                  <Check className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3} />
                </div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  Remember me
                </span>
              </label>
              <a href="#" className="text-sm font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors">
                Forgot password?
              </a>
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
          </form>

        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 animate-fade-in">
          {footerText}
        </p>
      </div>
    </div>
  );
}
