'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import Modal from '@/app/admin/components/Modal';
import ConfirmModal from '@/app/admin/components/ConfirmModal';
import { Coins, Landmark, PlusCircle, RefreshCcw, Search } from 'lucide-react';

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

type CashRow = {
    id: string | number;
    branch_code: string;
    branch_name: string;
    currency_code: string;
    currency_name?: string;
    currency_symbol?: string;
    customer_rate: string | number;
    active: YesNo;
    updated_at?: string;
};

type DigitalRow = {
    id: number;
    code?: string;
    currency_code?: string;
    currency_name?: string;
    symbol?: string;
    visible_in_app: YesNo;
    show_on_home: YesNo;
    default_for_transfer: YesNo;
    source_branch_code?: string;
    source_branch_name?: string;
    display_order?: number;
    updated_at?: string;
};

type CombinedRow = {
    key: string;
    branch_code: string;
    branch_name: string;
    currency_code: string;
    currency_display: string;
    cash_rate: number | null;
    cash_active: YesNo | 'n/a';
    digital_visible: YesNo | 'n/a';
    digital_home: YesNo | 'n/a';
    digital_default: YesNo | 'n/a';
    digital_source: string;
    updated_at: string;
};

type CurrencyOption = {
    code: string;
    name: string;
    symbol: string;
};

type FormState = {
    branchCode: string;
    currencyCode: string;
    customerRate: string;
    applyToMobile: boolean;
    sourceBranchCode: string;
    visibleInApp: YesNo;
    showOnHome: YesNo;
    defaultForTransfer: YesNo;
    displayOrder: string;
};

const EMPTY_FORM: FormState = {
    branchCode: '',
    currencyCode: '',
    customerRate: '',
    applyToMobile: true,
    sourceBranchCode: '',
    visibleInApp: 'yes',
    showOnHome: 'yes',
    defaultForTransfer: 'no',
    displayOrder: '10',
};

