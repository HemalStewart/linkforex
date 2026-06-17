'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../components/ConfirmModal';
import { validatePassword } from '@/app/lib/validation';
import { Mail, Lock, Loader2, Eye, EyeOff, Key, ArrowLeft, CheckCircle2 } from 'lucide-react';

type Step = 'EMAIL' | 'OTP' | 'RESET';

export default function AdminForgotPasswordPage() {
  const router = useRouter();
  const defaultFooterText = '© 2026 LinkForex. Protected by 256-bit encryption.';
  const [step, setStep] = React.useState<Step>('EMAIL');
  const [email, setEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [otpInput, setOtpInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [footerText, setFooterText] = React.useState(defaultFooterText);
  const [resendCooldown, setResendCooldown] = React.useState(30);
  const [passwordErrorState, setPasswordErrorState] = React.useState('');
  const [confirmPasswordErrorState, setConfirmPasswordErrorState] = React.useState('');

  const [confirmModal, setConfirmModal] = React.useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'danger' | 'warning' | 'success',
    isAlert: true,
    onConfirm: () => { }
  });

  React.useEffect(() => {
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
  }, []);

  React.useEffect(() => {
    if (step !== 'OTP' || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const emailInput = String(formData.get('email') || '').trim();

    try {
      const response = await fetch(ENDPOINTS.AUTH.ADMIN_FORGOT_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: emailInput })
      });

      const data = await response.json();

      if (response.ok) {
        setEmail(emailInput);
        setResendCooldown(30);
        let msg = data.message || 'OTP sent successfully to your email.';
        if (data.otp_debug) {
          msg += ` (Debug OTP: ${data.otp_debug})`;
        }
        setConfirmModal({
          isOpen: true,
          title: 'OTP Sent',
          message: msg,
          type: 'success',
          isAlert: true,
          onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            setStep('OTP');
          }
        });
      } else {
        const rawMsg = data.messages?.error || data.message || 'Failed to send OTP. Please check the email.';
        const msg = String(rawMsg).toLowerCase() === 'admin user not found' ? 'User not found' : rawMsg;
        setConfirmModal({
          isOpen: true,
          title: 'Request Failed',
          message: msg,
          type: 'danger',
          isAlert: true,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
      }
    } catch (err) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: 'Network Error',
        message: 'A network error occurred. Please try again.',
        type: 'danger',
        isAlert: true,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setOtpInput('');
    try {
      const response = await fetch(ENDPOINTS.AUTH.ADMIN_FORGOT_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setResendCooldown(30);
        let msg = data.message || 'OTP resent successfully to your email.';
        if (data.otp_debug) {
          msg += ` (Debug OTP: ${data.otp_debug})`;
        }
        setConfirmModal({
          isOpen: true,
          title: 'OTP Resent',
          message: msg,
          type: 'success',
          isAlert: true,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
      } else {
        const rawMsg = data.messages?.error || data.message || 'Failed to resend OTP. Please try again.';
        const msg = String(rawMsg).toLowerCase() === 'admin user not found' ? 'User not found' : rawMsg;
        setConfirmModal({
          isOpen: true,
          title: 'Request Failed',
          message: msg,
          type: 'danger',
          isAlert: true,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
      }
    } catch (err) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: 'Network Error',
        message: 'A network error occurred. Please try again.',
        type: 'danger',
        isAlert: true,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(ENDPOINTS.AUTH.ADMIN_VERIFY_RESET_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp: otpInput })
      });

      const data = await response.json();

      if (response.ok) {
        setOtp(otpInput);
        setConfirmModal({
          isOpen: true,
          title: 'OTP Verified',
          message: 'OTP verification successful. Please proceed to set a new password.',
          type: 'success',
          isAlert: true,
          onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            setStep('RESET');
          }
        });
      } else {
        setConfirmModal({
          isOpen: true,
          title: 'Verification Failed',
          message: data.messages?.error || data.message || 'Invalid OTP. Please check and try again.',
          type: 'danger',
          isAlert: true,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
      }
    } catch (err) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: 'Network Error',
        message: 'A network error occurred. Please try again.',
        type: 'danger',
        isAlert: true,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirm_password') || '');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setPasswordErrorState(passwordError);
      setLoading(false);
      return;
    } else {
      setPasswordErrorState('');
    }

    if (password !== confirmPassword) {
      setConfirmPasswordErrorState('Passwords do not match.');
      setLoading(false);
      return;
    } else {
      setConfirmPasswordErrorState('');
    }

    try {
      const response = await fetch(ENDPOINTS.AUTH.ADMIN_RESET_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp, password })
      });

      const data = await response.json();

      if (response.ok) {
        setConfirmModal({
          isOpen: true,
          title: 'Success',
          message: 'Your password has been reset successfully. You can now login with your new password.',
          type: 'success',
          isAlert: true,
          onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            router.push('/admin/login');
          }
        });
      } else {
        setConfirmModal({
          isOpen: true,
          title: 'Reset Failed',
          message: data.messages?.error || data.message || 'Failed to reset password. Please try again.',
          type: 'danger',
          isAlert: true,
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
      }
    } catch (err) {
      console.error(err);
      setConfirmModal({
        isOpen: true,
        title: 'Network Error',
        message: 'A network error occurred. Please try again.',
        type: 'danger',
        isAlert: true,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-900">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.onConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
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
            {step === 'EMAIL' && 'Forgot Password?'}
            {step === 'OTP' && 'Verification Code'}
            {step === 'RESET' && 'New Password'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {step === 'EMAIL' && "No problem! Just enter your email address below and we'll help you reset your password"}
            {step === 'RESET' && 'Set a strong password for your admin account'}
          </p>
        </div>

        {/* Card Container */}
        <div className="glass-effect-strong rounded-[2.5rem] shadow-2xl p-8 border border-white/60 dark:border-slate-700/60 hover-lift backdrop-blur-3xl">

          {step === 'EMAIL' && (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                  Email Address
                </label>
                <div className="relative input-icon group">
                  <span className="input-icon-left">
                    <Mail className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    className="input-glass w-full py-3.5 text-base font-medium shadow-inner"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                    <span>Sending Code...</span>
                  </span>
                ) : 'Send Verification Code'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/admin/login')}
                  className="inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-500 transition-colors dark:text-slate-400"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {step === 'OTP' && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium text-center leading-relaxed px-4">
                We sent you a verification code to <span className="font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">{email}</span>,please check your email.
              </p>
              <div className="space-y-2">
                <label htmlFor="otp" className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                  Verification Code
                </label>
                <div className="relative input-icon group">
                  <span className="input-icon-left">
                    <Key className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                  </span>
                  <input
                    id="otp"
                    type="text"
                    name="otp"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    pattern="\d{6}"
                    className="input-glass w-full py-3.5 text-base font-medium tracking-[0.3em] text-center shadow-inner"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || resending}
                className="btn-primary w-full py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                    <span>Verifying Code...</span>
                  </span>
                ) : 'Verify Code'}
              </button>

              <div className="flex flex-col gap-4 text-center pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resending || resendCooldown > 0}
                  className="inline-flex items-center justify-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {resending ? 'Resending Code...' : (resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setOtpInput('');
                  }}
                  className="inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-500 transition-colors dark:text-slate-400 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Change Email
                </button>
              </div>
            </form>
          )}

          {step === 'RESET' && (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              {/* New Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                  New Password
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
                    onChange={() => {
                      if (passwordErrorState) setPasswordErrorState('');
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-200 hover:text-teal-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrorState && (
                  <p className="text-xs text-rose-500 font-semibold mt-1.5 ml-1">{passwordErrorState}</p>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <label htmlFor="confirm_password" className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                  Confirm Password
                </label>
                <div className="relative input-icon group">
                  <span className="input-icon-left">
                    <Lock className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                  </span>
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    placeholder="••••••••"
                    className="input-glass w-full py-3.5 pr-12 text-base font-medium shadow-inner"
                    onChange={() => {
                      if (confirmPasswordErrorState) setConfirmPasswordErrorState('');
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-200 hover:text-teal-500 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPasswordErrorState && (
                  <p className="text-xs text-rose-500 font-semibold mt-1.5 ml-1">{confirmPasswordErrorState}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                    <span>Resetting Password...</span>
                  </span>
                ) : 'Reset Password'}
              </button>
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
