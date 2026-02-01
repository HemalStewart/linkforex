'use client';

import React from 'react';

import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  // Check if already logged in
  React.useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      router.replace('/admin/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const response = await fetch(ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Save user to local storage (Simple Auth)
        localStorage.setItem('user', JSON.stringify(data.user));
        // Redirect
        router.push('/admin/dashboard');
      } else {
        alert(data.messages?.error || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-sky-100 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 -z-10"></div>

      {/* Floating Orbs Animation */}
      <div className="fixed inset-0 overflow-hidden -z-5 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-400/20 dark:bg-sky-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md px-6 animate-fade-in-up z-10">

        {/* Logo & Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <img src="/logo-removebg-preview.png" alt="LinkForex" className="h-14 object-contain" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Sign in to your account</p>
        </div>

        {/* Card Container */}
        <div className="glass-effect-strong rounded-2xl shadow-2xl p-8 border border-white/40 dark:border-slate-600/40 hover-lift">
          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="admin@linkforex.com"
                className="input-glass w-full px-4 py-3 text-sm font-medium"
                autoComplete="email"
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                className="input-glass w-full px-4 py-3 text-sm font-medium"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-sky-300 dark:border-sky-600 text-sky-500 focus:ring-sky-500 cursor-pointer transition-all"
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-sky-500 transition-colors">
                  Remember me
                </span>
              </label>
              <a href="#" className="text-sm font-bold text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sky-200 dark:border-sky-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 glass-effect rounded-full py-1 text-slate-600 dark:text-slate-400 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* SSO Options */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="glass-effect flex items-center justify-center space-x-2 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:shadow-lg transition-all duration-300 hover-lift group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Google</span>
            </button>
            <button
              type="button"
              className="glass-effect flex items-center justify-center space-x-2 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:shadow-lg transition-all duration-300 hover-lift group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400 animate-fade-in">
          © 2026 LinkForex. Protected by 256-bit encryption.
        </p>
      </div>
    </div>
  );
}
