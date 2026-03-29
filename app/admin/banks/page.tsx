'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { BadgeCheck, Building2, Edit2, PlusCircle, RefreshCw, Save, Trash2, X } from 'lucide-react';

type BankRow = {
    id: number | string;
    name?: string | null;
    country?: string | null;
    country_bank_code?: string | null;
    category?: string | null;
    bank_code?: string | null;
    swift_code?: string | null;
    status?: string | null;
    is_default?: number | string | boolean | null;
};

type SortKey = 'name' | 'country_bank_code' | 'bank_code' | 'swift_code' | 'category' | 'status' | 'is_default';
type SortDir = 'asc' | 'desc';

type BankFormState = {
    name: string;
    country_bank_code: string;
    category: string;
    bank_code: string;
    swift_code: string;
    status: string;
    is_default: number;
};

const CATEGORY_OPTIONS = [
    { value: 'bank', label: 'Bank' },
    { value: 'cash', label: 'Cash Pickup' },
    { value: 'allied', label: 'Allied Bank (legacy)' },
    { value: 'cash_pickup', label: 'Cash Pickup (legacy)' },
];

const STATUS_OPTIONS = ['active', 'inactive'];

const EMPTY_BANK_FORM: BankFormState = {
    name: '',
    country_bank_code: '',
    category: 'bank',
    bank_code: '',
    swift_code: '',
    status: 'active',
    is_default: 0,
};

const COUNTRY_CODE_BY_NAME: Record<string, string> = {
    pakistan: 'PK',
    'united kingdom': 'UK',
    uk: 'UK',
    'great britain': 'UK',
    england: 'UK',
    'sri lanka': 'LK',
    uae: 'AE',
    'united arab emirates': 'AE',
};

const toLabel = (value: string) =>
    CATEGORY_OPTIONS.find((option) => option.value === value)?.label || value || '—';

const normalizeCode = (value: string | null | undefined) => String(value || '').trim().toUpperCase();

const codeFromCountry = (country: string | null | undefined) => {
    const normalized = String(country || '').trim().toLowerCase();
    return COUNTRY_CODE_BY_NAME[normalized] || '';
};

const getCountryBankCode = (bank: BankRow) => normalizeCode(bank.country_bank_code) || codeFromCountry(bank.country);
const isDefaultBank = (value: BankRow['is_default']) => String(value ?? '0') === '1' || value === true;

