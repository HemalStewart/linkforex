'use client';

import React from 'react';
import Modal from './Modal';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    loading?: boolean;
    isAlert?: boolean;
    autoCloseMs?: number;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'info',
    loading = false,
    isAlert = false,
    autoCloseMs = 3000
}: ConfirmModalProps) {
    const buttonStyles = {
        danger: 'bg-red-500/90 hover:bg-red-500 text-white shadow-sm shadow-red-500/20 transition-all duration-300',
        warning: 'bg-amber-500/90 hover:bg-amber-500 text-white shadow-sm shadow-amber-500/20 transition-all duration-300',
        info: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm shadow-teal-500/30 transition-all duration-300',
        success: 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm shadow-teal-500/25 transition-all duration-300',
    };

    React.useEffect(() => {
        if (!isOpen || !isAlert || autoCloseMs <= 0) return;
        const timer = window.setTimeout(() => {
            onConfirm();
        }, autoCloseMs);
        return () => window.clearTimeout(timer);
    }, [isOpen, isAlert, autoCloseMs, onConfirm]);

    if (isAlert && isOpen) {
        const toastStyles = {
            danger: {
                container: 'border-red-200/80 dark:border-red-900/40',
                iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300',
                title: 'text-red-700 dark:text-red-300',
                message: 'text-red-700/80 dark:text-red-200/85',
                progress: 'bg-red-500'
            },
            warning: {
                container: 'border-amber-200/80 dark:border-amber-900/40',
                iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300',
                title: 'text-amber-700 dark:text-amber-300',
                message: 'text-amber-700/80 dark:text-amber-200/85',
                progress: 'bg-amber-500'
            },
            info: {
                container: 'border-teal-200/80 dark:border-teal-900/40',
                iconBg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300',
                title: 'text-teal-700 dark:text-teal-300',
                message: 'text-teal-700/80 dark:text-teal-200/85',
                progress: 'bg-teal-500'
            },
            success: {
                container: 'border-emerald-200/80 dark:border-emerald-900/40',
                iconBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300',
                title: 'text-emerald-700 dark:text-emerald-300',
                message: 'text-emerald-700/80 dark:text-emerald-200/85',
                progress: 'bg-emerald-500'
            }
        }[type];

        const Icon = {
            danger: AlertCircle,
            warning: TriangleAlert,
            info: Info,
            success: CheckCircle2
        }[type];

        return (
            <div className="fixed top-5 right-5 z-[100] w-[min(92vw,24rem)] animate-slide-in-right">
                <div className={`glass-effect-strong rounded-2xl border shadow-xl overflow-hidden ${toastStyles.container}`}>
                    <div className="p-4 flex items-start gap-3">
                        <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center ${toastStyles.iconBg}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${toastStyles.title}`}>{title}</p>
                            <p className={`text-xs mt-1 leading-relaxed ${toastStyles.message}`}>{message}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            aria-label="Close notification"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="h-1 bg-white/30 dark:bg-slate-800/60">
                        <div
                            className={`h-full ${toastStyles.progress} animate-toast-progress`}
                            style={{ animationDuration: `${autoCloseMs}ms` }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-6 p-2">
                <p className="text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                    {message}
                </p>
                <div className="dialog-actions mt-6">
                    {!isAlert && (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="btn-secondary text-sm disabled:opacity-60"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`btn-primary inline-flex justify-center text-sm ${buttonStyles[type as keyof typeof buttonStyles] || buttonStyles.info} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
