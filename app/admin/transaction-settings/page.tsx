'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../components/ConfirmModal';
import { Save, SlidersHorizontal } from 'lucide-react';

type Channel = 'app' | 'backend';
type Period = 'month' | 'year';

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
    const actingUser = useMemo(() => getStoredUser<{ id?: string | number; username?: string; name?: string }>(), []);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [values, setValues] = useState<Record<string, string>>({
        [keyOf('app', 'month')]: '0.00',
        [keyOf('app', 'year')]: '0.00',
        [keyOf('backend', 'month')]: '0.00',
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

    useEffect(() => {
        const load = async () => {
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
                        const period = row.period === 'year' ? 'year' : 'month';
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
        };

        void load();
    }, [actingUser?.id]);

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
                { channel: 'app', period: 'month', currency: 'GBP', limit_amount: Number(values[keyOf('app', 'month')]) || 0, active: 'yes' },
                { channel: 'app', period: 'year', currency: 'GBP', limit_amount: Number(values[keyOf('app', 'year')]) || 0, active: 'yes' },
                { channel: 'backend', period: 'month', currency: 'GBP', limit_amount: Number(values[keyOf('backend', 'month')]) || 0, active: 'yes' },
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
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-20">
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

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <SlidersHorizontal className="w-7 h-7 text-slate-500 dark:text-slate-300" />
                        Transaction Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Configure monthly and yearly transaction limits for app and backend transfers.</p>
                </div>
                <button
                    onClick={() => void handleSave()}
                    disabled={saving || loading}
                    className="btn-primary rounded-full px-6 py-3 inline-flex items-center gap-2 disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            <div className="card-glass p-6 md:p-8 space-y-6">
                {loading ? (
                    <div className="py-10 text-center text-slate-500 dark:text-slate-300">Loading transaction settings...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/30 p-5 space-y-4">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">App Limits (GBP)</div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Monthly Limit</label>
                                <input
                                    className="input-glass w-full"
                                    inputMode="decimal"
                                    value={values[keyOf('app', 'month')]}
                                    onChange={(e) => updateDraft('app', 'month', e.target.value)}
                                    onBlur={() => normalizeBlur('app', 'month')}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Yearly Limit</label>
                                <input
                                    className="input-glass w-full"
                                    inputMode="decimal"
                                    value={values[keyOf('app', 'year')]}
                                    onChange={(e) => updateDraft('app', 'year', e.target.value)}
                                    onBlur={() => normalizeBlur('app', 'year')}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/30 p-5 space-y-4">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">Backend Limits (GBP)</div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Monthly Limit</label>
                                <input
                                    className="input-glass w-full"
                                    inputMode="decimal"
                                    value={values[keyOf('backend', 'month')]}
                                    onChange={(e) => updateDraft('backend', 'month', e.target.value)}
                                    onBlur={() => normalizeBlur('backend', 'month')}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Yearly Limit</label>
                                <input
                                    className="input-glass w-full"
                                    inputMode="decimal"
                                    value={values[keyOf('backend', 'year')]}
                                    onChange={(e) => updateDraft('backend', 'year', e.target.value)}
                                    onBlur={() => normalizeBlur('backend', 'year')}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

