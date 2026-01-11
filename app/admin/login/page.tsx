import React from 'react';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-indigo-950 dark:to-purple-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-400/30 dark:bg-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/30 dark:bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-400/20 dark:bg-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl mb-4 transform hover:scale-110 transition-transform duration-300">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
            LinkForex
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Admin Portal</p>
        </div>

        {/* Glass Card */}
        <div className="glass-strong rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Welcome Back</h2>
            <p className="text-slate-600 dark:text-slate-400">Sign in to manage your forex operations</p>
          </div>

          <form className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2 animate-slide-in">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@linkforex.com"
                  className="input-field pl-12 hover:border-indigo-300 dark:hover:border-indigo-600"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2 animate-slide-in" style={{ animationDelay: '0.1s' }}>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="input-field pl-12 hover:border-indigo-300 dark:hover:border-indigo-600"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between animate-slide-in" style={{ animationDelay: '0.2s' }}>
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Remember me
                </span>
              </label>
              <a href="#" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="btn btn-primary w-full text-lg animate-slide-in"
              style={{ animationDelay: '0.3s' }}
            >
              <span className="flex items-center justify-center space-x-2">
                <span>Sign In</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {/* Divider */}
            <div className="relative animate-slide-in" style={{ animationDelay: '0.4s' }}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            {/* SSO Options */}
            <div className="grid grid-cols-2 gap-4 animate-slide-in" style={{ animationDelay: '0.5s' }}>
              <button
                type="button"
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </button>
            </div>
          </form>

          {/* Security Badge */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 animate-slide-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Secured with 256-bit encryption</span>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400 animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <p>
            Need help? {' '}
            <a href="#" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
              Contact Support
            </a>
          </p>
          <p className="mt-2 text-xs">
            © 2026 LinkForex. Connecting UK to Afghanistan with trust.
          </p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
    </div>
  );
}
