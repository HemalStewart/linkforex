'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Search, PlusCircle, RefreshCcw } from 'lucide-react';

type SortDir = 'asc' | 'desc';

type BranchCurrencyRate = {
    id: string | number;
    branch_code: string;
    branch_name: string;
    currency_code: string;
    currency_name: string;
    currency_symbol?: string;
    currency_display?: string;
    active: 'yes' | 'no';
    customer_rate: string;
    entered_user?: string;
    modified_user?: string;
    created_at?: string;
    updated_at?: string;
};

type SortKey =
    | 'branch_name'
    | 'currency_display'
    | 'active'
    | 'customer_rate'
    | 'entered_user'
    | 'created_at'
    | 'modified_user'
    | 'updated_at';

export default function BranchCurrencyRatesPage() {
    const [rows, setRows] = useState<BranchCurrencyRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'yes' | 'no'>('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [sortKey, setSortKey] = useState<SortKey>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
    const [page, setPage] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const rowsRes = await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.LIST);
            if (!rowsRes.ok) {
                setRows([]);
                return;
            }
            const data = (await rowsRes.json()) as BranchCurrencyRate[];
            setRows(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch branch currency rates', error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, activeFilter, branchFilter]);

    const branchOptions = useMemo(() => {
        const entries = rows
            .map((row) => ({ code: row.branch_code, name: row.branch_name }))
            .filter((row) => row.code || row.name);
        const map = new Map<string, { code: string; name: string }>();
        entries.forEach((entry) => {
            const key = `${entry.code || ''}::${entry.name || ''}`;
            if (!map.has(key)) {
                map.set(key, entry);
            }
        });
        return Array.from(map.values()).sort((left, right) =>
            `${left.name} ${left.code}`.localeCompare(`${right.name} ${right.code}`)
        );
    }, [rows]);

    const searchableRows = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();
        const statusFiltered = rows.filter((row) => activeFilter === 'all' || row.active === activeFilter);
        const branchFiltered = statusFiltered.filter((row) => {
            if (branchFilter === 'all') return true;
            return row.branch_code === branchFilter;
        });
        if (!term) return branchFiltered;

        return branchFiltered.filter((row) => {
            const haystack = [
                row.branch_name,
                row.branch_code,
                row.currency_code,
                row.currency_name,
                row.currency_display,
                row.active,
                row.customer_rate,
                row.entered_user,
                row.modified_user,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [rows, searchQuery, activeFilter, branchFilter]);

    const sortedRows = useMemo(() => {
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        return [...searchableRows].sort((a, b) => {
            const valueFor = (row: BranchCurrencyRate) => {
                switch (sortKey) {
                    case 'currency_display':
                        return row.currency_display || `${row.currency_code} ${row.currency_symbol || ''}`.trim();
                    case 'created_at':
                    case 'updated_at':
                        return row[sortKey] ? new Date(String(row[sortKey])).getTime() : 0;
                    case 'customer_rate':
                        return Number(row[sortKey] || 0);
                    default:
                        return String(row[sortKey] || '');
                }
            };

            const aVal = valueFor(a);
            const bVal = valueFor(b);
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
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

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortKey(key);
        setSortDir('asc');
    };

    const sortIndicator = (key: SortKey) => {
        return <SortIndicator active={sortKey === key} dir={sortDir} className="text-slate-400 dark:text-slate-300" />;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Customer Cash Rates</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
                        Add-only branch currency rates for cash operations.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={fetchData}
                        className="px-5 py-3 rounded-full glass-effect text-sm font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 inline-flex items-center gap-2"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Search className="w-4 h-4" /></span>
                            <input
                                className="input-glass w-full text-sm"
                                placeholder="Search all columns"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                        <select
                            className="input-glass w-full text-sm"
                            value={activeFilter}
                            onChange={(event) => setActiveFilter(event.target.value as 'all' | 'yes' | 'no')}
                        >
                            <option value="all">All Active States</option>
                            <option value="yes">Active: Yes</option>
                            <option value="no">Active: No</option>
                        </select>
                        <select
                            className="input-glass w-full text-sm"
                            value={branchFilter}
                            onChange={(event) => setBranchFilter(event.target.value)}
                        >
                            <option value="all">All Branches</option>
                            {branchOptions.map((branch) => (
                                <option key={`${branch.code}-${branch.name}`} value={branch.code}>
                                    {branch.name} ({branch.code})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                        Results: {total === 0 ? 0 : startIndex + 1} - {endIndex} of {total}
                    </div>
                </div>

                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-300">Loading customer cash rates...</div>
                    ) : (
                        <table className="table-shell whitespace-nowrap">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">No.</th>
                                    {[
                                        ['branch_name', 'Branch'],
                                        ['currency_display', 'Currency'],
                                        ['active', 'Active'],
                                        ['customer_rate', 'Customer Cash Rate For £'],
                                        ['entered_user', 'Entered User'],
                                        ['created_at', 'Entered Date'],
                                        ['modified_user', 'Modified User'],
                                        ['updated_at', 'Modified Date'],
                                    ].map(([key, label]) => (
                                        <th key={key} className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                            <button onClick={() => toggleSort(key as SortKey)} className="flex items-center gap-1">
                                                {label}
                                                <span className="text-slate-400 dark:text-slate-300">{sortIndicator(key as SortKey)}</span>
                                            </button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedRows.map((row, index) => (
                                    <tr key={String(row.id)} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{startIndex + index + 1}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            <div className="font-semibold text-slate-800 dark:text-slate-100">{row.branch_name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{row.branch_code}</div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {row.currency_display || `${row.currency_code} ${row.currency_symbol || ''}`.trim()}
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <Badge type={row.active === 'yes' ? 'active' : 'inactive'}>
                                                {row.active === 'yes' ? 'Yes' : 'No'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {Number(row.customer_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.entered_user || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.modified_user || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}</td>
                                    </tr>
                                ))}
                                {!loading && pagedRows.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                            No branch currency rates found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setPage(1); }}
                />
            </div>
        </div>
    );
}
