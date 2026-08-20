'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { showToast } from '@/app/lib/toast';
import { Save, CalendarClock, History } from 'lucide-react';
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
    const { canEdit } = usePagePermissions('API_TOKENS');
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
                    Allocate screening credits to a month. A month without its own allocation uses the
                    application-wide limit.
                </p>
            </div>

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
