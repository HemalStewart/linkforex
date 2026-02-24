'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, Download, FilterX, RefreshCw, Search, ShieldAlert, UserCheck } from 'lucide-react';
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
    riskLabel: string;
};

type SessionLog = LogRow & {
    status: 'Active' | 'Closed';
    forcedSignOff: boolean;
    risk: 'Low' | 'Medium' | 'High' | 'N/A';
    activityScore: number;
    sessionSeconds: number;
    sessionPeriod: string;
    signInEpoch: number;
    signOffEpoch: number;
};

type DateRangeFilter = 'all' | 'today' | '7d' | '30d' | '90d';
type StatusFilter = 'all' | 'active' | 'closed';
type SortDir = 'asc' | 'desc';
type SortKey =
    | 'logId'
    | 'username'
    | 'status'
    | 'signInTs'
    | 'signOffTs'
    | 'duration'
    | 'logCountry'
    | 'ip'
    | 'transfersImpact'
    | 'transfersApproveImpact'
    | 'activityScore'
    | 'risk';

const normalizeDate = (value?: string | null): string => {
    if (!value) return '';
    return value.includes('T') ? value : value.replace(' ', 'T');
};

const toEpoch = (value?: string | null): number => {
    const normalized = normalizeDate(value);
    if (!normalized) return 0;
    const epoch = new Date(normalized).getTime();
    return Number.isNaN(epoch) ? 0 : epoch;
};

const firstNonEmpty = (source: Record<string, unknown>, keys: string[]): string => {
    for (const key of keys) {
        const value = source[key];
        if (value === null || value === undefined) continue;
        const text = String(value).trim();
        if (text) return text;
    }
    return '';
};

const mapApiLog = (log: Record<string, unknown>): LogRow => ({
    id: Number(log.id ?? 0),
    logId: Number(log.id ?? 0),
    username: firstNonEmpty(log, ['username', 'user_name', 'user', 'email']) || '-',
    transfersImpact: Number(log.transfers_impact ?? 0),
    transfersApproveImpact: Number(log.transfers_approve_impact ?? 0),
    logCountry: firstNonEmpty(log, ['log_country', 'country', 'logCountry', 'country_name']),
    ip: firstNonEmpty(log, ['log_ip', 'ip', 'ip_address', 'logIp']),
    signInTs: normalizeDate(firstNonEmpty(log, ['sign_in', 'signin', 'signed_in_at', 'created_at'])),
    signOffTs: firstNonEmpty(log, ['sign_off', 'signoff', 'signed_off_at', 'updated_at'])
        ? normalizeDate(firstNonEmpty(log, ['sign_off', 'signoff', 'signed_off_at', 'updated_at']))
        : null,
    signOffNote: firstNonEmpty(log, ['sign_off_note', 'signoff_note', 'note', 'remarks']),
    riskLabel: firstNonEmpty(log, ['risk', 'risk_level', 'log_risk', 'riskLabel'])
});

const formatDateTime = (value: string | null): string => {
    const epoch = toEpoch(value);
    if (!epoch) return '-';
    const date = new Date(epoch);
    const datePart = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date);
    return `${datePart} ${timePart}`;
};

const getSessionSeconds = (signInTs: string, signOffTs: string | null): number => {
    const start = toEpoch(signInTs);
    const end = toEpoch(signOffTs);
    if (!start || !end || end < start) return 0;
    return Math.floor((end - start) / 1000);
};

const formatDuration = (seconds: number): string => {
    if (!seconds) return '-';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
};

const looksForcedSignOff = (note: string): boolean => {
    const text = note.toLowerCase();
    if (!text) return false;
    return ['auto', 'expired', 'browser closed', 'timeout', 'session', 'terminated'].some((term) => text.includes(term));
};

const getRisk = (row: Omit<SessionLog, 'risk'>): SessionLog['risk'] => {
    const raw = row.riskLabel.trim().toLowerCase();
    if (raw === 'high') return 'High';
    if (raw === 'medium') return 'Medium';
    if (raw === 'low') return 'Low';
    return 'N/A';
};

const escapeCsv = (value: unknown): string => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

