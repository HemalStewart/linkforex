'use client';

import React from 'react';
import Modal from './Modal';

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
    isAlert = false
}: ConfirmModalProps) {
    const buttonStyles = {
        danger: 'bg-red-500/90 hover:bg-red-500 text-white shadow-sm shadow-red-500/20 transition-all duration-300',
        warning: 'bg-amber-500/90 hover:bg-amber-500 text-white shadow-sm shadow-amber-500/20 transition-all duration-300',
        info: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm shadow-teal-500/30 transition-all duration-300',
        success: 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm shadow-teal-500/25 transition-all duration-300',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-6 p-2">
                <p className="text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                    {message}
                </p>
                <div className="flex justify-end gap-3 mt-6">
                    {!isAlert && (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 glass-effect hover:bg-white/70 dark:hover:bg-white/5 border border-transparent rounded-[12px] transition-all duration-300"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`inline-flex justify-center px-5 py-2.5 text-sm font-semibold border-0 rounded-[12px] focus:outline-none shadow-sm transition-all duration-300 ${buttonStyles[type as keyof typeof buttonStyles] || buttonStyles.info} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
