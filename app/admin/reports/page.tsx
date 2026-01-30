'use client';

import React, { useState } from 'react';

// Icons for Report Types
import { ENDPOINTS } from '../../lib/api';

const Icons = {
    financial: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    transfers: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
    ),
    kyc: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    branches: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    ),
    users: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    audit: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    ),
};

export default function ReportsPage() {
    const [stats, setStats] = useState({
        totalTransfersMTD: 0,
        revenueMTD: 0,
        activeCustomers: 0,
        avgTransfer: 0
    });
    const [loading, setLoading] = useState(true);


    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [transfersRes, remittersRes] = await Promise.all([
                    fetch(ENDPOINTS.TRANSFERS.LIST),
                    fetch(ENDPOINTS.REMITTERS.LIST)
                ]);

                const transfers = transfersRes.ok ? await transfersRes.json() : [];
                const remitters = remittersRes.ok ? await remittersRes.json() : [];

                // MTD Logic
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const mtdTransfers = transfers.filter((t: any) => {
                    const d = new Date(t.created_at);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });

                const totalTransfersMTD = mtdTransfers.reduce((sum: number, t: any) => sum + parseFloat(t.source_amount || 0), 0);
                // Assuming revenue is a % of transfer, or for now just using total volume as "Total Transfers Value" 
                // and maybe a fixed fee for "Revenue". 
                // Let's assume the "Revenue (MTD)" label in the UI meant "Volume" based on the high value £2M, 
                // OR if it's actual profit. The UI had £2M for transfers and £48k for revenue.
                // I'll calculate Volume as Total Transfers.
                // And Revenue as approx 2% for estimation if no fee field exists.

                const revenueMTD = totalTransfersMTD * 0.02; // estimated 2%

                const activeCustomers = remitters.filter((r: any) => r.status === 'active').length;
                const avgTransfer = mtdTransfers.length > 0 ? totalTransfersMTD / mtdTransfers.length : 0;

                setStats({
                    totalTransfersMTD,
                    revenueMTD,
                    activeCustomers,
                    avgTransfer
                });

            } catch (error) {
                console.error('Failed to fetch report stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const [selectedReport, setSelectedReport] = useState('financial');
    const [dateRange, setDateRange] = useState('month');

    const reportTypes = [
        { id: 'financial', name: 'Financial Summary', icon: Icons.financial, description: 'Revenue, fees, and profitability' },
        { id: 'transfers', name: 'Transfer Analytics', icon: Icons.transfers, description: 'Volume and trends analysis' },
        { id: 'kyc', name: 'KYC Compliance', icon: Icons.kyc, description: 'Verification status and metrics' },
        { id: 'branches', name: 'Branch Performance', icon: Icons.branches, description: 'Per-location statistics' },
        { id: 'users', name: 'User Activity', icon: Icons.users, description: 'Customer engagement metrics' },
        { id: 'audit', name: 'Audit Logs', icon: Icons.audit, description: 'System activity and changes' },
    ];

    const quickStats = [
        { label: 'Total Volume (MTD)', value: `£${stats.totalTransfersMTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: '+0%', trend: 'neutral' },
        { label: 'Est. Revenue (MTD)', value: `£${stats.revenueMTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: '+0%', trend: 'neutral' },
        { label: 'Active Customers', value: stats.activeCustomers.toLocaleString(), change: '+0%', trend: 'neutral' },
        { label: 'Avg. Transfer Size', value: `£${stats.avgTransfer.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: '+0%', trend: 'neutral' },
    ];

    const recentReports = [
        { id: '1', name: 'Monthly Financial Report - December 2025', type: 'Financial', date: '2026-01-01', size: '2.4 MB', status: 'ready' },
        { id: '2', name: 'Q4 2025 Transfer Analytics', type: 'Transfers', date: '2026-01-01', size: '1.8 MB', status: 'ready' },
        { id: '3', name: 'KYC Compliance Report - Week 52', type: 'KYC', date: '2025-12-31', size: '956 KB', status: 'ready' },
        { id: '4', name: 'Branch Performance - 2025 Annual', type: 'Branches', date: '2025-12-31', size: '3.2 MB', status: 'ready' },
        { id: '5', name: 'User Activity Report - December', type: 'Users', date: '2025-12-30', size: '1.2 MB', status: 'ready' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Generate and download business reports</p>
                </div>
                <button className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm">
                    <span className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Generate New Report</span>
                    </span>
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {quickStats.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700"
                    >
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{stat.value}</p>
                        <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{stat.change}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Report Generator */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Generate New Report</h2>

                {/* Report Types */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {reportTypes.map((report) => (
                        <button
                            key={report.id}
                            onClick={() => setSelectedReport(report.id)}
                            className={`p-4 rounded-xl text-left transition-all duration-200 border ${selectedReport === report.id
                                ? 'bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-500 ring-1 ring-slate-300 dark:ring-slate-500'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-start space-x-3">
                                <span className={`p-2 rounded-lg ${selectedReport === report.id
                                    ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                    }`}>
                                    {report.icon}
                                </span>
                                <div className="flex-1">
                                    <h3 className={`font-semibold mb-1 ${selectedReport === report.id ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {report.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {report.description}
                                    </p>
                                </div>
                                {selectedReport === report.id && (
                                    <svg className="w-5 h-5 text-slate-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Date Range and Format */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date Range</label>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                        >
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="quarter">This Quarter</option>
                            <option value="year">This Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Format</label>
                        <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700">
                            <option>PDF Document</option>
                            <option>Excel Spreadsheet</option>
                            <option>CSV File</option>
                            <option>JSON Data</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Delivery</label>
                        <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700">
                            <option>Download Now</option>
                            <option>Email to Me</option>
                            <option>Schedule Recurring</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button className="px-6 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm">
                        Generate Report
                    </button>
                </div>
            </div>

            {/* Recent Reports */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Reports</h2>
                    <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        View All →
                    </button>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {recentReports.map((report) => (
                        <div
                            key={report.id}
                            className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 flex-1">
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{report.name}</h3>
                                        <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            <span>{report.type}</span>
                                            <span>•</span>
                                            <span>{report.date}</span>
                                            <span>•</span>
                                            <span>{report.size}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500" title="Download">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scheduled Reports */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Scheduled Reports</h2>
                <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Weekly Financial Summary</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Every Monday at 9:00 AM • Email to admin@linkforex.com</p>
                                </div>
                            </div>
                            <button className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                Edit
                            </button>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-slate-200 dark:border-slate-700">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Monthly Compliance Report</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">1st of every month • Email to compliance@linkforex.com</p>
                                </div>
                            </div>
                            <button className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