export default function LogsPage() {
    const [logs, setLogs] = useState<LogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [countryFilter, setCountryFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('30d');
    const [activityOnly, setActivityOnly] = useState(false);

    const [sortKey, setSortKey] = useState<SortKey>('signInTs');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(ENDPOINTS.LOGS.LIST);
            if (!res.ok) {
                throw new Error(`Failed to load logs (${res.status})`);
            }
            const data = await res.json();
            setLogs(Array.isArray(data) ? data.map((row) => mapApiLog(row as Record<string, unknown>)) : []);
        } catch (fetchError) {
            console.error(fetchError);
            setError('Could not load logs. Please refresh.');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const sessionLogs = useMemo<SessionLog[]>(() => {
        return logs.map((row) => {
            const signInEpoch = toEpoch(row.signInTs);
            const signOffEpoch = toEpoch(row.signOffTs);
            const sessionSeconds = getSessionSeconds(row.signInTs, row.signOffTs);
            const forcedSignOff = looksForcedSignOff(row.signOffNote);
            const status: SessionLog['status'] = row.signOffTs ? 'Closed' : 'Active';
            const activityScore = row.transfersImpact + row.transfersApproveImpact * 2;

            const base: Omit<SessionLog, 'risk'> = {
                ...row,
                status,
                forcedSignOff,
                activityScore,
                sessionSeconds,
                sessionPeriod: formatDuration(sessionSeconds),
                signInEpoch,
                signOffEpoch
            };

            return {
                ...base,
                risk: getRisk(base)
            };
        });
    }, [logs]);

    const countryOptions = useMemo(() => {
        const values = new Set<string>();
        sessionLogs.forEach((row) => {
            if (row.logCountry) values.add(row.logCountry);
        });
        return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
    }, [sessionLogs]);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const now = Date.now();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        return sessionLogs.filter((row) => {
            if (statusFilter === 'active' && row.status !== 'Active') return false;
            if (statusFilter === 'closed' && row.status !== 'Closed') return false;

            if (countryFilter !== 'all' && row.logCountry !== countryFilter) return false;
            if (activityOnly && row.activityScore <= 0) return false;

            if (dateRangeFilter !== 'all') {
                const signInEpoch = row.signInEpoch;
                if (!signInEpoch) return false;
                if (dateRangeFilter === 'today' && signInEpoch < startOfToday.getTime()) return false;
                if (dateRangeFilter === '7d' && signInEpoch < now - 7 * 24 * 60 * 60 * 1000) return false;
                if (dateRangeFilter === '30d' && signInEpoch < now - 30 * 24 * 60 * 60 * 1000) return false;
                if (dateRangeFilter === '90d' && signInEpoch < now - 90 * 24 * 60 * 60 * 1000) return false;
            }

            if (!query) return true;
            const haystack = [
                row.logId,
                row.username,
                row.status,
                row.risk,
                row.transfersImpact,
                row.transfersApproveImpact,
                row.activityScore,
                row.logCountry,
                row.ip,
                row.signOffNote,
                formatDateTime(row.signInTs),
                formatDateTime(row.signOffTs),
                row.sessionPeriod
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [activityOnly, countryFilter, dateRangeFilter, searchQuery, sessionLogs, statusFilter]);

    const sorted = useMemo(() => {
        const rankRisk: Record<SessionLog['risk'], number> = { 'N/A': 0, Low: 1, Medium: 2, High: 3 };
        const rankStatus: Record<SessionLog['status'], number> = { Closed: 1, Active: 2 };
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

        const getValue = (row: SessionLog): string | number => {
            switch (sortKey) {
                case 'logId':
                    return row.logId;
                case 'username':
                    return row.username;
                case 'status':
                    return rankStatus[row.status];
                case 'signInTs':
                    return row.signInEpoch;
                case 'signOffTs':
                    return row.signOffEpoch;
                case 'duration':
                    return row.sessionSeconds;
                case 'logCountry':
                    return row.logCountry;
                case 'ip':
                    return row.ip;
                case 'transfersImpact':
                    return row.transfersImpact;
                case 'transfersApproveImpact':
                    return row.transfersApproveImpact;
                case 'activityScore':
                    return row.activityScore;
                case 'risk':
                    return rankRisk[row.risk];
                default:
                    return row.logId;
            }
        };

        return [...filtered].sort((a, b) => {
            const aValue = getValue(a);
            const bValue = getValue(b);
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDir === 'asc' ? aValue - bValue : bValue - aValue;
            }
            const result = collator.compare(String(aValue || ''), String(bValue || ''));
            return sortDir === 'asc' ? result : -result;
        });
    }, [filtered, sortDir, sortKey]);

    const summary = useMemo(() => {
        const total = filtered.length;
        const active = filtered.filter((row) => row.status === 'Active').length;
        const forced = filtered.filter((row) => row.forcedSignOff).length;
        const transfersTouched = filtered.reduce((sum, row) => sum + row.transfersImpact, 0);
        const approvals = filtered.reduce((sum, row) => sum + row.transfersApproveImpact, 0);
        const closedSessions = filtered.filter((row) => row.status === 'Closed' && row.sessionSeconds > 0);
        const avgSessionSeconds = closedSessions.length
            ? Math.floor(closedSessions.reduce((sum, row) => sum + row.sessionSeconds, 0) / closedSessions.length)
            : 0;

        return {
            total,
            active,
            forced,
            transfersTouched,
            approvals,
            avgSessionSeconds
        };
    }, [filtered]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

    useEffect(() => {
        setPage(1);
    }, [searchQuery, statusFilter, countryFilter, dateRangeFilter, activityOnly, pageSize]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const startIndex = sorted.length === 0 ? 0 : (page - 1) * pageSize;
    const endIndex = sorted.length === 0 ? 0 : Math.min(startIndex + pageSize, sorted.length);
    const paged = sorted.slice(startIndex, endIndex);

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setCountryFilter('all');
        setDateRangeFilter('30d');
        setActivityOnly(false);
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortKey(key);
        setSortDir(key === 'signInTs' || key === 'signOffTs' ? 'desc' : 'asc');
    };

    const sortIndicator = (key: SortKey): string => {
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    const exportCsv = () => {
        const headers = [
            'Session ID',
            'User',
            'Status',
            'Risk',
            'Sign In',
            'Sign Off',
            'Duration',
            'Country',
            'IP',
            'Transfer Updates',
            'Approval Actions',
            'Activity Score',
            'Sign Off Note'
        ];

        const rows = sorted.map((row) => [
            row.logId,
            row.username,
            row.status,
            row.risk,
            formatDateTime(row.signInTs),
            formatDateTime(row.signOffTs),
            row.sessionPeriod,
            row.logCountry || '-',
            row.ip || '-',
            row.transfersImpact,
            row.transfersApproveImpact,
            row.activityScore,
            row.signOffNote || '-'
        ]);

        const csv = [headers, ...rows].map((line) => line.map(escapeCsv).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-session-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Session & Activity Logs</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
                        Track operator sessions, transfer touches, approvals, and sign-off reasons.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLogs}
                        className="glass-effect rounded-full px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:text-teal-500 dark:hover:text-teal-300 transition-all duration-300 flex items-center space-x-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="font-semibold text-sm">Refresh</span>
                    </button>
                    <button
                        onClick={exportCsv}
                        className="btn-primary flex items-center space-x-2"
                        disabled={sorted.length === 0}
                    >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                <div className="card-glass p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sessions</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{summary.total}</p>
                </div>
                <div className="card-glass p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Now</p>
                    <p className="text-2xl font-black mt-2 text-teal-600 dark:text-teal-300">{summary.active}</p>
                </div>
                <div className="card-glass p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Transfer Updates</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{summary.transfersTouched}</p>
                </div>
                <div className="card-glass p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Approvals</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{summary.approvals}</p>
                </div>
                <div className="card-glass p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg Session</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{formatDuration(summary.avgSessionSeconds)}</p>
                </div>
                <div className="card-glass p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Forced Sign-offs</p>
                    <p className="text-2xl font-black mt-2 text-amber-600 dark:text-amber-300">{summary.forced}</p>
                </div>
            </div>

            <div className="card-glass p-5 space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-4">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                placeholder="User, IP, country, note..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-glass w-full text-sm"
                            />
                        </div>
                    </div>

                    <div className="xl:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                            className="input-glass w-full text-sm"
                        >
                            <option value="all">All Sessions</option>
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>

                    <div className="xl:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Country</label>
                        <select
                            value={countryFilter}
                            onChange={(e) => setCountryFilter(e.target.value)}
                            className="input-glass w-full text-sm"
                        >
                            {countryOptions.map((country) => (
                                <option key={country} value={country}>
                                    {country === 'all' ? 'All Countries' : country}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="xl:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Date Range</label>
                        <select
                            value={dateRangeFilter}
                            onChange={(e) => setDateRangeFilter(e.target.value as DateRangeFilter)}
                            className="input-glass w-full text-sm"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="90d">Last 90 Days</option>
                        </select>
                    </div>

                    <div className="xl:col-span-2 flex items-end gap-2">
                        <button
                            onClick={() => setActivityOnly((current) => !current)}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                activityOnly
                                    ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/25'
                                    : 'glass-effect text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            Activity Only
                        </button>
                        <button
                            onClick={resetFilters}
                            className="glass-effect rounded-xl px-3 py-2.5 text-slate-500 dark:text-slate-300 hover:text-teal-500 dark:hover:text-teal-300 transition-all"
                            title="Reset filters"
                        >
                            <FilterX className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-500 dark:text-slate-300">
                        Results: {sorted.length === 0 ? 0 : startIndex + 1} - {endIndex} of {sorted.length}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Sorted by {sortKey} ({sortDir.toUpperCase()})
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table-shell min-w-[1320px]">
                        <thead className="table-head">
                            <tr>
                                <th>#</th>
                                <th>
                                    <button onClick={() => toggleSort('logId')} className="flex items-center gap-1">
                                        Session <span className="text-slate-400 dark:text-slate-300">{sortIndicator('logId')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('username')} className="flex items-center gap-1">
                                        User <span className="text-slate-400 dark:text-slate-300">{sortIndicator('username')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1">
                                        Status <span className="text-slate-400 dark:text-slate-300">{sortIndicator('status')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('risk')} className="flex items-center gap-1">
                                        Risk <span className="text-slate-400 dark:text-slate-300">{sortIndicator('risk')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('signInTs')} className="flex items-center gap-1">
                                        Sign In <span className="text-slate-400 dark:text-slate-300">{sortIndicator('signInTs')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('signOffTs')} className="flex items-center gap-1">
                                        Sign Off <span className="text-slate-400 dark:text-slate-300">{sortIndicator('signOffTs')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('duration')} className="flex items-center gap-1">
                                        Duration <span className="text-slate-400 dark:text-slate-300">{sortIndicator('duration')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('logCountry')} className="flex items-center gap-1">
                                        Country <span className="text-slate-400 dark:text-slate-300">{sortIndicator('logCountry')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('ip')} className="flex items-center gap-1">
                                        IP <span className="text-slate-400 dark:text-slate-300">{sortIndicator('ip')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('transfersImpact')} className="flex items-center gap-1">
                                        Transfer Updates <span className="text-slate-400 dark:text-slate-300">{sortIndicator('transfersImpact')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('transfersApproveImpact')} className="flex items-center gap-1">
                                        Approvals <span className="text-slate-400 dark:text-slate-300">{sortIndicator('transfersApproveImpact')}</span>
                                    </button>
                                </th>
                                <th>
                                    <button onClick={() => toggleSort('activityScore')} className="flex items-center gap-1">
                                        Activity Score <span className="text-slate-400 dark:text-slate-300">{sortIndicator('activityScore')}</span>
                                    </button>
                                </th>
                                <th>Sign-off Note</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {loading ? (
                                <tr>
                                    <td colSpan={14} className="px-6 py-12 text-center text-slate-500 dark:text-slate-300">
                                        Loading session logs...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={14} className="px-6 py-12 text-center text-red-500 font-semibold">
                                        {error}
                                    </td>
                                </tr>
                            ) : paged.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="px-6 py-12 text-center text-slate-500 dark:text-slate-300">
                                        No logs found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                paged.map((row, index) => (
                                    <tr key={row.id || `${row.logId}-${index}`} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="text-sm text-slate-500 dark:text-slate-300">{startIndex + index + 1}</td>
                                        <td className="text-sm font-semibold text-slate-700 dark:text-slate-100">#{row.logId}</td>
                                        <td className="text-sm font-semibold text-slate-700 dark:text-slate-100">{row.username || '-'}</td>
                                        <td>
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${
                                                    row.status === 'Active'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                        : 'bg-slate-200 text-slate-700 dark:bg-slate-600/40 dark:text-slate-200'
                                                }`}
                                            >
                                                <UserCheck className="w-3 h-3" />
                                                {row.status}
                                            </span>
                                        </td>
                                    <td>
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${
                                                    row.risk === 'High'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                                                    : row.risk === 'Medium'
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                                            : row.risk === 'Low'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-600/40 dark:text-slate-200'
                                                }`}
                                            >
                                                <ShieldAlert className="w-3 h-3" />
                                                {row.risk}
                                            </span>
                                        </td>
                                        <td className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime(row.signInTs)}</td>
                                        <td className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime(row.signOffTs)}</td>
                                        <td className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock3 className="w-3.5 h-3.5" />
                                                {row.sessionPeriod}
                                            </span>
                                        </td>
                                        <td className="text-sm text-slate-600 dark:text-slate-300">{row.logCountry || '-'}</td>
                                        <td className="text-sm text-slate-600 dark:text-slate-300 font-mono">{row.ip || '-'}</td>
                                        <td className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{row.transfersImpact}</td>
                                        <td className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{row.transfersApproveImpact}</td>
                                        <td className="text-sm text-slate-700 dark:text-slate-200">
                                            <span className="inline-flex items-center gap-1 font-semibold">
                                                <Activity className="w-3.5 h-3.5" />
                                                {row.activityScore}
                                            </span>
                                        </td>
                                        <td className="text-sm text-slate-600 dark:text-slate-300 min-w-[280px]">{row.signOffNote || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-100/70 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-300">
                        <span className="font-semibold">Rows per page</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="input-glass h-9 text-sm px-3"
                        >
                            {[25, 50, 100, 250].map((size) => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page <= 1}
                            className="px-4 py-2 rounded-full text-xs font-bold glass-effect border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Prev
                        </button>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                            disabled={page >= totalPages}
                            className="px-4 py-2 rounded-full text-xs font-bold glass-effect border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
