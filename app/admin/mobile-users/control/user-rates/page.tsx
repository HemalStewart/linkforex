'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Badge from '@/app/admin/components/ui/Badge';
import { RefreshCw, Search, Plus, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/app/lib/dateUtils';
import { useAuditColumns } from '@/app/lib/permissions';

type MobileExchangeRate = {
    id: number;
    currency_code?: string;
    code?: string;
    name?: string;
    currency_name?: string;
    symbol?: string;
    currency_symbol?: string;
    payout_enabled?: string;
};

type UserRateOverride = {
    id: number;
    user_email: string;
    currency_code: string;
    rate: string | number;
    status: 'active' | 'inactive';
    updated_by?: string;
    updated_at?: string | null;
    created_by?: string | null;
    entered_user?: string | null;
    modified_user?: string | null;
    created_at?: string | null;
};

function normalizeCurrencyLabel(row: MobileExchangeRate) {
    const code = String(row.currency_code || row.code || '').toUpperCase();
    const name = String(row.name || row.currency_name || '').trim();
    const symbol = String(row.symbol || row.currency_symbol || '').trim();
    return {
        code,
        name,
        symbol,
        label: `${code}${symbol ? ` ${symbol}` : ''}${name ? ` - ${name}` : ''}`,
    };
}

export default function MobileUserRatesPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('MOBILE_USER_RATES');
    const [currencies, setCurrencies] = useState<MobileExchangeRate[]>([]);
    const [rows, setRows] = useState<UserRateOverride[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

    const [open, setOpen] = useState(false);
    const [formEmail, setFormEmail] = useState('');
    const [formCurrency, setFormCurrency] = useState('');
    const [formRate, setFormRate] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [currRes, overridesRes] = await Promise.all([
                fetch(ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATES),
                fetch(`${ENDPOINTS.MOBILE_ADMIN.USER_RATE_OVERRIDES}?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery.trim())}`),
            ]);

            const currData = currRes.ok ? await currRes.json() : [];
            const overridesData = overridesRes.ok ? await overridesRes.json() : [];

            const payoutCurrencies = (Array.isArray(currData) ? currData : []).filter(
                (row: MobileExchangeRate) => String(row.payout_enabled || '').trim().toLowerCase() !== 'no'
            );
            setCurrencies(payoutCurrencies);

            setRows(Array.isArray(overridesData) ? overridesData : []);
        } catch (error) {
            console.error('Failed to fetch user rate overrides', error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const currencyOptions = useMemo(() => {
        const opts = currencies
            .map(normalizeCurrencyLabel)
            .filter((c) => c.code);
        opts.sort((a, b) => a.code.localeCompare(b.code));
        return opts;
    }, [currencies]);

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) =>
            [row.user_email, row.currency_code, row.rate, row.status, row.updated_by, row.updated_at]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        );
    }, [rows, searchQuery]);

    const sortedRows = useMemo(() => {
        return [...filteredRows].sort((a, b) => {
            if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
            const aEmail = a.user_email.localeCompare(b.user_email);
            if (aEmail !== 0) return aEmail;
            return a.currency_code.localeCompare(b.currency_code);
        });
    }, [filteredRows]);

    const onSave = async () => {
        const email = formEmail.trim().toLowerCase();
        const currency_code = formCurrency.trim().toUpperCase();
        const rate = formRate.trim();
        if (!email || !currency_code || !rate) return;

        setSaving(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.USER_RATE_OVERRIDES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: email, currency_code, rate }),
            });
            if (!res.ok) {
                const msg = await res.text();
                console.error('Failed to save override', msg);
            } else {
                setOpen(false);
                setFormEmail('');
                setFormCurrency('');
                setFormRate('');
                await fetchData();
            }
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (id: number) => {
        if (!confirm('Delete this override?')) return;
        await fetch(ENDPOINTS.MOBILE_ADMIN.USER_RATE_OVERRIDE_DETAIL(id), { method: 'DELETE' });
        await fetchData();
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">User Rates</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
                        Optional per-user digital rate overrides. If an override exists, it will be returned to the app when rates are requested with that user&apos;s email.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => void fetchData()}
                        className="glass-effect inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-slate-600 transition hover:text-teal-600 dark:text-slate-200 dark:hover:text-teal-300"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
                    >
                        <Plus className="w-4 h-4" />
                        Add Override
                    </button>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative input-icon md:col-span-2">
                            <span className="input-icon-left"><Search className="w-4 h-4" /></span>
                            <input
                                className="input-glass w-full text-sm"
                                placeholder="Search email, currency, rate"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void fetchData();
                                }}
                            />
                        </div>
                        <select
                            className="input-glass text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => void fetchData()}
                            className="glass-effect inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-slate-600 transition hover:text-teal-600 dark:text-slate-200 dark:hover:text-teal-300"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Apply
                        </button>
                    </div>
                </div>

                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading overrides...</div>
                    ) : (
                        <table className="table-shell whitespace-nowrap">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">User Email</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Currency</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Digital Rate</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Status</th>
                                    {showCreatedBy && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Created By</th>}
                                    {showCreatedAt && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Created At</th>}
                                    {showUpdatedBy && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Updated By</th>}
                                    {showUpdatedAt && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Updated At</th>}
                                    <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-300">Action</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {sortedRows.map((row) => {
                                    const status = row.status === 'inactive' ? 'Inactive' : 'Active';
                                    const rate = Number(row.rate || 0).toFixed(4);
                                    return (
                                        <tr key={row.id}>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200 font-semibold">{row.user_email}</td>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{row.currency_code}</td>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{rate}</td>
                                            <td className="px-4 py-4 text-sm">
                                                <Badge type={status === 'Active' ? 'active' : 'inactive'}>{status}</Badge>
                                            </td>
                                            {showCreatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{row.created_by || row.entered_user || '—'}</td>}
                                            {showCreatedAt && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{row.created_at ? formatDateTime(row.created_at) : '—'}</td>}
                                            {showUpdatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{row.updated_by || row.modified_user || '—'}</td>}
                                            {showUpdatedAt && (
                                                <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                                    {row.updated_at ? formatDateTime(row.updated_at) : '—'}
                                                </td>
                                            )}
                                            <td className="px-4 py-4 text-right text-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => void onDelete(row.id)}
                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sortedRows.length === 0 && (
                                    <tr>
                                        <td colSpan={6 + (showCreatedBy ? 1 : 0) + (showCreatedAt ? 1 : 0) + (showUpdatedBy ? 1 : 0) + (showUpdatedAt ? 1 : 0)} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                            No overrides found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="card-glass w-full max-w-lg shadow-2xl">
                        <div className="px-6 py-5 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center justify-between">
                            <div>
                                <div className="text-lg font-extrabold text-slate-900 dark:text-white">Add User Rate Override</div>
                                <div className="text-sm text-slate-500 dark:text-slate-300">Overrides the app digital rate for a specific user.</div>
                            </div>
                            <button className="text-slate-500 hover:text-slate-700 dark:hover:text-white" onClick={() => setOpen(false)} type="button">
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">User Email</label>
                                <input className="input-glass w-full text-sm" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Currency</label>
                                <select className="input-glass w-full text-sm" value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)}>
                                    <option value="">Select currency</option>
                                    {currencyOptions.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Digital Rate</label>
                                <input className="input-glass w-full text-sm" value={formRate} onChange={(e) => setFormRate(e.target.value)} placeholder="1.2345" />
                            </div>
                        </div>
                        <div className="px-6 py-5 border-t border-slate-100/70 dark:border-slate-700/60 flex items-center justify-end gap-3">
                            <button type="button" onClick={() => setOpen(false)} className="glass-effect rounded-full px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-200">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void onSave()}
                                disabled={saving || !formEmail.trim() || !formCurrency.trim() || !formRate.trim()}
                                className="btn-primary rounded-full px-6 py-2 text-sm font-bold disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

