'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../../components/ConfirmModal';
import { showToast, queueToast } from '@/app/lib/toast';
import {
    ArrowLeft,
    Landmark,
    Coins,
    BadgePoundSterling,
    Save,
    ChevronRight
} from 'lucide-react';

type Branch = {
    id: string | number;
    name: string;
    code?: string;
    transaction_prefix?: string;
    default_transaction_type?: string | null;
    branch_default_transaction_type?: string | null;
    sender_branch?: string | number | boolean | null;
    is_sender_branch?: string | number | boolean | null;
    sender_enabled?: string | number | boolean | null;
};

type Currency = {
    id: string | number;
    code: string;
    name: string;
    symbol?: string;
};

type Country = {
    id: string | number;
    currency_code?: string | null;
    currency_name?: string | null;
    currency_symbol?: string | null;
    payout_currency?: string | null;
    black_list_country?: string | null;
    status?: string | null;
};

type FormState = {
    branchCode: string;
    currencyCode: string;
    customerRate: string;
    setAllBranches: boolean;
};

export default function CreateBranchCurrencyRatePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [existingRows, setExistingRows] = useState<any[]>([]);

    const [formData, setFormData] = useState<FormState>({
        branchCode: '',
        currencyCode: '',
        customerRate: '',
        setAllBranches: false,
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false
    });

    useEffect(() => {
        const fetchSetup = async () => {
            setLoading(true);
            try {
                const [branchesRes, countriesRes, existingRowsRes] = await Promise.all([
                    fetch(`${ENDPOINTS.BRANCHES.LIST}?status=active`),
                    fetch(`${ENDPOINTS.COUNTRIES.LIST}?status=active&payout_currency=yes&sort=name&dir=asc`),
                    fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.LIST),
                ]);

                const branchRows = branchesRes.ok ? ((await branchesRes.json()) as Branch[]) : [];
                const senderBranches = branchRows.filter((branch) => isSenderBranch(branch));
                const countriesRows = countriesRes.ok ? ((await countriesRes.json()) as Country[]) : [];
                const existing = existingRowsRes.ok ? ((await existingRowsRes.json()) as any[]) : [];
                const currencyMap = new Map<string, Currency>();
                countriesRows.forEach((country) => {
                    if (String(country.payout_currency || '').toLowerCase() !== 'yes') return;
                    const code = String(country.currency_code || '').trim().toUpperCase();
                    if (!code || currencyMap.has(code)) return;
                    currencyMap.set(code, {
                        id: country.id,
                        code,
                        name: String(country.currency_name || '').trim() || code,
                        symbol: String(country.currency_symbol || '').trim() || code,
                    });
                });
                const currencyRows = Array.from(currencyMap.values()).sort((left, right) =>
                    `${left.code} ${left.name}`.localeCompare(`${right.code} ${right.name}`)
                );

                setBranches(senderBranches);
                setCurrencies(currencyRows);
                setExistingRows(Array.isArray(existing) ? existing : []);

                setFormData((prev) => ({
                    ...prev,
                    branchCode: prev.branchCode || '',
                    currencyCode: prev.currencyCode || '',
                }));
            } catch (error) {
                console.error('Failed to load setup for branch currency rate', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSetup();
    }, []);

    const selectedBranch = useMemo(
        () => branches.find((branch) => String(branch.code || branch.transaction_prefix || branch.id) === formData.branchCode),
        [branches, formData.branchCode]
    );

    const selectedCurrency = useMemo(
        () => currencies.find((currency) => currency.code === formData.currencyCode),
        [currencies, formData.currencyCode]
    );

    const previousRate = useMemo(() => {
        if (!formData.currencyCode) return null;
        const filtered = existingRows.filter((row) => {
            const code = String(row?.currency_code || '').trim().toUpperCase();
            if (code !== formData.currencyCode.toUpperCase()) return false;
            if (formData.setAllBranches) return true;
            return String(row?.branch_code || '').trim() === formData.branchCode;
        });
        if (filtered.length === 0) return null;

        return [...filtered].sort((left, right) => {
            const leftTime = new Date(String(left?.updated_at || left?.created_at || 0)).getTime() || 0;
            const rightTime = new Date(String(right?.updated_at || right?.created_at || 0)).getTime() || 0;
            return rightTime - leftTime;
        })[0];
    }, [existingRows, formData.currencyCode, formData.branchCode, formData.setAllBranches]);

    useEffect(() => {
        if (!previousRate) return;
        setFormData((prev) => {
            if (prev.customerRate) return prev;
            return {
                ...prev,
                customerRate: String(previousRate.customer_rate ?? ''),
            };
        });
    }, [previousRate]);

    const handleModalClose = () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (confirmModal.shouldRedirect) {
            router.push('/admin/branch-currency-rates');
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (branches.length === 0) {
            setConfirmModal({
                isOpen: true,
                title: 'Sender Branches Not Configured',
                message: 'No sender branches are available. Please enable sender branch flag and try again.',
                type: 'warning',
                isAlert: true,
                shouldRedirect: false
            });
            return;
        }

        if (!selectedCurrency || (!formData.setAllBranches && !selectedBranch)) {
            setConfirmModal({
                isOpen: true,
                title: 'Missing Information',
                message: formData.setAllBranches
                    ? 'Please select a currency.'
                    : 'Please select branch and currency.',
                type: 'warning',
                isAlert: true,
                shouldRedirect: false
            });
            return;
        }

        setSubmitting(true);

        try {
            const user = getStoredUser<{ username?: string; name?: string }>();
            const userName = user?.username || user?.name || 'Admin';
            const targetBranches = formData.setAllBranches
                ? branches
                    .map((branch) => ({
                        code: String(branch.code || branch.transaction_prefix || branch.id),
                        name: branch.name,
                    }))
                    .filter((branch) => branch.code && branch.name)
                : [{ code: formData.branchCode, name: selectedBranch?.name || '' }];

            if (targetBranches.length === 0) {
                throw new Error('No valid branch found to apply this rate.');
            }

            const createdRecords: Array<{ id: string | number; branchCode: string; currencyCode: string }> = [];
            const failures: string[] = [];

            for (const branch of targetBranches) {
                const payload = {
                    branch_code: branch.code,
                    branch_name: branch.name,
                    currency_code: selectedCurrency.code,
                    currency_name: selectedCurrency.name,
                    currency_symbol: selectedCurrency.symbol || selectedCurrency.code,
                    active: 'yes',
                    customer_rate: Number(formData.customerRate || 0),
                    branch_rate: Number(formData.customerRate || 0),
                    entered_user: userName,
                    modified_user: userName
                };

                const response = await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.LIST, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    let message = 'Failed to add branch currency rate.';
                    try {
                        const err = await response.json();
                        message = err?.messages?.error || err?.message || message;
                    } catch {
                        // Ignore parse errors.
                    }
                    failures.push(`${branch.name}: ${message}`);
                    continue;
                }

                const created = await response.json();
                createdRecords.push({
                    id: created?.id,
                    branchCode: branch.code,
                    currencyCode: selectedCurrency.code,
                });
            }

            if (createdRecords.length > 0) {
                const allRowsRes = await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.LIST);
                const allRows = allRowsRes.ok ? await allRowsRes.json() : [];
                if (Array.isArray(allRows)) {
                    for (const created of createdRecords) {
                        const duplicates = allRows
                            .filter((row) => String(row?.branch_code || '') === created.branchCode)
                            .filter((row) => String(row?.currency_code || '').toUpperCase() === created.currencyCode.toUpperCase())
                            .filter((row) => String(row?.id || '') !== String(created.id || ''))
                            .filter((row) => String(row?.active || '').toLowerCase() === 'yes');

                        for (const duplicate of duplicates) {
                            await fetch(ENDPOINTS.BRANCH_CURRENCY_RATES.DETAIL(duplicate.id), {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ active: 'no', modified_user: userName }),
                            });
                        }
                    }
                }
            }

            if (failures.length > 0 && createdRecords.length === 0) {
            showToast('Error', failures.join(' | '), 'danger');
                return;
            }

            if (failures.length > 0) {
                queueToast('Partial Success', `Created ${createdRecords.length} rate(s). Some failed: ${failures.join(' | ')}`, 'warning');
                router.push('/admin/branch-currency-rates');
                return;
            }

            queueToast('Success', `Customer cash rate added for ${createdRecords.length} branch(es).`, 'success');
            router.push('/admin/branch-currency-rates');
        } catch (error) {
            console.error(error);
            showToast('Error', 'Failed to add branch currency rate.', 'danger');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto py-20 text-center text-slate-500 dark:text-slate-300">
                Loading add rate form...
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalClose}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
            />

            <div className="mb-8">
                <Link href="/admin/branch-currency-rates" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Customer Cash Rates
                </Link>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Add Customer Cash Rate</h1>
                <p className="text-slate-500 dark:text-slate-300 mt-2">
                    Create a new active rate and automatically deactivate previous active rates for the same branch/currency.
                </p>
                {branches.length === 0 && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300">
                        No sender branches are configured. Enable sender branch flag in branch settings first.
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                            Branch {!formData.setAllBranches && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Landmark className="w-5 h-5" /></span>
                            <select
                                required={!formData.setAllBranches}
                                value={formData.branchCode}
                                onChange={(event) => setFormData((prev) => ({ ...prev, branchCode: event.target.value }))}
                                disabled={formData.setAllBranches}
                                className="input-glass w-full pr-10 appearance-none"
                            >
                                <option value="">Select branch</option>
                                {branches.map((branch) => {
                                    const value = String(branch.code || branch.transaction_prefix || branch.id);
                                    return (
                                        <option key={`${value}-${branch.name}`} value={value}>
                                            {branch.name}
                                        </option>
                                    );
                                })}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-500 dark:text-slate-200 pointer-events-none" />
                        </div>
                        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <input
                                type="checkbox"
                                checked={formData.setAllBranches}
                                onChange={(event) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        setAllBranches: event.target.checked,
                                        branchCode: event.target.checked ? '' : prev.branchCode,
                                    }))
                                }
                            />
                            Set this currency rate to all branches
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Currency <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Coins className="w-5 h-5" /></span>
                            <select
                                required
                                value={formData.currencyCode}
                                onChange={(event) => setFormData((prev) => ({ ...prev, currencyCode: event.target.value }))}
                                className="input-glass w-full pr-10 appearance-none"
                            >
                                <option value="">Select currency</option>
                                {currencies.map((currency) => (
                                    <option key={`${currency.code}-${currency.id}`} value={currency.code}>
                                        {currency.code} {currency.symbol || ''}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-500 dark:text-slate-200 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Customer Cash Rate For £ <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><BadgePoundSterling className="w-5 h-5" /></span>
                            <input
                                required
                                type="number"
                                step="0.0001"
                                min="0"
                                value={formData.customerRate}
                                onChange={(event) => setFormData((prev) => ({ ...prev, customerRate: event.target.value }))}
                                className="input-glass w-full"
                            />
                        </div>
                    </div>

                </div>

                {previousRate && (
                    <div className="rounded-2xl border border-amber-200/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                        Previous rate found:
                        <span className="ml-2 font-semibold">Customer {Number(previousRate.customer_rate || 0).toFixed(2)}</span>
                    </div>
                )}

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100/70 dark:border-slate-700/60">
                    <Link
                        href="/admin/branch-currency-rates"
                        className="px-6 py-2.5 rounded-full glass-effect text-sm font-semibold text-slate-600 dark:text-slate-200"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary px-6 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {submitting ? 'Saving...' : 'Save Customer Cash Rate'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function normalizeFlag(value: unknown): boolean {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return false;
    return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
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
