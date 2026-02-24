'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Mail, Phone, MoreVertical } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';

type MobileUser = {
    id: string | number;
    name?: string;
    email?: string;
    phone?: string;
    created_at?: string;
    status?: string;
    device?: string;
    appVersion?: string;
};

export default function MobileUsersPage() {
    const [users, setUsers] = useState<MobileUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${ENDPOINTS.MOBILE_ADMIN.REVIEW_QUEUE}?status=all`);
            if (res.ok) {
                const data = await res.json() as unknown;
                const rows = Array.isArray(data) ? (data as MobileUser[]) : [];
                const mobileUsers = rows.map((u) => ({
                    ...u,
                    device: 'Mobile App',
                    appVersion: 'latest',
                    status: u.status || 'pending'
                }));
                setUsers(mobileUsers);
            }
        } catch (error) {
            console.error('Failed to fetch mobile users', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery)
    );

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return styles[status as keyof typeof styles] || styles.pending;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mobile Accounts</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Overview of users registered via the mobile app</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/mobile-users/control" className="btn-primary rounded-full px-5 py-2.5 text-sm">
                        Mobile Control
                    </Link>
                    <Link href="/admin/mobile-profiles" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        Mobile Profiles
                    </Link>
                    <div className="relative group w-72 input-icon">
                        <div className="input-icon-left">
                            <Search className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-glass w-full py-3"
                        />
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading mobile users...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Info</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Device & App</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                            <td className="px-8 py-5">
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white text-lg">{user.name}</div>
                                                    <div className="text-xs text-slate-500 font-medium mt-1">
                                                        Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-300">
                                                        <Mail className="w-4 h-4 mr-2 text-slate-400" />
                                                        {user.email}
                                                    </div>
                                                    <div className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-300">
                                                        <Phone className="w-4 h-4 mr-2 text-slate-400" />
                                                        {user.phone}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="space-y-1.5">
                                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{user.device}</div>
                                                    <div className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg inline-block border border-slate-200 dark:border-slate-700">
                                                        v{user.appVersion}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`badge-glass px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-extrabold ${getStatusBadge(user.status || 'pending')}`}>
                                                    {user.status || 'pending'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all">
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">No users found</h3>
                                            <p className="text-slate-500">Try adjusting your search terms.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
