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
    type?: 'danger' | 'warning' | 'info';
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
        danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-red-500/50 transition-all duration-300',
        warning: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-amber-500/50 transition-all duration-300',
        info: 'bg-blue-gradient text-white shadow-lg hover:shadow-sky-500/50 transition-all duration-300 hover-lift',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {message}
                </p>
                <div className="flex justify-end gap-3 mt-6">
                    {!isAlert && (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 glass-effect hover:shadow-md transition-all duration-300 rounded-xl"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`inline-flex justify-center px-5 py-2.5 text-sm font-semibold border-0 rounded-xl focus:outline-none shadow-lg transition-all duration-300 ${buttonStyles[type] || buttonStyles.info} ${loading ? 'opacity-70 cursor-not-allowed' : 'hover-lift'}`}
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
