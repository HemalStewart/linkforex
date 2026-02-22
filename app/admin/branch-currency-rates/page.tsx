'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { Search, PlusCircle, Trash2, RefreshCcw } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

type SortDir = 'asc' | 'desc';

type BranchCurrencyRate = {
    id: string | number;
    company: string;
    branch_code: string;
    branch_name: string;
    currency_code: string;
    currency_name: string;
    currency_symbol?: string;
    currency_display?: string;
    active: 'yes' | 'no';
    customer_rate: string;
    branch_rate: string;
    entered_user?: string;
    modified_user?: string;
    created_at?: string;
    updated_at?: string;
};

export default function BranchCurrencyRatesPage() {
    const [rows, setRows] = useState<BranchCurrencyRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<keyof BranchCurrencyRate>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<BranchCurrencyRate | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: false
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const rowsRes = await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.LIST);
            if (!rowsRes.ok) {
                setRows([]);
                return;
            }
            const data = (await rowsRes.json()) as BranchCurrencyRate[];
            setRows(data);
        } catch (error) {
            console.error('Failed to fetch branch currency rates', error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const searchableRows = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) => {
            const haystack = [
                row.company,
                row.branch_name,
                row.branch_code,
                row.currency_code,
                row.currency_name,
                row.currency_display,
                row.active,
                row.customer_rate,
                row.branch_rate,
                row.entered_user,
                row.modified_user
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [rows, searchQuery]);

    const sortedRows = useMemo(() => {
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        return [...searchableRows].sort((a, b) => {
            const aVal = (a[sortKey] ?? '') as string | number;
            const bVal = (b[sortKey] ?? '') as string | number;

            if (sortKey === 'created_at' || sortKey === 'updated_at') {
                const aTime = aVal ? new Date(String(aVal)).getTime() : 0;
                const bTime = bVal ? new Date(String(bVal)).getTime() : 0;
                return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
            }

            const result = collator.compare(String(aVal), String(bVal));
            return sortDir === 'asc' ? result : -result;
        });
    }, [searchableRows, sortKey, sortDir]);

    const total = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, total);
    const pagedRows = sortedRows.slice(startIndex, endIndex);

    useEffect(() => {
        if (currentPage !== page) {
            setPage(currentPage);
        }
    }, [currentPage, page]);

    const toggleSort = (key: keyof BranchCurrencyRate) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortKey(key);
        setSortDir('asc');
    };

    const sortIndicator = (key: keyof BranchCurrencyRate) => {
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    const toggleActive = async (row: BranchCurrencyRate) => {
        const nextActive = row.active === 'yes' ? 'no' : 'yes';
        const user = getStoredUser<{ username?: string; name?: string }>();
        const userName = user?.username || user?.name || 'Admin';

        setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, active: nextActive } : item)));

        try {
            const response = await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.DETAIL(row.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: nextActive, modified_user: userName })
            });
            if (!response.ok) {
                throw new Error('Failed to update active state');
            }
            const updated = (await response.json()) as BranchCurrencyRate;
            setRows((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
        } catch (error) {
            console.error(error);
            setRows((prev) => prev.map((item) => (item.id === row.id ? row : item)));
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to update active status.',
                type: 'danger',
                isAlert: true
            });
        }
    };

    const requestDelete = (row: BranchCurrencyRate) => {
        setDeleteTarget(row);
        setConfirmModal({
            isOpen: true,
            title: 'Delete Branch Currency Rate',
            message: `Delete ${row.branch_name} / ${row.currency_code} rate?`,
            type: 'danger',
            isAlert: false
        });
    };

    const handleConfirm = async () => {
        if (confirmModal.isAlert) {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            return;
        }

        if (!deleteTarget) return;
        try {
            const response = await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.DETAIL(deleteTarget.id), { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');
            setRows((prev) => prev.filter((item) => item.id !== deleteTarget.id));
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to delete branch currency rate.',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setDeleteTarget(null);
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.isAlert ? 'OK' : 'Delete'}
                cancelText="Cancel"
            />

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Branch Currency Rates</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Customer and branch rates per currency by branch</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={fetchData}
                        className="px-5 py-3 rounded-full glass-effect text-sm font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 inline-flex items-center gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Refresh
                    </button>
                    <Link
                        href="/admin/branch-currency-rates/create"
                        className="btn-primary px-5 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add Rate
                    </Link>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-slate-500 dark:text-slate-300">
                            Results: {total === 0 ? 0 : startIndex + 1} - {endIndex} of {total}
                        </div>
                        <div className="relative input-icon max-w-sm w-full">
                            <span className="input-icon-left"><Search className="w-4 h-4" /></span>
                            <input
                                className="input-glass w-full text-sm"
                                placeholder="Search all columns"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-300">Loading branch currency rates...</div>
                    ) : (
                        <table className="table-shell whitespace-nowrap">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">No.</th>
                                    {[
                                        ['company', 'Company'],
                                        ['branch_name', 'Branch'],
                                        ['currency_display', 'Currency'],
                                        ['active', 'Active'],
                                        ['customer_rate', 'Customer Rate For £'],
                                        ['branch_rate', 'Branch Rate For £'],
                                        ['entered_user', 'Entered User'],
                                        ['created_at', 'Entered Date'],
                                        ['modified_user', 'Modified User'],
                                        ['updated_at', 'Modified Date']
                                    ].map(([key, label]) => (
                                        <th key={key} className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                            <button onClick={() => toggleSort(key as keyof BranchCurrencyRate)} className="flex items-center gap-1">
                                                {label}
                                                <span className="text-slate-400 dark:text-slate-300">{sortIndicator(key as keyof BranchCurrencyRate)}</span>
                                            </button>
                                        </th>
                                    ))}
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedRows.map((row, index) => (
                                    <tr key={String(row.id)} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{startIndex + index + 1}</td>
                                        <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200 font-medium">{row.company}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.branch_name}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.currency_display || `${row.currency_code} ${row.currency_symbol || ''}`}</td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => toggleActive(row)}
                                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${row.active === 'yes'
                                                    ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300'
                                                    : 'bg-slate-500/20 text-slate-600 dark:text-slate-300'
                                                    }`}
                                            >
                                                {row.active === 'yes' ? 'Yes' : 'No'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{Number(row.customer_rate || 0).toLocaleString()}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{Number(row.branch_rate || 0).toLocaleString()}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.entered_user || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.modified_user || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}</td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => requestDelete(row)}
                                                className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-red-600 inline-flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100/70 dark:border-slate-700/60">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-slate-400 dark:text-slate-300">Rows per page</span>
                        <select
                            className="input-glass px-3 py-1.5 text-sm"
                            value={rowsPerPage}
                            onChange={(event) => {
                                setRowsPerPage(Number(event.target.value));
                                setPage(1);
                            }}
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <button
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-full glass-effect text-slate-600 dark:text-slate-200 disabled:opacity-40"
                        >
                            Prev
                        </button>
                        <span className="text-slate-400 dark:text-slate-300">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-full glass-effect text-slate-600 dark:text-slate-200 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
