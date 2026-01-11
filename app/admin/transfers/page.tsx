'use client';

import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';

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
        all: { label: 'All', count: transfers.length, color: 'slate' },
        pending: { label: 'Pending', count: transfers.filter(t => t.status === 'pending').length, color: 'yellow' },
        pending_payment: { label: 'Pending Payment', count: transfers.filter(t => t.status === 'pending_payment').length, color: 'orange' },
        in_review: { label: 'In Review', count: transfers.filter(t => t.status === 'in_review').length, color: 'purple' },
        in_transit: { label: 'In Transit', count: transfers.filter(t => t.status === 'in_transit').length, color: 'blue' },
        completed: { label: 'Completed', count: transfers.filter(t => t.status === 'completed').length, color: 'green' },
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            completed: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
            in_transit: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
            pending: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900',
            in_review: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900',
            pending_payment: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900',
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
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Transfers</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage and track all money transfers</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all duration-200">
                            <span className="flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Export</span>
                            </span>
                        </button>
                        <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/50">
                            <span className="flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>New Transfer</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Status Filters */}
                <div className="card-glass">
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                        {Object.entries(statusConfig).map(([key, config]) => (
                            <button
                                key={key}
                                onClick={() => setFilterStatus(key)}
                                className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 ${filterStatus === key
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span className="flex items-center space-x-2">
                                    <span>{config.label}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filterStatus === key
                                            ? 'bg-white/20 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}>
                                        {config.count}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="card-glass">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                <svg className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="search"
                                placeholder="Search by ID, sender, or recipient..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-field pl-12"
                            />
                        </div>
                        <div className="flex space-x-3">
                            <select className="px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all duration-300">
                                <option>All Branches</option>
                                <option>London Central</option>
                                <option>Manchester</option>
                                <option>Birmingham</option>
                            </select>
                            <select className="px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all duration-300">
                                <option>Last 7 Days</option>
                                <option>Last 30 Days</option>
                                <option>Last 90 Days</option>
                                <option>All Time</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Transfers Table */}
                <div className="card-glass overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Transfer ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Sender</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Recipient</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Branch</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredTransfers.map((transfer, index) => (
                                    <tr
                                        key={transfer.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                                    🇬🇧
                                                </div>
                                                <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{transfer.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-100">{transfer.sender}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{transfer.senderEmail}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xl">🇦🇫</span>
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{transfer.recipient}</p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">{transfer.recipientPhone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-100">{transfer.amount}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{transfer.amountAfn}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{transfer.branch}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusBadge(transfer.status)}`}>
                                                {formatStatus(transfer.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                            {transfer.date}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Showing <span className="font-semibold">{filteredTransfers.length}</span> of <span className="font-semibold">{transfers.length}</span> transfers
                        </p>
                        <div className="flex space-x-2">
                            <button className="px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                                Previous
                            </button>
                            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200">
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
