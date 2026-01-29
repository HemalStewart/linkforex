'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CustomersPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Mock Data - filtered for customers
    const customers = [
        { id: 5, name: 'Ahmed Hassan', email: 'ahmed.hassan@example.com', role: 'customer', status: 'active', phone: '+44 7700 900 123', branch: '-', lastLogin: '2026-01-11 07:00', joinedDate: '2025-12-01', transfersCount: 8, kycStatus: 'verified' },
        { id: 6, name: 'Fatima Rahman', email: 'fatima.rahman@example.com', role: 'customer', status: 'active', phone: '+44 7700 900 234', branch: '-', lastLogin: '2026-01-10 18:30', joinedDate: '2025-11-15', transfersCount: 12, kycStatus: 'verified' },
        { id: 8, name: 'Mohammed Ali', email: 'ali.m@example.com', role: 'customer', status: 'inactive', phone: '+44 7700 900 345', branch: '-', lastLogin: '2026-01-05 14:20', joinedDate: '2025-10-10', transfersCount: 5, kycStatus: 'pending' },
        { id: 9, name: 'Noor Khan', email: 'noor.khan@example.com', role: 'customer', status: 'suspended', phone: '+44 7700 900 456', branch: '-', lastLogin: '2026-01-02 12:00', joinedDate: '2025-09-25', transfersCount: 3, kycStatus: 'rejected' },
        { id: 10, name: 'Zahra Karimi', email: 'zahra.k@example.com', role: 'customer', status: 'active', phone: '+44 7700 900 567', branch: '-', lastLogin: '2026-01-11 06:30', joinedDate: '2025-08-12', transfersCount: 15, kycStatus: 'verified' },
    ];

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
            inactive: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
            suspended: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        };
        return styles[status as keyof typeof styles] || styles.inactive;
    };

    const getKycBadge = (status: string) => {
        const styles = {
            verified: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
            pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
            rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        };
        return styles[status as keyof typeof styles] || styles.pending;
    };

    const filteredCustomers = customers.filter(customer => {
        const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
        const matchesSearch = searchQuery === '' ||
            customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.phone.includes(searchQuery);
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage customer profiles and activity</p>
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
                    <Link href="/admin/customers/create" className="px-4 py-2 rounded-lg bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white font-medium hover:bg-emerald-500 dark:hover:bg-emerald-400 transition-colors shadow-sm inline-flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add Customer</span>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Customers</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{customers.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Active Customers</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{customers.filter(c => c.status === 'active').length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">KYC Verified</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{customers.filter(c => c.kycStatus === 'verified').length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">New This Month</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">2</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="search"
                        placeholder="Search customers by name, email or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 shadow-sm transition-all"
                    />
                </div>

                {/* Filter */}
                <div className="flex justify-end">
                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === 'all'
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === 'inactive'
                                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">KYC</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Transfers</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredCustomers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{customer.name}</p>
                                                <p className="text-xs text-slate-500">Joined: {customer.joinedDate}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <p className="text-slate-700 dark:text-slate-300">{customer.email}</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs">{customer.phone}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(customer.status)}`}>
                                            {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getKycBadge(customer.kycStatus)}`}>
                                            {customer.kycStatus.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{customer.transfersCount}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex space-x-2">
                                            <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors" title="View Profile">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors" title="New Transfer">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredCustomers.length === 0 && (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No customers found.
                    </div>
                )}
            </div>
        </div>
    );
}
