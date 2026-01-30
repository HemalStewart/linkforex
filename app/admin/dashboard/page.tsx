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

// Demo Data
const transferVolumeData = [
    { name: 'Mon', value: 145, revenue: 6200 },
    { name: 'Tue', value: 167, revenue: 7100 },
    { name: 'Wed', value: 132, revenue: 5800 },
    { name: 'Thu', value: 189, revenue: 8200 },
    { name: 'Fri', value: 198, revenue: 8900 },
    { name: 'Sat', value: 156, revenue: 6800 },
    { name: 'Sun', value: 142, revenue: 6300 },
];

const statusData = [
    { name: 'Completed', value: 142, color: '#10b981' }, // Emerald
    { name: 'In Transit', value: 45, color: '#3b82f6' }, // Blue
    { name: 'Pending', value: 18, color: '#f59e0b' },    // Amber
    { name: 'In Review', value: 12, color: '#64748b' },  // Slate
];

const branchRevenueData = [
    { name: 'London', value: 18400 },
    { name: 'Manchester', value: 12800 },
    { name: 'Birmingham', value: 9600 },
    { name: 'Leeds', value: 7600 },
    { name: 'Glasgow', value: 5400 },
];

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

    React.useEffect(() => {
        setIsClient(true);
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch transfers
            const transfersRes = await fetch('http://localhost:8888/linforex_backend/public/api/transfers');
            const transfers = transfersRes.ok ? await transfersRes.json() : [];

            // Fetch customers
            const customersRes = await fetch('http://localhost:8888/linforex_backend/public/api/remitters');
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

            // Get recent 4 transfers with customer info
            const recent = transfers.slice(0, 4).map((t: any) => {
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Overview of your transaction activities.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 shadow-sm">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>This Month</option>
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Transfers', value: stats.totalTransfers.toLocaleString(), change: '+12.5%', trend: 'up' },
                    { label: 'Active Users', value: stats.activeUsers.toLocaleString(), change: '+5.2%', trend: 'up' },
                    { label: 'Pending KYC', value: stats.pendingKYC.toLocaleString(), change: '-2.4%', trend: 'down' },
                    { label: 'Total Revenue', value: `£${stats.totalRevenue.toLocaleString()}`, change: '+18.3%', trend: 'up' },
                ].map((stat, index) => (
                    <div key={index} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stat.trend === 'up'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {stat.value}
                        </h3>
                    </div>
                ))}
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transfer Volume Area Chart */}
                <div className="lg:col-span-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Transfer Volume</h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={transferVolumeData}>
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
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Status Breakdown</h2>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                    cornerRadius={4}
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">217</span>
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Total</span>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 mt-6">
                        {statusData.map((status, index) => (
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
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Revenue by Branch</h2>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={branchRevenueData} barSize={32}>
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
                                    tickFormatter={(value) => `£${value / 1000}k`}
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
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
                    <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Recent Activity</h2>
                        <button className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors">View All</button>
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
