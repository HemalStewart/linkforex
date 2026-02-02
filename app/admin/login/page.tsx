'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { Mail, Lock, Loader2, Github, Chrome, Check } from 'lucide-react';

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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950 -z-10"></div>

      {/* Floating Orbs Animation */}
      <div className="fixed inset-0 overflow-hidden -z-5 opacity-40 mix-blend-multiply dark:mix-blend-soft-light pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-300 dark:bg-cyan-500/20 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-300 dark:bg-blue-500/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md px-6 animate-fade-in-up z-10">

        {/* Logo & Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 dark:opacity-40 rounded-full"></div>
            <img src="/logo-removebg-preview.png" alt="LinkForex" className="h-16 object-contain relative z-10 drop-shadow-sm" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Welcome Back</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Sign in to your dashboard to continue</p>
        </div>

        {/* Card Container */}
        <div className="glass-effect-strong rounded-[2.5rem] shadow-2xl p-8 border border-white/60 dark:border-slate-700/60 hover-lift backdrop-blur-3xl">
          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="admin@linkforex.com"
                  className="input-glass w-full pl-11 py-3.5 text-base font-medium shadow-inner"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                </div>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="input-glass w-full pl-11 py-3.5 text-base font-medium shadow-inner"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1 px-1">
              <label className="flex items-center space-x-2.5 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all"></div>
                  <Check className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3} />
                </div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Remember me
                </span>
              </label>
              <a href="#" className="text-sm font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                  <span>Signing in...</span>
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 glass-effect rounded-full py-1 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wide">
                Or continue with
              </span>
            </div>
          </div>

          {/* SSO Options */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="glass-effect flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-slate-700 dark:text-slate-300 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group bg-white/40 dark:bg-slate-800/40 border-0"
            >
              <Chrome className="w-5 h-5 group-hover:text-red-500 transition-colors" />
              <span>Google</span>
            </button>
            <button
              type="button"
              className="glass-effect flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-slate-700 dark:text-slate-300 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group bg-white/40 dark:bg-slate-800/40 border-0"
            >
              <Github className="w-5 h-5 group-hover:text-black dark:group-hover:text-white transition-colors" />
              <span>GitHub</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 animate-fade-in">
          © 2026 LinkForex. Protected by 256-bit encryption.
        </p>
      </div>
    </div>
  );
}
