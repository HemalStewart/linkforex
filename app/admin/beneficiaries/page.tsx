'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import { ENDPOINTS } from '@/app/lib/api';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Users, RefreshCw, Search, Building2, Calendar, Eye } from 'lucide-react';
import VeriffDetailsModal from '../components/VeriffDetailsModal';
import { useAuditColumns } from '@/app/lib/permissions';
import { formatDateTime } from '@/app/lib/dateUtils';

export default function BeneficiariesPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('RECEIVERS');
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
    const [selectedBeneficiary, setSelectedBeneficiary] = useState<any | null>(null);

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
            b.account_number?.includes(searchQuery) ||
            b.registration_source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.veriff_status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.aml_status?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [beneficiaries, searchQuery]);

    const sortedBeneficiaries = useMemo(() => {
        return [...filteredBeneficiaries].sort((a, b) => {
            const aVal = a[sortKey] ?? '';
            const bVal = b[sortKey] ?? '';
            if (sortKey === 'created_at' || sortKey === 'updated_at') {
                return sortDir === 'asc'
                    ? new Date(aVal).getTime() - new Date(bVal).getTime()
                    : new Date(bVal).getTime() - new Date(aVal).getTime();
            }
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
    const sortIndicator = (key: string) => (
        <SortIndicator active={sortKey === key} dir={sortDir} className="text-slate-400 dark:text-slate-300" />
    );

    const baseColSpan = 11;
    const dynamicColSpan = baseColSpan +
        (showCreatedBy ? 1 : 0) +
        (showCreatedAt ? 1 : 0) +
        (showUpdatedBy ? 1 : 0) +
        (showUpdatedAt ? 1 : 0);

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
                    <div className="xl:col-span-12">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Search</label>
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
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">#</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">
                                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1">Name <span>{sortIndicator('name')}</span></button>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Bank Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Customer ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Contact</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Payment Mode</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Location</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">
                                        <button onClick={() => toggleSort('aml_status')} className="flex items-center gap-1">AML Status <span>{sortIndicator('aml_status')}</span></button>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Source</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Veriff Status</th>
                                    {showCreatedBy && (
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">
                                            <button onClick={() => toggleSort('created_by')} className="flex items-center gap-1">Created By <span>{sortIndicator('created_by')}</span></button>
                                        </th>
                                    )}
                                    {showCreatedAt && (
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">
                                            <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1">Created At <span>{sortIndicator('created_at')}</span></button>
                                        </th>
                                    )}
                                    {showUpdatedBy && (
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">
                                            <button onClick={() => toggleSort('updated_by')} className="flex items-center gap-1">Updated By <span>{sortIndicator('updated_by')}</span></button>
                                        </th>
                                    )}
                                    {showUpdatedAt && (
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400">
                                            <button onClick={() => toggleSort('updated_at')} className="flex items-center gap-1">Updated At <span>{sortIndicator('updated_at')}</span></button>
                                        </th>
                                    )}
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
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                                                (b.aml_status ?? '').toLowerCase() === 'clear' || (b.aml_status ?? '').toLowerCase() === 'passed' || (b.aml_status ?? '').toLowerCase() === 'manually passed'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                    : (b.aml_status ?? '').toLowerCase() === 'review'
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                                    : (b.aml_status ?? '').toLowerCase() === 'hit'
                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                            }`}>
                                                {b.aml_status ? (b.aml_status.split('_').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ')) : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                b.registration_source === 'mobile_app' 
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-350 border border-purple-200 dark:border-purple-800' 
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-350 border border-blue-200 dark:border-blue-800'
                                            }`}>
                                                {b.registration_source === 'mobile_app' ? 'Mobile App' : 'Web'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center space-x-2">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                    b.veriff_status === 'clear' || b.veriff_status === 'passed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-350 border border-emerald-200 dark:border-emerald-800' :
                                                    b.veriff_status === 'review' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-355 border border-amber-200 dark:border-amber-800' :
                                                    b.veriff_status === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-350 border border-blue-200 dark:border-blue-800' :
                                                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-355 border border-slate-200 dark:border-slate-700'
                                                }`}>
                                                    {b.veriff_status ? b.veriff_status.replace('_', ' ') : '-'}
                                                </span>
                                                {b.veriff_pep_sanction_match && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedBeneficiary(b)}
                                                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-teal-600 transition-colors"
                                                        title="View Veriff details"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        {showCreatedBy && <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400">{b.entered_user || b.created_by || '—'}</td>}
                                        {showCreatedAt && <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{b.created_at ? formatDateTime(b.created_at) : '—'}</td>}
                                        {showUpdatedBy && <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400">{b.modified_user || b.updated_by || '—'}</td>}
                                        {showUpdatedAt && <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{b.updated_at ? formatDateTime(b.updated_at) : '—'}</td>}
                                        </tr>
                                    );
                                })}
                                {!loading && pagedBeneficiaries.length === 0 && (
                                    <tr>
                                        <td colSpan={dynamicColSpan} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                            No beneficiaries found.
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
            {selectedBeneficiary && (
                <VeriffDetailsModal
                    isOpen={!!selectedBeneficiary}
                    onClose={() => setSelectedBeneficiary(null)}
                    beneficiaryName={selectedBeneficiary.name}
                    veriffStatus={selectedBeneficiary.veriff_status}
                    veriffSessionId={selectedBeneficiary.veriff_session_id}
                    veriffCheckedAt={selectedBeneficiary.veriff_checked_at}
                    veriffPepSanctionMatch={selectedBeneficiary.veriff_pep_sanction_match}
                />
            )}
        </div>
    );
}
