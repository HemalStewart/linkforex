import React from 'react';

type BadgeProps = {
    children: React.ReactNode;
    type?: 'yes' | 'no' | 'active' | 'inactive' | 'danger' | 'warning' | 'info' | 'neutral' | 'dark';
    className?: string;
};

const normalizeText = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    
    // Keep ISO and currency codes uppercase (e.g. USD, GB, BTC)
    if (trimmed.length <= 3 && trimmed === trimmed.toUpperCase()) {
        return trimmed;
    }
    
    // Otherwise Title Case each word
    return trimmed
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export default function Badge({ children, type = 'neutral', className = '' }: BadgeProps) {
    const normalizedType = type.toLowerCase();
    const getBadgeClasses = (type: string) => {
        switch (type.toLowerCase()) {
            case 'yes':
            case 'active':
                return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-800';
            case 'no':
                return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800';
            case 'inactive':
            case 'neutral':
                return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700';
            case 'danger':
                return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800';
            case 'warning':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800';
            case 'info':
                return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800';
            case 'dark':
                return 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 ring-1 ring-slate-700 dark:ring-slate-300';
            default:
                return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700';
        }
    };

    // Keep table yes/no pills compact without shrinking warning/info badges used in alerts.
    const sizeClass =
        normalizedType === 'yes' ||
        normalizedType === 'no' ||
        normalizedType === 'active' ||
        normalizedType === 'inactive' ||
        normalizedType === 'neutral'
            ? 'px-2 py-0.5 text-[8px] leading-none tracking-wide'
            : 'px-3 py-1 text-[10px] leading-none';

    const renderedContent = typeof children === 'string' ? normalizeText(children) : children;

    return (
        <span
            className={`inline-flex items-center rounded-full font-extrabold normal-case ${sizeClass} ${getBadgeClasses(
                type
            )} ${className}`}
        >
            {renderedContent}
        </span>
    );
}
