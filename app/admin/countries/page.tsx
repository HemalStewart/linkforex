'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Edit2, Globe, PlusCircle, RefreshCw, Save, ShieldAlert, Trash2, X } from 'lucide-react';

type YesNo = 'yes' | 'no';
type Status = 'active' | 'inactive';

type CountryRow = {
    id: number | string;
    name?: string | null;
    iso_code?: string | null;
    phone_code?: string | null;
    currency_code?: string | null;
    currency_symbol?: string | null;
    currency_name?: string | null;
    high_risk_country?: YesNo | null;
    black_list_country?: YesNo | null;
    payout_currency?: YesNo | null;
    status?: Status | null;
};

type CountryFormState = {
    name: string;
    iso_code: string;
    phone_code: string;
    high_risk_country: YesNo;
    black_list_country: YesNo;
    currency_code: string;
    currency_symbol: string;
    currency_name: string;
    payout_currency: YesNo;
    status: Status;
};

type SortKey =
    | 'phone_code'
    | 'name'
    | 'high_risk_country'
    | 'black_list_country'
    | 'currency_code'
    | 'currency_symbol'
    | 'currency_name'
    | 'payout_currency';

type SortDir = 'asc' | 'desc';

const EMPTY_FORM: CountryFormState = {
    name: '',
    iso_code: '',
    phone_code: '',
    high_risk_country: 'no',
    black_list_country: 'no',
    currency_code: '',
    currency_symbol: '',
    currency_name: '',
    payout_currency: 'no',
    status: 'active',
};

const YES_NO_OPTIONS: YesNo[] = ['yes', 'no'];
const STATUS_OPTIONS: Status[] = ['active', 'inactive'];

const yesNoClass = (value: YesNo) =>
    value === 'yes'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300';

