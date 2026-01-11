'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const stats = [
        {
            name: 'Total Transfers',
            value: '£2,847,394',
            change: '+12.5%',
            trend: 'up',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
            ),
            gradient: 'from-blue-500 via-cyan-500 to-teal-500',
            bg: 'from-blue-500/10 to-cyan-500/10'
        },
        {
            name: 'Pending KYC',
            value: '24',
            change: '+8',
            trend: 'up',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            gradient: 'from-purple-500 via-pink-500 to-rose-500',
            bg: 'from-purple-500/10 to-pink-500/10'
        },
        {
            name: 'Active Users',
            value: '1,429',
            change: '+5.2%',
            trend: 'up',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            gradient: 'from-green-500 via-emerald-500 to-teal-500',
            bg: 'from-green-500/10 to-emerald-500/10'
        },
        {
            name: 'Total Revenue',
            value: '£48,392',
            change: '+18.2%',
            trend: 'up',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            gradient: 'from-orange-500 via-red-500 to-pink-500',
            bg: 'from-orange-500/10 to-red-500/10'
        }
    ];

    const transferVolumeData = [
        { day: 'Mon', transfers: 145, revenue: 6200 },
        { day: 'Tue', transfers: 167, revenue: 7100 },
        { day: 'Wed', transfers: 132, revenue: 5800 },
        { day: 'Thu', transfers: 189, revenue: 8200 },
        { day: 'Fri', transfers: 198, revenue: 8900 },
        { day: 'Sat', transfers: 156, revenue: 6800 },
        { day: 'Sun', transfers: 142, revenue: 6300 },
    ];

    const statusData = [
        { name: 'Completed', value: 142, color: '#10b981' },
        { name: 'In Transit', value: 45, color: '#3b82f6' },
        { name: 'Pending', value: 18, color: '#f59e0b' },
        { name: 'In Review', value: 12, color: '#8b5cf6' },
    ];

    const branchRevenueData = [
        { branch: 'London', revenue: 18400 },
        { branch: 'Manchester', revenue: 12800 },
        { branch: 'Birmingham', revenue: 9600 },
        { branch: 'Leeds', revenue: 7600 },
    ];

    const recentTransfers = [
        { id: 'TRX-001', sender: 'John Smith', recipient: 'Ahmad Khan', amount: '£850', status: 'completed', date: '2 hours ago', flag: '🇬🇧→🇦🇫' },
        { id: 'TRX-002', sender: 'Sarah Johnson', recipient: 'Fatima Noor', amount: '£1,200', status: 'in_transit', date: '4 hours ago', flag: '🇬🇧→🇦🇫' },
        { id: 'TRX-003', sender: 'Michael Brown', recipient: 'Hassan Ali', amount: '£650', status: 'pending', date: '6 hours ago', flag: '🇬🇧→🇦🇫' },
        { id: 'TRX-004', sender: 'Emma Wilson', recipient: 'Zahra Ahmad', amount: '£2,100', status: 'completed', date: '8 hours ago', flag: '🇬🇧→🇦🇫' },
        { id: 'TRX-005', sender: 'David Lee', recipient: 'Abdul Rahman', amount: '£900', status: 'in_review', date: '10 hours ago', flag: '🇬🇧→🇦🇫' }
    ];

    const getStatusBadge = (status: string) => {
        const styles = {
            completed: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
            in_transit: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
            pending: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900',
            in_review: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900'
        };
        return styles[status as keyof typeof styles] || styles.pending;
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-fade-in relative">
                {/* Floating Particles Background */}
                {mounted && (
                    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-2 h-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full animate-float"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 5}s`,
                                    animationDuration: `${3 + Math.random() * 4}s`,
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Page Header with Premium Badge */}
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-indigo-600 to-purple-600 dark:from-slate-100 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                                Dashboard
                            </h1>
                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold animate-pulse shadow-lg">
                                LIVE
                            </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">Welcome back! Here's what's happening today.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button className="px-5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all duration-300 transform hover:scale-105 hover-lift relative overflow-hidden group">
                            <span className="relative z-10 flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Export</span>
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                        </button>
                        <button className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-600/60 relative overflow-hidden group">
                            <span className="relative z-10 flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>Generate Report</span>
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </button>
                    </div>
                </div>

                {/* Premium Stats Grid with Enhanced Design */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                    {stats.map((stat, index) => (
                        <div
                            key={stat.name}
                            className="group relative overflow-hidden rounded-2xl p-6 animate-scale-in hover-lift cursor-pointer"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Gradient Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} group-hover:opacity-100 opacity-70 transition-opacity duration-300`} />

                            {/* Glass Effect */}
                            <div className="absolute inset-0 glass-strong" />

                            {/* Animated Border */}
                            <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br ${stat.gradient} bg-clip-border opacity-0 group-hover:opacity-20 transition-opacity duration-300" />

                            {/* Content */}
                            <div className="relative flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">{stat.name}</p>
                                    <p className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-3">{stat.value}</p>
                                    <div className="flex items-center space-x-2">
                                        <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-950">
                                            <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                            <span className="text-xs font-bold text-green-600 dark:text-green-400">{stat.change}</span>
                                        </div>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">vs last month</span>
                                    </div>
                                </div>

                                {/* Animated Icon */}
                                <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-2xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 animate-float`}>
                                    {stat.icon}
                                    <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                            </div>

                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>
                    ))}
                </div>

                {/* Charts with Premium Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                    {/* Transfer Volume Chart */}
                    <div className="group card-glass p-6 animate-slide-in hover-lift relative overflow-hidden" style={{ animationDelay: '0.4s' }}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl transform translate-x-16 -translate-y-16" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Transfer Volume</h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Last 7 days performance</p>
                                </div>
                                <div className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">+24%</span>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={transferVolumeData}>
                                    <defs>
                                        <linearGradient id="colorTransfers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.2} />
                                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                                    <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="transfers" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTransfers)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Pie Chart */}
                    <div className="group card-glass p-6 animate-slide-in hover-lift relative overflow-hidden" style={{ animationDelay: '0.5s' }}>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-pink-500/10 to-purple-500/10 rounded-full blur-3xl transform -translate-x-16 translate-y-16" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Transfer Status</h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Current distribution</p>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Live Data</span>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)'
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Bar Chart - Full Width */}
                <div className="card-glass p-6 animate-slide-in hover-lift relative overflow-hidden" style={{ animationDelay: '0.6s' }}>
                    <div className="absolute top-0 left-1/2 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-32" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Revenue by Branch</h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Top performing locations</p>
                            </div>
                            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-semibold hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-300">
                                View All
                            </button>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={branchRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.2} />
                                <XAxis dataKey="branch" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)'
                                    }}
                                    formatter={(value) => `£${value.toLocaleString()}`}
                                />
                                <Bar dataKey="revenue" fill="url(#barGradient)" radius={[12, 12, 0, 0]} />
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0.9} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Transfers & Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                    {/* Recent Transfers */}
                    <div className="lg:col-span-2 card-glass animate-slide-in hover-lift overflow-hidden" style={{ animationDelay: '0.7s' }}>
                        <div className="flex items-center justify-between mb-6 px-6 pt-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Recent Transfers</h2>
                            <button className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center space-x-1">
                                <span>View All</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-3 px-6 pb-6">
                            {recentTransfers.map((transfer, idx) => (
                                <div
                                    key={transfer.id}
                                    className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-800/50 hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950/30 dark:hover:to-purple-950/30 transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transform hover:scale-[1.02]"
                                    style={{ animationDelay: `${0.7 + idx * 0.05}s` }}
                                >
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                                            {transfer.flag}
                                            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <p className="font-bold text-slate-900 dark:text-slate-100">{transfer.sender}</p>
                                                <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                                <p className="font-bold text-slate-900 dark:text-slate-100">{transfer.recipient}</p>
                                            </div>
                                            <div className="flex items-center space-x-3 text-xs">
                                                <span className="font-semibold text-slate-600 dark:text-slate-400">{transfer.id}</span>
                                                <span className="text-slate-400">•</span>
                                                <span className="text-slate-500 dark:text-slate-400">{transfer.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <p className="text-lg font-black text-slate-900 dark:text-slate-100">{transfer.amount}</p>
                                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${getStatusBadge(transfer.status)}`}>
                                            {formatStatus(transfer.status)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats & Alerts */}
                    <div className="space-y-6">
                        {/* Today's Summary */}
                        <div className="card-glass animate-slide-in hover-lift" style={{ animationDelay: '0.8s' }}>
                            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-4 px-6 pt-6">Today's Summary</h3>
                            <div className="space-y-3 px-6 pb-6">
                                <div className="group p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 transform hover:scale-105">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-blue-900 dark:text-blue-100">Pending</p>
                                                <p className="text-xs text-blue-600 dark:text-blue-400">Awaiting review</p>
                                            </div>
                                        </div>
                                        <p className="text-3xl font-black text-blue-700 dark:text-blue-300">18</p>
                                    </div>
                                </div>

                                <div className="group p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 transform hover:scale-105">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-green-900 dark:text-green-100">Completed</p>
                                                <p className="text-xs text-green-600 dark:text-green-400">Today</p>
                                            </div>
                                        </div>
                                        <p className="text-3xl font-black text-green-700 dark:text-green-300">142</p>
                                    </div>
                                </div>

                                <div className="group p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 transform hover:scale-105">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-purple-900 dark:text-purple-100">New Users</p>
                                                <p className="text-xs text-purple-600 dark:text-purple-400">This week</p>
                                            </div>
                                        </div>
                                        <p className="text-3xl font-black text-purple-700 dark:text-purple-300">47</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alerts */}
                        <div className="card-glass animate-slide-in hover-lift" style={{ animationDelay: '0.9s' }}>
                            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-4 px-6 pt-6">Alerts</h3>
                            <div className="space-y-3 px-6 pb-6">
                                <div className="group p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-rose-500/10 border-2 border-red-500/20 hover:border-red-500/40 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">High-value transfer</p>
                                            <p className="text-xs text-red-700 dark:text-red-400">Transfer TRX-098 requires approval (£15,000)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-yellow-900 dark:text-yellow-100 mb-1">KYC expiring soon</p>
                                            <p className="text-xs text-yellow-700 dark:text-yellow-400">8 users need KYC renewal this week</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
