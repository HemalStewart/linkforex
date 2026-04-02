'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import { Users, RefreshCw, Search, Building2, Calendar } from 'lucide-react';

export default function BeneficiariesPage() {
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    useEffect(() => {
        fetchBeneficiaries();
    }, []);

    const fetchBeneficiaries = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.LIST);
            if (res.ok) {
                const data = await res.json();
                setBeneficiaries(data);
            }
        } catch (error) {
            console.error('Failed to fetch beneficiaries', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBeneficiaries = useMemo(() => {
        return beneficiaries.filter(b =>
            b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.account_number?.includes(searchQuery)
        );
    }, [beneficiaries, searchQuery]);

    const sortedBeneficiaries = useMemo(() => {
        return [...filteredBeneficiaries].sort((a, b) => {
            const aVal = a[sortKey] ?? '';
            const bVal = b[sortKey] ?? '';
            if (sortDir === 'asc') return String(aVal).localeCompare(String(bVal));
            return String(bVal).localeCompare(String(aVal));
        });
    }, [filteredBeneficiaries, sortKey, sortDir]);

    const totalRows = sortedBeneficiaries.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const pagedBeneficiaries = sortedBeneficiaries.slice(startIndex, endIndex);

    const toggleSort = (key: string) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };
    const sortIndicator = (key: string) => sortKey !== key ? '↕' : sortDir === 'asc' ? '↑' : '↓';

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Beneficiaries</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage global beneficiary accounts</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={fetchBeneficiaries} className="px-5 py-3 rounded-2xl border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all group">
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </span>
                    </button>
                    {/* Placeholder for Add Beneficiary - usually done via Remitter context */}
                </div>
            </div>

            {/* Search */}
            <div className="card-glass p-5">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-5">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="search"
                                placeholder="Beneficiary, bank, account number"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-glass w-full text-sm"
                            />
                        </div>
                    </div>
                    <div className="xl:col-span-7 flex items-end">
                        <p className="text-xs text-slate-400 dark:text-slate-300">Search across all beneficiary columns.</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center space-x-3">
                    <Users className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">All Beneficiaries</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Showing {totalRows === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRows}</p>
                    </div>
                </div>
                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading beneficiaries...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1">Name <span>{sortIndicator('name')}</span></button>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bank Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Mode</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1">Date Added <span>{sortIndicator('created_at')}</span></button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedBeneficiaries.map((b, idx) => {
                                    const statusValue = (b.status ?? '').toString().toLowerCase();
                                    const isActive = statusValue === 'active' || statusValue === 'verified';
                                    const statusLabel = isActive ? 'Verified' : statusValue ? 'Pending' : '-';
                                    return (
                                        <tr key={b.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center space-x-3">
                                                <div className="avatar-circle avatar-circle-sm">
                                                    {(b.name || '?').charAt(0)}
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-white">{b.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center space-x-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                    <span>{b.bank_name}</span>
                                                </div>
                                                <div className="pl-6 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                    {b.account_number}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400 font-mono">
                                            {b.customer_id}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400">
                                            {b.mobile_number || '-'}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400">
                                            {b.payment_mode || '-'}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400">
                                            {[b.country, b.city].filter(Boolean).join(', ') || '-'}
                                        </td>
                                        <td className="px-6 py-5">
                                            <Badge type={isActive ? 'active' : 'warning'}>
                                                {statusLabel}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <span>{new Date(b.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        </tr>
                                    );
                                })}
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
