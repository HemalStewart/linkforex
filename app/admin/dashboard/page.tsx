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
                    { label: 'Total Transfers', value: '1,284', change: '+12.5%', trend: 'up' },
                    { label: 'Active Users', value: '845', change: '+5.2%', trend: 'up' },
                    { label: 'Pending KYC', value: '24', change: '-2.4%', trend: 'down' },
                    { label: 'Total Revenue', value: '£48,200', change: '+18.3%', trend: 'up' },
                ].map((stat, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.trend === 'up'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                }`}>
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {stat.value}
                        </h3>
                    </div>
                ))}
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transfer Volume Area Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Transfer Volume</h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={transferVolumeData}>
                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    name="Transfers"
                                    stroke="#0f172a"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorVolume)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Transfer Status Pie Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Status Breakdown</h2>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">217</span>
                            <span className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total</span>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-6">
                        {statusData.map((status, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }}></div>
                                <span className="text-sm text-slate-600 dark:text-slate-300">{status.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Revenue Bar Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Revenue by Branch</h2>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchRevenueData} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => `£${value / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    content={<CustomTooltip />}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="#334155"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity List (Simplified) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h2>
                        <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View All</button>
                    </div>
                    <div className="p-0">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                                        JD
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">John Doe</p>
                                        <p className="text-xs text-slate-500">Sent £1,250.00 to US</p>
                                    </div>
                                </div>
                                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">Completed</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
