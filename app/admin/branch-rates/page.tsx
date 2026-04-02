'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import Modal from '@/app/admin/components/Modal';
import ConfirmModal from '@/app/admin/components/ConfirmModal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import { PlusCircle, RefreshCcw, Search } from 'lucide-react';

type YesNo = 'yes' | 'no';

type Branch = {
    id: string | number;
    code?: string;
    name: string;
    transaction_prefix?: string;
    default_transaction_type?: string | null;
    branch_default_transaction_type?: string | null;
    sender_branch?: string | number | boolean | null;
    is_sender_branch?: string | number | boolean | null;
    sender_enabled?: string | number | boolean | null;
};

type Country = {
    id: string | number;
    currency_code?: string | null;
    currency_name?: string | null;
    currency_symbol?: string | null;
    payout_currency?: string | null;
    black_list_country?: string | null;
};

type BranchRateRow = {
    id: string | number;
    branch_code: string;
    branch_name: string;
    currency_code: string;
    currency_name?: string;
    currency_symbol?: string;
    customer_rate: string | number;
    branch_rate?: string | number | null;
    digital_rate?: string | number | null;
    active: YesNo;
    entered_user?: string | null;
    modified_user?: string | null;
    updated_at?: string | null;
};

type MobileRateRow = {
    id: number;
    currency_code?: string;
    code?: string;
    source_branch_code?: string;
    display_order?: number;
};

type CurrencyOption = {
    code: string;
    name: string;
    symbol: string;
};

type SortDir = 'asc' | 'desc';
type SortKey =
    | 'branch'
    | 'currency'
    | 'cash'
    | 'branchRate'
    | 'digital'
    | 'status'
    | 'updatedAt'
    | 'updatedUser';

type FormState = {
    branchCode: string;
    currencyCode: string;
    cashRate: string;
    branchRate: string;
    digitalRate: string;
    applyToAll: boolean;
};

const EMPTY_FORM: FormState = {
    branchCode: '',
    currencyCode: '',
    cashRate: '',
    branchRate: '',
    digitalRate: '',
    applyToAll: false,
};

