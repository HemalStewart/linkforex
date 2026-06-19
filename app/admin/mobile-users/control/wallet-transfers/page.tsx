'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Search } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';
import { formatDateTime } from '@/app/lib/dateUtils';
import type { WalletTransfer } from '../_shared';
import { useAuditColumns } from '@/app/lib/permissions';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'awaiting_funds', label: 'Awaiting Funds' },
    { value: 'funds_received', label: 'Funds Received' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
] as const;

const statusBadge = (status: string): string => {
    switch (status) {
        case 'awaiting_funds':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        case 'funds_received':
            return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
        case 'processing':
            return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
        case 'completed':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'rejected':
            return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
        default:
            return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
};

export default function WalletTransfersPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('TRANSFERS');
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState<WalletTransfer[]>([]);
    const [notes, setNotes] = useState<Record<number, string>>({});
    const [draftStatuses, setDraftStatuses] = useState<Record<number, string>>({});

    const loadTransfers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (search.trim()) params.set('search', search.trim());

            const res = await fetch(`${ENDPOINTS.MOBILE_ADMIN.TRANSFERS}?${params.toString()}`);
            if (!res.ok) {
                setRows([]);
                return;
            }
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setRows(list);
            setNotes(Object.fromEntries(list.map((row: WalletTransfer) => [row.id, row.wallet_status_note || ''])));
            setDraftStatuses(Object.fromEntries(list.map((row: WalletTransfer) => [row.id, row.status || 'awaiting_funds'])));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTransfers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return rows;
        return rows.filter((row) =>
            [row.code, row.remitter_name, row.remitter_email, row.beneficiary_name, row.wallet_tx_hash, row.payment_reference]
                .some((value) => String(value || '').toLowerCase().includes(needle))
        );
    }, [rows, search]);

    const saveRow = async (row: WalletTransfer) => {
        setSavingId(row.id);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.TRANSFER_DETAIL(row.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: draftStatuses[row.id] || row.status,
                    wallet_status_note: notes[row.id] || '',
                    wallet_tx_hash: row.wallet_tx_hash || '',
                }),
            });
            if (!res.ok) {
                return;
            }
            const updated = await res.json();
            setRows((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-fade-in-up">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Wallet Funding Queue</h1>
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                        Review all mobile transfer requests funded to the shared trust wallet and update manual settlement status.
                    </p>
                </div>
                <button onClick={loadTransfers} className="btn-primary flex items-center gap-2 rounded-full px-5">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="card-glass p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="text-xs font-bold text-slate-500">
                        Status
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="text-xs font-bold text-slate-500 md:col-span-2">
                        Search
                        <div className="relative mt-1.5">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="input-glass w-full py-2.5 pl-10 text-sm normal-case"
                                placeholder="Search by reference, remitter, beneficiary, or wallet hash"
                            />
                        </div>
                    </label>
                </div>
            </div>

            <div className="card-glass overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50/80 dark:bg-slate-900/40">
                            <tr className="text-left text-xs font-bold text-slate-500">
                                <th className="px-4 py-3">Transfer</th>
                                <th className="px-4 py-3">Sender</th>
                                <th className="px-4 py-3">Recipient</th>
                                <th className="px-4 py-3">Amounts</th>
                                <th className="px-4 py-3">Wallet Proof</th>
                                <th className="px-4 py-3">Status</th>
                                {showCreatedBy && <th className="px-4 py-3">Created By</th>}
                                {showCreatedAt && <th className="px-4 py-3">Created At</th>}
                                {showUpdatedBy && <th className="px-4 py-3">Updated By</th>}
                                {showUpdatedAt && <th className="px-4 py-3">Updated At</th>}
                                <th className="px-4 py-3">Note</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={8 + (showCreatedBy ? 1 : 0) + (showCreatedAt ? 1 : 0) + (showUpdatedBy ? 1 : 0) + (showUpdatedAt ? 1 : 0)}>
                                        Loading wallet transfers...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={8 + (showCreatedBy ? 1 : 0) + (showCreatedAt ? 1 : 0) + (showUpdatedBy ? 1 : 0) + (showUpdatedAt ? 1 : 0)}>
                                        No wallet transfers found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr key={row.id} className="align-top">
                                        <td className="px-4 py-4 text-sm">
                                            <div className="font-bold text-slate-900 dark:text-white">{row.code}</div>
                                            <div className="text-slate-500 whitespace-nowrap">{formatDateTime(row.created_at)}</div>
                                            <div className="mt-1 text-xs text-slate-500">{row.payment_mode || 'trust_wallet'}</div>
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <div className="font-semibold text-slate-900 dark:text-white">{row.remitter_name || 'Unknown'}</div>
                                            <div className="text-slate-500">{row.remitter_email || '-'}</div>
                                            <div className="text-slate-500">{row.remitter_phone || '-'}</div>
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <div className="font-semibold text-slate-900 dark:text-white">{row.beneficiary_name || 'Unknown'}</div>
                                            <div className="text-slate-500">{row.beneficiary_bank_name || '-'}</div>
                                            <div className="text-slate-500">{row.beneficiary_account_number || '-'}</div>
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <div className="font-semibold text-slate-900 dark:text-white">{row.source_amount.toFixed(2)} {row.source_currency || 'GBP'}</div>
                                            <div className="text-slate-500">{row.dest_amount.toFixed(2)} {row.payout_currency || '-'}</div>
                                            <div className="text-slate-500">Rate {row.rate.toFixed(2)}</div>
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <div className="font-medium text-slate-900 dark:text-white">{row.payment_reference || '-'}</div>
                                            <div className="mt-1 break-all text-slate-500">{row.wallet_tx_hash || 'No transaction hash supplied'}</div>
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(row.status)}`}>
                                                {row.status.replaceAll('_', ' ')}
                                            </span>
                                            <select
                                                value={draftStatuses[row.id] || row.status}
                                                onChange={(event) => setDraftStatuses((prev) => ({ ...prev, [row.id]: event.target.value }))}
                                                className="input-glass mt-3 w-44 py-2 text-sm normal-case"
                                            >
                                                {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        {showCreatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{row.created_by || row.entered_user || '—'}</td>}
                                        {showCreatedAt && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{row.created_at ? formatDateTime(row.created_at) : '—'}</td>}
                                        {showUpdatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{row.updated_by || row.modified_user || '—'}</td>}
                                        {showUpdatedAt && (
                                            <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                                {row.updated_at ? formatDateTime(row.updated_at) : '—'}
                                            </td>
                                        )}
                                        <td className="px-4 py-4 text-sm">
                                            <textarea
                                                value={notes[row.id] || ''}
                                                onChange={(event) => setNotes((prev) => ({ ...prev, [row.id]: event.target.value }))}
                                                className="input-glass min-h-24 w-72 py-2 text-sm normal-case"
                                                placeholder="Internal settlement note"
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <button
                                                onClick={() => saveRow(row)}
                                                disabled={savingId === row.id}
                                                className="btn-primary flex items-center gap-2 rounded-full px-4 py-2 text-xs"
                                            >
                                                <Save className="h-3.5 w-3.5" />
                                                {savingId === row.id ? 'Saving...' : 'Update'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
