'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';

type LogRow = {
    id: number;
    logId: number;
    username: string;
    transfersImpact: number;
    transfersApproveImpact: number;
    logCountry: string;
    ip: string;
    signInTs: string;
    signOffTs: string | null;
    signOffNote: string;
};

const normalizeDate = (value?: string | null) => {
    if (!value) return '';
    return value.includes('T') ? value : value.replace(' ', 'T');
};

const mapApiLog = (log: any): LogRow => ({
    id: Number(log.id),
    logId: Number(log.id),
    username: log.username || '-',
    transfersImpact: Number(log.transfers_impact || 0),
    transfersApproveImpact: Number(log.transfers_approve_impact || 0),
    logCountry: log.log_country || '',
    ip: log.log_ip || '',
    signInTs: normalizeDate(log.sign_in),
    signOffTs: log.sign_off ? normalizeDate(log.sign_off) : null,
    signOffNote: log.sign_off_note || ''
});

const formatDateTime = (value: string | null) => {
    const normalized = normalizeDate(value);
    if (!normalized) return '';
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return '';
    const datePart = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: '2-digit'
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).format(date);
    return `${datePart} ${timePart}`;
};

const getSessionSeconds = (signIn: string, signOff: string | null) => {
    const startValue = normalizeDate(signIn);
    const endValue = normalizeDate(signOff);
    if (!startValue || !endValue) return 0;
    const start = new Date(startValue).getTime();
    const end = new Date(endValue).getTime();
    if (!start || !end || end < start) return 0;
    return Math.floor((end - start) / 1000);
};

const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function LogsPage() {
    const [logs, setLogs] = useState<LogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<string>('signInTs');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const res = await fetch(ENDPOINTS.LOGS.LIST);
                if (res.ok) {
                    const data = await res.json();
                    setLogs(Array.isArray(data) ? data.map(mapApiLog) : []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const logsWithSession = useMemo(() => {
        return logs.map((log) => {
            const sessionSeconds = getSessionSeconds(log.signInTs, log.signOffTs);
            return {
                ...log,
                sessionSeconds,
                sessionPeriod: formatDuration(sessionSeconds)
            };
        });
    }, [logs]);

    const searched = searchQuery.trim()
        ? logsWithSession.filter((l) => {
            const haystack = [
                l.logId,
                l.username,
                l.transfersImpact,
                l.transfersApproveImpact,
                l.logCountry,
                l.ip,
                formatDateTime(l.signInTs),
                formatDateTime(l.signOffTs),
                l.sessionPeriod,
                l.signOffNote
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(searchQuery.trim().toLowerCase());
        })
        : logsWithSession;

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const getSortValue = (log: any, key: string) => {
        switch (key) {
            case 'logId':
                return log.logId;
            case 'username':
                return log.username || '';
            case 'transfersImpact':
                return log.transfersImpact;
            case 'transfersApproveImpact':
                return log.transfersApproveImpact;
            case 'logCountry':
                return log.logCountry || '';
            case 'ip':
                return log.ip || '';
            case 'signInTs': {
                const value = normalizeDate(log.signInTs);
                const ts = value ? new Date(value).getTime() : 0;
                return Number.isNaN(ts) ? 0 : ts;
            }
            case 'signOffTs': {
                const value = normalizeDate(log.signOffTs);
                const ts = value ? new Date(value).getTime() : 0;
                return Number.isNaN(ts) ? 0 : ts;
            }
            case 'sessionPeriod':
                return log.sessionSeconds || 0;
            case 'signOffNote':
                return log.signOffNote || '';
            default:
                return log[key] || '';
        }
    };

    const sorted = [...searched].sort((a, b) => {
        const aVal = getSortValue(a, sortKey);
        const bVal = getSortValue(b, sortKey);
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const result = collator.compare(String(aVal), String(bVal));
        return sortDir === 'asc' ? result : -result;
    });

    const toggleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortIndicator = (key: string) => {
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">User Logs</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">View login sessions, activity, and sign-off details</p>
                </div>
            </div>

            <div className="card-glass p-6">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                <div className="relative input-icon">
                    <span className="input-icon-left">
                        <Search className="w-4 h-4" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search across all columns"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-glass w-full text-sm"
                    />
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60">
                    <div className="text-sm text-slate-500 dark:text-slate-300">
                        Results: {sorted.length === 0 ? 0 : 1} - {sorted.length} of {sorted.length}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">No.</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('logId')} className="flex items-center gap-1">
                                        Log Id <span className="text-slate-400 dark:text-slate-300">{sortIndicator('logId')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('username')} className="flex items-center gap-1">
                                        Username <span className="text-slate-400 dark:text-slate-300">{sortIndicator('username')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('transfersImpact')} className="flex items-center gap-1">
                                        Transfers Impact <span className="text-slate-400 dark:text-slate-300">{sortIndicator('transfersImpact')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('transfersApproveImpact')} className="flex items-center gap-1">
                                        Transfers Approve Impact <span className="text-slate-400 dark:text-slate-300">{sortIndicator('transfersApproveImpact')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('logCountry')} className="flex items-center gap-1">
                                        Log Country <span className="text-slate-400 dark:text-slate-300">{sortIndicator('logCountry')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('ip')} className="flex items-center gap-1">
                                        Log IP Address <span className="text-slate-400 dark:text-slate-300">{sortIndicator('ip')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('signInTs')} className="flex items-center gap-1">
                                        Sign In <span className="text-slate-400 dark:text-slate-300">{sortIndicator('signInTs')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('signOffTs')} className="flex items-center gap-1">
                                        Sign Off <span className="text-slate-400 dark:text-slate-300">{sortIndicator('signOffTs')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('sessionPeriod')} className="flex items-center gap-1">
                                        Session Period <span className="text-slate-400 dark:text-slate-300">{sortIndicator('sessionPeriod')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Sign Off Note</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {loading ? (
                                <tr>
                                    <td colSpan={11} className="px-6 py-10 text-center text-slate-500 dark:text-slate-300">
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : (
                                sorted.map((log, idx) => (
                                <tr key={log.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{idx + 1}</td>
                                    <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{log.logId}</td>
                                    <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{log.username}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{log.transfersImpact}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{log.transfersApproveImpact}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{log.logCountry || '-'}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-mono">{log.ip}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime(log.signInTs)}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime(log.signOffTs)}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{log.sessionPeriod}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 min-w-[260px]">{log.signOffNote}</td>
                                </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
