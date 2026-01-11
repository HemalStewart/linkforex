'use client';

import React, { useState } from 'react';

export default function TransfersPage() {
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const transfers = [
        { id: 'TRX-001', sender: 'John Smith', senderEmail: 'john@example.com', recipient: 'Ahmad Khan', recipientPhone: '+93 700 123 456', amount: '£850', amountAfn: '৳98,600', status: 'completed', date: '2026-01-11 10:30', branch: 'London Central', method: 'Cash Pickup' },
        { id: 'TRX-002', sender: 'Sarah Johnson', senderEmail: 'sarah@example.com', recipient: 'Fatima Noor', recipientPhone: '+93 700 234 567', amount: '£1,200', amountAfn: '৳139,200', status: 'in_transit', date: '2026-01-11 08:15', branch: 'Manchester', method: 'Cash Pickup' },
        { id: 'TRX-003', sender: 'Michael Brown', senderEmail: 'michael@example.com', recipient: 'Hassan Ali', recipientPhone: '+93 700 345 678', amount: '£650', amountAfn: '৳75,400', status: 'pending', date: '2026-01-11 06:45', branch: 'Birmingham', method: 'Cash Pickup' },
        { id: 'TRX-004', sender: 'Emma Wilson', senderEmail: 'emma@example.com', recipient: 'Zahra Ahmad', recipientPhone: '+93 700 456 789', amount: '£2,100', amountAfn: '৳243,600', status: 'completed', date: '2026-01-10 14:20', branch: 'London East', method: 'Cash Pickup' },
        { id: 'TRX-005', sender: 'David Lee', senderEmail: 'david@example.com', recipient: 'Abdul Rahman', recipientPhone: '+93 700 567 890', amount: '£900', amountAfn: '৳104,400', status: 'in_review', date: '2026-01-10 12:00', branch: 'Leeds', method: 'Cash Pickup' },
        { id: 'TRX-006', sender: 'Olivia Taylor', senderEmail: 'olivia@example.com', recipient: 'Mariam Aziz', recipientPhone: '+93 700 678 901', amount: '£1,500', amountAfn: '৳174,000', status: 'pending_payment', date: '2026-01-10 09:30', branch: 'Glasgow', method: 'Cash Pickup' },
        { id: 'TRX-007', sender: 'James Anderson', senderEmail: 'james@example.com', recipient: 'Hamid Karimi', recipientPhone: '+93 700 789 012', amount: '£3,200', amountAfn: '৳371,200', status: 'in_review', date: '2026-01-09 16:45', branch: 'London Central', method: 'Cash Pickup' },
        { id: 'TRX-008', sender: 'Sophie Martin', senderEmail: 'sophie@example.com', recipient: 'Nadia Sultana', recipientPhone: '+93 700 890 123', amount: '£750', amountAfn: '৳87,000', status: 'completed', date: '2026-01-09 11:20', branch: 'Liverpool', method: 'Cash Pickup' },
    ];

    const statusConfig = {
        all: { label: 'All', count: transfers.length },
        pending: { label: 'Pending', count: transfers.filter(t => t.status === 'pending').length },
        pending_payment: { label: 'Pending Payment', count: transfers.filter(t => t.status === 'pending_payment').length },
        in_review: { label: 'In Review', count: transfers.filter(t => t.status === 'in_review').length },
        in_transit: { label: 'In Transit', count: transfers.filter(t => t.status === 'in_transit').length },
        completed: { label: 'Completed', count: transfers.filter(t => t.status === 'completed').length },
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
            in_transit: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
            pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
            in_review: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
            pending_payment: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
        };
        return styles[status as keyof typeof styles] || styles.pending;
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const filteredTransfers = transfers.filter(transfer => {
        const matchesStatus = filterStatus === 'all' || transfer.status === filterStatus;
        const matchesSearch = searchQuery === '' ||
            transfer.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transfer.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transfer.recipient.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transfers</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and track all money transfers</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <span className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export</span>
                        </span>
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm">
                        <span className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>New Transfer</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Status Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center space-x-1 overflow-x-auto p-1">
                    {Object.entries(statusConfig).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setFilterStatus(key)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filterStatus === key
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="flex items-center space-x-2">
                                <span>{config.label}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${filterStatus === key
                                    ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
                                    }`}>
                                    {config.count}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            placeholder="Search by ID, sender, or recipient..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                        />
                    </div>
                    <div className="flex space-x-3">
                        <select className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200">
                            <option>All Branches</option>
                            <option>London Central</option>
                            <option>Manchester</option>
                            <option>Birmingham</option>
                        </select>
                        <select className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                            <option>All Time</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Transfers Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Transfer ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sender</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipient</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredTransfers.map((transfer) => (
                                <tr
                                    key={transfer.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs">
                                                🇬🇧
                                            </div>
                                            <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">{transfer.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{transfer.sender}</p>
                                            <p className="text-xs text-slate-500">{transfer.senderEmail}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xl">🇦🇫</span>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{transfer.recipient}</p>
                                                <p className="text-xs text-slate-500">{transfer.recipientPhone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{transfer.amount}</p>
                                            <p className="text-xs text-slate-500">{transfer.amountAfn}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">{transfer.branch}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(transfer.status)}`}>
                                            {formatStatus(transfer.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {transfer.date}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Showing <span className="font-medium text-slate-900 dark:text-white">{filteredTransfers.length}</span> of <span className="font-medium text-slate-900 dark:text-white">{transfers.length}</span> results
                    </p>
                    <div className="flex space-x-2">
                        <button className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                            Previous
                        </button>
                        <button className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
