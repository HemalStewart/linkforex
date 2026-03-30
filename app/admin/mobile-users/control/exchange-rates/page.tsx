'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '@/app/admin/components/Modal';
import ConfirmModal from '@/app/admin/components/ConfirmModal';
import type { MobileExchangeRate } from '../_shared';
import { Coins, Edit2, PlusCircle, RefreshCcw, Save, Search, Trash2 } from 'lucide-react';

type YesNo = 'yes' | 'no';
type SortKey =
    | 'display_order'
    | 'code'
    | 'name'
    | 'source_branch_code'
    | 'rate'
    | 'visible_in_app'
    | 'show_on_home'
    | 'default_for_transfer';
type SortDir = 'asc' | 'desc';

type CurrencyOption = {
    id: number | string;
    code: string;
    name: string;
    symbol?: string | null;
    status?: string | null;
};

type BranchOption = {
    id: number | string;
    code: string;
    name: string;
    status?: string | null;
};

type CountryOption = {
    id: number | string;
    name?: string | null;
    currency_code?: string | null;
    currency_name?: string | null;
    currency_symbol?: string | null;
    payout_currency?: string | null;
    black_list_country?: string | null;
    status?: string | null;
};

type FormState = {
    currency_code: string;
    source_branch_code: string;
    visible_in_app: YesNo;
    show_on_home: YesNo;
    default_for_transfer: YesNo;
    display_order: string;
};

const EMPTY_FORM: FormState = {
    currency_code: '',
    source_branch_code: '',
    visible_in_app: 'yes',
    show_on_home: 'yes',
    default_for_transfer: 'no',
    display_order: '10',
};

const yesNoBadgeClass = (value: YesNo) =>
    value === 'yes'
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300';

