'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../components/ConfirmModal';
import { PoundSterling, RefreshCw, Save, SlidersHorizontal } from 'lucide-react';
import { usePagePermissions } from '@/app/lib/permissions';

type Channel = 'app' | 'backend';
type Period = 'quarter' | 'year';

type TransactionSetting = {
    id?: string | number;
    channel: Channel;
    period: Period;
    currency: string;
    limit_amount: string | number;
    active?: string;
    updated_by?: string | null;
    updated_at?: string | null;
};

const keyOf = (channel: Channel, period: Period) => `${channel}::${period}`;

const toNumberDraft = (value: string): string => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length <= 1) return cleaned;
    return `${parts[0]}.${parts.slice(1).join('')}`;
};

const toFixed2 = (value: string): string => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return '0.00';
    return n.toFixed(2);
};

export default function TransactionSettingsPage() {
    const { canEdit } = usePagePermissions('TRANSACTION_SETTINGS');
    const actingUser = useMemo(() => getStoredUser<{ id?: string | number; username?: string; name?: string }>(), []);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [values, setValues] = useState<Record<string, string>>({
        [keyOf('app', 'quarter')]: '0.00',
        [keyOf('app', 'year')]: '0.00',
        [keyOf('backend', 'quarter')]: '0.00',
        [keyOf('backend', 'year')]: '0.00',
    });

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
                ? `${ENDPOINTS.TRANSACTION_SETTINGS.LIST}?acting_user_id=${encodeURIComponent(String(actingUser.id))}`
                : ENDPOINTS.TRANSACTION_SETTINGS.LIST;
            const res = await fetch(url);
            const data = await res.json().catch(() => []);
            const rows = Array.isArray(data) ? (data as TransactionSetting[]) : (data?.items as TransactionSetting[]) || [];

            setValues((prev) => {
                const next = { ...prev };
                for (const row of rows) {
                    const channel = row.channel === 'app' ? 'app' : 'backend';
                    const period = row.period === 'year' ? 'year' : 'quarter';
                    const key = keyOf(channel, period);
                    next[key] = toFixed2(String(row.limit_amount ?? '0'));
                }
                return next;
            });
        } catch {
            // keep defaults
        } finally {
            setLoading(false);
        }
    }, [actingUser?.id]);

    useEffect(() => {
        void fetchSettings();
    }, [fetchSettings]);

    const updateDraft = (channel: Channel, period: Period, draft: string) => {
        const key = keyOf(channel, period);
        setValues((prev) => ({ ...prev, [key]: toNumberDraft(draft) }));
    };

    const normalizeBlur = (channel: Channel, period: Period) => {
        const key = keyOf(channel, period);
        setValues((prev) => ({ ...prev, [key]: toFixed2(prev[key]) }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const items: TransactionSetting[] = [
                { channel: 'app', period: 'quarter', currency: 'GBP', limit_amount: Number(values[keyOf('app', 'quarter')]) || 0, active: 'yes' },
                { channel: 'app', period: 'year', currency: 'GBP', limit_amount: Number(values[keyOf('app', 'year')]) || 0, active: 'yes' },
                { channel: 'backend', period: 'quarter', currency: 'GBP', limit_amount: Number(values[keyOf('backend', 'quarter')]) || 0, active: 'yes' },
                { channel: 'backend', period: 'year', currency: 'GBP', limit_amount: Number(values[keyOf('backend', 'year')]) || 0, active: 'yes' },
            ];

            const res = await fetch(ENDPOINTS.TRANSACTION_SETTINGS.LIST, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acting_user_id: actingUser?.id,
                    items,
                }),
            });

            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.message || 'Failed to update transaction settings.');
            }

            setConfirmModal({
                isOpen: true,
                title: 'Saved',
                message: 'Transaction settings updated.',
                type: 'success',
                isAlert: true,
            });
        } catch (error) {
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to update transaction settings.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setSaving(false);
        }
    };

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
                        <SlidersHorizontal className="w-7 h-7 text-slate-500 dark:text-slate-300" />
                        Transaction Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Configure monthly and yearly transaction limits for app and backend transfers.
                    </p>
                </div>
                <div className="flex items-center gap-3 justify-end">
                    <button
                        onClick={() => void fetchSettings()}
                        disabled={saving}
                        className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 hover:scale-105 active:scale-95 transition-all duration-150 group border-0 bg-gradient-to-r from-teal-500 to-teal-600 text-white disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            <div className="card-glass p-5">
                {loading ? (
                    <div className="py-12 text-center text-slate-500 dark:text-slate-300 animate-pulse">
                        Loading transaction settings...
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/30 p-5 space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">App Limits (GBP)</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">3 Month Limit</label>
                                    <div className="relative input-icon">
                                        <span className="input-icon-left">
                                            <PoundSterling className="w-4 h-4" />
                                        </span>
                                        <input
                                            className="input-glass w-full"
                                            inputMode="decimal"
                                            value={values[keyOf('app', 'quarter')]}
                                            onChange={(e) => updateDraft('app', 'quarter', e.target.value)}
                                            onBlur={() => normalizeBlur('app', 'quarter')}
                                            placeholder="0.00"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Yearly Limit</label>
                                    <div className="relative input-icon">
                                        <span className="input-icon-left">
                                            <PoundSterling className="w-4 h-4" />
                                        </span>
                                        <input
                                            className="input-glass w-full"
                                            inputMode="decimal"
                                            value={values[keyOf('app', 'year')]}
                                            onChange={(e) => updateDraft('app', 'year', e.target.value)}
                                            onBlur={() => normalizeBlur('app', 'year')}
                                            placeholder="0.00"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/30 p-5 space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">Backend Limits (GBP)</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">3 Month Limit</label>
                                    <div className="relative input-icon">
                                        <span className="input-icon-left">
                                            <PoundSterling className="w-4 h-4" />
                                        </span>
                                        <input
                                            className="input-glass w-full"
                                            inputMode="decimal"
                                            value={values[keyOf('backend', 'quarter')]}
                                            onChange={(e) => updateDraft('backend', 'quarter', e.target.value)}
                                            onBlur={() => normalizeBlur('backend', 'quarter')}
                                            placeholder="0.00"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Yearly Limit</label>
                                    <div className="relative input-icon">
                                        <span className="input-icon-left">
                                            <PoundSterling className="w-4 h-4" />
                                        </span>
                                        <input
                                            className="input-glass w-full"
                                            inputMode="decimal"
                                            value={values[keyOf('backend', 'year')]}
                                            onChange={(e) => updateDraft('backend', 'year', e.target.value)}
                                            onBlur={() => normalizeBlur('backend', 'year')}
                                            placeholder="0.00"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {canEdit && (
                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => void handleSave()}
                                    disabled={saving || loading}
                                    className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 disabled:opacity-50"
                                >
                                    <Save className="w-5 h-5" />
                                    <span>{saving ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
