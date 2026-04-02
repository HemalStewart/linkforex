'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Badge from '@/app/admin/components/ui/Badge';
import { RefreshCcw, Search } from 'lucide-react';

type MobileExchangeRate = {
    id: number;
    code?: string;
    currency_code?: string;
    name?: string;
    currency_name?: string;
    symbol?: string;
    currency_symbol?: string;
    rate?: string | number;
    status?: string;
    payout_enabled?: string;
    source_branch_code?: string;
    source_branch_name?: string;
    updated_at?: string;
};

export default function MobileExchangeRatesPage() {
    const [rows, setRows] = useState<MobileExchangeRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATES);
            const data = res.ok ? await res.json() : [];
            const filtered = (Array.isArray(data) ? data : []).filter(
                (row: MobileExchangeRate) => String(row.payout_enabled || '').trim().toLowerCase() !== 'no'
            );
            setRows(filtered);
        } catch (error) {
            console.error('Failed to fetch mobile exchange rates', error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const filteredRows = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return rows;
        return rows.filter((row) =>
            [
                row.code,
                row.currency_code,
                row.name,
                row.currency_name,
                row.symbol,
                row.currency_symbol,
                row.rate,
                row.source_branch_code,
                row.source_branch_name,
                row.status,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [rows, searchQuery]);

    const sortedRows = useMemo(() => {
        return [...filteredRows].sort((a, b) => {
            const aCode = String(a.code || a.currency_code || '').toUpperCase();
            const bCode = String(b.code || b.currency_code || '').toUpperCase();
            if (aCode !== bCode) return aCode.localeCompare(bCode);
            const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return bUpdated - aUpdated;
        });
    }, [filteredRows]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Customer Digital Rates</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
                        Digital rates are managed from Branch Rates. This page is display-only.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void fetchData()}
                    className="glass-effect inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-slate-600 transition hover:text-teal-600 dark:text-slate-200 dark:hover:text-teal-300"
                >
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60">
                    <div className="relative input-icon">
                        <span className="input-icon-left"><Search className="w-4 h-4" /></span>
                        <input
                            className="input-glass w-full text-sm"
                            placeholder="Search currency, branch, rate"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </div>
                </div>

                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading mobile exchange rates...</div>
                    ) : (
                        <table className="table-shell whitespace-nowrap">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Currency</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Customer Digital Rate</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Status</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Source Branch</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {sortedRows.map((row) => {
                                    const code = String(row.code || row.currency_code || '').toUpperCase();
                                    const name = row.name || row.currency_name || '';
                                    const symbol = row.symbol || row.currency_symbol || '';
                                    const rate = Number(row.rate || 0).toFixed(4);
                                    const status = String(row.status || 'active').toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
                                    const branchLabel = row.source_branch_code
                                        ? `${row.source_branch_code}${row.source_branch_name ? ` - ${row.source_branch_name}` : ''}`
                                        : '-';
                                    return (
                                        <tr key={row.id}>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                                                <div className="font-semibold">{code} {symbol}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{name || '-'}</div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{rate}</td>
                                            <td className="px-4 py-4 text-sm">
                                                <Badge type={status === 'Active' ? 'active' : 'inactive'}>{status}</Badge>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{branchLabel}</td>
                                            <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                                                {row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!loading && sortedRows.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                            No mobile exchange rates found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
