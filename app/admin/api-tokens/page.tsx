'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import {
    BarChart3,
    CheckCircle2,
    CircleAlert,
    Clock3,
    RefreshCw,
    Save,
    ScanFace,
    SearchCheck,
    ShieldCheck,
} from 'lucide-react';
import { usePagePermissions } from '@/app/lib/permissions';

type LimitField =
    | 'veriff_monthly_limit'
    | 'veriff_yearly_limit'
    | 'dilisense_monthly_limit'
    | 'dilisense_yearly_limit';

type IntegrationUsageSettings = {
    veriff_configured: boolean;
    veriff_aml_configured: boolean;
    veriff_monthly_limit: number;
    veriff_yearly_limit: number;
    veriff_monthly_usage: number;
    veriff_yearly_usage: number;
    veriff_monthly_remaining: number | null;
    veriff_yearly_remaining: number | null;
    veriff_last_used_at: string | null;
    dilisense_configured: boolean;
    dilisense_monthly_limit: number;
    dilisense_yearly_limit: number;
    dilisense_monthly_usage: number;
    dilisense_yearly_usage: number;
    dilisense_monthly_remaining: number | null;
    dilisense_yearly_remaining: number | null;
    dilisense_last_used_at: string | null;
};

type Quota = {
    usage: number;
    limit: number;
    remaining: number | null;
};

const emptySettings: IntegrationUsageSettings = {
    veriff_configured: false,
    veriff_aml_configured: false,
    veriff_monthly_limit: 0,
    veriff_yearly_limit: 0,
    veriff_monthly_usage: 0,
    veriff_yearly_usage: 0,
    veriff_monthly_remaining: null,
    veriff_yearly_remaining: null,
    veriff_last_used_at: null,
    dilisense_configured: false,
    dilisense_monthly_limit: 0,
    dilisense_yearly_limit: 0,
    dilisense_monthly_usage: 0,
    dilisense_yearly_usage: 0,
    dilisense_monthly_remaining: null,
    dilisense_yearly_remaining: null,
    dilisense_last_used_at: null,
};

const quotaFields: { label: string; field: LimitField }[] = [
    { label: 'Veriff monthly', field: 'veriff_monthly_limit' },
    { label: 'Veriff yearly', field: 'veriff_yearly_limit' },
    { label: 'Dilisense monthly', field: 'dilisense_monthly_limit' },
    { label: 'Dilisense yearly', field: 'dilisense_yearly_limit' },
];

function quotaProgress({ usage, limit, remaining }: Quota) {
    if (limit <= 0 || remaining === null) {
        return {
            width: 100,
            label: 'No application cap',
            detail: `${usage.toLocaleString()} successful calls recorded`,
            color: 'bg-gradient-to-r from-sky-400 to-teal-400',
        };
    }

    const percentage = Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));
    const color = percentage < 20
        ? 'bg-gradient-to-r from-rose-500 to-red-500'
        : percentage < 50
            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
            : 'bg-gradient-to-r from-emerald-400 to-teal-500';

    return {
        width: percentage,
        label: `${remaining.toLocaleString()} remaining`,
        detail: `${usage.toLocaleString()} of ${limit.toLocaleString()} successful calls used`,
        color,
    };
}

function formatLastUsed(value: string | null): string {
    if (!value) return 'No successful calls recorded yet';

    const date = new Date(value.replace(' ', 'T'));
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusPill({ configured }: { configured: boolean }) {
    return configured ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Configured
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">
            <CircleAlert className="h-3.5 w-3.5" /> Needs server configuration
        </span>
    );
}

function QuotaCard({ title, quota }: { title: string; quota: Quota }) {
    const progress = quotaProgress(quota);

    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 dark:border-white/10 dark:bg-slate-950/20">
            <div className="flex items-center justify-between gap-3 text-sm font-bold">
                <span className="text-slate-600 dark:text-slate-300">{title}</span>
                <span className="text-slate-900 dark:text-white">{progress.label}</span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/70">
                <div className={`h-full rounded-full transition-all duration-500 ${progress.color}`} style={{ width: `${progress.width}%` }} />
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{progress.detail}</p>
        </div>
    );
}

