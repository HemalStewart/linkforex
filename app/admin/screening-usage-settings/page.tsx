'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { showToast } from '@/app/lib/toast';
import { Save, CalendarClock, History, Repeat } from 'lucide-react';
import ScreeningUsageTables from '@/app/admin/components/ScreeningUsageTables';
import { usePagePermissions } from '@/app/lib/permissions';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const SERVICES = [
    { value: 'dilisense', label: 'Dilisense' },
    { value: 'veriff', label: 'Veriff' },
];

type Allocation = { service: string; year: number; month: number; quota_limit: number };

export default function ScreeningUsageSettingsPage() {
    const { canEdit } = usePagePermissions('API_TOKEN_QUOTAS');
    const now = useMemo(() => new Date(), []);

    // Next month is the common case, so the form opens on it.
    const next = useMemo(() => {
        const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
    }, [now]);

    const [form, setForm] = useState<Allocation>({
        service: 'dilisense',
        year: next.year,
        month: next.month,
        quota_limit: 500,
    });
    const [saving, setSaving] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    // The default applies to any month that has not been given its own
    // allocation, including every future month.
    const [defaults, setDefaults] = useState({ dilisense_monthly_limit: 0, veriff_monthly_limit: 0 });
    const [defaultsLoaded, setDefaultsLoaded] = useState(false);
    const [savingDefaults, setSavingDefaults] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(ENDPOINTS.API_TOKEN_SETTINGS.LIST);
                if (res.ok) {
                    const j = await res.json();
                    const d = j?.data ?? j ?? {};
                    setDefaults({
                        dilisense_monthly_limit: Number(d.dilisense_monthly_limit ?? 0),
                        veriff_monthly_limit: Number(d.veriff_monthly_limit ?? 0),
                    });
                }
            } catch {
                // the fields simply stay at zero if the settings cannot be read
            } finally {
                setDefaultsLoaded(true);
            }
        })();
    }, []);

    const saveDefaults = async (e: React.FormEvent) => {
        e.preventDefault();
        if (savingDefaults) return;
        setSavingDefaults(true);
        try {
            const res = await fetch(ENDPOINTS.API_TOKEN_SETTINGS.LIST, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(defaults),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast('Error', body?.message || 'Could not save the default credits.', 'danger');
                return;
            }
            showToast('Saved', 'Default monthly credits updated. Months without their own allocation now use these figures.', 'success');
            setReloadKey(k => k + 1);
        } catch {
            showToast('Error', 'Could not save the default credits.', 'danger');
        } finally {
            setSavingDefaults(false);
        }
    };

    const years = useMemo(() => {
        const y = now.getFullYear();
        return [y - 2, y - 1, y, y + 1];
    }, [now]);

    const isPast = form.year < now.getFullYear()
        || (form.year === now.getFullYear() && form.month < now.getMonth() + 1);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const res = await fetch(ENDPOINTS.SCREENING_USAGE.QUOTA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast('Error', body?.messages?.error || body?.message || 'Could not save the quota.', 'danger');
                return;
            }
            showToast('Saved', `${SERVICES.find(s => s.value === form.service)?.label} quota for ${MONTHS[form.month - 1]} ${form.year} set to ${form.quota_limit}.`, 'success');
            setReloadKey(k => k + 1);
        } catch {
            showToast('Error', 'Could not save the quota.', 'danger');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20 animate-fade-in-up">
            <div className="mb-6">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Screening Usage Setting</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Allocate screening credits to a month, or change the default every month starts on.
                </p>

                <div className="mt-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/40 px-4 py-3">
                    <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                        <strong className="text-slate-800 dark:text-slate-100">How a new month gets its credits.</strong>{' '}
                        Nothing runs at midnight and no row is created in advance. A month simply uses the
                        default above until someone allocates it a figure of its own, at which point that
                        figure replaces the default for that month only. So the usage table always shows a
                        limit for the current month, whether or not anyone has touched it.
                    </p>
                </div>
            </div>

            <form onSubmit={saveDefaults} className="card-glass p-6 mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Repeat className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Default monthly credits</h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-2xl">
                    Every month starts on these figures. A month keeps them until you allocate it
                    something different below, so next month and the ones after it are already covered.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="def-dilisense" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Dilisense</label>
                        <input
                            id="def-dilisense"
                            type="number"
                            min={0}
                            value={defaults.dilisense_monthly_limit}
                            onChange={(e) => setDefaults({ ...defaults, dilisense_monthly_limit: Number(e.target.value) })}
                            className="input-glass w-full py-2.5 px-3 text-sm tabular-nums"
                        />
                    </div>
                    <div>
                        <label htmlFor="def-veriff" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Veriff</label>
                        <input
                            id="def-veriff"
                            type="number"
                            min={0}
                            value={defaults.veriff_monthly_limit}
                            onChange={(e) => setDefaults({ ...defaults, veriff_monthly_limit: Number(e.target.value) })}
                            className="input-glass w-full py-2.5 px-3 text-sm tabular-nums"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-slate-200/60 dark:border-slate-700/60 pt-5">
                    {canEdit ? (
                        <button type="submit" disabled={savingDefaults || !defaultsLoaded} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                            <Save className="h-4 w-4" /> {savingDefaults ? 'Saving…' : 'Save defaults'}
                        </button>
                    ) : (
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                            You have view-only access.
                        </p>
                    )}
                </div>
            </form>

            <form onSubmit={submit} className="card-glass p-6">
                <div className="flex items-center gap-2 mb-5">
                    {isPast
                        ? <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        : <CalendarClock className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {isPast ? 'Correct a previous month' : 'Allocate credits'}
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="service" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Provider</label>
                        <select
                            id="service"
                            value={form.service}
                            onChange={(e) => setForm({ ...form, service: e.target.value })}
                            className="input-glass w-full py-2.5 px-3 text-sm cursor-pointer"
                        >
                            {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="year" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Year</label>
                        <select
                            id="year"
                            value={form.year}
                            onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                            className="input-glass w-full py-2.5 px-3 text-sm cursor-pointer"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="month" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Month</label>
                        <select
                            id="month"
                            value={form.month}
                            onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                            className="input-glass w-full py-2.5 px-3 text-sm cursor-pointer"
                        >
                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="quota" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Allocated credits</label>
                        <input
                            id="quota"
                            type="number"
                            min={0}
                            value={form.quota_limit}
                            onChange={(e) => setForm({ ...form, quota_limit: Number(e.target.value) })}
                            className="input-glass w-full py-2.5 px-3 text-sm tabular-nums"
                        />
                    </div>
                </div>

                {isPast && (
                    <p className="mt-4 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        This month has already passed. Saving changes what that month was allowed, which changes
                        the usage figures reported below.
                    </p>
                )}

                <div className="mt-6 flex justify-end border-t border-slate-200/60 dark:border-slate-700/60 pt-5">
                    {canEdit ? (
                        <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save allocation'}
                        </button>
                    ) : (
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                            You have view-only access. Grant <strong>Screening Usage: EDIT</strong> to change allocations.
                        </p>
                    )}
                </div>
            </form>

            <ScreeningUsageTables key={reloadKey} />
        </div>
    );
}
