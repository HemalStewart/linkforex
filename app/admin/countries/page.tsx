'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { isPrivilegedUser } from '@/app/lib/permissions';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Edit2, Globe, PlusCircle, RefreshCw, Save, Search, ShieldAlert, Trash2 } from 'lucide-react';
import ToggleSwitch from '../components/ToggleSwitch';

type YesNo = 'yes' | 'no';

type CountryRow = {
    id: number | string;
    name?: string | null;
    iso_code?: string | null;
    currency_code?: string | null;
    currency_symbol?: string | null;
    currency_name?: string | null;
    high_risk_country?: YesNo | null;
    black_list_country?: YesNo | null;
    payout_currency?: YesNo | null;
};

type CountryFormState = {
    name: string;
    iso_code: string;
    high_risk_country: YesNo;
    black_list_country: YesNo;
    currency_code: string;
    currency_symbol: string;
    currency_name: string;
    payout_currency: YesNo;
};

type SortKey =
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
    high_risk_country: 'no',
    black_list_country: 'no',
    currency_code: '',
    currency_symbol: '',
    currency_name: '',
    payout_currency: 'no',
};

const YES_NO_OPTIONS: YesNo[] = ['yes', 'no'];

export default function CountriesPage() {
    const [countries, setCountries] = useState<CountryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [highRiskFilter, setHighRiskFilter] = useState<'all' | YesNo>('all');
    const [blackListFilter, setBlackListFilter] = useState<'all' | YesNo>('all');
    const [payoutFilter, setPayoutFilter] = useState<'all' | YesNo>('all');
    const [canDeleteCountry, setCanDeleteCountry] = useState(false);
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

    useEffect(() => {
        let ignore = false;

        const resolveDeletePermission = async () => {
            try {
                const user = getStoredUser<{ role?: string | null; username?: string | null; email?: string | null; name?: string | null; system_defined?: string | null }>();
                if (!user) {
                    if (!ignore) setCanDeleteCountry(false);
                    return;
                }

                if (isPrivilegedUser(user)) {
                    if (!ignore) setCanDeleteCountry(true);
                    return;
                }

                const roleName = String(user.role || '').trim().toLowerCase();
                if (!roleName) {
                    if (!ignore) setCanDeleteCountry(false);
                    return;
                }

                const response = await fetch(ENDPOINTS.PERMISSION_GROUPS.LIST);
                if (!response.ok) {
                    if (!ignore) setCanDeleteCountry(false);
                    return;
                }

                const data = await response.json();
                const allowed = Array.isArray(data) && data.some((row) => {
                    const role = String(row?.role_name || '').trim().toLowerCase();
                    const section = String(row?.page_section || '').trim().toUpperCase();
                    const operation = String(row?.operation || '').trim().toUpperCase();
                    const active = String(row?.active || '').trim().toLowerCase();
                    if (role !== roleName) return false;
                    if (active !== 'yes') return false;
                    if (operation !== 'DELETE') return false;
                    return section === 'COUNTRY' || section === 'COUNTRIES' || section === 'COUNTRY_MASTER';
                });

                if (!ignore) {
                    setCanDeleteCountry(allowed);
                }
            } catch {
                if (!ignore) setCanDeleteCountry(false);
            }
        };

        void resolveDeletePermission();

        return () => {
            ignore = true;
        };
    }, []);

    const fetchCountries = async () => {
        try {
            const res = await fetch(`${ENDPOINTS.COUNTRIES.LIST}?include_blacklisted=yes`);
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
                country.currency_code,
                country.currency_symbol,
                country.currency_name,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));

            const matchesHighRisk = highRiskFilter === 'all' || normalizeYesNo(country.high_risk_country) === highRiskFilter;
            const matchesBlackList = blackListFilter === 'all' || normalizeYesNo(country.black_list_country) === blackListFilter;
            const matchesPayout = payoutFilter === 'all' || normalizeYesNo(country.payout_currency) === payoutFilter;

            return matchesQuery && matchesHighRisk && matchesBlackList && matchesPayout;
        });
    }, [countries, searchQuery, highRiskFilter, blackListFilter, payoutFilter]);

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
    }, [searchQuery, highRiskFilter, blackListFilter, payoutFilter, rowsPerPage, sortKey, sortDir]);

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
            high_risk_country: normalizeYesNo(country.high_risk_country),
            black_list_country: normalizeYesNo(country.black_list_country),
            currency_code: String(country.currency_code || ''),
            currency_symbol: String(country.currency_symbol || ''),
            currency_name: String(country.currency_name || ''),
            payout_currency: normalizeYesNo(country.payout_currency),
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
        if (!canDeleteCountry) {
            setConfirmModal({
                isOpen: true,
                title: 'Permission denied',
                message: 'You do not have permission to delete countries.',
                type: 'warning',
                isAlert: true,
            });
            setDeleteCountryId(null);
            return;
        }
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
        return <SortIndicator active={sortKey === key} dir={sortDir} />;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Countries</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Maintain the master country directory. Currency fields are controlled independently, while payout availability is driven only by the payout currency flag.
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

            <div className="card-glass p-5">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-5">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                className="input-glass w-full text-sm"
                                placeholder="Country, alpha-2, code, currency, symbol"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="xl:col-span-2">
                        <FlagFilter label="High Risk" value={highRiskFilter} onChange={setHighRiskFilter} />
                    </div>
                    <div className="xl:col-span-2">
                        <FlagFilter label="Black List" value={blackListFilter} onChange={setBlackListFilter} />
                    </div>
                    <div className="xl:col-span-3">
                        <FlagFilter label="Payout Currency" value={payoutFilter} onChange={setPayoutFilter} />
                    </div>
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
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">#</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">Actions</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                                        <span>Country Code</span>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                                            <span>Country Name</span>
                                            <span>{sortIndicator('name')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                                        <button onClick={() => toggleSort('high_risk_country')} className="flex items-center gap-1">
                                            <span>High Risk Country</span>
                                            <span>{sortIndicator('high_risk_country')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                                        <button onClick={() => toggleSort('black_list_country')} className="flex items-center gap-1">
                                            <span>Black List Country</span>
                                            <span>{sortIndicator('black_list_country')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                                        <button onClick={() => toggleSort('currency_code')} className="flex items-center gap-1">
                                            <span>Currency Code</span>
                                            <span>{sortIndicator('currency_code')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                                        <button onClick={() => toggleSort('currency_symbol')} className="flex items-center gap-1">
                                            <span>Symbol</span>
                                            <span>{sortIndicator('currency_symbol')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                                        <button onClick={() => toggleSort('currency_name')} className="flex items-center gap-1">
                                            <span>Currency Name</span>
                                            <span>{sortIndicator('currency_name')}</span>
                                        </button>
                                    </th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                                        <button onClick={() => toggleSort('payout_currency')} className="flex items-center gap-1">
                                            <span>Payout Currency</span>
                                            <span>{sortIndicator('payout_currency')}</span>
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedCountries.map((country, idx) => (
                                    <tr key={country.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button onClick={() => openEditModal(country)} className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all" title="Edit country">
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteCountryId(Number(country.id))}
                                                    disabled={!canDeleteCountry}
                                                    title={canDeleteCountry ? 'Delete country' : 'Delete permission required'}
                                                    className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-mono text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                            {String(country.iso_code || '').toUpperCase() || '—'}
                                        </td>
                                        <td className="px-8 py-5 font-bold text-slate-900 dark:text-white min-w-[220px]">
                                            {country.name || '—'}
                                        </td>
                                        <td className="px-8 py-5 text-sm whitespace-nowrap">
                                            <Badge type={normalizeYesNo(country.high_risk_country) === 'yes' ? 'yes' : 'no'} className="min-w-[58px] justify-center">
                                                {toYesNoLabel(normalizeYesNo(country.high_risk_country))}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-5 text-sm whitespace-nowrap">
                                            <Badge type={normalizeYesNo(country.black_list_country) === 'yes' ? 'yes' : 'no'} className="min-w-[58px] justify-center">
                                                {toYesNoLabel(normalizeYesNo(country.black_list_country))}
                                            </Badge>
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
                                            <Badge type={normalizeYesNo(country.payout_currency) === 'yes' ? 'yes' : 'no'} className="min-w-[58px] justify-center">
                                                {toYesNoLabel(normalizeYesNo(country.payout_currency))}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && pagedCountries.length === 0 && (
                                    <tr>
                                        <td colSpan={11} className="px-8 py-12 text-center text-slate-500 dark:text-slate-400">
                                            No countries found for the current filters.
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
                    onRowsPerPageChange={(rows) => {
                        setRowsPerPage(rows);
                        setPage(1);
                    }}
                />
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId == null ? 'Add Country' : 'Edit Country'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Country Name</label>
                            <input className="input-glass w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Country Code (Alpha-2)</label>
                            <input className="input-glass w-full uppercase" value={form.iso_code} onChange={(e) => setForm({ ...form, iso_code: e.target.value.toUpperCase() })} maxLength={2} required />
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
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300"></label>
                            {/* <select className="input-glass w-full" value={form.high_risk_country} onChange={(e) => setForm({ ...form, high_risk_country: e.target.value as YesNo })}>
                                {YES_NO_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{toYesNoLabel(option)}</option>
                                ))}
                            </select> */}
                            <ToggleSwitch
                                label="High Risk Country"
                                value={form.high_risk_country}
                                onChange={(value) => setForm({ ...form, high_risk_country: value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300"></label>
                            {/* <select className="input-glass w-full" value={form.black_list_country} onChange={(e) => setForm({ ...form, black_list_country: e.target.value as YesNo })}>
                                {YES_NO_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{toYesNoLabel(option)}</option>
                                ))}
                            </select> */}
                            <ToggleSwitch
                                label="Black List Country"
                                value={form.black_list_country}
                                onChange={(value) => setForm({ ...form, black_list_country: value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300"></label>
                            {/* <select className="input-glass w-full" value={form.payout_currency} onChange={(e) => setForm({ ...form, payout_currency: e.target.value as YesNo })}>
                                {YES_NO_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{toYesNoLabel(option)}</option>
                                ))}
                            </select> */}
                            <ToggleSwitch
                                label="Payout Currency"
                                value={form.payout_currency}
                                onChange={(value) => setForm({ ...form, payout_currency: value })}
                            />
                        </div>
                    </div>
                    <div className="dialog-actions pt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                        <button type="submit" className="btn-primary glass-effect hover-lift text-sm disabled:opacity-60" disabled={submitting}>
                            {submitting ? (
                                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Saving...</span>
                            ) : (
                                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save</span>
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

function normalizeForm(form: CountryFormState): CountryFormState {
    return {
        ...form,
        name: form.name.trim(),
        iso_code: form.iso_code.trim().toUpperCase().slice(0, 2),
        currency_code: form.currency_code.trim().toUpperCase(),
        currency_symbol: form.currency_symbol.trim(),
        currency_name: form.currency_name.trim(),
    };
}

function getSortValue(country: CountryRow, key: SortKey): string {
    switch (key) {
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
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <ShieldAlert className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                    className="input-glass w-full pl-10"
                    value={value}
                    onChange={(e) => onChange(e.target.value as 'all' | YesNo)}
                >
                    <option value="all">All</option>
                    {YES_NO_OPTIONS.map((option) => (
                        <option key={option} value={option}>{toYesNoLabel(option)}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function toYesNoLabel(value: YesNo): string {
    return value === 'yes' ? 'Yes' : 'No';
}
