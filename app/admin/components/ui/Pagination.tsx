'use client';

import React from 'react';
import { useTableFontSize } from '@/app/lib/uiPreferences';
import { ZoomIn, ZoomOut } from 'lucide-react';

type PaginationProps = {
    currentPage: number;
    totalPages: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rows: number) => void;
};

export default function Pagination({
    currentPage,
    totalPages,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange
}: PaginationProps) {
    const options = Array.from(new Set([10, 25, 50, 100, 500, 1000, rowsPerPage])).sort((a, b) => a - b);
    const [fontSize, setFontSize] = useTableFontSize();

    return (
        <div className="px-6 py-4 border-t border-slate-100/70 dark:border-slate-700/60 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-400 dark:text-slate-300 font-medium">Rows per page</span>
            <select
                className="input-glass px-3 py-1.5 text-sm pr-8 min-w-[70px]"
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            
            {/* Font Size Adjuster */}
            <div className="flex items-center gap-1 border-l border-slate-200/80 dark:border-slate-700/60 pl-3">
                <span className="text-slate-400 dark:text-slate-300 font-medium whitespace-nowrap mr-1">Size</span>
                <button
                    type="button"
                    onClick={() => setFontSize(fontSize - 1)}
                    disabled={fontSize <= 10}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Decrease table text size"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-[28px] text-center" title="Table text size">
                    {fontSize}px
                </span>
                <button
                    type="button"
                    onClick={() => setFontSize(fontSize + 1)}
                    disabled={fontSize >= 20}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Increase table text size"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
            </div>

            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className="px-4 py-1.5 rounded-full btn-secondary font-medium disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
            >
                Prev
            </button>
            <span className="text-slate-500 dark:text-slate-300 font-medium whitespace-nowrap">
                Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
            </span>
            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || totalPages === 0}
                className="px-4 py-1.5 rounded-full btn-secondary font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Next
            </button>
        </div>
    );
}

