'use client';

import React, { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Prevent scrolling when modal is open
        if (isOpen) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            document.documentElement.classList.add('modal-open');
            document.body.classList.add('modal-open');
        } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            document.documentElement.classList.remove('modal-open');
            document.body.classList.remove('modal-open');
        }
        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            document.documentElement.classList.remove('modal-open');
            document.body.classList.remove('modal-open');
        };
    }, [isOpen]);

    if (!mounted) return null;

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-xl',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                {/* Backdrop with Blur */}
                <div
                    className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 transition-all duration-300 backdrop-blur-sm animate-fade-in"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                <div className={`
                    relative transform overflow-hidden glass-effect-strong rounded-[18px] text-left shadow-lg transition-all sm:my-8 w-full ${sizeClasses[size]}
                    border border-white/20 dark:border-white/10 animate-scale-in
                `}>
                    <div className="px-8 pt-8 pb-8">
                        {title && (
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight" id="modal-title">
                                    {title}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="glass-effect p-2 rounded-full text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-all duration-300 hover:scale-105"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <div className="mt-2 text-slate-700 dark:text-slate-300">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
