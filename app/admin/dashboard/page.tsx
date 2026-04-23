'use client';

import React, { useMemo, useState } from 'react';
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    Activity,
    ArrowRightLeft,
    Building2,
    Globe2,
    ShieldCheck,
    Users,
    Wallet,
} from 'lucide-react';
import { ENDPOINTS } from '../../lib/api';

type RangeKey = '7d' | '30d' | '90d';
type DashboardTransfer = Record<string, any>;
type DashboardCustomer = Record<string, any>;
type DashboardBranch = Record<string, any>;

type ChartPalette = {
    primary: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
    destructive: string;
    mutedForeground: string;
    foreground: string;
    background: string;
    border: string;
    grid: string;
};

const RANGE_DAYS: Record<RangeKey, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fallbackChartPalette: ChartPalette = {
    primary: '#0ea5a4',
    chart2: '#14b8a6',
    chart3: '#f59e0b',
    chart4: '#3b82f6',
    chart5: '#8b5cf6',
    destructive: '#ef4444',
    mutedForeground: '#64748b',
    foreground: '#0f172a',
    background: 'rgba(255,255,255,0.94)',
    border: 'rgba(15,23,42,0.12)',
    grid: 'rgba(148,163,184,0.24)',
};

const CSS_COLOR_PATTERN = /^(#|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|oklab\(|lab\(|lch\(|color\()/i;

const resolveCssColor = (styles: CSSStyleDeclaration, variableName: string, fallback: string) => {
    const value = styles.getPropertyValue(variableName).trim();
    if (!value) return fallback;
    if (CSS_COLOR_PATTERN.test(value)) return value;
    return `hsl(${value})`;
};

const readChartPalette = (): ChartPalette => {
    if (typeof window === 'undefined') return fallbackChartPalette;

    const styles = window.getComputedStyle(document.documentElement);
    const primary = resolveCssColor(styles, '--chart-primary', fallbackChartPalette.primary);
    const foreground = resolveCssColor(styles, '--foreground', fallbackChartPalette.foreground);
    const background = resolveCssColor(styles, '--background-solid', fallbackChartPalette.background);
    const border = resolveCssColor(styles, '--line-2', fallbackChartPalette.border);
    const grid = resolveCssColor(styles, '--chart-grid', fallbackChartPalette.grid);

    return {
        primary,
        chart2: resolveCssColor(styles, '--blue-gradient-middle', fallbackChartPalette.chart2),
        chart3: fallbackChartPalette.chart3,
        chart4: fallbackChartPalette.chart4,
        chart5: fallbackChartPalette.chart5,
        destructive: resolveCssColor(styles, '--accent-danger', fallbackChartPalette.destructive),
        mutedForeground: resolveCssColor(styles, '--accent-secondary', fallbackChartPalette.mutedForeground),
        foreground,
        background,
        border,
        grid,
    };
};

const getNumeric = (value: unknown) => {
    const parsed = Number.parseFloat(String(value ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) =>
    `£${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `£${(value / 1000).toFixed(1)}K`;
    return formatCurrency(value);
};

const parseDate = (value?: string | null) => {
    if (!value) return null;
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const addDays = (date: Date, days: number) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
};

const dateKey = (date: Date) => date.toISOString().split('T')[0];

const transferDate = (transfer: DashboardTransfer) =>
    parseDate(transfer.created_at || transfer.transaction_date || transfer.date || transfer.updated_at || transfer.createdAt);

const transferAmount = (transfer: DashboardTransfer) =>
    getNumeric(transfer.source_amount || transfer.sending_amount || transfer.total_amount || transfer.amount);

const destinationAmount = (transfer: DashboardTransfer) =>
    getNumeric(transfer.dest_amount || transfer.destination_amount || transfer.fc_amount || transfer.payout_amount || transfer.receiving_amount);

const getStatusLabel = (status?: string | null) =>
    String(status || 'unknown')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

const getTransferMeta = (transfer: DashboardTransfer) => {
    if (transfer.transfer_meta && typeof transfer.transfer_meta === 'object') return transfer.transfer_meta;
    if (typeof transfer.meta_json === 'string' && transfer.meta_json.trim()) {
        try {
            return JSON.parse(transfer.meta_json);
        } catch {
            return {};
        }
    }
    return {};
};

const initialsFor = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('') || 'U';

export default function DashboardPage() {
    const [mounted, setMounted] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [selectedRange, setSelectedRange] = useState<RangeKey>('30d');
    const [transfers, setTransfers] = React.useState<DashboardTransfer[]>([]);
    const [customers, setCustomers] = React.useState<DashboardCustomer[]>([]);
    const [branches, setBranches] = React.useState<DashboardBranch[]>([]);
    const [chartPalette, setChartPalette] = React.useState<ChartPalette>(fallbackChartPalette);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const updatePalette = () => setChartPalette(readChartPalette());
        updatePalette();

        const observer = new MutationObserver(updatePalette);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style'],
        });

        return () => observer.disconnect();
    }, []);

    React.useEffect(() => {
        void fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [transfersRes, customersRes, branchesRes] = await Promise.all([
                fetch(`${ENDPOINTS.TRANSFERS.LIST}?_t=${Date.now()}`),
                fetch(`${ENDPOINTS.REMITTERS.LIST}?_t=${Date.now()}`),
                fetch(`${ENDPOINTS.BRANCHES.LIST}?status=active&_t=${Date.now()}`),
            ]);

            const transfersData = transfersRes.ok ? await transfersRes.json() : [];
            const customersData = customersRes.ok ? await customersRes.json() : [];
            const branchesData = branchesRes.ok ? await branchesRes.json() : [];

            setTransfers(Array.isArray(transfersData) ? transfersData : []);
            setCustomers(Array.isArray(customersData) ? customersData : []);
            setBranches(Array.isArray(branchesData) ? branchesData : []);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const rangeDays = RANGE_DAYS[selectedRange];
    const latestTransferDate = useMemo(() => {
        return transfers
            .map(transferDate)
            .filter((date): date is Date => Boolean(date))
            .sort((a, b) => b.getTime() - a.getTime())[0] || null;
    }, [transfers]);

    const rangeAnchor = useMemo(() => {
        const today = startOfDay(new Date());
        const currentStart = addDays(today, -(rangeDays - 1));
        const hasCurrentData = transfers.some((transfer) => {
            const createdAt = transferDate(transfer);
            return createdAt ? startOfDay(createdAt) >= currentStart : false;
        });
        return hasCurrentData || !latestTransferDate ? today : startOfDay(latestTransferDate);
    }, [latestTransferDate, rangeDays, transfers]);

    const rangeDates = useMemo(
        () => Array.from({ length: rangeDays }, (_, index) => addDays(rangeAnchor, -(rangeDays - index - 1))),
        [rangeAnchor, rangeDays],
    );

    const rangeStart = useMemo(() => startOfDay(rangeDates[0] || new Date()), [rangeDates]);
    const previousRangeStart = useMemo(() => addDays(rangeStart, -rangeDays), [rangeDays, rangeStart]);
    const rangeIsFallback = latestTransferDate ? dateKey(rangeAnchor) === dateKey(startOfDay(latestTransferDate)) && dateKey(rangeAnchor) !== dateKey(startOfDay(new Date())) : false;

    const filteredTransfers = useMemo(
        () => transfers.filter((transfer) => {
            const createdAt = transferDate(transfer);
            return createdAt ? startOfDay(createdAt) >= rangeStart && startOfDay(createdAt) <= rangeAnchor : false;
        }),
        [rangeAnchor, rangeStart, transfers],
    );

    const previousTransfers = useMemo(
        () => transfers.filter((transfer) => {
            const createdAt = transferDate(transfer);
            const day = createdAt ? startOfDay(createdAt) : null;
            return day ? day >= previousRangeStart && day < rangeStart : false;
        }),
        [previousRangeStart, rangeStart, transfers],
    );

    const filteredCustomers = useMemo(
        () => customers.filter((customer) => {
            const createdAt = parseDate(customer.created_at || customer.createdAt);
            return createdAt ? startOfDay(createdAt) >= rangeStart && startOfDay(createdAt) <= rangeAnchor : false;
        }),
        [customers, rangeAnchor, rangeStart],
    );

    const previousCustomers = useMemo(
        () => customers.filter((customer) => {
            const createdAt = parseDate(customer.created_at || customer.createdAt);
            const day = createdAt ? startOfDay(createdAt) : null;
            return day ? day >= previousRangeStart && day < rangeStart : false;
        }),
        [customers, previousRangeStart, rangeStart],
    );

    const approvedStatuses = ['completed', 'approved'];
    const queueStatuses = ['pending', 'in_review', 'processing'];

    const completedTransfers = useMemo(
        () => filteredTransfers.filter((transfer) => approvedStatuses.includes(String(transfer.status || '').toLowerCase())),
        [filteredTransfers],
    );

    const pendingTransfers = useMemo(
        () => filteredTransfers.filter((transfer) => queueStatuses.includes(String(transfer.status || '').toLowerCase())),
        [filteredTransfers],
    );

    const totalVolume = useMemo(
        () => completedTransfers.reduce((sum, transfer) => sum + transferAmount(transfer), 0),
        [completedTransfers],
    );

    const previousVolume = useMemo(
        () => previousTransfers
            .filter((transfer) => approvedStatuses.includes(String(transfer.status || '').toLowerCase()))
            .reduce((sum, transfer) => sum + transferAmount(transfer), 0),
        [previousTransfers],
    );

    const activeUsers = customers.filter((customer) => String(customer.status || '').toLowerCase() === 'active').length;
    const pendingKYC = customers.filter((customer) => String(customer.kyc_status || '').toLowerCase() === 'pending').length;

    const summaryCards = [
        {
            title: 'Transfers',
            value: loading ? '...' : filteredTransfers.length.toLocaleString(),
            description: `${previousTransfers.length.toLocaleString()} in previous range`,
            icon: ArrowRightLeft,
        },
        {
            title: 'Transfer Volume',
            value: loading ? '...' : formatCompactCurrency(totalVolume),
            description: `${formatCompactCurrency(previousVolume)} previous range`,
            icon: Wallet,
        },
        {
            title: 'Pending Transfers',
            value: loading ? '...' : pendingTransfers.length.toLocaleString(),
            description: 'Pending, in review, or processing',
            icon: Activity,
        },
        {
            title: 'Active Users',
            value: loading ? '...' : activeUsers.toLocaleString(),
            description: 'Current active remitter accounts',
            icon: Users,
        },
        {
            title: 'Pending KYC',
            value: loading ? '...' : pendingKYC.toLocaleString(),
            description: 'Profiles awaiting review',
            icon: ShieldCheck,
        },
        {
            title: 'New Customers',
            value: loading ? '...' : filteredCustomers.length.toLocaleString(),
            description: `${previousCustomers.length.toLocaleString()} in previous range`,
            icon: Globe2,
        },
    ];

    const timelineData = useMemo(
        () => rangeDates.map((date) => {
            const key = dateKey(date);
            const dayTransfers = filteredTransfers.filter((transfer) => {
                const createdAt = transferDate(transfer);
                return createdAt ? dateKey(startOfDay(createdAt)) === key : false;
            });
            const dayCustomers = filteredCustomers.filter((customer) => {
                const createdAt = parseDate(customer.created_at || customer.createdAt);
                return createdAt ? dateKey(startOfDay(createdAt)) === key : false;
            });
            const approved = dayTransfers.filter((transfer) => approvedStatuses.includes(String(transfer.status || '').toLowerCase()));
            const queued = dayTransfers.filter((transfer) => queueStatuses.includes(String(transfer.status || '').toLowerCase()));
            return {
                name: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                transfers: dayTransfers.length,
                customers: dayCustomers.length,
                approvedCount: approved.length,
                queuedCount: queued.length,
                volume: approved.reduce((sum, transfer) => sum + transferAmount(transfer), 0),
            };
        }),
        [filteredCustomers, filteredTransfers, rangeDates],
    );

    const branchLookup = useMemo(() => {
        const lookup = new Map<string, string>();
        branches.forEach((branch) => {
            const code = String(branch.code || branch.transaction_prefix || branch.id || '').trim();
            const name = String(branch.name || '').trim();
            if (code && name && !lookup.has(code)) lookup.set(code, name);
        });
        return lookup;
    }, [branches]);

    const statusChartData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredTransfers.forEach((transfer) => {
            const status = String(transfer.status || 'unknown').toLowerCase();
            counts[status] = (counts[status] || 0) + 1;
        });

        const statusColors: Record<string, string> = {
            completed: chartPalette.primary,
            approved: chartPalette.chart2,
            pending: chartPalette.chart3,
            in_review: chartPalette.chart4,
            processing: chartPalette.chart5,
            rejected: chartPalette.destructive,
            cancelled: chartPalette.mutedForeground,
            unknown: chartPalette.mutedForeground,
        };

        return Object.entries(counts)
            .map(([status, value]) => ({
                name: getStatusLabel(status),
                value,
                color: statusColors[status] || chartPalette.mutedForeground,
            }))
            .sort((a, b) => b.value - a.value);
    }, [chartPalette, filteredTransfers]);

    const branchBreakdown = useMemo(() => {
        const totals: Record<string, number> = {};
        filteredTransfers.forEach((transfer) => {
            const meta = getTransferMeta(transfer);
            const branchCode = String(transfer.branch_id || transfer.branch_code || '').trim();
            const branchName = String(
                meta.branch_name ||
                branchLookup.get(branchCode) ||
                transfer.branch_name ||
                transfer.branch ||
                transfer.to_branch ||
                branchCode ||
                'Unassigned',
            );
            totals[branchName] = (totals[branchName] || 0) + transferAmount(transfer);
        });

        return Object.entries(totals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [branchLookup, filteredTransfers]);

    const payoutCurrencyBreakdown = useMemo(() => {
        const totals: Record<string, number> = {};
        filteredTransfers.forEach((transfer) => {
            const meta = getTransferMeta(transfer);
            const code = String(
                meta.payout_currency ||
                transfer.payout_currency ||
                transfer.currency ||
                transfer.destination_currency ||
                transfer.fc_currency ||
                '',
            ).trim().toUpperCase();
            if (!code) return;
            const amount = destinationAmount(transfer) || transferAmount(transfer);
            totals[code] = (totals[code] || 0) + amount;
        });

        return Object.entries(totals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [filteredTransfers]);

    const kycBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        customers.forEach((customer) => {
            const status = String(customer.kyc_status || customer.status || 'unknown').toLowerCase();
            counts[status] = (counts[status] || 0) + 1;
        });

        const colors = [chartPalette.primary, chartPalette.chart2, chartPalette.chart3, chartPalette.destructive, chartPalette.mutedForeground];
        return Object.entries(counts)
            .map(([name, value], index) => ({
                name: getStatusLabel(name),
                value,
                color: colors[index % colors.length],
                share: customers.length > 0 ? (value / customers.length) * 100 : 0,
            }))
            .sort((a, b) => b.value - a.value);
    }, [chartPalette, customers]);

    const weekdayBreakdown = useMemo(() => {
        const weekdays = WEEKDAY_LABELS.map((label) => ({ name: label, transfers: 0, volume: 0 }));
        filteredTransfers.forEach((transfer) => {
            const createdAt = transferDate(transfer);
            if (!createdAt) return;
            const index = createdAt.getDay();
            weekdays[index].transfers += 1;
            weekdays[index].volume += transferAmount(transfer);
        });
        return weekdays;
    }, [filteredTransfers]);

    const geographyBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        customers.forEach((customer) => {
            const name = String(customer.country || customer.country_name || customer.nationality || 'Unknown');
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [customers]);

    const recentActivity = useMemo<Array<DashboardTransfer & { customerName: string; customerInitials: string }>>(() => {
        return [...filteredTransfers]
            .sort((left, right) => (transferDate(right)?.getTime() || 0) - (transferDate(left)?.getTime() || 0))
            .slice(0, 8)
            .map((transfer) => {
                const customer = customers.find((candidate) => String(candidate.id) === String(transfer.remitter_id || transfer.sender_id || ''));
                const customerName = customer?.name || customer?.sender_name || transfer.remitter_name || transfer.sender_name || 'Unknown';
                return {
                    ...transfer,
                    customerName,
                    customerInitials: initialsFor(customerName),
                };
            });
    }, [customers, filteredTransfers]);

    const chartTooltipStyle = useMemo(
        () => ({
            backgroundColor: chartPalette.background,
            borderColor: chartPalette.border,
            color: chartPalette.foreground,
            borderRadius: '12px',
            border: `1px solid ${chartPalette.border}`,
        }),
        [chartPalette],
    );

    const rangeTitle = `${rangeDays} Days${rangeIsFallback ? ' - Latest Data' : ''}`;

    if (!mounted) {
        return (
            <div className="max-w-7xl mx-auto space-y-6 p-4">
                <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-1/4 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                        <div key={item} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const hasStatusData = statusChartData.length > 0;
    const hasBranchData = branchBreakdown.length > 0;
    const hasPayoutData = payoutCurrencyBreakdown.length > 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gradient-blue tracking-tight">Dashboard</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">
                        Operational summary, live performance trends, queue health, and customer distribution.
                    </p>
                </div>
                <div className="grid w-full grid-cols-3 rounded-2xl border border-white/20 dark:border-white/10 bg-white/45 dark:bg-white/5 p-1 xl:w-[340px]">
                    {([
                        ['7d', 'Last 7 Days'],
                        ['30d', 'Last 30 Days'],
                        ['90d', 'Last 90 Days'],
                    ] as [RangeKey, string][]).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setSelectedRange(value)}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${selectedRange === value
                                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm shadow-teal-500/25'
                                : 'text-slate-500 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.title} className="card-glass p-4">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{card.title}</p>
                                </div>
                                <div className="rounded-full border border-white/20 bg-white/45 p-2 dark:bg-white/5">
                                    <Icon className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{card.value}</div>
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{card.description}</p>
                        </div>
                    );
                })}
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                <div className="card-glass p-6 lg:col-span-4">
                    <div className="mb-5">
                        <h2 className="text-xl font-extrabold text-gradient-blue tracking-tight">Flow Overview ({rangeTitle})</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Transfer count, approved volume, and new customers.</p>
                    </div>
                    <div className="h-[340px] min-h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={timelineData}>
                                <defs>
                                    <linearGradient id="old-dashboard-flow-volume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartPalette.primary} stopOpacity={0.35} />
                                        <stop offset="95%" stopColor={chartPalette.primary} stopOpacity={0.04} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: chartPalette.mutedForeground, fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" tick={{ fill: chartPalette.mutedForeground, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: chartPalette.mutedForeground, fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(Number(value || 0))} />
                                <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: chartPalette.foreground }} labelStyle={{ color: chartPalette.foreground }} formatter={(value, name) => name === 'Volume' ? formatCurrency(Number(value || 0)) : Number(value || 0).toLocaleString()} />
                                <Legend wrapperStyle={{ color: chartPalette.foreground }} />
                                <Area yAxisId="right" type="monotone" dataKey="volume" name="Volume" fill="url(#old-dashboard-flow-volume)" stroke={chartPalette.primary} strokeWidth={2} />
                                <Bar yAxisId="left" dataKey="transfers" name="Transfers" fill={chartPalette.chart2} radius={[4, 4, 0, 0]} barSize={16} />
                                <Line yAxisId="left" type="monotone" dataKey="customers" name="New Customers" stroke={chartPalette.chart3} strokeWidth={2.25} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card-glass overflow-hidden lg:col-span-3">
                    <div className="border-b border-white/20 p-6 dark:border-slate-700/50">
                        <h2 className="text-xl font-extrabold text-gradient-blue tracking-tight">Recent Activity</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Latest transactions in the selected window.</p>
                    </div>
                    <div>
                        {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                            <div key={`${activity.id}-${index}`} className="flex items-center justify-between gap-3 border-b border-gray-100/50 p-4 last:border-0 hover:bg-white/40 dark:border-slate-800/50 dark:hover:bg-slate-700/40">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="avatar-circle avatar-circle-sm shrink-0">{activity.customerInitials}</div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{activity.customerName}</p>
                                        <p className="mt-0.5 text-xs font-medium text-slate-500">{formatCurrency(transferAmount(activity))}</p>
                                    </div>
                                </div>
                                <span className="badge-glass rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                    {getStatusLabel(activity.status)}
                                </span>
                            </div>
                        )) : (
                            <div className="p-10 text-center text-sm font-medium text-slate-500">No recent activity in this range.</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                <div className="card-glass p-6 lg:col-span-3">
                    <h2 className="text-xl font-extrabold text-gradient-blue tracking-tight">Status Breakdown</h2>
                    <div className="relative h-[300px] min-h-[300px] w-full">
                        {hasStatusData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={4} dataKey="value">
                                        {statusChartData.map((entry, index) => <Cell key={`status-cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: chartPalette.foreground }} labelStyle={{ color: chartPalette.foreground }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <EmptyChart />}
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-900 dark:text-white">{filteredTransfers.length}</span>
                            <span className="text-xs uppercase tracking-wide text-slate-500">Transfers</span>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {statusChartData.map((status) => (
                            <div key={status.name} className="flex items-center gap-2 text-xs">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
                                <span className="text-slate-500 dark:text-slate-400">{status.name}</span>
                                <span className="font-bold text-slate-800 dark:text-white">{status.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card-glass p-6 lg:col-span-4">
                    <div className="mb-5">
                        <h2 className="text-xl font-extrabold text-gradient-blue tracking-tight">Pipeline Trend</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Approved versus queued transfers.</p>
                    </div>
                    <div className="h-[300px] min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timelineData}>
                                <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: chartPalette.mutedForeground, fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: chartPalette.mutedForeground, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: chartPalette.foreground }} labelStyle={{ color: chartPalette.foreground }} />
                                <Legend wrapperStyle={{ color: chartPalette.foreground }} />
                                <Bar dataKey="approvedCount" name="Approved" stackId="pipeline" fill={chartPalette.chart2} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="queuedCount" name="Queued" stackId="pipeline" fill={chartPalette.chart3} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-5">
                <div className="card-glass p-6 xl:col-span-2">
                    <h2 className="flex items-center gap-2 text-xl font-extrabold text-gradient-blue tracking-tight"><Building2 className="h-5 w-5" /> Branch Breakdown</h2>
                    <div className="h-[290px] min-h-[290px]">
                        {hasBranchData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchBreakdown} layout="vertical" margin={{ left: 12, right: 12 }}>
                                    <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={130} tick={{ fill: chartPalette.mutedForeground, fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: chartPalette.foreground }} labelStyle={{ color: chartPalette.foreground }} formatter={(value) => formatCurrency(Number(value || 0))} />
                                    <Bar dataKey="value" fill={chartPalette.primary} radius={[0, 5, 5, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyChart />}
                    </div>
                </div>

                <div className="card-glass p-6 xl:col-span-2">
                    <h2 className="flex items-center gap-2 text-xl font-extrabold text-gradient-blue tracking-tight"><Globe2 className="h-5 w-5" /> Payout Mix</h2>
                    <div className="h-[290px] min-h-[290px]">
                        {hasPayoutData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={payoutCurrencyBreakdown}>
                                    <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: chartPalette.mutedForeground, fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fill: chartPalette.mutedForeground, fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: chartPalette.foreground }} labelStyle={{ color: chartPalette.foreground }} formatter={(value) => Number(value || 0).toLocaleString()} />
                                    <Bar dataKey="value" fill={chartPalette.chart3} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyChart />}
                    </div>
                </div>

                <div className="card-glass p-6 xl:col-span-1">
                    <h2 className="flex items-center gap-2 text-xl font-extrabold text-gradient-blue tracking-tight"><Users className="h-5 w-5" /> Customer Geography</h2>
                    <div className="mt-5 space-y-4">
                        {geographyBreakdown.map((item) => (
                            <ProgressRow key={item.name} label={item.name} value={item.value} max={customers.length} color={chartPalette.primary} />
                        ))}
                        {geographyBreakdown.length === 0 && !loading && <div className="py-10 text-center text-sm text-slate-500">No geography data available.</div>}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="card-glass p-6">
                    <h2 className="text-xl font-extrabold text-gradient-blue tracking-tight">Weekday Activity</h2>
                    <div className="h-[260px] min-h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weekdayBreakdown}>
                                <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: chartPalette.mutedForeground, fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: chartPalette.mutedForeground, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: chartPalette.foreground }} labelStyle={{ color: chartPalette.foreground }} />
                                <Bar dataKey="transfers" fill={chartPalette.chart4} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card-glass p-6 xl:col-span-2">
                    <h2 className="text-xl font-extrabold text-gradient-blue tracking-tight">KYC Pipeline</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-[320px_1fr]">
                        <div className="relative h-[260px] min-h-[260px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={kycBreakdown} cx="50%" cy="50%" innerRadius={56} outerRadius={86} paddingAngle={3} dataKey="value">
                                        {kycBreakdown.map((entry, index) => <Cell key={`kyc-cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: chartPalette.foreground }} labelStyle={{ color: chartPalette.foreground }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-slate-900 dark:text-white">{customers.length}</span>
                                <span className="text-xs uppercase tracking-wide text-slate-500">Customers</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {kycBreakdown.map((item) => (
                                <div key={item.name} className="rounded-xl border border-white/20 bg-white/35 p-3 dark:border-white/10 dark:bg-white/5">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">{item.value}</span>
                                    </div>
                                    <ProgressBar value={item.share} color={item.color} />
                                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.share.toFixed(1)}% of total customers</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyChart() {
    return <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400">No data available</div>;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
    return (
        <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
        </div>
    );
}

function ProgressRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const percent = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-slate-500 dark:text-slate-400">{label}</span>
                <span className="font-black text-slate-900 dark:text-white">{value}</span>
            </div>
            <ProgressBar value={percent} color={color} />
        </div>
    );
}
