'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Building2, Eye, Plus, Search, Trash2, Users } from 'lucide-react';

type SortDir = 'asc' | 'desc';

type Receiver = {
    id: string | number;
    name?: string | null;
    bank_name?: string | null;
    account_number?: string | null;
    iban?: string | null;
    country?: string | null;
    status?: string | null;
    aml_status?: string | null;
    created_at?: string | null;
    [key: string]: unknown;
};

type ColumnKey = 'remitter' | 'name' | 'bank' | 'account' | 'country' | 'status' | 'amlStatus' | 'createdAt';

const asString = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value);
};

const normalize = (value: unknown): string => asString(value).trim().toLowerCase();

const formatStatus = (value: unknown): string => {
    const key = normalize(value);
    if (!key) return '-';
    return key
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const statusBadgeClass = (value: unknown): string => {
    const key = normalize(value);
    if (key === 'active' || key === 'yes' || key === 'verified') {
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    }
    if (key === 'inactive' || key === 'no') {
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export default function ReceiversPage() {
    const [receivers, setReceivers] = useState<Receiver[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<ColumnKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    const handleAmlStatusChange = async (id: string | number, newStatus: string) => {
        setUpdatingId(id);
        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    aml_status: newStatus,
                }),
            });

            if (res.ok) {
                const updatedReceiver = (await res.json()) as Receiver;
                setReceivers((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, aml_status: updatedReceiver.aml_status } : r))
                );
            } else {
                alert('Failed to update AML status');
            }
        } catch (error) {
            console.error('Error updating AML status:', error);
            alert('An error occurred while updating AML status');
        } finally {
            setUpdatingId(null);
        }
    };

    const getAmlBadgeClass = (status: string) => {
        switch (normalize(status)) {
            case 'clear':
            case 'passed':
            case 'manually passed':
                return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'review':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'hit':
                return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800';
            case 'pending':
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    useEffect(() => {
        void fetchReceivers();
    }, []);

    const fetchReceivers = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.LIST);
            if (res.ok) {
                const data = (await res.json()) as Receiver[];
                setReceivers(Array.isArray(data) ? data : []);
            } else {
                setReceivers([]);
            }
        } catch (error) {
            console.error('Failed to fetch receivers:', error);
            setReceivers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this receiver?')) return;

        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(id), {
                method: 'DELETE',
            });

            if (res.ok) {
                setReceivers((prev) => prev.filter((r) => Number(r.id) !== id));
            }
        } catch (error) {
            console.error('Error deleting receiver:', error);
        }
    };

    const filteredReceivers = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();
        if (!term) return receivers;
        return receivers.filter((receiver) => {
            const text = [
                receiver.remitter_name,
                receiver.name,
                receiver.bank_name,
                receiver.account_number,
                receiver.iban,
                receiver.country,
                receiver.status,
            ]
                .map((v) => asString(v).toLowerCase())
                .join(' ');
            return text.includes(term);
        });
    }, [receivers, searchQuery]);

    const sortedReceivers = useMemo(() => {
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        const valueFor = (receiver: Receiver): string => {
            switch (sortKey) {
                case 'remitter':
                    return asString(receiver.remitter_name);
                case 'name':
                    return asString(receiver.name);
                case 'bank':
                    return asString(receiver.bank_name);
                case 'account':
                    return asString(receiver.account_number || receiver.iban);
                case 'country':
                    return asString(receiver.country);
                case 'status':
                    return asString(receiver.status);
                case 'amlStatus':
                    return asString(receiver.aml_status);
                case 'createdAt':
                default:
                    return asString(receiver.created_at);
            }
        };

        return [...filteredReceivers].sort((a, b) => {
            if (sortKey === 'createdAt') {
                const aTime = Date.parse(asString(a.created_at)) || 0;
                const bTime = Date.parse(asString(b.created_at)) || 0;
                return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
            }
            const result = collator.compare(valueFor(a), valueFor(b));
            return sortDir === 'asc' ? result : -result;
        });
    }, [filteredReceivers, sortKey, sortDir]);

    const total = sortedReceivers.length;
    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, total);
    const pagedReceivers = sortedReceivers.slice(startIndex, endIndex);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, rowsPerPage, sortKey, sortDir]);

    const toggleSort = (key: ColumnKey) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortKey(key);
        setSortDir('asc');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Receivers</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Manage all transfer beneficiaries</p>
                </div>
                <Link href="/admin/receivers/create" className="btn-primary flex items-center space-x-2 rounded-full px-6">
                    <Plus className="w-5 h-5" />
                    <span>Add Receiver</span>
                </Link>
            </div>

            <div className="card-glass p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Search className="w-4 h-4" /></span>
                            <input
                                type="text"
                                placeholder="Search by name, bank, account, IBAN, country..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-glass w-full text-sm"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2 flex md:justify-end items-end">
                        <button
                            type="button"
                            onClick={() => void fetchReceivers()}
                            className="px-4 py-2 rounded-full glass-effect text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center space-x-3">
                    <Users className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Receivers Directory</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Showing {total === 0 ? 0 : startIndex + 1} to {endIndex} of {total}
                        </p>
                    </div>
                </div>

                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-300">Loading receivers...</div>
                    ) : (
                        <table className="table-shell whitespace-nowrap">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('remitter')} className="flex items-center gap-2">
                                            Remitter <SortIndicator active={sortKey === 'remitter'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('name')} className="flex items-center gap-2">
                                            Name <SortIndicator active={sortKey === 'name'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('bank')} className="flex items-center gap-2">
                                            Bank <SortIndicator active={sortKey === 'bank'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('account')} className="flex items-center gap-2">
                                            Account / IBAN <SortIndicator active={sortKey === 'account'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('country')} className="flex items-center gap-2">
                                            Country <SortIndicator active={sortKey === 'country'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('status')} className="flex items-center gap-2">
                                            Status <SortIndicator active={sortKey === 'status'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('amlStatus')} className="flex items-center gap-2">
                                            AML Status <SortIndicator active={sortKey === 'amlStatus'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-2">
                                            Entered <SortIndicator active={sortKey === 'createdAt'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedReceivers.length > 0 ? (
                                    pagedReceivers.map((receiver) => (
                                        <tr key={String(receiver.id)} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                            <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                                                {asString(receiver.remitter_name) || '-'}
                                            </td>
                                            <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                                                {asString(receiver.name) || '-'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                <div className="inline-flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                    <span>{asString(receiver.bank_name) || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 font-mono">
                                                {asString(receiver.account_number || receiver.iban) || '-'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {asString(receiver.country) || '-'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass(receiver.status)}`}>
                                                    {formatStatus(receiver.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${getAmlBadgeClass(String(receiver.aml_status || 'pending'))}`}>
                                                    {asString(receiver.aml_status || 'pending')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {receiver.created_at ? new Date(receiver.created_at).toLocaleString() : '-'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/admin/receivers/${receiver.id}`}
                                                        className="p-2 rounded-full glass-effect text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300"
                                                        title="View receiver"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(Number(receiver.id))}
                                                        className="p-2 rounded-full glass-effect text-slate-600 dark:text-slate-200 hover:text-red-600"
                                                        title="Delete receiver"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="py-20 text-center">
                                            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Users className="w-10 h-10 text-slate-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No receivers found</h3>
                                            <p className="text-slate-500 dark:text-slate-300">Try adjusting your search or add a new one.</p>
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

