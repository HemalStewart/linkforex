'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, FileCheck, Map, Users, FileText, Download, Calendar, Mail, Clock, ChevronRight, Plus, RefreshCw, TrendingUp, DollarSign } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';

export default function ReportsPage() {
    const [stats, setStats] = useState({
        totalTransfersMTD: 0,
        revenueMTD: 0,
        activeCustomers: 0,
        avgTransfer: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [transfersRes, remittersRes] = await Promise.all([
                    fetch(ENDPOINTS.TRANSFERS.LIST),
                    fetch(ENDPOINTS.REMITTERS.LIST)
                ]);

                const transfers = transfersRes.ok ? await transfersRes.json() : [];
                const remitters = remittersRes.ok ? await remittersRes.json() : [];

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const mtdTransfers = transfers.filter((t: any) => {
                    const d = new Date(t.created_at);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });

                const totalTransfersMTD = mtdTransfers.reduce((sum: number, t: any) => sum + parseFloat(t.source_amount || 0), 0);
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
        { id: 'financial', name: 'Financial Summary', icon: TrendingUp, description: 'Revenue, fees, and profitability' },
        { id: 'transfers', name: 'Transfer Analytics', icon: BarChart3, description: 'Volume and trends analysis' },
        { id: 'kyc', name: 'KYC Compliance', icon: FileCheck, description: 'Verification status and metrics' },
        { id: 'branches', name: 'Branch Performance', icon: Map, description: 'Per-location statistics' },
        { id: 'users', name: 'User Activity', icon: Users, description: 'Customer engagement metrics' },
        { id: 'audit', name: 'Audit Logs', icon: FileText, description: 'System activity and changes' },
    ];

    const quickStats = [
        { label: 'Total Volume (MTD)', value: `£${stats.totalTransfersMTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-emerald-500' },
        { label: 'Est. Revenue (MTD)', value: `£${stats.revenueMTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-blue-500' },
        { label: 'Active Customers', value: stats.activeCustomers.toLocaleString(), icon: Users, color: 'text-purple-500' },
        { label: 'Avg. Transfer Size', value: `£${stats.avgTransfer.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: RefreshCw, color: 'text-amber-500' },
    ];

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
                <button className="btn-primary flex items-center space-x-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 bg-gradient-to-r from-indigo-500 to-purple-600 border-0">
                    <Plus className="w-5 h-5" />
                    <span>Generate New Report</span>
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {quickStats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="card-glass p-6 rounded-[2rem] hover:scale-[1.02] transition-transform duration-300">
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
                <div className="lg:col-span-2 card-glass p-8 rounded-[2.5rem]">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                        Generate Custom Report
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {reportTypes.map((report) => (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReport(report.id)}
                                className={`p-4 rounded-2xl text-left transition-all duration-300 border ${selectedReport === report.id
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20'
                                    : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:bg-white hover:shadow-md dark:hover:bg-slate-800'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${selectedReport === report.id
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                    }`}>
                                    <report.icon className="w-5 h-5" />
                                </div>
                                <h3 className={`font-bold text-sm mb-1 ${selectedReport === report.id ? 'text-indigo-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
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
                        <button className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25">
                            <Download className="w-5 h-5" />
                            <span>Generate & Download</span>
                        </button>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="flex flex-col gap-6">
                    {/* Recent Reports */}
                    <div className="card-glass p-6 rounded-[2rem] flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-slate-400" />
                                Recent Reports
                            </h3>
                            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">View All</button>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {recentReports.map((report) => (
                                <div key={report.id} className="group p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:bg-white hover:shadow-md transition-all duration-300 cursor-pointer">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start space-x-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{report.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">{report.type} • {report.size}</p>
                                            </div>
                                        </div>
                                        <Download className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors mt-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scheduled */}
                    <div className="card-glass p-6 rounded-[2rem]">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-slate-400" />
                            Scheduled
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 border border-blue-100 dark:border-slate-700 flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-blue-500 shadow-sm">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-xs text-slate-900 dark:text-white">Weekly Financial</p>
                                    <p className="text-[10px] font-medium text-slate-500">Mon 9:00 AM</p>
                                </div>
                            </div>
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 border border-purple-100 dark:border-slate-700 flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-purple-500 shadow-sm">
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
