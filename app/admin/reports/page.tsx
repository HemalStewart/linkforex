'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, FileCheck, Map, Users, FileText, Download, Calendar, Mail, Clock, Plus, RefreshCw, TrendingUp, DollarSign } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';

type SummaryResponse = {
    totals: {
        transfers: number;
        volume_gbp: number;
        fc_amount: number;
        average_transfer_gbp: number;
        unique_senders: number;
        active_remitters: number;
    };
    today: {
        transfers: number;
        volume_gbp: number;
    };
    month_to_date: {
        transfers: number;
        volume_gbp: number;
    };
    status_breakdown: Record<string, number>;
    payout_currency_breakdown: Array<{ code: string; count: number }>;
};

type TrendsResponse = {
    range_days: number;
    daily: Array<{
        date: string;
        transfers: number;
        volume_gbp: number;
    }>;
    status_breakdown: Record<string, number>;
};

const EMPTY_SUMMARY: SummaryResponse = {
    totals: {
        transfers: 0,
        volume_gbp: 0,
        fc_amount: 0,
        average_transfer_gbp: 0,
        unique_senders: 0,
        active_remitters: 0
    },
    today: {
        transfers: 0,
        volume_gbp: 0
    },
    month_to_date: {
        transfers: 0,
        volume_gbp: 0
    },
    status_breakdown: {},
    payout_currency_breakdown: []
};

const EMPTY_TRENDS: TrendsResponse = {
    range_days: 30,
    daily: [],
    status_breakdown: {}
};

const dateRangeToDays: Record<string, number> = {
    today: 7,
    week: 14,
    month: 30,
    quarter: 90,
    year: 180
};

