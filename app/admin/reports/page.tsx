'use client';

import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function ReportsPage() {
    const [selectedReport, setSelectedReport] = useState('financial');
    const [dateRange, setDateRange] = useState('month');

    const reportTypes = [
        { id: 'financial', name: 'Financial Summary', icon: '💰', description: 'Revenue, fees, and profitability' },
        { id: 'transfers', name: 'Transfer Analytics', icon: '📊', description: 'Volume and trends analysis' },
        { id: 'kyc', name: 'KYC Compliance', icon: '📋', description: 'Verification status and metrics' },
        { id: 'branches', name: 'Branch Performance', icon: '🏢', description: 'Per-location statistics' },
        { id: 'users', name: 'User Activity', icon: '👥', description: 'Customer engagement metrics' },
        { id: 'audit', name: 'Audit Logs', icon: '🔍', description: 'System activity and changes' },
    ];

    const quickStats = [
        { label: 'Total Transfers (MTD)', value: '£2,847,394', change: '+12.5%', color: 'blue' },
        { label: 'Revenue (MTD)', value: '£48,392', change: '+18.2%', color: 'green' },
        { label: 'Active Customers', value: '1,429', change: '+5.2%', color: 'purple' },
        { label: 'Avg. Transfer Size', value: '£967', change: '+2.1%', color: 'orange' },
    ];

    const recentReports = [
        { id: '1', name: 'Monthly Financial Report - December 2025', type: 'Financial', date: '2026-01-01', size: '2.4 MB', status: 'ready' },
        { id: '2', name: 'Q4 2025 Transfer Analytics', type: 'Transfers', date: '2026-01-01', size: '1.8 MB', status: 'ready' },
        { id: '3', name: 'KYC Compliance Report - Week 52', type: 'KYC', date: '2025-12-31', size: '956 KB', status: 'ready' },
        { id: '4', name: 'Branch Performance - 2025 Annual', type: 'Branches', date: '2025-12-31', size: '3.2 MB', status: 'ready' },
        { id: '5', name: 'User Activity Report - December', type: 'Users', date: '2025-12-30', size: '1.2 MB', status: 'ready' },
    ];

    const getColorClasses = (color: string) => {
        const colors = {
            blue: 'from-blue-500 to-cyan-500',
            green: 'from-green-500 to-emerald-500',
            purple: 'from-purple-500 to-pink-500',
            orange: 'from-orange-500 to-red-500',
        };
        return colors[color as keyof typeof colors];
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Reports & Analytics</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">Generate and download business reports</p>
                    </div>
                    <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/50">
                        <span className="flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            className="card-glass p-6 animate-slide-in"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{stat.label}</p>
                            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{stat.value}</p>
                            <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{stat.change}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Report Generator */}
                <div className="card-glass p-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Generate New Report</h2>

                    {/* Report Types */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {reportTypes.map((report) => (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReport(report.id)}
                                className={`p-4 rounded-xl text-left transition-all duration-200 ${selectedReport === report.id
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50 transform scale-105'
                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <div className="flex items-start space-x-3">
                                    <span className="text-3xl">{report.icon}</span>
                                    <div className="flex-1">
                                        <h3 className={`font-bold mb-1 ${selectedReport === report.id ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                            {report.name}
                                        </h3>
                                        <p className={`text-sm ${selectedReport === report.id ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {report.description}
                                        </p>
                                    </div>
                                    {selectedReport === report.id && (
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Date Range and Format */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Date Range</label>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="input-field"
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
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Format</label>
                            <select className="input-field">
                                <option>PDF Document</option>
                                <option>Excel Spreadsheet</option>
                                <option>CSV File</option>
                                <option>JSON Data</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Delivery</label>
                            <select className="input-field">
                                <option>Download Now</option>
                                <option>Email to Me</option>
                                <option>Schedule Recurring</option>
                            </select>
                        </div>
                    </div>

                    <button className="btn btn-primary w-full">
                        <span className="flex items-center justify-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            <span>Generate Report</span>
                        </span>
                    </button>
                </div>

                {/* Recent Reports */}
                <div className="card-glass">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Recent Reports</h2>
                        <button className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                            View All →
                        </button>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {recentReports.map((report, index) => (
                            <div
                                key={report.id}
                                className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors animate-slide-in"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{report.name}</h3>
                                            <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center space-x-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                    </svg>
                                                    <span>{report.type}</span>
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center space-x-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>{report.date}</span>
                                                </span>
                                                <span>•</span>
                                                <span>{report.size}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="px-3 py-1 rounded-lg bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 text-xs font-bold">
                                            READY
                                        </span>
                                        <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Download">
                                            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                        <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Share">
                                            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scheduled Reports */}
                <div className="card-glass p-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Scheduled Reports</h2>
                    <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-blue-900 dark:text-blue-100">Weekly Financial Summary</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">Every Monday at 9:00 AM • Email to admin@linkforex.com</p>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 rounded-lg bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 text-sm font-semibold hover:bg-blue-300 dark:hover:bg-blue-800 transition-colors">
                                    Edit
                                </button>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center text-white">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-purple-900 dark:text-purple-100">Monthly Compliance Report</p>
                                        <p className="text-sm text-purple-700 dark:text-purple-300">1st of every month • Email to compliance@linkforex.com</p>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 rounded-lg bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 text-sm font-semibold hover:bg-purple-300 dark:hover:bg-purple-800 transition-colors">
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