export default function BanksPage() {
    const [banks, setBanks] = useState<BankRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteBankId, setDeleteBankId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editForm, setEditForm] = useState<BankFormState>(EMPTY_BANK_FORM);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newBank, setNewBank] = useState<BankFormState>(EMPTY_BANK_FORM);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [countryBankCodeFilter, setCountryBankCodeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    useEffect(() => {
        void fetchBanks();
    }, []);

    const fetchBanks = async () => {
        try {
            const res = await fetch(`${ENDPOINTS.BANKS.LIST}?include_blacklisted=yes`);
            if (res.ok) {
                const data = await res.json();
                setBanks(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch banks', error);
        } finally {
            setLoading(false);
        }
    };

    const countryBankCodeOptions = useMemo(() => {
        return Array.from(
            new Set(
                banks
                    .map((bank) => getCountryBankCode(bank))
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b));
    }, [banks]);

    const filteredBanks = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return banks.filter((bank) => {
            const bankCountryCode = getCountryBankCode(bank);
            const matchesQuery = !query || [
                bank.name,
                bankCountryCode,
                bank.bank_code,
                bank.swift_code,
                bank.category,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));

            const matchesCountryBankCode =
                countryBankCodeFilter === 'all' || bankCountryCode === countryBankCodeFilter;
            const matchesCategory = categoryFilter === 'all' || String(bank.category || '') === categoryFilter;
            const matchesStatus = statusFilter === 'all' || String(bank.status || '') === statusFilter;

            return matchesQuery && matchesCountryBankCode && matchesCategory && matchesStatus;
        });
    }, [banks, searchQuery, countryBankCodeFilter, categoryFilter, statusFilter]);

    const sortedBanks = useMemo(() => {
        const rows = [...filteredBanks];
        rows.sort((left, right) => {
            const a = getSortValue(left, sortKey);
            const b = getSortValue(right, sortKey);
            if (a === b) return 0;
            if (sortDir === 'asc') return a > b ? 1 : -1;
            return a < b ? 1 : -1;
        });
        return rows;
    }, [filteredBanks, sortKey, sortDir]);

    const totalRows = sortedBanks.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const pagedBanks = sortedBanks.slice(startIndex, endIndex);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, countryBankCodeFilter, categoryFilter, statusFilter, rowsPerPage, sortKey, sortDir]);

    useEffect(() => {
        if (page !== currentPage) {
            setPage(currentPage);
        }
    }, [page, currentPage]);

    const handleEdit = (bank: BankRow) => {
        setEditingId(bank.id);
        setEditForm({
            name: String(bank.name || ''),
            country_bank_code: getCountryBankCode(bank),
            category: String(bank.category || 'bank'),
            bank_code: normalizeCode(bank.bank_code),
            swift_code: normalizeCode(bank.swift_code),
            status: String(bank.status || 'active'),
            is_default: isDefaultBank(bank.is_default) ? 1 : 0,
        });
    };

    const handleSave = async (id: number) => {
        try {
            const res = await fetch(ENDPOINTS.BANKS.DETAIL(id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalizeForm(editForm)),
            });

            if (res.ok) {
                setEditingId(null);
                await fetchBanks();
            }
        } catch (error) {
            console.error('Failed to update bank', error);
        }
    };

    const handleDelete = async () => {
        if (deleteBankId == null) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(ENDPOINTS.BANKS.DETAIL(deleteBankId), { method: 'DELETE' });
            if (res.ok) {
                await fetchBanks();
                setConfirmModal({
                    isOpen: true,
                    title: 'Deleted',
                    message: 'Bank deleted successfully',
                    type: 'info',
                    isAlert: true,
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to delete bank',
                    type: 'danger',
                    isAlert: true,
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while deleting the bank',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setDeleteLoading(false);
            setDeleteBankId(null);
        }
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(ENDPOINTS.BANKS.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalizeForm(newBank)),
            });

            if (res.ok) {
                setAddModalOpen(false);
                setNewBank(EMPTY_BANK_FORM);
                await fetchBanks();
                setConfirmModal({ isOpen: true, title: 'Success', message: 'Bank added successfully', type: 'info', isAlert: true });
            } else {
                setConfirmModal({ isOpen: true, title: 'Error', message: 'Failed to add bank', type: 'danger', isAlert: true });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({ isOpen: true, title: 'Error', message: 'An error occurred', type: 'danger', isAlert: true });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
            return;
        }

        setSortKey(key);
        setSortDir(key === 'is_default' ? 'desc' : 'asc');
    };

    const sortIndicator = (key: SortKey) => {
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Banks</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage beneficiary banks and pickup networks</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchBanks}
                        className="px-5 py-3 rounded-2xl border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all group"
                    >
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </span>
                    </button>
                    <button
                        onClick={() => setAddModalOpen(true)}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Add Bank</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Search</label>
                    <input
                        className="input-glass w-full"
                        placeholder="Search bank, country code, bank code, or SWIFT"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Country Bank Code</label>
                    <select
                        className="input-glass w-full"
                        value={countryBankCodeFilter}
                        onChange={(e) => setCountryBankCodeFilter(e.target.value)}
                    >
                        <option value="all">All</option>
                        {countryBankCodeOptions.map((code) => (
                            <option key={code} value={code}>{code}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Category</label>
                    <select
                        className="input-glass w-full"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">All</option>
                        {CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Status</label>
                    <select
                        className="input-glass w-full"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All</option>
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700/50 flex items-center space-x-3">
                    <Building2 className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bank Directory</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Showing {totalRows} of {banks.length}
                        </p>
                    </div>
                </div>
                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading banks...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                                            <span>Bank</span>
                                            <span>{sortIndicator('name')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('country_bank_code')} className="flex items-center gap-1">
                                            <span>Country Bank Code</span>
                                            <span>{sortIndicator('country_bank_code')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('bank_code')} className="flex items-center gap-1">
                                            <span>Bank Code</span>
                                            <span>{sortIndicator('bank_code')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('swift_code')} className="flex items-center gap-1">
                                            <span>SWIFT</span>
                                            <span>{sortIndicator('swift_code')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('category')} className="flex items-center gap-1">
                                            <span>Category</span>
                                            <span>{sortIndicator('category')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('status')} className="flex items-center gap-1">
                                            <span>Status</span>
                                            <span>{sortIndicator('status')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('is_default')} className="mx-auto flex items-center gap-1">
                                            <span>Default</span>
                                            <span>{sortIndicator('is_default')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedBanks.map((bank, idx) => (
                                    <tr key={bank.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 font-medium">
                                            {startIndex + idx + 1}
                                        </td>
                                        <td className="px-8 py-5 font-bold text-slate-900 dark:text-white min-w-[240px]">
                                            {editingId === bank.id ? (
                                                <input
                                                    className="input-glass py-1 px-3 w-full"
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold ring-2 ring-white dark:ring-slate-800">
                                                        {String(bank.name || '').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span>{bank.name}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                            {editingId === bank.id ? (
                                                <input
                                                    className="input-glass py-1 px-3 w-24 uppercase"
                                                    value={editForm.country_bank_code}
                                                    maxLength={20}
                                                    onChange={(e) => setEditForm({ ...editForm, country_bank_code: e.target.value.toUpperCase() })}
                                                />
                                            ) : (
                                                getCountryBankCode(bank) || '—'
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                            {editingId === bank.id ? (
                                                <input
                                                    className="input-glass py-1 px-3 w-28 uppercase"
                                                    value={editForm.bank_code}
                                                    maxLength={50}
                                                    onChange={(e) => setEditForm({ ...editForm, bank_code: e.target.value.toUpperCase() })}
                                                />
                                            ) : (
                                                normalizeCode(bank.bank_code) || '—'
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                            {editingId === bank.id ? (
                                                <input
                                                    className="input-glass py-1 px-3 w-36 uppercase"
                                                    value={editForm.swift_code}
                                                    maxLength={50}
                                                    onChange={(e) => setEditForm({ ...editForm, swift_code: e.target.value.toUpperCase() })}
                                                />
                                            ) : (
                                                normalizeCode(bank.swift_code) || '—'
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                            {editingId === bank.id ? (
                                                <select className="input-glass py-1 px-3 w-44" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                                                    {CATEGORY_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                    ))}
                                                </select>
                                            ) : toLabel(String(bank.category || ''))}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                            {editingId === bank.id ? (
                                                <select className="input-glass py-1 px-3 w-28" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                                                    {STATUS_OPTIONS.map((option) => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className={`badge-glass ${String(bank.status || 'inactive') === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    {bank.status || 'inactive'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {editingId === bank.id ? (
                                                <label className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(editForm.is_default)}
                                                        onChange={(e) => setEditForm({ ...editForm, is_default: e.target.checked ? 1 : 0 })}
                                                    />
                                                    Default
                                                </label>
                                            ) : (
                                                isDefaultBank(bank.is_default) ? <BadgeCheck className="w-5 h-5 text-emerald-500 inline" /> : <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {editingId === bank.id ? (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button onClick={() => void handleSave(Number(bank.id))} className="p-2 rounded-xl bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button onClick={() => handleEdit(bank)} className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all">
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => setDeleteBankId(Number(bank.id))} className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
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
                        <div className="relative input-icon">
                            <select
                                className="input-glass px-3 py-1.5 text-sm pr-8"
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <button
                            onClick={() => setPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-full glass-effect text-slate-600 dark:text-slate-200 disabled:opacity-40"
                        >
                            Prev
                        </button>
                        <span className="text-slate-400 dark:text-slate-300">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-full glass-effect text-slate-600 dark:text-slate-200 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Bank">
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Bank Name</label>
                        <input className="input-glass w-full" value={newBank.name} onChange={(e) => setNewBank({ ...newBank, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Country Bank Code</label>
                            <input className="input-glass w-full uppercase" value={newBank.country_bank_code} onChange={(e) => setNewBank({ ...newBank, country_bank_code: e.target.value.toUpperCase() })} placeholder="PK" maxLength={20} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Bank Code</label>
                            <input className="input-glass w-full uppercase" value={newBank.bank_code} onChange={(e) => setNewBank({ ...newBank, bank_code: e.target.value.toUpperCase() })} placeholder="ABLPKKAXXX" maxLength={50} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">SWIFT Code</label>
                            <input className="input-glass w-full uppercase" value={newBank.swift_code} onChange={(e) => setNewBank({ ...newBank, swift_code: e.target.value.toUpperCase() })} placeholder="ABPAPKKA" maxLength={50} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Category</label>
                            <select className="input-glass w-full" value={newBank.category} onChange={(e) => setNewBank({ ...newBank, category: e.target.value })}>
                                {CATEGORY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Status</label>
                            <select className="input-glass w-full" value={newBank.status} onChange={(e) => setNewBank({ ...newBank, status: e.target.value })}>
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-7">
                            <input
                                type="checkbox"
                                checked={Boolean(newBank.is_default)}
                                onChange={(e) => setNewBank({ ...newBank, is_default: e.target.checked ? 1 : 0 })}
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-300">Set as default</span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setAddModalOpen(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Bank'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />

            <ConfirmModal
                isOpen={deleteBankId !== null}
                title="Delete bank"
                message="This will permanently remove the bank from the directory. Continue?"
                type="danger"
                confirmText="Delete"
                loading={deleteLoading}
                onClose={() => {
                    if (deleteLoading) return;
                    setDeleteBankId(null);
                }}
                onConfirm={handleDelete}
            />
        </div>
    );
}

function normalizeForm(form: BankFormState): BankFormState {
    return {
        ...form,
        name: form.name.trim(),
        country_bank_code: normalizeCode(form.country_bank_code),
        bank_code: normalizeCode(form.bank_code),
        swift_code: normalizeCode(form.swift_code),
    };
}

function getSortValue(bank: BankRow, key: SortKey): string | number {
    switch (key) {
        case 'country_bank_code':
            return getCountryBankCode(bank);
        case 'bank_code':
            return normalizeCode(bank.bank_code);
        case 'swift_code':
            return normalizeCode(bank.swift_code);
        case 'is_default':
            return isDefaultBank(bank.is_default) ? 1 : 0;
        default:
            return String(bank[key] || '').toLowerCase();
    }
}