export default function BranchRatesPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rows, setRows] = useState<BranchRateRow[]>([]);
    const [mobileRows, setMobileRows] = useState<MobileRateRow[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | YesNo>('yes');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [toast, setToast] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'danger' | 'success',
    });
    const lastSelectionRef = useRef<string>('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ratesRes, branchesRes, countriesRes, mobileRes] = await Promise.all([
                fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.LIST),
                fetch(`${ENDPOINTS.BRANCHES.LIST}?status=active`),
                fetch(`${ENDPOINTS.COUNTRIES.LIST}?status=active&payout_currency=yes&sort=name&dir=asc`),
                fetch(ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATES),
            ]);

            const ratesData = ratesRes.ok ? await ratesRes.json() : [];
            const branchData = branchesRes.ok ? await branchesRes.json() : [];
            const countryData = countriesRes.ok ? await countriesRes.json() : [];
            const mobileData = mobileRes.ok ? await mobileRes.json() : [];

            const senderBranches = (Array.isArray(branchData) ? branchData : []).filter((branch: Branch) =>
                isSenderBranch(branch)
            );

            const currencyMap = new Map<string, CurrencyOption>();
            (Array.isArray(countryData) ? countryData : []).forEach((country: Country) => {
                if (String(country.payout_currency || '').toLowerCase() !== 'yes') return;
                if (String(country.black_list_country || '').toLowerCase() === 'yes') return;
                const code = String(country.currency_code || '').trim().toUpperCase();
                if (!code || currencyMap.has(code)) return;
                currencyMap.set(code, {
                    code,
                    name: String(country.currency_name || '').trim() || code,
                    symbol: String(country.currency_symbol || '').trim() || code,
                });
            });

            setRows(Array.isArray(ratesData) ? ratesData : []);
            setBranches(senderBranches);
            setCurrencies(Array.from(currencyMap.values()).sort((a, b) => a.code.localeCompare(b.code)));
            setMobileRows(Array.isArray(mobileData) ? mobileData : []);
        } catch (error) {
            console.error('Failed to load branch rates', error);
            setRows([]);
            setBranches([]);
            setCurrencies([]);
            setMobileRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const previousRate = useMemo(() => {
        if (!form.branchCode || !form.currencyCode) return null;
        const matches = rows
            .filter((row) => String(row.branch_code || '') === form.branchCode)
            .filter((row) => String(row.currency_code || '').toUpperCase() === form.currencyCode.toUpperCase())
            .sort((a, b) => {
                const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                if (aTime !== bTime) return bTime - aTime;
                return Number(b.id) - Number(a.id);
            });
        return matches[0] ?? null;
    }, [rows, form.branchCode, form.currencyCode]);

    useEffect(() => {
        const key = `${form.branchCode}::${form.currencyCode}`;
        if (!form.branchCode || !form.currencyCode) {
            lastSelectionRef.current = key;
            return;
        }
        if (lastSelectionRef.current !== key) {
            lastSelectionRef.current = key;
            if (previousRate) {
                setForm((prev) => ({
                    ...prev,
                    cashRate: previousRate.customer_rate != null ? String(previousRate.customer_rate) : '',
                    branchRate: previousRate.branch_rate != null ? String(previousRate.branch_rate) : '',
                    digitalRate: previousRate.digital_rate != null ? String(previousRate.digital_rate) : '',
                }));
            } else {
                setForm((prev) => ({
                    ...prev,
                    cashRate: '',
                    branchRate: '',
                    digitalRate: '',
                }));
            }
        }
    }, [form.branchCode, form.currencyCode, previousRate]);

    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase();
        return rows.filter((row) => {
            if (activeFilter !== 'all' && normalizeYesNo(row.active) !== activeFilter) return false;
            if (!query) return true;
            return [
                row.branch_name,
                row.branch_code,
                row.currency_code,
                row.currency_name,
                row.currency_symbol,
                row.customer_rate,
                row.branch_rate,
                row.digital_rate,
                row.active,
                row.entered_user,
                row.modified_user,
            ]
                .filter((value) => value !== null && value !== undefined)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [rows, search, activeFilter]);

    const sortedRows = useMemo(() => {
        const data = [...filteredRows];
        if (!sortKey) return data;

        const compareText = (a?: string | null, b?: string | null) =>
            String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' });

        const compareNumber = (a?: string | number | null, b?: string | number | null) =>
            Number(a ?? 0) - Number(b ?? 0);

        const compareDate = (a?: string | null, b?: string | null) =>
            new Date(a ?? 0).getTime() - new Date(b ?? 0).getTime();

        data.sort((a, b) => {
            let result = 0;
            switch (sortKey) {
                case 'branch':
                    result = compareText(a.branch_name || a.branch_code, b.branch_name || b.branch_code);
                    break;
                case 'currency':
                    result = compareText(a.currency_code, b.currency_code);
                    break;
                case 'cash':
                    result = compareNumber(a.customer_rate, b.customer_rate);
                    break;
                case 'branchRate':
                    result = compareNumber(a.branch_rate, b.branch_rate);
                    break;
                case 'digital':
                    result = compareNumber(a.digital_rate, b.digital_rate);
                    break;
                case 'status':
                    result = compareText(normalizeYesNo(a.active), normalizeYesNo(b.active));
                    break;
                case 'updatedUser': {
                    const userA = a.modified_user || a.entered_user || '';
                    const userB = b.modified_user || b.entered_user || '';
                    result = compareText(userA, userB);
                    break;
                }
                case 'updatedAt':
                default:
                    result = compareDate(a.updated_at, b.updated_at);
                    break;
            }
            return sortDir === 'asc' ? result : -result;
        });
        return data;
    }, [filteredRows, sortKey, sortDir]);

    const totalRows = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRows);
    const pagedRows = sortedRows.slice(startIndex, endIndex);

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

    const openModal = () => {
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setForm(EMPTY_FORM);
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!form.branchCode || !form.currencyCode || !form.cashRate || !form.branchRate || !form.digitalRate) {
            setToast({
                isOpen: true,
                title: 'Missing Information',
                message: 'Branch, currency, cash rate, branch rate, and digital rate are required.',
                type: 'warning',
            });
            return;
        }

        setSubmitting(true);
        try {
            const user = getStoredUser<{ username?: string; name?: string }>();
            const userName = user?.username || user?.name || 'Admin';
            const selectedBranch = branches.find((branch) => String(branch.code || branch.transaction_prefix || branch.id) === form.branchCode);
            const selectedCurrency = currencies.find((currency) => currency.code === form.currencyCode);

            if (!selectedBranch || !selectedCurrency) {
                throw new Error('Selected branch or currency is invalid.');
            }

            const targetBranches = form.applyToAll ? branches : [selectedBranch];
            if (targetBranches.length === 0) {
                throw new Error('No sender branches are configured.');
            }

            for (const branch of targetBranches) {
                const branchCode = String(branch.code || branch.transaction_prefix || branch.id);
                const payload = {
                    company: 'Link Forex Ltd',
                    branch_code: branchCode,
                    branch_name: branch.name,
                    currency_code: selectedCurrency.code,
                    currency_name: selectedCurrency.name,
                    currency_symbol: selectedCurrency.symbol,
                    active: 'yes',
                    customer_rate: Number(form.cashRate),
                    branch_rate: Number(form.branchRate),
                    digital_rate: Number(form.digitalRate),
                    entered_user: userName,
                    modified_user: userName,
                };

                const createResponse = await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.LIST, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!createResponse.ok) {
                    throw new Error(await readErrorMessage(createResponse, 'Failed to create branch rate.'));
                }

                const created = await createResponse.json();
                const duplicatesRes = await fetch(
                    `${ENDPOINTS.BRANCH_CURRENCY_RATES.LIST}?branch_code=${encodeURIComponent(branchCode)}&currency_code=${encodeURIComponent(selectedCurrency.code)}`
                );
                const duplicates = duplicatesRes.ok ? await duplicatesRes.json() : [];
                if (Array.isArray(duplicates)) {
                    const toDisable = duplicates
                        .filter((row) => String(row?.id || '') !== String(created?.id || ''))
                        .filter((row) => normalizeYesNo(row?.active) === 'yes');

                    for (const duplicate of toDisable) {
                        await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.DETAIL(duplicate.id), {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ active: 'no', modified_user: userName }),
                        });
                    }
                }
            }

            await upsertMobileConfig({
                currencyCode: selectedCurrency.code,
                branchCode: form.branchCode,
                mobileRows,
            });

            setToast({
                isOpen: true,
                title: 'Success',
                message: form.applyToAll
                    ? 'Rates applied to all sender branches.'
                    : 'Branch rate saved successfully.',
                type: 'success',
            });
            await fetchData();
            closeModal();
        } catch (error) {
            console.error(error);
            setToast({
                isOpen: true,
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to save branch rate.',
                type: 'danger',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={toast.isOpen}
                onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={() => setToast((prev) => ({ ...prev, isOpen: false }))}
                title={toast.title}
                message={toast.message}
                type={toast.type}
                isAlert
                confirmText="OK"
            />

            <Modal isOpen={modalOpen} onClose={closeModal} title="Add Branch Rate">
                <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Select Branch</label>
                            <select
                                className="input-glass w-full"
                                value={form.branchCode}
                                onChange={(event) => setForm((prev) => ({ ...prev, branchCode: event.target.value }))}
                                required
                            >
                                <option value="">Select branch</option>
                                {branches.map((branch) => {
                                    const code = String(branch.code || branch.transaction_prefix || branch.id);
                                    return (
                                        <option key={code} value={code}>
                                            {branch.name}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Select Currency</label>
                            <select
                                className="input-glass w-full"
                                value={form.currencyCode}
                                onChange={(event) => setForm((prev) => ({ ...prev, currencyCode: event.target.value }))}
                                required
                            >
                                <option value="">Select currency</option>
                                {currencies.map((currency) => (
                                    <option key={currency.code} value={currency.code}>
                                        {currency.code} - {currency.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Customer Cash Rate</label>
                            <input
                                type="number"
                                step="0.0001"
                                min="0"
                                className="input-glass w-full"
                                value={form.cashRate}
                                onChange={(event) => setForm((prev) => ({ ...prev, cashRate: event.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Branch Rate</label>
                            <input
                                type="number"
                                step="0.0001"
                                min="0"
                                className="input-glass w-full"
                                value={form.branchRate}
                                onChange={(event) => setForm((prev) => ({ ...prev, branchRate: event.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Customer Digital Rate</label>
                            <input
                                type="number"
                                step="0.0001"
                                min="0"
                                className="input-glass w-full"
                                value={form.digitalRate}
                                onChange={(event) => setForm((prev) => ({ ...prev, digitalRate: event.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={form.applyToAll}
                            onChange={(event) => setForm((prev) => ({ ...prev, applyToAll: event.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        Apply to all sender branches
                    </label>

                    {previousRate && (
                        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-4 text-sm text-slate-600 dark:text-slate-300">
                            <div className="font-semibold text-slate-800 dark:text-slate-100">Latest rate for {previousRate.branch_code} • {previousRate.currency_code}</div>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>Cash: {Number(previousRate.customer_rate || 0).toFixed(4)}</div>
                                <div>Branch: {previousRate.branch_rate !== null && previousRate.branch_rate !== undefined ? Number(previousRate.branch_rate || 0).toFixed(4) : '—'}</div>
                                <div>Digital: {previousRate.digital_rate !== null && previousRate.digital_rate !== undefined ? Number(previousRate.digital_rate || 0).toFixed(4) : '—'}</div>
                                <div>Status: {normalizeYesNo(previousRate.active) === 'yes' ? 'Active' : 'Inactive'}</div>
                                <div>Updated: {previousRate.updated_at ? new Date(previousRate.updated_at).toLocaleString() : '—'}</div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={closeModal} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
                            {submitting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                            {submitting ? 'Saving...' : 'Save Branch Rate'}
                        </button>
                    </div>
                </form>
            </Modal>

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Branch Rates</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
                        Customer cash + digital rates managed per sender branch.
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
                    <button type="button" onClick={openModal} className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
                        <PlusCircle className="h-4 w-4" />
                        Add Rate
                    </button>
                </div>
            </div>

            <div className="card-glass p-5">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-6">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Search className="w-4 h-4" /></span>
                            <input
                                className="input-glass w-full text-sm"
                                placeholder="Search branch, currency, rate, user"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </div>
                    <div className="xl:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Status</label>
                        <select
                            className="input-glass w-full text-sm"
                            value={activeFilter}
                            onChange={(event) => {
                                setActiveFilter(event.target.value as 'all' | YesNo);
                                setPage(1);
                            }}
                        >
                            <option value="all">All Status</option>
                            <option value="yes">Active</option>
                            <option value="no">Inactive</option>
                        </select>
                    </div>
                    <div className="xl:col-span-3 flex items-end">
                        <p className="text-xs text-slate-400 dark:text-slate-300">
                            Search across all branch rate columns.
                        </p>
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Branch Rate Directory</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Showing {totalRows === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRows}
                        </p>
                    </div>
                </div>

                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Loading branch rates...</div>
                    ) : (
                        <table className="table-shell whitespace-nowrap">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('branch')} className="flex items-center gap-1">
                                            Branch <span>{sortIndicator('branch')}</span>
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('currency')} className="flex items-center gap-1">
                                            Currency <span>{sortIndicator('currency')}</span>
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('cash')} className="flex items-center gap-1">
                                            Customer Cash Rate <span>{sortIndicator('cash')}</span>
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('branchRate')} className="flex items-center gap-1">
                                            Branch Rate <span>{sortIndicator('branchRate')}</span>
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('digital')} className="flex items-center gap-1">
                                            Customer Digital Rate <span>{sortIndicator('digital')}</span>
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('status')} className="flex items-center gap-1">
                                            Status <span>{sortIndicator('status')}</span>
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('updatedAt')} className="flex items-center gap-1">
                                            Updated <span>{sortIndicator('updatedAt')}</span>
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('updatedUser')} className="flex items-center gap-1">
                                            Updated User <span>{sortIndicator('updatedUser')}</span>
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedRows.map((row) => {
                                    const updatedUser = row.modified_user || row.entered_user || '-';
                                    return (
                                        <tr key={row.id}>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                                                <div className="font-semibold">{row.branch_name || '-'}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{row.branch_code || '-'}</div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                                                {row.currency_code} {row.currency_symbol ? row.currency_symbol : ''}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                                                {Number(row.customer_rate || 0).toFixed(4)}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                                                {row.branch_rate !== null && row.branch_rate !== undefined
                                                    ? Number(row.branch_rate || 0).toFixed(4)
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                                                {row.digital_rate !== null && row.digital_rate !== undefined
                                                    ? Number(row.digital_rate || 0).toFixed(4)
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-4 text-sm">
                                                <Badge type={row.active === 'yes' ? 'active' : 'inactive'}>
                                                    {row.active === 'yes' ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                                                {row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{updatedUser}</td>
                                        </tr>
                                    );
                                })}
                                {!loading && pagedRows.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                            No branch rate rows found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
                <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    rowsPerPage={pageSize}
                    onPageChange={setPage}
                    onRowsPerPageChange={(rows) => {
                        setPageSize(rows);
                        setPage(1);
                    }}
                />
            </div>
        </div>
    );
}

function normalizeYesNo(value: unknown): YesNo {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'no' ? 'no' : 'yes';
}

function isSenderBranch(branch: Branch): boolean {
    const defaultType = String(
        branch.default_transaction_type ?? branch.branch_default_transaction_type ?? ''
    )
        .trim()
        .toLowerCase();
    if (defaultType === 'sender') {
        return true;
    }

    const senderSignals: unknown[] = [
        branch.sender_branch,
        branch.is_sender_branch,
        branch.sender_enabled,
    ];
    const hasSignal = senderSignals.some((value) => value !== undefined && value !== null && String(value).trim() !== '');
    if (!hasSignal) return false;
    return senderSignals.some((value) => normalizeYesNo(value) === 'yes' || String(value).trim() === '1');
}



async function upsertMobileConfig({
    currencyCode,
    branchCode,
    mobileRows,
}: {
    currencyCode: string;
    branchCode: string;
    mobileRows: MobileRateRow[];
}) {
    const existing = mobileRows.find((row) =>
        String(row.code || row.currency_code || '').trim().toUpperCase() === currencyCode.toUpperCase()
    );

    const payload = {
        currency_code: currencyCode.toUpperCase(),
        source_branch_code: branchCode.toUpperCase(),
        visible_in_app: 'yes',
        show_on_home: 'yes',
        default_for_transfer: 'no',
        display_order: Number(existing?.display_order ?? 10),
    };

    const response = existing
        ? await fetch(ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATE_DETAIL(existing.id), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        : await fetch(ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to update mobile digital rate config.'));
    }
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
        // ignore JSON parse errors
    }
    return fallback;
}
