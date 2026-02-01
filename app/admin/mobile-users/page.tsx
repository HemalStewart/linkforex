'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';

export default function MobileUsersPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [remitters, setRemitters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRemitters = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.append('registration_source', 'mobile_app');
                if (statusFilter !== 'all') params.append('status', statusFilter);
                if (searchQuery) params.append('search', searchQuery);

                const res = await fetch(`${ENDPOINTS.REMITTERS.LIST}?${params.toString()}`);
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();

                // Map DB fields to UI fields if necessary, codeigniter returns matching fields usually
                // But we need to ensure structure matches what UI expects
                const mappedData = data.map((c: any) => ({
                    ...c,
                    joinedDate: c.created_at ? new Date(c.created_at).toLocaleDateString() : '-',
                    transfersCount: 0, // Placeholder
                    lastLogin: c.last_login || 'Never',
                    kycStatus: c.kyc_status || 'pending'
                }));
                setRemitters(mappedData);
            } catch (error) {
                console.error('Failed to fetch remitters:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(fetchRemitters, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, statusFilter]);

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

    // No client-side filtering needed as API handles it, but we use remitters directly
    const filteredRemitters = remitters;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mobile App Users</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage users registered via mobile application</p>
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
                    {/* Replaced 'Add Remitter' with nothing or 'View Analytics' etc if needed */}
                </div>
            </div>

            {/* Stats Cards - Note: These should ideally come from an API stats endpoint */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Users</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{remitters.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                {/* Simplified stats for now */}
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
                        placeholder="Search users by name, email or phone..."
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

            {/* Remitters Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">KYC</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredRemitters.map((remitter) => (
                                    <tr
                                        key={remitter.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                    {remitter.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{remitter.name}</p>
                                                    <p className="text-xs text-slate-500">Joined: {remitter.joinedDate}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <p className="text-slate-700 dark:text-slate-300">{remitter.email}</p>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs">{remitter.phone}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(remitter.status)}`}>
                                                {remitter.status ? remitter.status.charAt(0).toUpperCase() + remitter.status.slice(1) : 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getKycBadge(remitter.kycStatus)}`}>
                                                {remitter.kycStatus ? remitter.kycStatus.toUpperCase() : 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                <Link
                                                    href={`/admin/remitters/${remitter.id}`}
                                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                                                    title="View/Edit Profile"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {!loading && filteredRemitters.length === 0 && (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No mobile users found.
                    </div>
                )}
            </div>
        </div>
    );
}
