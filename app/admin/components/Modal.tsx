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
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
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
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop with Blur */}
                <div
                    className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 transition-all duration-300 backdrop-blur-md animate-fade-in"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                {/* Center Modal */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className={`
                    inline-block align-bottom glass-effect-strong rounded-2xl text-left overflow-hidden shadow-2xl sm:my-8 sm:align-middle w-full ${sizeClasses[size]} 
                    border border-white/40 dark:border-slate-600/40 relative animate-scale-in
                `}>
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        {title && (
                            <div className="mb-4 pb-4 border-b border-sky-200/50 dark:border-sky-800/50">
                                <h3 className="text-lg font-bold leading-6 bg-blue-gradient bg-clip-text text-transparent" id="modal-title">
                                    {title}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="absolute top-5 right-5 glass-effect p-2 rounded-xl text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 transition-all duration-300 hover:scale-110 hover-glow group"
                                >
                                    <svg className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
