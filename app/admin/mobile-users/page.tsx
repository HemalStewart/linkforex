'use client';

import React, { useState, useEffect } from 'react';
import { Search, User, Mail, Phone, Calendar, Smartphone, FileText, CheckCircle, XCircle, MoreVertical, Shield, Clock } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';

export default function MobileUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            // Using REMITTERS endpoint as proxy for mobile users if specific endpoint doesn't exist yet
            const res = await fetch(ENDPOINTS.REMITTERS.LIST);
            if (res.ok) {
                const data = await res.json();
                // Filter or transform if needed to simulate mobile users
                const mobileUsers = data.map((u: any) => ({
                    ...u,
                    device: 'iPhone 13 Pro', // Mock data
                    lastLogin: new Date().toISOString(), // Mock data
                    appVersion: '1.2.0', // Mock data
                    status: u.kyc_status === 'verified' ? 'active' : 'pending' // Mock status mapping
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
            active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return styles[status as keyof typeof styles] || styles.pending;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mobile App Users</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage users registered via the mobile application</p>
                </div>
                <div className="relative group w-72">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <Search className="w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-glass w-full pl-11 py-3"
                    />
                </div>
            </div>

            <div className="card-glass overflow-hidden rounded-[2rem] shadow-xl">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading mobile users...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Info</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Device & App</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-500/20">
                                                        {user.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white text-lg">{user.name}</div>
                                                        <div className="text-xs text-slate-500 font-medium flex items-center mt-1">
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            Joined {new Date(user.created_at).toLocaleDateString()}
                                                        </div>
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
                                                    <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-200">
                                                        <Smartphone className="w-4 h-4 mr-2 text-slate-400" />
                                                        {user.device}
                                                    </div>
                                                    <div className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg inline-block border border-slate-200 dark:border-slate-700">
                                                        v{user.appVersion}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`badge-glass px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-extrabold ${getStatusBadge(user.status)}`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-all">
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <User className="w-10 h-10 text-slate-400" />
                                            </div>
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
