import React from 'react';

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
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-4 text-sm dark:border-white/8">
            <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-500 dark:text-slate-300 font-medium">Rows per page</span>
            <select
                className="input-glass px-3 py-1.5 text-sm pr-8 min-w-[70px]"
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
            </select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className="btn-secondary px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Prev
            </button>
            <span className="rounded-full bg-white/40 px-4 py-2 text-slate-600 dark:bg-white/5 dark:text-slate-300 font-medium whitespace-nowrap">
                Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
            </span>
            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || totalPages === 0}
                className="btn-secondary px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Next
            </button>
            </div>
        </div>
    );
}
