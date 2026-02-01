'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from 'recharts';
import { ENDPOINTS } from '../../lib/api';

// Demo Data Removed - using real data from API


const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 text-sm">
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color || entry.fill }}>
                        {entry.name}: {entry.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const [isClient, setIsClient] = React.useState(false);
    const [stats, setStats] = React.useState({
        totalTransfers: 0,
        activeUsers: 0,
        pendingKYC: 0,
        totalRevenue: 0
    });
    const [recentActivity, setRecentActivity] = React.useState<any[]>([]);

    const [volumeData, setVolumeData] = React.useState<any[]>([]);
    const [statusChartData, setStatusChartData] = React.useState<any[]>([]);
    const [revenueData, setRevenueData] = React.useState<any[]>([]);

    React.useEffect(() => {
        setIsClient(true);
        fetchDashboardData();
    }, []);


    const fetchDashboardData = async () => {
        try {
            // Fetch transfers
            // Fetch transfers
            const transfersRes = await fetch(`${ENDPOINTS.TRANSFERS.LIST}?_t=${new Date().getTime()}`);
            const transfers = transfersRes.ok ? await transfersRes.json() : [];

            // Fetch customers
            const customersRes = await fetch(`${ENDPOINTS.REMITTERS.LIST}?_t=${new Date().getTime()}`);
            const customers = customersRes.ok ? await customersRes.json() : [];


            // Calculate stats
            const completedTransfers = transfers.filter((t: any) => t.status === 'completed');
            const totalRevenue = completedTransfers.reduce((sum: number, t: any) => sum + parseFloat(t.source_amount || 0), 0);
            const pendingKYC = customers.filter((c: any) => c.kyc_status === 'pending').length;

            setStats({
                totalTransfers: transfers.length,
                activeUsers: customers.filter((c: any) => c.status === 'active').length,
                pendingKYC: pendingKYC,
                totalRevenue: totalRevenue
            });

            // --- Process Chart Data ---

            // 1. Status Data (Pie Chart)
            const statusCounts: Record<string, number> = {};
            transfers.forEach((t: any) => {
                const s = t.status || 'unknown';
                statusCounts[s] = (statusCounts[s] || 0) + 1;
            });

            const statusColors: Record<string, string> = {
                completed: '#10b981',
                in_transit: '#3b82f6',
                pending: '#f59e0b',
                in_review: '#64748b',
                rejected: '#ef4444',
                cancelled: '#94a3b8'
            };

            const newStatusData = Object.keys(statusCounts).map(status => ({
                name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
                value: statusCounts[status],
                color: statusColors[status] || '#cbd5e1'
            }));
            setStatusChartData(newStatusData);

            // 2. Volume Data (Area Chart - Last 7 Days)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d;
            });

            const newVolumeData = last7Days.map(date => {
                const dayName = days[date.getDay()];
                const dateStr = date.toISOString().split('T')[0];

                // Sum transfers for this day
                const dayTransfers = transfers.filter((t: any) => t.created_at && t.created_at.startsWith(dateStr));
                const count = dayTransfers.length;
                const revenue = dayTransfers.reduce((sum: number, t: any) => sum + parseFloat(t.source_amount || 0), 0);

                return { name: dayName, value: count, revenue: revenue };
            });
            setVolumeData(newVolumeData);

            // 3. Branch Revenue (Bar Chart)
            const branchRevenue: Record<string, number> = {};
            transfers.forEach((t: any) => {
                const customer = customers.find((c: any) => c.id === t.remitter_id);
                const branch = customer?.branch || 'Unknown';
                const amount = parseFloat(t.source_amount || 0);
                branchRevenue[branch] = (branchRevenue[branch] || 0) + amount;
            });

            const newRevenueData = Object.keys(branchRevenue).map(branch => ({
                name: branch.replace('Link Forex Ltd', '').replace('-', '').trim() || branch, // Clean up long names
                value: branchRevenue[branch]
            })).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5
            setRevenueData(newRevenueData);


            // Get recent 4 transfers with customer info
            const recent = transfers.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 4)
                .map((t: any) => {
                    const customer = customers.find((c: any) => c.id === t.remitter_id);
                    return {
                        ...t,
                        customerName: customer?.name || 'Unknown',
                        customerInitials: customer?.name?.split(' ').map((n: string) => n[0]).join('') || 'UK'
                    };
                });
            setRecentActivity(recent);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        }
    };

    if (!isClient) {
        return (
            <div className="max-w-7xl mx-auto space-y-8 p-4">
                <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-1/4 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gradient-blue">
                        Dashboard
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">Overview of your transaction activities.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <select className="glass-effect px-4 py-2.5 text-sm rounded-xl outline-none cursor-pointer font-semibold text-slate-700 dark:text-slate-300 hover:shadow-lg transition-all duration-300">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>This Month</option>
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        label: 'Total Transfers',
                        value: stats.totalTransfers.toLocaleString(),
                        change: '+12.5%',
                        trend: 'up',
                        icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                        )
                    },
                    {
                        label: 'Active Users',
                        value: stats.activeUsers.toLocaleString(),
                        change: '+5.2%',
                        trend: 'up',
                        icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        )
                    },
                    {
                        label: 'Pending KYC',
                        value: stats.pendingKYC.toLocaleString(),
                        change: '-2.4%',
                        trend: 'down',
                        icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        )
                    },
                    {
                        label: 'Total Revenue',
                        value: `£${stats.totalRevenue.toLocaleString()}`,
                        change: '+18.3%',
                        trend: 'up',
                        icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )
                    },
                ].map((stat, index) => (
                    <div key={index} className="card-glass p-6 stagger-item" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-gradient flex items-center justify-center text-white shadow-lg">
                                {stat.icon}
                            </div>
                            <span className={`badge-glass font-bold ${stat.trend === 'up'
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                                }`}>
                                {stat.change}
                            </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">{stat.label}</p>
                        <h3 className="text-3xl font-extrabold text-gradient-blue tracking-tight">
                            {stat.value}
                        </h3>
                    </div>
                ))}
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transfer Volume Area Chart */}
                <div className="lg:col-span-2 card-glass p-6">
                    <h2 className="text-xl font-extrabold text-gradient-blue mb-6 tracking-tight">Transfer Volume (Last 7 Days)</h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={volumeData}>
                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.8} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    name="Transfers"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorVolume)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Transfer Status Pie Chart */}
                <div className="card-glass p-6">
                    <h2 className="text-xl font-extrabold text-gradient-blue mb-6 tracking-tight">Status Breakdown</h2>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie
                                    data={statusChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                    cornerRadius={4}
                                >
                                    {statusChartData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {statusChartData.reduce((acc, curr) => acc + curr.value, 0)}
                            </span>
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Total</span>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 mt-6">
                        {statusChartData.map((status: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: status.color }}></div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{status.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Revenue Bar Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card-glass p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-extrabold text-gradient-blue tracking-tight">Revenue by Branch</h2>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={revenueData} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.8} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    tickFormatter={(value) => `£${value}`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    content={<CustomTooltip />}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="#10b981"
                                    radius={[6, 6, 0, 0]}
                                    fillOpacity={0.9}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity List (Simplified) */}
                <div className="card-glass overflow-hidden">
                    <div className="p-6 border-b border-sky-200/50 dark:border-sky-800/50 flex justify-between items-center">
                        <h2 className="text-xl font-extrabold text-gradient-blue tracking-tight">Recent Activity</h2>
                        <button className="text-sm text-sky-600 dark:text-sky-400 font-bold hover:text-sky-700 dark:hover:text-sky-300 transition-colors">View All →</button>
                    </div>
                    <div className="p-0">
                        {recentActivity.length > 0 ? recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between p-4 border-b border-slate-100/60 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs ring-2 ring-white dark:ring-slate-800">
                                        {activity.customerInitials}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{activity.customerName}</p>
                                        <p className="text-xs text-slate-500 font-medium">Sent £{parseFloat(activity.source_amount || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${activity.status === 'completed' ? 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/30' :
                                    activity.status === 'in_transit' ? 'text-blue-700 bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/30' :
                                        activity.status === 'pending' ? 'text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/30' :
                                            'text-slate-600 bg-slate-50 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                    }`}>
                                    {activity.status === 'in_transit' ? 'In Transit' :
                                        activity.status === 'in_review' ? 'In Review' :
                                            activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                                </span>
                            </div>
                        )) : (
                            <div className="p-12 text-center text-slate-500 font-medium">
                                No recent transfers found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
