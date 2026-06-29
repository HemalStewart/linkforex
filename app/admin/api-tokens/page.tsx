'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../components/ConfirmModal';
import {
    RefreshCw,
    Save,
    Key,
    Eye,
    EyeOff,
    Lock,
    ShieldCheck
} from 'lucide-react';
import { usePagePermissions } from '@/app/lib/permissions';

type ApiSettings = {
    veriff_api_key: string;
    veriff_hmac_secret: string;
    veriff_aml_api_key: string;
    veriff_aml_hmac_secret: string;
    veriff_monthly_limit: number;
    veriff_yearly_limit: number;
    veriff_monthly_usage: number;
    veriff_yearly_usage: number;
    veriff_monthly_remaining: number | null;
    veriff_yearly_remaining: number | null;

    dilisense_api_key: string;
    dilisense_monthly_limit: number;
    dilisense_yearly_limit: number;
    dilisense_monthly_usage: number;
    dilisense_yearly_usage: number;
    dilisense_monthly_remaining: number | null;
    dilisense_yearly_remaining: number | null;
};

export default function ApiTokensPage() {
    const { canEdit } = usePagePermissions('API_TOKENS');
    const actingUser = useMemo(() => getStoredUser<{ id?: string | number; username?: string; name?: string }>(), []);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<ApiSettings>({
        veriff_api_key: '',
        veriff_hmac_secret: '',
        veriff_aml_api_key: '',
        veriff_aml_hmac_secret: '',
        veriff_monthly_limit: 0,
        veriff_yearly_limit: 0,
        veriff_monthly_usage: 0,
        veriff_yearly_usage: 0,
        veriff_monthly_remaining: null,
        veriff_yearly_remaining: null,

        dilisense_api_key: '',
        dilisense_monthly_limit: 0,
        dilisense_yearly_limit: 0,
        dilisense_monthly_usage: 0,
        dilisense_yearly_usage: 0,
        dilisense_monthly_remaining: null,
        dilisense_yearly_remaining: null,
    });

    const [showVeriffKey, setShowVeriffKey] = useState(false);
    const [showVeriffSecret, setShowVeriffSecret] = useState(false);
    const [showVeriffAmlKey, setShowVeriffAmlKey] = useState(false);
    const [showVeriffAmlSecret, setShowVeriffAmlSecret] = useState(false);
    const [showDilisenseKey, setShowDilisenseKey] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
    });

    const closeModal = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const url = actingUser?.id
                ? `${ENDPOINTS.API_TOKEN_SETTINGS.LIST}?acting_user_id=${encodeURIComponent(String(actingUser.id))}`
                : ENDPOINTS.API_TOKEN_SETTINGS.LIST;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error('Failed to fetch settings');
            }
            const data = await res.json();
            setSettings({
                veriff_api_key: data.veriff_api_key ?? '',
                veriff_hmac_secret: data.veriff_hmac_secret ?? '',
                veriff_aml_api_key: data.veriff_aml_api_key ?? '',
                veriff_aml_hmac_secret: data.veriff_aml_hmac_secret ?? '',
                veriff_monthly_limit: Number(data.veriff_monthly_limit) || 0,
                veriff_yearly_limit: Number(data.veriff_yearly_limit) || 0,
                veriff_monthly_usage: Number(data.veriff_monthly_usage) || 0,
                veriff_yearly_usage: Number(data.veriff_yearly_usage) || 0,
                veriff_monthly_remaining: data.veriff_monthly_remaining !== null ? Number(data.veriff_monthly_remaining) : null,
                veriff_yearly_remaining: data.veriff_yearly_remaining !== null ? Number(data.veriff_yearly_remaining) : null,

                dilisense_api_key: data.dilisense_api_key ?? '',
                dilisense_monthly_limit: Number(data.dilisense_monthly_limit) || 0,
                dilisense_yearly_limit: Number(data.dilisense_yearly_limit) || 0,
                dilisense_monthly_usage: Number(data.dilisense_monthly_usage) || 0,
                dilisense_yearly_usage: Number(data.dilisense_yearly_usage) || 0,
                dilisense_monthly_remaining: data.dilisense_monthly_remaining !== null ? Number(data.dilisense_monthly_remaining) : null,
                dilisense_yearly_remaining: data.dilisense_yearly_remaining !== null ? Number(data.dilisense_yearly_remaining) : null,
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [actingUser?.id]);

    useEffect(() => {
        void fetchSettings();
    }, [fetchSettings]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(ENDPOINTS.API_TOKEN_SETTINGS.LIST, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    acting_user_id: actingUser?.id,
                    veriff_api_key: settings.veriff_api_key,
                    veriff_hmac_secret: settings.veriff_hmac_secret,
                    veriff_aml_api_key: settings.veriff_aml_api_key,
                    veriff_aml_hmac_secret: settings.veriff_aml_hmac_secret,
                    veriff_monthly_limit: settings.veriff_monthly_limit,
                    veriff_yearly_limit: settings.veriff_yearly_limit,
                    dilisense_api_key: settings.dilisense_api_key,
                    dilisense_monthly_limit: settings.dilisense_monthly_limit,
                    dilisense_yearly_limit: settings.dilisense_yearly_limit,
                }),
            });

            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.message || 'Failed to update API token settings.');
            }

            setConfirmModal({
                isOpen: true,
                title: 'Saved Successfully',
                message: 'Veriff KYC, Veriff AML, and Dilisense configuration updated.',
                type: 'success',
                isAlert: true,
            });

            void fetchSettings();
        } catch (error) {
            setConfirmModal({
                isOpen: true,
                title: 'Error Saving Settings',
                message: error instanceof Error ? error.message : 'An error occurred.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setSaving(false);
        }
    };

    const getProgressInfo = (usage: number, limit: number) => {
        if (limit <= 0) {
            return {
                percentage: 100,
                text: 'Unlimited',
                colorClass: 'bg-gradient-to-r from-teal-400 to-indigo-500',
                remaining: 'Unlimited',
                bgClass: 'bg-teal-500/10'
            };
        }
        const remaining = Math.max(0, limit - usage);
        const percentage = Math.round((remaining / limit) * 100);
        let colorClass = 'bg-gradient-to-r from-emerald-400 to-teal-500';
        let bgClass = 'bg-emerald-500/10';

        if (percentage < 20) {
            colorClass = 'bg-gradient-to-r from-red-500 to-rose-600';
            bgClass = 'bg-rose-500/10';
        } else if (percentage < 50) {
            colorClass = 'bg-gradient-to-r from-amber-400 to-orange-500';
            bgClass = 'bg-amber-500/10';
        }

        return {
            percentage,
            text: `${remaining} / ${limit} Remaining (${percentage}%)`,
            colorClass,
            remaining,
            bgClass
        };
    };

    const veriffMonthly = getProgressInfo(settings.veriff_monthly_usage, settings.veriff_monthly_limit);
    const veriffYearly = getProgressInfo(settings.veriff_yearly_usage, settings.veriff_yearly_limit);
    const dilisenseMonthly = getProgressInfo(settings.dilisense_monthly_usage, settings.dilisense_monthly_limit);
    const dilisenseYearly = getProgressInfo(settings.dilisense_yearly_usage, settings.dilisense_yearly_limit);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeModal}
                onConfirm={closeModal}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
            />

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Key className="w-7 h-7 text-slate-500 dark:text-slate-300" />
                        API Token Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Set API keys and configure monthly & yearly token limits for Veriff and Dilisense.
                    </p>
                </div>
                <div className="flex items-center gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => void fetchSettings()}
                        disabled={saving || loading}
                        className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 hover:scale-105 active:scale-95 transition-all duration-150 group border-0 bg-gradient-to-r from-teal-500 to-teal-600 text-white disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="card-glass p-8 text-center text-slate-500 dark:text-slate-300 animate-pulse">
                    Loading API configuration and remaining token quotas...
                </div>
            ) : (
                <form id="api-tokens-form" onSubmit={(e) => void handleSave(e)} className="space-y-8">
                    {/* VERIFF SERVICES */}
                    <div className="card-glass p-6 space-y-6">
                        <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
                            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Veriff KYC Integration</h2>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Identity verification and biometric liveness checks</p>
                            </div>
                        </div>

                        {/* Quotas Visualization */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/40 dark:bg-slate-950/20 border border-white/10 rounded-2xl p-5 space-y-3">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-slate-500 dark:text-slate-300 text-xs">Monthly Token Quota</span>
                                    <span className="text-slate-800 dark:text-slate-200">{veriffMonthly.text}</span>
                                </div>
                                <div className="h-3 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${veriffMonthly.colorClass}`}
                                        style={{ width: `${veriffMonthly.percentage}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Used: {settings.veriff_monthly_usage} calls</span>
                                    <span>Limit: {settings.veriff_monthly_limit === 0 ? 'Unlimited' : `${settings.veriff_monthly_limit} calls`}</span>
                                </div>
                            </div>

                            <div className="bg-white/40 dark:bg-slate-950/20 border border-white/10 rounded-2xl p-5 space-y-3">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-slate-500 dark:text-slate-300 text-xs">Yearly Token Quota</span>
                                    <span className="text-slate-800 dark:text-slate-200">{veriffYearly.text}</span>
                                </div>
                                <div className="h-3 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${veriffYearly.colorClass}`}
                                        style={{ width: `${veriffYearly.percentage}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Used: {settings.veriff_yearly_usage} calls</span>
                                    <span>Limit: {settings.veriff_yearly_limit === 0 ? 'Unlimited' : `${settings.veriff_yearly_limit} calls`}</span>
                                </div>
                            </div>
                        </div>

                        {/* Credentials / Quotas Limits configuration inputs */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Veriff API Client Key</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                            <Lock className="w-4 h-4" />
                                        </span>
                                        <input
                                            type={showVeriffKey ? 'text' : 'password'}
                                            className="input-glass w-full pl-10 pr-12"
                                            value={settings.veriff_api_key}
                                            onChange={(e) => setSettings({ ...settings, veriff_api_key: e.target.value })}
                                            placeholder="Enter Veriff API Client Key"
                                            disabled={!canEdit}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowVeriffKey(!showVeriffKey)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            {showVeriffKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Veriff HMAC Signature Secret</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                            <Lock className="w-4 h-4" />
                                        </span>
                                        <input
                                            type={showVeriffSecret ? 'text' : 'password'}
                                            className="input-glass w-full pl-10 pr-12"
                                            value={settings.veriff_hmac_secret}
                                            onChange={(e) => setSettings({ ...settings, veriff_hmac_secret: e.target.value })}
                                            placeholder="Enter Veriff HMAC Secret"
                                            disabled={!canEdit}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowVeriffSecret(!showVeriffSecret)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            {showVeriffSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Veriff AML API Client Key</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                            <Lock className="w-4 h-4" />
                                        </span>
                                        <input
                                            type={showVeriffAmlKey ? 'text' : 'password'}
                                            className="input-glass w-full pl-10 pr-12"
                                            value={settings.veriff_aml_api_key}
                                            onChange={(e) => setSettings({ ...settings, veriff_aml_api_key: e.target.value })}
                                            placeholder="Optional dedicated AML API key"
                                            disabled={!canEdit}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowVeriffAmlKey(!showVeriffAmlKey)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            {showVeriffAmlKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Veriff AML HMAC Secret</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                            <Lock className="w-4 h-4" />
                                        </span>
                                        <input
                                            type={showVeriffAmlSecret ? 'text' : 'password'}
                                            className="input-glass w-full pl-10 pr-12"
                                            value={settings.veriff_aml_hmac_secret}
                                            onChange={(e) => setSettings({ ...settings, veriff_aml_hmac_secret: e.target.value })}
                                            placeholder="Optional dedicated AML HMAC secret"
                                            disabled={!canEdit}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowVeriffAmlSecret(!showVeriffAmlSecret)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            {showVeriffAmlSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Monthly Quota Token Limit (0 for Unlimited)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="input-glass w-full"
                                        value={settings.veriff_monthly_limit}
                                        onChange={(e) => setSettings({ ...settings, veriff_monthly_limit: Math.max(0, parseInt(e.target.value) || 0) })}
                                        placeholder="0"
                                        disabled={!canEdit}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Yearly Quota Token Limit (0 for Unlimited)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="input-glass w-full"
                                        value={settings.veriff_yearly_limit}
                                        onChange={(e) => setSettings({ ...settings, veriff_yearly_limit: Math.max(0, parseInt(e.target.value) || 0) })}
                                        placeholder="0"
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DILISENSE SERVICES */}
                    <div className="card-glass p-6 space-y-6">
                        <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
                            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dilisense AML Screening</h2>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Sanctions list checks, PEP screenings, and watchlists</p>
                            </div>
                        </div>

                        {/* Quotas Visualization */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/40 dark:bg-slate-950/20 border border-white/10 rounded-2xl p-5 space-y-3">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-slate-500 dark:text-slate-300 text-xs">Monthly Token Quota</span>
                                    <span className="text-slate-800 dark:text-slate-200">{dilisenseMonthly.text}</span>
                                </div>
                                <div className="h-3 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${dilisenseMonthly.colorClass}`}
                                        style={{ width: `${dilisenseMonthly.percentage}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Used: {settings.dilisense_monthly_usage} calls</span>
                                    <span>Limit: {settings.dilisense_monthly_limit === 0 ? 'Unlimited' : `${settings.dilisense_monthly_limit} calls`}</span>
                                </div>
                            </div>

                            <div className="bg-white/40 dark:bg-slate-950/20 border border-white/10 rounded-2xl p-5 space-y-3">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-slate-500 dark:text-slate-300 text-xs">Yearly Token Quota</span>
                                    <span className="text-slate-800 dark:text-slate-200">{dilisenseYearly.text}</span>
                                </div>
                                <div className="h-3 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${dilisenseYearly.colorClass}`}
                                        style={{ width: `${dilisenseYearly.percentage}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>Used: {settings.dilisense_yearly_usage} calls</span>
                                    <span>Limit: {settings.dilisense_yearly_limit === 0 ? 'Unlimited' : `${settings.dilisense_yearly_limit} calls`}</span>
                                </div>
                            </div>
                        </div>

                        {/* Credentials / Quotas Limits configuration inputs */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="space-y-4 justify-between flex flex-col">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Dilisense API Key</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                                            <Lock className="w-4 h-4" />
                                        </span>
                                        <input
                                            type={showDilisenseKey ? 'text' : 'password'}
                                            className="input-glass w-full pl-10 pr-12"
                                            value={settings.dilisense_api_key}
                                            onChange={(e) => setSettings({ ...settings, dilisense_api_key: e.target.value })}
                                            placeholder="Enter Dilisense API Key (x-api-key)"
                                            disabled={!canEdit}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowDilisenseKey(!showDilisenseKey)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            {showDilisenseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-white/10 bg-white/20 dark:bg-slate-900/10 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                    <p className="font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-teal-500" /> Database Credential Fallback</p>
                                    <p>If left blank, the system will fall back to reading `DILISENSE_API_KEY` from the system environment variables (`.env` file).</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Monthly Quota Token Limit (0 for Unlimited)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="input-glass w-full"
                                        value={settings.dilisense_monthly_limit}
                                        onChange={(e) => setSettings({ ...settings, dilisense_monthly_limit: Math.max(0, parseInt(e.target.value) || 0) })}
                                        placeholder="0"
                                        disabled={!canEdit}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Yearly Quota Token Limit (0 for Unlimited)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="input-glass w-full"
                                        value={settings.dilisense_yearly_limit}
                                        onChange={(e) => setSettings({ ...settings, dilisense_yearly_limit: Math.max(0, parseInt(e.target.value) || 0) })}
                                        placeholder="0"
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                        </div>

                        {canEdit && (
                            <div className="flex justify-end border-t border-slate-100 dark:border-slate-700/50 pt-5">
                                <button
                                    type="submit"
                                    disabled={saving || loading}
                                    className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 disabled:opacity-50"
                                >
                                    <Save className="w-5 h-5" />
                                    <span>{saving ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            )}
        </div>
    );
}
