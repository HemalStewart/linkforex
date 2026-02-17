'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import {
    ArrowLeft,
    Building2,
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
};

type Currency = {
    id: string | number;
    code: string;
    name: string;
    symbol?: string;
};

type FormState = {
    company: string;
    branchCode: string;
    currencyCode: string;
    customerRate: string;
    branchRate: string;
    active: 'yes' | 'no';
};

export default function CreateBranchCurrencyRatePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);

    const [formData, setFormData] = useState<FormState>({
        company: 'Link Forex Ltd',
        branchCode: '',
        currencyCode: '',
        customerRate: '',
        branchRate: '',
        active: 'yes'
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
                const [branchesRes, currenciesRes] = await Promise.all([
                    fetch(ENDPOINTS.BRANCHES.LIST),
                    fetch(ENDPOINTS.CURRENCIES.LIST)
                ]);

                const branchRows = branchesRes.ok ? ((await branchesRes.json()) as Branch[]) : [];
                const currencyRows = currenciesRes.ok ? ((await currenciesRes.json()) as Currency[]) : [];

                setBranches(branchRows);
                setCurrencies(currencyRows);

                setFormData((prev) => ({
                    ...prev,
                    branchCode: prev.branchCode || (branchRows[0] ? String(branchRows[0].code || branchRows[0].transaction_prefix || branchRows[0].id) : ''),
                    currencyCode: prev.currencyCode || (currencyRows[0] ? currencyRows[0].code : '')
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

    const handleModalClose = () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (confirmModal.shouldRedirect) {
            router.push('/admin/branch-currency-rates');
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!selectedBranch || !selectedCurrency) {
            setConfirmModal({
                isOpen: true,
                title: 'Missing Information',
                message: 'Please select branch and currency.',
                type: 'warning',
                isAlert: true,
                shouldRedirect: false
            });
            return;
        }

        setSubmitting(true);

        try {
            const userRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            const userName = userRaw ? (JSON.parse(userRaw).username || JSON.parse(userRaw).name || 'Admin') : 'Admin';

            const payload = {
                company: formData.company || 'Link Forex Ltd',
                branch_code: formData.branchCode,
                branch_name: selectedBranch.name,
                currency_code: selectedCurrency.code,
                currency_name: selectedCurrency.name,
                currency_symbol: selectedCurrency.symbol || selectedCurrency.code,
                active: formData.active,
                customer_rate: Number(formData.customerRate || 0),
                branch_rate: Number(formData.branchRate || 0),
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
                    // ignore parse error
                }

                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message,
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
                return;
            }

            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: 'Branch currency rate added successfully.',
                type: 'success',
                isAlert: true,
                shouldRedirect: true
            });
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to add branch currency rate.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
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
                    Back to Branch Currency Rates
                </Link>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Add Branch Currency Rate</h1>
                <p className="text-slate-500 dark:text-slate-300 mt-2">Create customer and branch rates for a branch and currency.</p>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Company <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Building2 className="w-5 h-5" /></span>
                            <input
                                required
                                value={formData.company}
                                onChange={(event) => setFormData((prev) => ({ ...prev, company: event.target.value }))}
                                className="input-glass w-full"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Landmark className="w-5 h-5" /></span>
                            <select
                                required
                                value={formData.branchCode}
                                onChange={(event) => setFormData((prev) => ({ ...prev, branchCode: event.target.value }))}
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
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Active <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <select
                                value={formData.active}
                                onChange={(event) => setFormData((prev) => ({ ...prev, active: event.target.value as 'yes' | 'no' }))}
                                className="input-glass w-full pr-10 appearance-none"
                            >
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-500 dark:text-slate-200 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Customer Rate For £ <span className="text-red-500">*</span></label>
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

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch Rate For £ <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><BadgePoundSterling className="w-5 h-5" /></span>
                            <input
                                required
                                type="number"
                                step="0.0001"
                                min="0"
                                value={formData.branchRate}
                                onChange={(event) => setFormData((prev) => ({ ...prev, branchRate: event.target.value }))}
                                className="input-glass w-full"
                            />
                        </div>
                    </div>
                </div>

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
                        {submitting ? 'Saving...' : 'Save Rate'}
                    </button>
                </div>
            </form>
        </div>
    );
}
