'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Clock3, Download, FilterX, RefreshCw, Search, ShieldAlert, UserCheck } from 'lucide-react';
import { formatDateTime } from '@/app/lib/dateUtils';
import { ENDPOINTS } from '@/app/lib/api';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { useAuditColumns, usePagePermissions } from '@/app/lib/permissions';

type LogRow = {
    id: number;
    logId: number;
    username: string;
    logCountry: string;
    ip: string;
    signInTs: string;
    signOffTs: string | null;
    signOffNote: string;
    rawStatus: string;
};

type SessionLog = LogRow & {
    status: 'Active' | 'Closed';
    forcedSignOff: boolean;
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
    | 'ip';

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

const normalizeTimestampOrNull = (value: string): string | null => {
    const normalized = normalizeDate(value);
    if (!normalized) return null;
    if (normalized.startsWith('0000-00-00')) return null;
    const epoch = new Date(normalized).getTime();
    if (Number.isNaN(epoch) || epoch <= 0) return null;
    return normalized;
};

const mapApiLog = (log: Record<string, unknown>): LogRow => ({
    id: Number(log.id ?? 0),
    logId: Number(log.id ?? 0),
    username: firstNonEmpty(log, ['username', 'user_name', 'user', 'email']) || '-',
    logCountry: firstNonEmpty(log, ['log_country', 'country', 'logCountry', 'country_name']),
    ip: firstNonEmpty(log, ['log_ip', 'ip', 'ip_address', 'logIp']),
    signInTs: normalizeTimestampOrNull(firstNonEmpty(log, ['sign_in', 'signin', 'signed_in_at', 'created_at'])) || '',
    signOffTs: normalizeTimestampOrNull(firstNonEmpty(log, ['sign_off', 'signoff', 'signed_off_at'])),
    signOffNote: firstNonEmpty(log, ['sign_off_note', 'signoff_note', 'note', 'remarks']),
    rawStatus: firstNonEmpty(log, ['status', 'session_status', 'log_status']).toLowerCase()
});



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

const deriveStatus = (row: LogRow): SessionLog['status'] => {
    if (row.signOffTs) return 'Closed';
    const explicit = row.rawStatus.trim();
    if (['closed', 'signed_off', 'logged_out', 'inactive'].includes(explicit)) return 'Closed';
    return 'Active';
};

const isLikelyIpAddress = (value: string): boolean => {
    const text = value.trim();
    if (!text) return false;
    return /^[0-9a-fA-F:.]+$/.test(text) && (text.includes('.') || text.includes(':'));
};


const escapeCsv = (value: unknown): string => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

export default function LogsPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('AUDIT_LOGS');
    const { canExport } = usePagePermissions('AUDIT_LOGS');
    const [logs, setLogs] = useState<LogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [countryFilter, setCountryFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('30d');
    const [showRiskGuide, setShowRiskGuide] = useState(false);

    const [sortKey, setSortKey] = useState<SortKey>('signInTs');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useRowsPerPage(10);

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
        const now = Date.now();
        return logs.map((row) => {
            const signInEpoch = toEpoch(row.signInTs);
            const status: SessionLog['status'] = deriveStatus(row);
            
            let sessionSeconds = 0;
            if (status === 'Closed') {
                sessionSeconds = getSessionSeconds(row.signInTs, row.signOffTs);
            } else if (signInEpoch > 0) {
                sessionSeconds = Math.max(0, Math.floor((now - signInEpoch) / 1000));
            }

            const signOffEpoch = toEpoch(row.signOffTs);
            const forcedSignOff = looksForcedSignOff(row.signOffNote);

            const base: SessionLog = {
                ...row,
                status,
                forcedSignOff,
                sessionSeconds,
                sessionPeriod: formatDuration(sessionSeconds),
                signInEpoch,
                signOffEpoch
            };

            return base;
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
    }, [countryFilter, dateRangeFilter, searchQuery, sessionLogs, statusFilter]);

    const sorted = useMemo(() => {
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
        const now = Date.now();
        const sessionDurations = filtered
            .map((row) => {
                if (row.status === 'Closed') return row.sessionSeconds;
                if (row.status === 'Active' && row.signInEpoch > 0) {
                    return Math.max(0, Math.floor((now - row.signInEpoch) / 1000));
                }
                return 0;
            })
            .filter((seconds) => seconds > 0);
        const avgSessionSeconds = sessionDurations.length
            ? Math.floor(sessionDurations.reduce((sum, seconds) => sum + seconds, 0) / sessionDurations.length)
            : 0;

        return {
            total,
            active,
            forced,
            avgSessionSeconds
        };
    }, [filtered]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

    useEffect(() => {
        setPage(1);
    }, [searchQuery, statusFilter, countryFilter, dateRangeFilter, pageSize]);

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
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortKey(key);
        setSortDir(key === 'signInTs' || key === 'signOffTs' ? 'desc' : 'asc');
    };

    const sortIndicator = (key: SortKey) => (
        <SortIndicator active={sortKey === key} dir={sortDir} className="text-slate-400 dark:text-slate-300" />
    );

    const exportCsv = () => {
        const headers = [
            'Session ID',
            'User',
            'Status',
            'Sign In',
            'Sign Off',
            'Duration',
            'Country',
            'IP',
            'Sign Off Note'
        ];

        const rows = sorted.map((row) => [
            row.logId,
            row.username,
            row.status,
            formatDateTime(row.signInTs),
            formatDateTime(row.signOffTs),
            row.sessionPeriod,
            row.logCountry || '-',
            row.ip || '-',
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
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">User Logs</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
                        Track operator sessions, transfer touches, approvals, and sign-off reasons.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLogs}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 border-0 group"
                    >
                        <RefreshCw className={`w-4 h-4 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                        <span className="font-semibold text-sm">Refresh</span>
                    </button>
                    {canExport && (
                        <button
                            onClick={exportCsv}
                            className="btn-primary flex items-center space-x-2"
                            disabled={sorted.length === 0}
                        >
                            <Download className="w-4 h-4" />
                            <span>Export CSV</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="card-glass p-4">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Sessions</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{summary.total}</p>
                </div>
                <div className="card-glass p-4">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Active Now</p>
                    <p className="text-2xl font-black mt-2 text-teal-600 dark:text-teal-300">{summary.active}</p>
                </div>
                <div className="card-glass p-4">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Avg Session Duration</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{formatDuration(summary.avgSessionSeconds)}</p>
                </div>
                <div className="card-glass p-4">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Forced Sign-offs</p>
                    <p className="text-2xl font-black mt-2 text-amber-600 dark:text-amber-300">{summary.forced}</p>
                </div>
            </div>

            <div className="card-glass p-5 space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-4">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Search</label>
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
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Status</label>
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
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Country</label>
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
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Date Range</label>
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

                    <div className="xl:col-span-2 flex items-end">
                        <button
                            onClick={resetFilters}
                            className="w-full glass-effect rounded-xl px-3 py-2.5 text-slate-500 dark:text-slate-300 hover:text-teal-500 dark:hover:text-teal-300 transition-all inline-flex items-center justify-center"
                            title="Reset filters"
                        >
                            <FilterX className="w-4 h-4 mr-2" />
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Logs</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Showing {sorted.length === 0 ? 0 : startIndex + 1} to {endIndex} of {sorted.length}</p>
                    </div>
                </div>

                <div className="table-scroll">
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
                                {showCreatedBy && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Created By</th>}
                                {showCreatedAt && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Created At</th>}
                                {showUpdatedBy && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Updated By</th>}
                                {showUpdatedAt && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Updated At</th>}
                                <th>Sign-off Note</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {loading ? (
                                <tr>
                                    <td colSpan={10 + (showCreatedBy ? 1 : 0) + (showCreatedAt ? 1 : 0) + (showUpdatedBy ? 1 : 0) + (showUpdatedAt ? 1 : 0)} className="px-6 py-12 text-center text-slate-500 dark:text-slate-300">
                                        Loading session logs...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={10 + (showCreatedBy ? 1 : 0) + (showCreatedAt ? 1 : 0) + (showUpdatedBy ? 1 : 0) + (showUpdatedAt ? 1 : 0)} className="px-6 py-12 text-center text-red-500 font-semibold">
                                        {error}
                                    </td>
                                </tr>
                            ) : paged.length === 0 ? (
                                <tr>
                                    <td colSpan={10 + (showCreatedBy ? 1 : 0) + (showCreatedAt ? 1 : 0) + (showUpdatedBy ? 1 : 0) + (showUpdatedAt ? 1 : 0)} className="px-6 py-12 text-center text-slate-500 dark:text-slate-300">
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
                                        <td className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime(row.signInTs)}</td>
                                        <td className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime(row.signOffTs)}</td>
                                        <td className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock3 className="w-3.5 h-3.5" />
                                                {row.sessionPeriod}
                                            </span>
                                        </td>
                                        <td className="text-sm text-slate-600 dark:text-slate-300">{row.logCountry || '-'}</td>
                                        <td className="text-sm text-slate-600 dark:text-slate-300 font-mono">
                                            {isLikelyIpAddress(row.ip) ? (
                                                <a
                                                    href={`https://whatismyipaddress.com/ip/${encodeURIComponent(row.ip)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-teal-600 dark:text-teal-300 hover:underline"
                                                    title="Open IP lookup"
                                                >
                                                    {row.ip}
                                                </a>
                                            ) : (row.ip || '-')}
                                        </td>
                                        {showCreatedBy && <td className="text-sm text-slate-600 dark:text-slate-300">{(row as any).created_by || '—'}</td>}
                                        {showCreatedAt && <td className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime((row as any).created_at)}</td>}
                                        {showUpdatedBy && <td className="text-sm text-slate-600 dark:text-slate-300">{(row as any).updated_by || '—'}</td>}
                                        {showUpdatedAt && <td className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime((row as any).updated_at)}</td>}
                                        <td className="text-sm text-slate-600 dark:text-slate-300 min-w-[280px]">{row.signOffNote || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    rowsPerPage={pageSize}
                    onPageChange={setPage}
                    onRowsPerPageChange={(rows) => { setPageSize(rows); setPage(1); }}
                />
            </div>
        </div>
    );
}
