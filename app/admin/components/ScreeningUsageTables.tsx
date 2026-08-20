'use client';

import React, { useEffect, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { Gauge } from 'lucide-react';

export type UsageRow = {
    service: string;
    year: number;
    month: string;
    quota_limit: number;
    usage_count: number;
    remaining: number;
    allocated: boolean;
    entered_user?: string | null;
    entered_date?: string | null;
};

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function UsageTable({ title, rows }: { title: string; rows: UsageRow[] }) {
    const totalUsed = rows.reduce((sum, r) => sum + (r.usage_count || 0), 0);

    return (
        <div className="card-glass p-6">
            <div className="flex items-center gap-2 mb-4">
                <Gauge className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{title}</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2 pr-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Year</th>
                            <th className="py-2 pr-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Month</th>
                            <th className="py-2 pr-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide text-right">Quota Limit</th>
                            <th className="py-2 pr-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide text-right">Usage Count</th>
                            <th className="py-2 pr-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide text-right">Remaining</th>
                            <th className="py-2 pr-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Entered User</th>
                            <th className="py-2 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Entered Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={7} className="py-6 text-center text-slate-400">No usage recorded yet.</td></tr>
                        )}
                        {rows.map((r) => (
                            <tr key={`${r.service}-${r.year}-${r.month}`} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <td className="py-2.5 pr-4 tabular-nums text-slate-700 dark:text-slate-200">{r.year}</td>
                                <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">
                                    {MONTH_NAMES[parseInt(r.month, 10)] || r.month}
                                </td>
                                <td className="py-2.5 pr-4 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                                    {r.quota_limit.toLocaleString()}
                                    {!r.allocated && <span className="ml-1 text-[10px] text-slate-400">(default)</span>}
                                </td>
                                <td className="py-2.5 pr-4 text-right tabular-nums text-slate-800 dark:text-slate-100">{r.usage_count.toLocaleString()}</td>
                                <td className={`py-2.5 pr-4 text-right tabular-nums font-bold ${r.remaining === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {r.remaining.toLocaleString()}
                                </td>
                                <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400 text-xs">{r.entered_user || '—'}</td>
                                <td className="py-2.5 text-slate-500 dark:text-slate-400 text-xs">{r.entered_date || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot>
                            <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                                <td colSpan={3} className="py-2.5 font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">Total used</td>
                                <td className="py-2.5 pr-4 text-right tabular-nums font-extrabold text-slate-900 dark:text-white">{totalUsed.toLocaleString()}</td>
                                <td colSpan={3} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

export default function ScreeningUsageTables() {
    const [data, setData] = useState<{ dilisense: UsageRow[]; veriff: UsageRow[] }>({ dilisense: [], veriff: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(ENDPOINTS.SCREENING_USAGE.LIST);
                if (res.ok) {
                    const j = await res.json();
                    setData({ dilisense: j.dilisense || [], veriff: j.veriff || [] });
                }
            } catch {
                // the tables simply stay empty if usage cannot be read
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return <p className="text-sm text-slate-400 mt-8">Loading screening usage…</p>;
    }

    return (
        <div className="mt-8 space-y-6">
            <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Monthly Screening Usage</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Credits allocated to each month against the checks actually run.
                </p>
            </div>
            <UsageTable title="Dilisense Monthly Usage" rows={data.dilisense} />
            <UsageTable title="Veriff Monthly Usage" rows={data.veriff} />
        </div>
    );
}
