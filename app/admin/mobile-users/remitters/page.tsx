'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { Search, UserPlus, Eye, Download } from 'lucide-react';

type MobileRemitter = {
    id: string | number;
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    kyc_status?: string;
    created_at?: string;
    last_login?: string;
    joinedDate?: string;
    transfersCount?: number;
    lastLogin?: string;
    kycStatus?: string;
};

export default function RemittersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [remitters, setRemitters] = useState<MobileRemitter[]>([]);
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
                const data = await res.json() as unknown;
                const rows = Array.isArray(data) ? (data as MobileRemitter[]) : [];

                // Map DB fields to UI fields if necessary
                const mappedData = rows.map((c) => ({
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
            active: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
            inactive: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
            suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        };
        return styles[status as keyof typeof styles] || styles.inactive;
    };

    const getKycBadge = (status: string) => {
        const styles = {
            verified: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
            rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        };
        return styles[status as keyof typeof styles] || styles.pending;
    };

    // No client-side filtering needed as API handles it
    const filteredRemitters = remitters;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mobile Profiles</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Detailed remitter/KYC profiles from the mobile app</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button className="px-5 py-3 rounded-full border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all">
                        <span className="flex items-center space-x-2">
                            <Download className="w-5 h-5" />
                            <span>Export</span>
                        </span>
                    </button>
                    <Link href="/admin/mobile-profiles/create" className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 rounded-full px-6">
                        <UserPlus className="w-5 h-5" />
                        <span>Add Profile</span>
                    </Link>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Search */}
                <div className="relative group w-full input-icon">
                    <div className="input-icon-left">
                        <Search className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                    <input
                        type="search"
                        placeholder="Search remitters by name, email or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-glass w-full py-3 text-base shadow-sm hover:shadow-md transition-shadow"
                    />
                </div>

                {/* Filter */}
                <div className="flex justify-end">
                    <div className="flex items-center card-glass p-1.5 rounded-full space-x-1">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${statusFilter === 'all'
                                ? 'bg-white shadow text-slate-900 dark:bg-slate-700 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${statusFilter === 'active'
                                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/20'
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${statusFilter === 'inactive'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20'
                                }`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>
            </div>

            {/* Profiles Table */}
            <div className="card-glass overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading remitters...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profile</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">KYC</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {filteredRemitters.map((remitter) => (
                                    <tr
                                        key={remitter.id}
                                        className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200"
                                    >
                                        <td className="px-8 py-5">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-[15px]">{remitter.name}</p>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">Joined: {remitter.joinedDate}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-sm">
                                                <p className="text-slate-700 dark:text-slate-300 font-medium">{remitter.email}</p>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{remitter.phone}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`badge-glass px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-extrabold ${getStatusBadge(remitter.status || 'inactive')}`}>
                                                {remitter.status || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`badge-glass px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-extrabold ${getKycBadge(remitter.kycStatus || 'pending')}`}>
                                                {remitter.kycStatus || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <Link
                                                href={`/admin/mobile-profiles/${remitter.id}`}
                                                className="p-2 rounded-full hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                title="View/Edit Profile"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {!loading && filteredRemitters.length === 0 && (
                    <div className="p-16 text-center text-slate-500 font-medium">
                        No remitters found.
                    </div>
                )}
            </div>
        </div >
    );
}