export default function MobileExchangeRatesPage() {
    const [rows, setRows] = useState<MobileExchangeRate[]>([]);
    const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('display_order');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<MobileExchangeRate | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ratesRes, currenciesRes, branchesRes, countriesRes] = await Promise.all([
                fetch(ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATES),
                fetch(`${ENDPOINTS.CURRENCIES.LIST}?status=active`),
                fetch(`${ENDPOINTS.BRANCHES.LIST}?status=active`),
                fetch(`${ENDPOINTS.COUNTRIES.LIST}?status=active&payout_currency=yes&sort=name&dir=asc`),
            ]);

            const ratesData = ratesRes.ok ? await ratesRes.json() : [];
            const currenciesData = currenciesRes.ok ? await currenciesRes.json() : [];
            const branchesData = branchesRes.ok ? await branchesRes.json() : [];
            const countriesData = countriesRes.ok ? await countriesRes.json() : [];
            const legacyCurrencyMap = new Map<string, CurrencyOption>();
            (Array.isArray(currenciesData) ? currenciesData : []).forEach((currency: CurrencyOption) => {
                const code = String(currency.code || '').trim().toUpperCase();
                if (!code) {
                    return;
                }
                legacyCurrencyMap.set(code, {
                    ...currency,
                    code,
                });
            });

            const payoutCurrencies = new Map<string, CurrencyOption>();
            (Array.isArray(countriesData) ? countriesData : []).forEach((country: CountryOption) => {
                if (String(country.payout_currency || '').trim().toLowerCase() !== 'yes') {
                    return;
                }

                const code = String(country.currency_code || '').trim().toUpperCase();
                if (!code || payoutCurrencies.has(code)) {
                    return;
                }

                const legacyCurrency = legacyCurrencyMap.get(code);
                payoutCurrencies.set(code, {
                    id: legacyCurrency?.id || code,
                    code,
                    name: legacyCurrency?.name || String(country.currency_name || '').trim() || code,
                    symbol: legacyCurrency?.symbol || String(country.currency_symbol || '').trim() || null,
                    status: legacyCurrency?.status || 'active',
                });
            });
            const filteredCurrencies = Array.from(payoutCurrencies.values()).sort((left, right) =>
                `${left.code} ${left.name}`.localeCompare(`${right.code} ${right.name}`)
            );

            setRows(
                (Array.isArray(ratesData) ? ratesData : []).filter((row: MobileExchangeRate) =>
                    String(row.payout_enabled || '').trim().toLowerCase() !== 'no'
                )
            );
            setCurrencies(filteredCurrencies);
            setBranches(Array.isArray(branchesData) ? branchesData : []);
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

    useEffect(() => {
        setPage(1);
    }, [searchQuery, sortKey, sortDir, rowsPerPage]);

    const filteredRows = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return rows;

        return rows.filter((row) =>
            [
                row.code,
                row.name,
                row.currency_name,
                row.symbol,
                row.source_branch_code,
                row.source_branch_name,
                row.rate,
                row.visible_in_app,
                row.show_on_home,
                row.default_for_transfer,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [rows, searchQuery]);

    const sortedRows = useMemo(() => {
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        return [...filteredRows].sort((left, right) => {
            const leftValue = String(left[sortKey] ?? '');
            const rightValue = String(right[sortKey] ?? '');
            const result = collator.compare(leftValue, rightValue);
            return sortDir === 'asc' ? result : -result;
        });
    }, [filteredRows, sortKey, sortDir]);

    const totalRows = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const pagedRows = sortedRows.slice(startIndex, endIndex);

    useEffect(() => {
        if (currentPage !== page) {
            setPage(currentPage);
        }
    }, [currentPage, page]);

    const configuredCurrencyCodes = useMemo(
        () => new Set(rows.map((row) => row.currency_code || row.code).filter(Boolean)),
        [rows]
    );

    const availableCurrencies = useMemo(() => {
        const currentCode = editingId == null ? '' : form.currency_code;
        return currencies.filter((currency) => {
            const code = String(currency.code || '').toUpperCase();
            return code === currentCode || !configuredCurrencyCodes.has(code);
        });
    }, [currencies, configuredCurrencyCodes, editingId, form.currency_code]);

    const openAddModal = () => {
        setEditingId(null);
        setForm({
            ...EMPTY_FORM,
            display_order: String((rows.length + 1) * 10),
        });
        setModalOpen(true);
    };

    const openEditModal = (row: MobileExchangeRate) => {
        setEditingId(row.id);
        setForm({
            currency_code: row.code,
            source_branch_code: row.source_branch_code || '',
            visible_in_app: row.visible_in_app,
            show_on_home: row.show_on_home,
            default_for_transfer: row.default_for_transfer,
            display_order: String(row.display_order ?? 0),
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortKey(key);
        setSortDir('asc');
    };

    const sortIndicator = (key: SortKey) => {
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const endpoint =
                editingId == null
                    ? ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATES
                    : ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATE_DETAIL(editingId);
            const method = editingId == null ? 'POST' : 'PUT';
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    currency_code: form.currency_code.toUpperCase(),
                    source_branch_code: form.source_branch_code.toUpperCase(),
                    display_order: Number(form.display_order || 0),
                }),
            });

            if (response.ok) {
                closeModal();
                await fetchData();
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: editingId == null
                        ? 'Customer digital rate config created.'
                        : 'Customer digital rate config updated.',
                    type: 'info',
                    isAlert: true,
                });
                return;
            }

            const error = await readErrorMessage(response, 'Failed to save customer digital rate config.');
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: error,
                type: 'danger',
                isAlert: true,
            });
        } catch (error) {
            console.error('Failed to save customer digital rate config', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An unexpected error occurred while saving.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        try {
            const response = await fetch(
                ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATE_DETAIL(deleteTarget.id),
                { method: 'DELETE' }
            );

            if (response.ok) {
                await fetchData();
                setConfirmModal({
                    isOpen: true,
                    title: 'Deleted',
                    message: 'Customer digital rate config deleted.',
                    type: 'info',
                    isAlert: true,
                });
                return;
            }

            const error = await readErrorMessage(response, 'Failed to delete customer digital rate config.');
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: error,
                type: 'danger',
                isAlert: true,
            });
        } catch (error) {
            console.error('Failed to delete customer digital rate config', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An unexpected error occurred while deleting.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setDeleteTarget(null);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => {
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                    if (!confirmModal.isAlert) {
                        setDeleteTarget(null);
                    }
                }}
                onConfirm={confirmModal.isAlert
                    ? () => setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                    : handleDelete}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.isAlert ? 'OK' : 'Delete'}
                cancelText="Cancel"
            />

            <Modal isOpen={modalOpen} onClose={closeModal} title={editingId == null ? 'Add Customer Digital Rate' : 'Edit Customer Digital Rate'}>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Currency</label>
                            <select
                                required
                                className="input-glass w-full"
                                value={form.currency_code}
                                onChange={(event) => setForm((prev) => ({ ...prev, currency_code: event.target.value }))}
                            >
                                <option value="">Select currency</option>
                                {availableCurrencies.map((currency) => (
                                    <option key={currency.code} value={currency.code}>
                                        {currency.code} - {currency.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Source Branch</label>
                            <select
                                className="input-glass w-full"
                                value={form.source_branch_code}
                                onChange={(event) => setForm((prev) => ({ ...prev, source_branch_code: event.target.value }))}
                            >
                                <option value="">No branch selected</option>
                                {branches.map((branch) => (
                                    <option key={branch.code} value={branch.code}>
                                        {branch.code} - {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Visible In App</label>
                            <select
                                className="input-glass w-full"
                                value={form.visible_in_app}
                                onChange={(event) => setForm((prev) => ({ ...prev, visible_in_app: event.target.value as YesNo }))}
                            >
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Show On Home</label>
                            <select
                                className="input-glass w-full"
                                value={form.show_on_home}
                                onChange={(event) => setForm((prev) => ({ ...prev, show_on_home: event.target.value as YesNo }))}
                            >
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Default For Transfer</label>
                            <select
                                className="input-glass w-full"
                                value={form.default_for_transfer}
                                onChange={(event) => setForm((prev) => ({ ...prev, default_for_transfer: event.target.value as YesNo }))}
                            >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Display Order</label>
                            <input
                                type="number"
                                min="0"
                                className="input-glass w-full"
                                value={form.display_order}
                                onChange={(event) => setForm((prev) => ({ ...prev, display_order: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="rounded-3xl bg-slate-50/80 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900/50 dark:text-slate-300">
                        Numeric app rates come from <span className="font-semibold">Customer Cash Rates</span>. Only currencies flagged as payout-enabled in <span className="font-semibold">Countries</span> can be used here.
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={closeModal} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
                            {submitting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {editingId == null ? 'Create' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Customer Digital Rates</h1>
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-300">
                        Manage which branch-backed digital rates are visible in the mobile app.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => void fetchData()}
                        className="glass-effect inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-slate-600 transition hover:text-teal-600 dark:text-slate-200 dark:hover:text-teal-300"
                    >
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={openAddModal}
                        className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Add Rate
                    </button>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="border-b border-slate-100/70 px-6 py-4 dark:border-slate-700/60">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-slate-500 dark:text-slate-300">
                            Results: {totalRows === 0 ? 0 : startIndex + 1} - {endIndex} of {totalRows}
                        </div>
                        <div className="relative input-icon w-full max-w-sm">
                            <span className="input-icon-left"><Search className="h-4 w-4" /></span>
                            <input
                                className="input-glass w-full text-sm"
                                placeholder="Search currency, branch, flags, rate"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading mobile exchange rates...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <SortableHeader label="Order" sortKey="display_order" activeKey={sortKey} direction={sortDir} onClick={toggleSort} />
                                    <SortableHeader label="Currency" sortKey="code" activeKey={sortKey} direction={sortDir} onClick={toggleSort} />
                                    <SortableHeader label="Source Branch" sortKey="source_branch_code" activeKey={sortKey} direction={sortDir} onClick={toggleSort} />
                                    <SortableHeader label="Rate" sortKey="rate" activeKey={sortKey} direction={sortDir} onClick={toggleSort} />
                                    <SortableHeader label="Visible" sortKey="visible_in_app" activeKey={sortKey} direction={sortDir} onClick={toggleSort} />
                                    <SortableHeader label="Home" sortKey="show_on_home" activeKey={sortKey} direction={sortDir} onClick={toggleSort} />
                                    <SortableHeader label="Default" sortKey="default_for_transfer" activeKey={sortKey} direction={sortDir} onClick={toggleSort} />
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Updated</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedRows.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-500 dark:text-slate-200">{row.display_order}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-200">
                                                    {row.symbol || row.code.slice(0, 1)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white">{row.code}</div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-300">{row.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-200">
                                            <div className="font-semibold">{row.source_branch_code || '—'}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{row.source_branch_name || 'No branch selected'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-200">
                                                <Coins className="h-4 w-4" />
                                                {Number(row.rate || 0).toFixed(4)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${yesNoBadgeClass(row.visible_in_app)}`}>
                                                {row.visible_in_app}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${yesNoBadgeClass(row.show_on_home)}`}>
                                                {row.show_on_home}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${yesNoBadgeClass(row.default_for_transfer)}`}>
                                                {row.default_for_transfer}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">
                                            {row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(row)}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-teal-600 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeleteTarget(row);
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: 'Delete Customer Digital Rate',
                                                            message: `Delete ${row.code} from mobile app rate visibility?`,
                                                            type: 'danger',
                                                            isAlert: false,
                                                        });
                                                    }}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/20"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="border-t border-slate-100/70 px-6 py-4 dark:border-slate-700/60">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-slate-500 dark:text-slate-300">
                            Showing {totalRows === 0 ? 0 : startIndex + 1} - {endIndex} of {totalRows}
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                className="input-glass text-sm"
                                value={rowsPerPage}
                                onChange={(event) => setRowsPerPage(Number(event.target.value))}
                            >
                                {[10, 25, 50, 100].map((size) => (
                                    <option key={size} value={size}>
                                        {size} per page
                                    </option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                                    disabled={currentPage <= 1}
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                >
                                    Prev
                                </button>
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SortableHeader({
    label,
    sortKey,
    activeKey,
    direction,
    onClick,
}: {
    label: string;
    sortKey: SortKey;
    activeKey: SortKey;
    direction: SortDir;
    onClick: (key: SortKey) => void;
}) {
    const indicator = activeKey !== sortKey ? '↕' : direction === 'asc' ? '↑' : '↓';

    return (
        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
            <button type="button" onClick={() => onClick(sortKey)} className="inline-flex items-center gap-2 transition hover:text-teal-600 dark:hover:text-teal-300">
                <span>{label}</span>
                <span>{indicator}</span>
            </button>
        </th>
    );
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const data = await response.json();
        if (typeof data?.message === 'string' && data.message.trim() !== '') {
            return data.message;
        }
        if (data?.messages && typeof data.messages === 'object') {
            const first = Object.values(data.messages)[0];
            if (typeof first === 'string' && first.trim() !== '') {
                return first;
            }
        }
    } catch {
        // Ignore invalid JSON.
    }

    return fallback;
}