const formatGbp = (value: number): string => `£${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ReportsPage() {
    const [summary, setSummary] = useState<SummaryResponse>(EMPTY_SUMMARY);
    const [trends, setTrends] = useState<TrendsResponse>(EMPTY_TRENDS);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState('financial');
    const [dateRange, setDateRange] = useState('month');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const days = dateRangeToDays[dateRange] ?? 30;
                const [summaryRes, trendsRes] = await Promise.all([
                    fetch(ENDPOINTS.REPORTS.SUMMARY),
                    fetch(`${ENDPOINTS.REPORTS.TRENDS}?days=${days}`)
                ]);

                if (!summaryRes.ok || !trendsRes.ok) {
                    throw new Error('Failed to load reports data');
                }

                const [summaryData, trendsData] = await Promise.all([
                    summaryRes.json() as Promise<SummaryResponse>,
                    trendsRes.json() as Promise<TrendsResponse>
                ]);

                setSummary(summaryData);
                setTrends(trendsData);
            } catch (fetchError) {
                console.error('Failed to fetch reports:', fetchError);
                setSummary(EMPTY_SUMMARY);
                setTrends(EMPTY_TRENDS);
                setError('Could not load live report data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    const reportTypes = [
        { id: 'financial', name: 'Financial Summary', icon: TrendingUp, description: 'Revenue, fees, and profitability' },
        { id: 'transfers', name: 'Transfer Analytics', icon: BarChart3, description: 'Volume and trends analysis' },
        { id: 'kyc', name: 'KYC Compliance', icon: FileCheck, description: 'Verification status and metrics' },
        { id: 'branches', name: 'Branch Performance', icon: Map, description: 'Per-location statistics' },
        { id: 'users', name: 'User Activity', icon: Users, description: 'Customer engagement metrics' },
        { id: 'audit', name: 'Audit Logs', icon: FileText, description: 'System activity and changes' },
    ];

    const revenueEstimate = summary.month_to_date.volume_gbp * 0.02;
    const quickStats = [
        { label: 'Total Volume (MTD)', value: formatGbp(summary.month_to_date.volume_gbp), icon: TrendingUp, color: 'text-teal-500' },
        { label: 'Est. Revenue (MTD)', value: formatGbp(revenueEstimate), icon: DollarSign, color: 'text-teal-500' },
        { label: 'Active Customers', value: summary.totals.active_remitters.toLocaleString(), icon: Users, color: 'text-teal-500' },
        { label: 'Avg. Transfer Size', value: formatGbp(summary.totals.average_transfer_gbp), icon: RefreshCw, color: 'text-teal-500' },
    ];

    const trendRows = trends.daily.slice(-7);
    const trendMax = Math.max(...trendRows.map((row) => row.volume_gbp), 1);
    const statusRows = Object.entries(summary.status_breakdown)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const recentReports = [
        { id: '1', name: 'Monthly Financial Report - Dec 2025', type: 'Financial', date: '2026-01-01', size: '2.4 MB' },
        { id: '2', name: 'Q4 2025 Transfer Analytics', type: 'Transfers', date: '2026-01-01', size: '1.8 MB' },
        { id: '3', name: 'KYC Compliance Report - Week 52', type: 'KYC', date: '2025-12-31', size: '956 KB' },
        { id: '4', name: 'Branch Performance - 2025 Annual', type: 'Branches', date: '2025-12-31', size: '3.2 MB' },
        { id: '5', name: 'User Activity Report - December', type: 'Users', date: '2025-12-30', size: '1.2 MB' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Reports & Analytics</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Generate and download business reports</p>
                </div>
                <button className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0">
                    <Plus className="w-5 h-5" />
                    <span>Generate New Report</span>
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {quickStats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="card-glass p-6 hover:scale-[1.02] transition-transform duration-300">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                                    {loading ? (
                                        <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse"></div>
                                    ) : (
                                        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
                                    )}
                                </div>
                                <div className={`p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm ${stat.color}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Report Generator */}
                <div className="lg:col-span-2 card-glass p-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-teal-500" />
                        Generate Custom Report
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {reportTypes.map((report) => (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReport(report.id)}
                                className={`p-4 rounded-2xl text-left transition-all duration-300 border ${selectedReport === report.id
                                    ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 ring-1 ring-teal-500/20'
                                    : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:bg-white hover:shadow-md dark:hover:bg-slate-800'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${selectedReport === report.id
                                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                    }`}>
                                    <report.icon className="w-5 h-5" />
                                </div>
                                <h3 className={`font-bold text-sm mb-1 ${selectedReport === report.id ? 'text-teal-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {report.name}
                                </h3>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                                    {report.description}
                                </p>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Date Range</label>
                            <div className="relative">
                                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    className="input-glass w-full pl-10 pr-8 appearance-none cursor-pointer hover:bg-white/80 transition-colors"
                                >
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="quarter">This Quarter</option>
                                    <option value="year">This Year</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Format</label>
                            <div className="relative">
                                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                <select className="input-glass w-full pl-10 pr-8 appearance-none cursor-pointer hover:bg-white/80 transition-colors">
                                    <option>PDF Document</option>
                                    <option>Excel Spreadsheet</option>
                                    <option>CSV File</option>
                                    <option>JSON Data</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Delivery Method</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                <select className="input-glass w-full pl-10 pr-8 appearance-none cursor-pointer hover:bg-white/80 transition-colors">
                                    <option>Download Now</option>
                                    <option>Email to Me</option>
                                    <option>Schedule Recurring</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-700/50">
                        <button className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/25">
                            <Download className="w-5 h-5" />
                            <span>Generate & Download</span>
                        </button>
                    </div>
                    {error && (
                        <p className="mt-4 text-xs font-semibold text-amber-600 dark:text-amber-400">{error}</p>
                    )}
                </div>

                {/* Sidebar */}
                <div className="flex flex-col gap-6">
                    <div className="card-glass p-6">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                            <BarChart3 className="w-5 h-5 mr-2 text-slate-400" />
                            Transfer Trend ({trends.range_days}d)
                        </h3>
                        {loading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <div key={index} className="h-8 rounded-xl bg-slate-200 dark:bg-slate-700/50 animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {trendRows.length === 0 && (
                                    <p className="text-xs font-medium text-slate-500">No data for selected range.</p>
                                )}
                                {trendRows.map((row) => (
                                    <div key={row.date} className="flex items-center gap-2">
                                        <div className="w-16 text-[10px] font-semibold text-slate-500">
                                            {new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="flex-1 h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/60 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
                                                style={{ width: `${Math.max((row.volume_gbp / trendMax) * 100, 4)}%` }}
                                            />
                                        </div>
                                        <div className="w-16 text-right text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                            {formatGbp(row.volume_gbp)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card-glass p-6">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                            <FileCheck className="w-5 h-5 mr-2 text-slate-400" />
                            Status Snapshot
                        </h3>
                        <div className="space-y-2">
                            {statusRows.length === 0 && (
                                <p className="text-xs font-medium text-slate-500">No status data available.</p>
                            )}
                            {statusRows.map(([status, count]) => (
                                <div key={status} className="flex items-center justify-between rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 px-3 py-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                        {status}
                                    </span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Reports */}
                    <div className="card-glass p-6 flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-slate-400" />
                                Recent Reports
                            </h3>
                            <button className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors">View All</button>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {recentReports.map((report) => (
                                <div key={report.id} className="group p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:bg-white hover:shadow-md transition-all duration-300 cursor-pointer">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start space-x-3">
                                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-500">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{report.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">{report.type} • {report.size} • {report.date}</p>
                                            </div>
                                        </div>
                                        <Download className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors mt-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scheduled */}
                    <div className="card-glass p-6">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-slate-400" />
                            Scheduled
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-900/10 border border-teal-100/80 dark:border-teal-800/40 flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-teal-500 shadow-sm">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-xs text-slate-900 dark:text-white">Weekly Financial</p>
                                    <p className="text-[10px] font-medium text-slate-500">Mon 9:00 AM</p>
                                </div>
                            </div>
                            <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-900/10 border border-teal-100/80 dark:border-teal-800/40 flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-teal-500 shadow-sm">
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-xs text-slate-900 dark:text-white">Monthly Compliance</p>
                                    <p className="text-[10px] font-medium text-slate-500">1st of Month</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