export default function ApiTokensPage() {
    const { canEdit } = usePagePermissions('API_TOKENS');
    const actingUser = useMemo(() => getStoredUser<{ id?: string | number }>(), []);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<IntegrationUsageSettings>(emptySettings);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchSettings = useCallback(async (clearNotice = true) => {
        setLoading(true);
        if (clearNotice) {
            setNotice(null);
        }
        try {
            const url = actingUser?.id
                ? `${ENDPOINTS.API_TOKEN_SETTINGS.LIST}?acting_user_id=${encodeURIComponent(String(actingUser.id))}`
                : ENDPOINTS.API_TOKEN_SETTINGS.LIST;
            const response = await fetch(url);
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.message || 'Unable to load integration usage.');
            }

            setSettings({
                ...emptySettings,
                ...payload,
                veriff_monthly_limit: Number(payload.veriff_monthly_limit) || 0,
                veriff_yearly_limit: Number(payload.veriff_yearly_limit) || 0,
                veriff_monthly_usage: Number(payload.veriff_monthly_usage) || 0,
                veriff_yearly_usage: Number(payload.veriff_yearly_usage) || 0,
                dilisense_monthly_limit: Number(payload.dilisense_monthly_limit) || 0,
                dilisense_yearly_limit: Number(payload.dilisense_yearly_limit) || 0,
                dilisense_monthly_usage: Number(payload.dilisense_monthly_usage) || 0,
                dilisense_yearly_usage: Number(payload.dilisense_yearly_usage) || 0,
                veriff_monthly_remaining: payload.veriff_monthly_remaining === null ? null : Number(payload.veriff_monthly_remaining),
                veriff_yearly_remaining: payload.veriff_yearly_remaining === null ? null : Number(payload.veriff_yearly_remaining),
                dilisense_monthly_remaining: payload.dilisense_monthly_remaining === null ? null : Number(payload.dilisense_monthly_remaining),
                dilisense_yearly_remaining: payload.dilisense_yearly_remaining === null ? null : Number(payload.dilisense_yearly_remaining),
            });
        } catch (error) {
            setNotice({
                type: 'error',
                text: error instanceof Error ? error.message : 'Unable to load integration usage.',
            });
        } finally {
            setLoading(false);
        }
    }, [actingUser?.id]);

    useEffect(() => {
        void fetchSettings();
    }, [fetchSettings]);

    const saveLimits = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setNotice(null);
        try {
            const response = await fetch(ENDPOINTS.API_TOKEN_SETTINGS.LIST, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acting_user_id: actingUser?.id,
                    veriff_monthly_limit: settings.veriff_monthly_limit,
                    veriff_yearly_limit: settings.veriff_yearly_limit,
                    dilisense_monthly_limit: settings.dilisense_monthly_limit,
                    dilisense_yearly_limit: settings.dilisense_yearly_limit,
                }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.message || 'Unable to save integration limits.');
            }

            setNotice({ type: 'success', text: payload?.message || 'Integration usage limits saved.' });
            await fetchSettings(false);
        } catch (error) {
            setNotice({
                type: 'error',
                text: error instanceof Error ? error.message : 'Unable to save integration limits.',
            });
        } finally {
            setSaving(false);
        }
    };

    const updateLimit = (field: LimitField, value: string) => {
        setSettings((current) => ({
            ...current,
            [field]: Math.max(0, Number.parseInt(value, 10) || 0),
        }));
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-fade-in-up">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        <BarChart3 className="h-8 w-8 text-teal-500" />
                        Integration Usage
                    </h1>
                    <p className="mt-2 max-w-3xl font-medium text-slate-500 dark:text-slate-400">
                        Monitor successful Veriff and Dilisense calls and set application safeguards before their quotas are reached.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void fetchSettings()}
                    disabled={loading || saving}
                    className="btn-primary inline-flex items-center justify-center gap-2 rounded-full border-0 bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all duration-150 hover:scale-105 hover:shadow-teal-500/40 active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {notice && (
                <div className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${notice.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200'}`}>
                    {notice.text}
                </div>
            )}

            {loading ? (
                <div className="card-glass p-10 text-center font-medium text-slate-500 dark:text-slate-300 animate-pulse">
                    Loading integration usage...
                </div>
            ) : (
                <form onSubmit={(event) => void saveLimits(event)} className="space-y-8">
                    <section className="card-glass overflow-hidden p-6">
                        <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-600 dark:text-teal-300"><ScanFace className="h-6 w-6" /></div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Veriff</h2>
                                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">KYC, liveness, PEP and sanctions screening.</p>
                                </div>
                            </div>
                            <StatusPill configured={settings.veriff_configured || settings.veriff_aml_configured} />
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-100/70 px-4 py-3 text-sm dark:bg-slate-900/40"><span className="font-semibold text-slate-500 dark:text-slate-400">KYC and liveness: </span><span className="font-bold text-slate-900 dark:text-white">{settings.veriff_configured ? 'Configured' : 'Not configured'}</span></div>
                            <div className="rounded-xl bg-slate-100/70 px-4 py-3 text-sm dark:bg-slate-900/40"><span className="font-semibold text-slate-500 dark:text-slate-400">PEP and sanctions: </span><span className="font-bold text-slate-900 dark:text-white">{settings.veriff_aml_configured ? 'Configured' : 'Not configured'}</span></div>
                        </div>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <QuotaCard title="This month" quota={{ usage: settings.veriff_monthly_usage, limit: settings.veriff_monthly_limit, remaining: settings.veriff_monthly_remaining }} />
                            <QuotaCard title="This year" quota={{ usage: settings.veriff_yearly_usage, limit: settings.veriff_yearly_limit, remaining: settings.veriff_yearly_remaining }} />
                        </div>
                        <p className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><Clock3 className="h-4 w-4" /> Last successful application call: {formatLastUsed(settings.veriff_last_used_at)}</p>
                    </section>

                    <section className="card-glass overflow-hidden p-6">
                        <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-600 dark:text-sky-300"><SearchCheck className="h-6 w-6" /></div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dilisense</h2>
                                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">AML watchlist, sanctions and adverse-media checks.</p>
                                </div>
                            </div>
                            <StatusPill configured={settings.dilisense_configured} />
                        </div>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <QuotaCard title="This month" quota={{ usage: settings.dilisense_monthly_usage, limit: settings.dilisense_monthly_limit, remaining: settings.dilisense_monthly_remaining }} />
                            <QuotaCard title="This year" quota={{ usage: settings.dilisense_yearly_usage, limit: settings.dilisense_yearly_limit, remaining: settings.dilisense_yearly_remaining }} />
                        </div>
                        <p className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><Clock3 className="h-4 w-4" /> Last successful application call: {formatLastUsed(settings.dilisense_last_used_at)}</p>
                    </section>

                    <section className="rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-white/60 to-sky-500/10 p-6 dark:from-teal-500/10 dark:via-slate-950/30 dark:to-sky-500/10">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-teal-600 dark:text-teal-300" />
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Application quota safeguards</h2>
                                <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-300">
                                    These are LinkForex limits based on successful calls tracked by this application, not a live balance from Veriff or Dilisense billing. Set them to the quota on your provider plan. A value of 0 means no application cap.
                                </p>
                            </div>
                        </div>

                        {canEdit ? (
                            <>
                                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                                    {quotaFields.map(({ label, field }) => (
                                        <label key={field} className="block">
                                            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{label} limit</span>
                                            <input
                                                type="number"
                                                min="0"
                                                inputMode="numeric"
                                                className="input-glass w-full"
                                                value={settings[field]}
                                                onChange={(event) => updateLimit(field, event.target.value)}
                                            />
                                        </label>
                                    ))}
                                </div>
                                <div className="mt-6 flex justify-end border-t border-teal-500/15 pt-5">
                                    <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 border-0 bg-gradient-to-r from-teal-500 to-teal-600 text-white disabled:opacity-50">
                                        <Save className="h-5 w-5" /> {saving ? 'Saving...' : 'Save quota limits'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="mt-5 rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/20 dark:text-slate-300">
                                You have view-only access. Grant the <strong>Integration Usage: EDIT</strong> permission to change safeguards.
                            </p>
                        )}
                    </section>
                </form>
            )}
        </div>
    );
}