export default function BranchRatesPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cashRows, setCashRows] = useState<CashRow[]>([]);
    const [digitalRows, setDigitalRows] = useState<DigitalRow[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | YesNo>('yes');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [toast, setToast] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'danger' | 'success',
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cashRes, digitalRes, branchesRes, countriesRes] = await Promise.all([
                fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.LIST),
                fetch(ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATES),
                fetch(`${ENDPOINTS.BRANCHES.LIST}?status=active`),
                fetch(`${ENDPOINTS.COUNTRIES.LIST}?status=active&payout_currency=yes&sort=name&dir=asc`),
            ]);

            const cashData = cashRes.ok ? await cashRes.json() : [];
            const digitalData = digitalRes.ok ? await digitalRes.json() : [];
            const branchData = branchesRes.ok ? await branchesRes.json() : [];
            const countryData = countriesRes.ok ? await countriesRes.json() : [];

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

            setCashRows(Array.isArray(cashData) ? cashData : []);
            setDigitalRows(Array.isArray(digitalData) ? digitalData : []);
            setBranches(senderBranches);
            setCurrencies(Array.from(currencyMap.values()).sort((a, b) => a.code.localeCompare(b.code)));
        } catch (error) {
            console.error('Failed to load branch rates', error);
            setCashRows([]);
            setDigitalRows([]);
            setBranches([]);
            setCurrencies([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const combinedRows = useMemo(() => {
        const digitalByCode = new Map<string, DigitalRow>();
        digitalRows.forEach((row) => {
            const code = String(row.code || row.currency_code || '').trim().toUpperCase();
            if (!code) return;
            digitalByCode.set(code, row);
        });

        const rows: CombinedRow[] = cashRows.map((cash) => {
            const code = String(cash.currency_code || '').trim().toUpperCase();
            const symbol = String(cash.currency_symbol || '').trim();
            const digital = digitalByCode.get(code);
            return {
                key: `cash-${cash.id}`,
                branch_code: String(cash.branch_code || ''),
                branch_name: String(cash.branch_name || ''),
                currency_code: code,
                currency_display: `${code} ${symbol}`.trim(),
                cash_rate: Number(cash.customer_rate || 0),
                cash_active: normalizeYesNo(cash.active),
                digital_visible: digital ? normalizeYesNo(digital.visible_in_app) : 'n/a',
                digital_home: digital ? normalizeYesNo(digital.show_on_home) : 'n/a',
                digital_default: digital ? normalizeYesNo(digital.default_for_transfer) : 'n/a',
                digital_source: digital?.source_branch_code
                    ? `${digital.source_branch_code}${digital.source_branch_name ? ` - ${digital.source_branch_name}` : ''}`
                    : '—',
                updated_at: String(cash.updated_at || digital?.updated_at || ''),
            };
        });

        const hasCurrencyInCash = new Set(rows.map((row) => row.currency_code));
        digitalRows.forEach((digital) => {
            const code = String(digital.code || digital.currency_code || '').trim().toUpperCase();
            if (!code || hasCurrencyInCash.has(code)) return;
            rows.push({
                key: `digital-${digital.id}`,
                branch_code: String(digital.source_branch_code || ''),
                branch_name: String(digital.source_branch_name || ''),
                currency_code: code,
                currency_display: `${code} ${String(digital.symbol || '').trim()}`.trim(),
                cash_rate: null,
                cash_active: 'n/a',
                digital_visible: normalizeYesNo(digital.visible_in_app),
                digital_home: normalizeYesNo(digital.show_on_home),
                digital_default: normalizeYesNo(digital.default_for_transfer),
                digital_source: digital.source_branch_code
                    ? `${digital.source_branch_code}${digital.source_branch_name ? ` - ${digital.source_branch_name}` : ''}`
                    : '—',
                updated_at: String(digital.updated_at || ''),
            });
        });

        return rows.sort((a, b) => {
            const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return bTime - aTime;
        });
    }, [cashRows, digitalRows]);

    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase();
        return combinedRows.filter((row) => {
            if (activeFilter !== 'all' && row.cash_active !== activeFilter) return false;
            if (!query) return true;
            return [
                row.branch_name,
                row.branch_code,
                row.currency_code,
                row.currency_display,
                row.cash_rate,
                row.cash_active,
                row.digital_visible,
                row.digital_home,
                row.digital_default,
                row.digital_source,
            ]
                .filter((value) => value !== null && value !== undefined)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [combinedRows, search, activeFilter]);

    const openModal = () => {
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setForm(EMPTY_FORM);
    };

    const onBranchChange = (branchCode: string) => {
        setForm((prev) => ({
            ...prev,
            branchCode,
            sourceBranchCode: prev.sourceBranchCode || branchCode,
        }));
    };

    const saveRate = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.branchCode || !form.currencyCode || !form.customerRate) {
            setToast({
                isOpen: true,
                title: 'Missing Information',
                message: 'Branch, currency, and cash rate are required.',
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

            const cashPayload = {
                company: 'Link Forex Ltd',
                branch_code: form.branchCode,
                branch_name: selectedBranch.name,
                currency_code: selectedCurrency.code,
                currency_name: selectedCurrency.name,
                currency_symbol: selectedCurrency.symbol,
                active: 'yes',
                customer_rate: Number(form.customerRate),
                branch_rate: Number(form.customerRate),
                entered_user: userName,
                modified_user: userName,
            };

            const createCashResponse = await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cashPayload),
            });

            if (!createCashResponse.ok) {
                throw new Error(await readErrorMessage(createCashResponse, 'Failed to create customer cash rate.'));
            }

            const createdCash = await createCashResponse.json();

            const allCashResponse = await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.LIST);
            const allCashRows = allCashResponse.ok ? await allCashResponse.json() : [];
            if (Array.isArray(allCashRows)) {
                const duplicates = allCashRows
                    .filter((row) => String(row?.branch_code || '') === form.branchCode)
                    .filter((row) => String(row?.currency_code || '').toUpperCase() === form.currencyCode.toUpperCase())
                    .filter((row) => String(row?.id || '') !== String(createdCash?.id || ''))
                    .filter((row) => normalizeYesNo(row?.active) === 'yes');

                for (const duplicate of duplicates) {
                    await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.DETAIL(duplicate.id), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active: 'no', modified_user: userName }),
                    });
                }
            }

            if (form.applyToMobile) {
                const existingDigital = digitalRows.find(
                    (row) => String(row.code || row.currency_code || '').trim().toUpperCase() === form.currencyCode.toUpperCase()
                );
                const digitalPayload = {
                    currency_code: form.currencyCode.toUpperCase(),
                    source_branch_code: (form.sourceBranchCode || form.branchCode).toUpperCase(),
                    visible_in_app: form.visibleInApp,
                    show_on_home: form.showOnHome,
                    default_for_transfer: form.defaultForTransfer,
                    display_order: Number(form.displayOrder || 0),
                };

                const digitalResponse = existingDigital
                    ? await fetch(ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATE_DETAIL(existingDigital.id), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(digitalPayload),
                    })
                    : await fetch(ENDPOINTS.MOBILE_ADMIN.EXCHANGE_RATES, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(digitalPayload),
                    });

                if (!digitalResponse.ok) {
                    const message = await readErrorMessage(digitalResponse, 'Cash rate added, but failed to save digital rate config.');
                    setToast({
                        isOpen: true,
                        title: 'Partial Success',
                        message,
                        type: 'warning',
                    });
                    await fetchData();
                    closeModal();
                    return;
                }
            }

            setToast({
                isOpen: true,
                title: 'Success',
                message: 'Branch rate saved for cash and mobile digital config.',
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
                <form onSubmit={saveRate} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Branch</label>
                            <select className="input-glass w-full" value={form.branchCode} onChange={(event) => onBranchChange(event.target.value)} required>
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
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Currency</label>
                            <select className="input-glass w-full" value={form.currencyCode} onChange={(event) => setForm((prev) => ({ ...prev, currencyCode: event.target.value }))} required>
                                <option value="">Select currency</option>
                                {currencies.map((currency) => (
                                    <option key={currency.code} value={currency.code}>
                                        {currency.code} - {currency.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Customer Cash Rate For £</label>
                            <input
                                type="number"
                                step="0.0001"
                                min="0"
                                className="input-glass w-full"
                                value={form.customerRate}
                                onChange={(event) => setForm((prev) => ({ ...prev, customerRate: event.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Apply To Mobile Digital</label>
                            <select
                                className="input-glass w-full"
                                value={form.applyToMobile ? 'yes' : 'no'}
                                onChange={(event) => setForm((prev) => ({ ...prev, applyToMobile: event.target.value === 'yes' }))}
                            >
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                    </div>

                    {form.applyToMobile && (
                        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Mobile Source Branch</label>
                                <select
                                    className="input-glass w-full"
                                    value={form.sourceBranchCode}
                                    onChange={(event) => setForm((prev) => ({ ...prev, sourceBranchCode: event.target.value }))}
                                >
                                    <option value="">Use selected branch</option>
                                    {branches.map((branch) => {
                                        const code = String(branch.code || branch.transaction_prefix || branch.id);
                                        return (
                                            <option key={`source-${code}`} value={code}>
                                                {branch.name}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Display Order</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input-glass w-full"
                                    value={form.displayOrder}
                                    onChange={(event) => setForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Visible In App</label>
                                <select className="input-glass w-full" value={form.visibleInApp} onChange={(event) => setForm((prev) => ({ ...prev, visibleInApp: event.target.value as YesNo }))}>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Show On Home</label>
                                <select className="input-glass w-full" value={form.showOnHome} onChange={(event) => setForm((prev) => ({ ...prev, showOnHome: event.target.value as YesNo }))}>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Default For Transfer</label>
                                <select className="input-glass w-full" value={form.defaultForTransfer} onChange={(event) => setForm((prev) => ({ ...prev, defaultForTransfer: event.target.value as YesNo }))}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                </select>
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
                        One table for customer cash rates and customer digital settings.
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

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative input-icon md:col-span-2">
                            <span className="input-icon-left"><Search className="w-4 h-4" /></span>
                            <input
                                className="input-glass w-full text-sm"
                                placeholder="Search branch, currency, rate, digital flags"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                        <select
                            className="input-glass w-full text-sm"
                            value={activeFilter}
                            onChange={(event) => setActiveFilter(event.target.value as 'all' | YesNo)}
                        >
                            <option value="all">All Cash Active States</option>
                            <option value="yes">Cash Active: Yes</option>
                            <option value="no">Cash Active: No</option>
                        </select>
                    </div>
                </div>

                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Loading branch rates...</div>
                    ) : (
                        <table className="table-shell whitespace-nowrap">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Branch</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Currency</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Customer Cash Rate For £</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Cash Active</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Digital Visible</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Digital Home</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Digital Default</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Digital Source Branch</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {filteredRows.map((row) => (
                                    <tr key={row.key}>
                                        <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                                            <div className="font-semibold">{row.branch_name || '-'}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{row.branch_code || '-'}</div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{row.currency_display}</td>
                                        <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                                            {row.cash_rate === null ? '—' : Number(row.cash_rate).toFixed(4)}
                                        </td>
                                        <td className="px-4 py-4 text-sm">{renderFlag(row.cash_active)}</td>
                                        <td className="px-4 py-4 text-sm">{renderFlag(row.digital_visible)}</td>
                                        <td className="px-4 py-4 text-sm">{renderFlag(row.digital_home)}</td>
                                        <td className="px-4 py-4 text-sm">{renderFlag(row.digital_default)}</td>
                                        <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{row.digital_source}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                                            {row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filteredRows.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                            No branch rate rows found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

function normalizeFlag(value: unknown): boolean {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return false;
    return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function normalizeYesNo(value: unknown): YesNo {
    return normalizeFlag(value) ? 'yes' : 'no';
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
    return senderSignals.some((value) => normalizeFlag(value));
}

function renderFlag(value: YesNo | 'n/a') {
    if (value === 'n/a') {
        return <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">N/A</span>;
    }
    const className = value === 'yes'
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300';
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>{value === 'yes' ? 'Yes' : 'No'}</span>;
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