export default function CountriesPage() {
    const [countries, setCountries] = useState<CountryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [highRiskFilter, setHighRiskFilter] = useState<'all' | YesNo>('all');
    const [blackListFilter, setBlackListFilter] = useState<'all' | YesNo>('all');
    const [payoutFilter, setPayoutFilter] = useState<'all' | YesNo>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [form, setForm] = useState<CountryFormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [deleteCountryId, setDeleteCountryId] = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
    });

    useEffect(() => {
        void fetchCountries();
    }, []);

    const fetchCountries = async () => {
        try {
            const res = await fetch(ENDPOINTS.COUNTRIES.LIST);
            if (res.ok) {
                const data = await res.json();
                setCountries(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch countries', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCountries = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return countries.filter((country) => {
            const matchesQuery = !query || [
                country.name,
                country.iso_code,
                country.phone_code,
                country.currency_code,
                country.currency_symbol,
                country.currency_name,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));

            const matchesHighRisk = highRiskFilter === 'all' || normalizeYesNo(country.high_risk_country) === highRiskFilter;
            const matchesBlackList = blackListFilter === 'all' || normalizeYesNo(country.black_list_country) === blackListFilter;
            const matchesPayout = payoutFilter === 'all' || normalizeYesNo(country.payout_currency) === payoutFilter;
            const matchesStatus = statusFilter === 'all' || normalizeStatus(country.status) === statusFilter;

            return matchesQuery && matchesHighRisk && matchesBlackList && matchesPayout && matchesStatus;
        });
    }, [countries, searchQuery, highRiskFilter, blackListFilter, payoutFilter, statusFilter]);

    const sortedCountries = useMemo(() => {
        const rows = [...filteredCountries];
        rows.sort((left, right) => {
            const a = getSortValue(left, sortKey);
            const b = getSortValue(right, sortKey);
            if (a === b) return 0;
            if (sortDir === 'asc') return a > b ? 1 : -1;
            return a < b ? 1 : -1;
        });
        return rows;
    }, [filteredCountries, sortKey, sortDir]);

    const totalRows = sortedCountries.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const pagedCountries = sortedCountries.slice(startIndex, endIndex);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, highRiskFilter, blackListFilter, payoutFilter, statusFilter, rowsPerPage, sortKey, sortDir]);

    useEffect(() => {
        if (page !== currentPage) {
            setPage(currentPage);
        }
    }, [page, currentPage]);

    const openAddModal = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEditModal = (country: CountryRow) => {
        setEditingId(country.id);
        setForm({
            name: String(country.name || ''),
            iso_code: String(country.iso_code || ''),
            phone_code: String(country.phone_code || ''),
            high_risk_country: normalizeYesNo(country.high_risk_country),
            black_list_country: normalizeYesNo(country.black_list_country),
            currency_code: String(country.currency_code || ''),
            currency_symbol: String(country.currency_symbol || ''),
            currency_name: String(country.currency_name || ''),
            payout_currency: normalizeYesNo(country.payout_currency),
            status: normalizeStatus(country.status),
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = normalizeForm(form);

        try {
            const endpoint = editingId == null ? ENDPOINTS.COUNTRIES.LIST : ENDPOINTS.COUNTRIES.DETAIL(editingId);
            const method = editingId == null ? 'POST' : 'PUT';
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setModalOpen(false);
                setForm(EMPTY_FORM);
                setEditingId(null);
                await fetchCountries();
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: editingId == null ? 'Country added successfully.' : 'Country updated successfully.',
                    type: 'info',
                    isAlert: true,
                });
            } else {
                const error = await readErrorMessage(res, 'Failed to save country.');
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: error,
                    type: 'danger',
                    isAlert: true,
                });
            }
        } catch (error) {
            console.error('Failed to save country', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while saving the country.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (deleteCountryId == null) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(ENDPOINTS.COUNTRIES.DETAIL(deleteCountryId), { method: 'DELETE' });
            if (res.ok) {
                await fetchCountries();
                setConfirmModal({
                    isOpen: true,
                    title: 'Deleted',
                    message: 'Country deleted successfully.',
                    type: 'info',
                    isAlert: true,
                });
            } else {
                const error = await readErrorMessage(res, 'Failed to delete country.');
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: error,
                    type: 'danger',
                    isAlert: true,
                });
            }
        } catch (error) {
            console.error('Failed to delete country', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while deleting the country.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setDeleteLoading(false);
            setDeleteCountryId(null);
        }
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
            return;
        }

        setSortKey(key);
        setSortDir('asc');
    };

    const sortIndicator = (key: SortKey) => {
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Countries</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Maintain the master country directory used by currency and payout flows.
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchCountries}
                        className="px-5 py-3 rounded-2xl border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all group"
                    >
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </span>
                    </button>
                    <button
                        onClick={openAddModal}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Add Country</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Search</label>
                    <input
                        className="input-glass w-full"
                        placeholder="Search country, code, currency, or symbol"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <FlagFilter label="High Risk" value={highRiskFilter} onChange={setHighRiskFilter} />
                <FlagFilter label="Black List" value={blackListFilter} onChange={setBlackListFilter} />
                <FlagFilter label="Payout Currency" value={payoutFilter} onChange={setPayoutFilter} />
                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Status</label>
                    <select
                        className="input-glass w-full"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | Status)}
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
                    <Globe className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Country Directory</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Showing {totalRows} of {countries.length}
                        </p>
                    </div>
                </div>
                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading countries...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('phone_code')} className="flex items-center gap-1">
                                            <span>Country Code</span>
                                            <span>{sortIndicator('phone_code')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                                            <span>Country Name</span>
                                            <span>{sortIndicator('name')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('high_risk_country')} className="flex items-center gap-1">
                                            <span>High Risk Country</span>
                                            <span>{sortIndicator('high_risk_country')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('black_list_country')} className="flex items-center gap-1">
                                            <span>Black List Country</span>
                                            <span>{sortIndicator('black_list_country')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('currency_code')} className="flex items-center gap-1">
                                            <span>Currency Code</span>
                                            <span>{sortIndicator('currency_code')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('currency_symbol')} className="flex items-center gap-1">
                                            <span>Symbol</span>
                                            <span>{sortIndicator('currency_symbol')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('currency_name')} className="flex items-center gap-1">
                                            <span>Currency Name</span>
                                            <span>{sortIndicator('currency_name')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('payout_currency')} className="flex items-center gap-1">
                                            <span>Payout Currency</span>
                                            <span>{sortIndicator('payout_currency')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedCountries.map((country, idx) => (
                                    <tr key={country.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                        <td className="px-8 py-5 text-sm font-mono text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                            {country.phone_code || '—'}
                                        </td>
                                        <td className="px-8 py-5 font-bold text-slate-900 dark:text-white min-w-[220px]">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold ring-2 ring-white dark:ring-slate-800">
                                                    {String(country.iso_code || '').substring(0, 2).toUpperCase() || '??'}
                                                </div>
                                                <div>
                                                    <div>{country.name}</div>
                                                    <div className="text-xs font-mono text-slate-400 dark:text-slate-500">
                                                        {country.iso_code || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm whitespace-nowrap">
                                            <span className={`badge-glass ${yesNoClass(normalizeYesNo(country.high_risk_country))}`}>
                                                {normalizeYesNo(country.high_risk_country)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm whitespace-nowrap">
                                            <span className={`badge-glass ${yesNoClass(normalizeYesNo(country.black_list_country))}`}>
                                                {normalizeYesNo(country.black_list_country)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-mono text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                            {country.currency_code || '—'}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                            {country.currency_symbol || '—'}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 min-w-[220px]">
                                            {country.currency_name || '—'}
                                        </td>
                                        <td className="px-8 py-5 text-sm whitespace-nowrap">
                                            <span className={`badge-glass ${yesNoClass(normalizeYesNo(country.payout_currency))}`}>
                                                {normalizeYesNo(country.payout_currency)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button onClick={() => openEditModal(country)} className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all">
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => setDeleteCountryId(Number(country.id))} className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && pagedCountries.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-8 py-12 text-center text-slate-500 dark:text-slate-400">
                                            No countries found for the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-slate-100/70 dark:border-slate-700/60">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-slate-400 dark:text-slate-300">Rows per page</span>
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

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId == null ? 'Add Country' : 'Edit Country'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Country Name</label>
                            <input className="input-glass w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">ISO Code</label>
                            <input className="input-glass w-full uppercase" value={form.iso_code} onChange={(e) => setForm({ ...form, iso_code: e.target.value.toUpperCase() })} maxLength={3} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Country Code</label>
                            <input className="input-glass w-full" value={form.phone_code} onChange={(e) => setForm({ ...form, phone_code: e.target.value.replace(/\D+/g, '') })} maxLength={4} placeholder="44" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Status</label>
                            <select className="input-glass w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Currency Code</label>
                            <input className="input-glass w-full uppercase" value={form.currency_code} onChange={(e) => setForm({ ...form, currency_code: e.target.value.toUpperCase() })} maxLength={10} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Symbol</label>
                            <input className="input-glass w-full" value={form.currency_symbol} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} maxLength={10} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Currency Name</label>
                            <input className="input-glass w-full" value={form.currency_name} onChange={(e) => setForm({ ...form, currency_name: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">High Risk Country</label>
                            <select className="input-glass w-full" value={form.high_risk_country} onChange={(e) => setForm({ ...form, high_risk_country: e.target.value as YesNo })}>
                                {YES_NO_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Black List Country</label>
                            <select className="input-glass w-full" value={form.black_list_country} onChange={(e) => setForm({ ...form, black_list_country: e.target.value as YesNo })}>
                                {YES_NO_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Payout Currency</label>
                            <select className="input-glass w-full" value={form.payout_currency} onChange={(e) => setForm({ ...form, payout_currency: e.target.value as YesNo })}>
                                {YES_NO_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? (
                                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Saving...</span>
                            ) : (
                                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Country</span>
                            )}
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
                isOpen={deleteCountryId !== null}
                title="Delete country"
                message="This will remove the country from the master table. Continue?"
                type="danger"
                confirmText="Delete"
                loading={deleteLoading}
                onClose={() => {
                    if (deleteLoading) return;
                    setDeleteCountryId(null);
                }}
                onConfirm={handleDelete}
            />
        </div>
    );
}

function normalizeYesNo(value: CountryRow['high_risk_country']): YesNo {
    return String(value || '').toLowerCase() === 'yes' ? 'yes' : 'no';
}

function normalizeStatus(value: CountryRow['status']): Status {
    return String(value || '').toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

function normalizeForm(form: CountryFormState): CountryFormState {
    return {
        ...form,
        name: form.name.trim(),
        iso_code: form.iso_code.trim().toUpperCase(),
        phone_code: form.phone_code.replace(/\D+/g, ''),
        currency_code: form.currency_code.trim().toUpperCase(),
        currency_symbol: form.currency_symbol.trim(),
        currency_name: form.currency_name.trim(),
    };
}

function getSortValue(country: CountryRow, key: SortKey): string {
    switch (key) {
        case 'phone_code':
            return String(country.phone_code || '');
        case 'high_risk_country':
            return normalizeYesNo(country.high_risk_country);
        case 'black_list_country':
            return normalizeYesNo(country.black_list_country);
        case 'payout_currency':
            return normalizeYesNo(country.payout_currency);
        default:
            return String(country[key] || '').toLowerCase();
    }
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
        const data = await res.json();
        if (typeof data?.message === 'string' && data.message.trim() !== '') {
            return data.message;
        }
        if (data?.messages && typeof data.messages === 'object') {
            const joined = Object.values(data.messages)
                .flat()
                .filter(Boolean)
                .join(' ');
            if (joined) return joined;
        }
    } catch {
        // Ignore JSON parsing issues and fall back to a generic message.
    }
    return fallback;
}

function FlagFilter({
    label,
    value,
    onChange,
}: {
    label: string;
    value: 'all' | YesNo;
    onChange: (value: 'all' | YesNo) => void;
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">{label}</label>
            <div className="relative">
                <ShieldAlert className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                    className="input-glass w-full pl-10"
                    value={value}
                    onChange={(e) => onChange(e.target.value as 'all' | YesNo)}
                >
                    <option value="all">All</option>
                    {YES_NO_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
