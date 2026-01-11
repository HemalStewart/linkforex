'use client';

import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function UsersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    const users = [
        { id: 1, name: 'Admin User', email: 'admin@linkforex.com', role: 'super_admin', status: 'active', phone: '+44 20 1234 5678', branch: 'London Central', lastLogin: '2026-01-11 11:30', joinedDate: '2025-01-15', transfersCount: 0 },
        { id: 2, name: 'Sarah Manager', email: 'sarah.m@linkforex.com', role: 'admin', status: 'active', phone: '+44 20 1234 5679', branch: 'Manchester', lastLogin: '2026-01-11 10:15', joinedDate: '2025-02-20', transfersCount: 0 },
        { id: 3, name: 'James Branch', email: 'james.b@linkforex.com', role: 'branch', status: 'active', phone: '+44 20 1234 5680', branch: 'Birmingham', lastLogin: '2026-01-11 09:45', joinedDate: '2025-03-10', transfersCount: 0 },
        { id: 4, name: 'Emma Agent', email: 'emma.a@linkforex.com', role: 'agent', status: 'active', phone: '+44 20 1234 5681', branch: 'London East', lastLogin: '2026-01-11 08:20', joinedDate: '2025-04-05', transfersCount: 0 },
        { id: 5, name: 'Ahmed Hassan', email: 'ahmed.hassan@example.com', role: 'customer', status: 'active', phone: '+44 7700 900 123', branch: '-', lastLogin: '2026-01-11 07:00', joinedDate: '2025-12-01', transfersCount: 8 },
        { id: 6, name: 'Fatima Rahman', email: 'fatima.rahman@example.com', role: 'customer', status: 'active', phone: '+44 7700 900 234', branch: '-', lastLogin: '2026-01-10 18:30', joinedDate: '2025-11-15', transfersCount: 12 },
        { id: 7, name: 'David Support', email: 'david.s@linkforex.com', role: 'support', status: 'active', phone: '+44 20 1234 5682', branch: 'All Branches', lastLogin: '2026-01-10 16:00', joinedDate: '2025-05-20', transfersCount: 0 },
        { id: 8, name: 'Mohammed Ali', email: 'ali.m@example.com', role: 'customer', status: 'inactive', phone: '+44 7700 900 345', branch: '-', lastLogin: '2026-01-05 14:20', joinedDate: '2025-10-10', transfersCount: 5 },
        { id: 9, name: 'Noor Khan', email: 'noor.khan@example.com', role: 'customer', status: 'suspended', phone: '+44 7700 900 456', branch: '-', lastLogin: '2026-01-02 12:00', joinedDate: '2025-09-25', transfersCount: 3 },
        { id: 10, name: 'Zahra Karimi', email: 'zahra.k@example.com', role: 'customer', status: 'active', phone: '+44 7700 900 567', branch: '-', lastLogin: '2026-01-11 06:30', joinedDate: '2025-08-12', transfersCount: 15 },
    ];

    const roleConfig = {
        all: { label: 'All Users', count: users.length },
        super_admin: { label: 'Super Admin', count: users.filter(u => u.role === 'super_admin').length },
        admin: { label: 'Admin', count: users.filter(u => u.role === 'admin').length },
        branch: { label: 'Branch Staff', count: users.filter(u => u.role === 'branch').length },
        agent: { label: 'Agents', count: users.filter(u => u.role === 'agent').length },
        support: { label: 'Support', count: users.filter(u => u.role === 'support').length },
        customer: { label: 'Customers', count: users.filter(u => u.role === 'customer').length },
    };

    const getRoleBadge = (role: string) => {
        const styles = {
            super_admin: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900',
            admin: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
            branch: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
            agent: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900',
            support: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
            customer: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
        return styles[role as keyof typeof styles];
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
            inactive: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
            suspended: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
        };
        return styles[status as keyof typeof styles];
    };

    const formatRole = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const filteredUsers = users.filter(user => {
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        const matchesSearch = searchQuery === '' ||
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRole && matchesSearch;
    });

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Users</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage users and assign roles</p>
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
                                <span>Add User</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Users</p>
                                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{users.length}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Active Users</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{users.filter(u => u.status === 'active').length}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white shadow-lg">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Customers</p>
                                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{roleConfig.customer.count}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Staff Members</p>
                                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                    {users.filter(u => u.role !== 'customer').length}
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Role Filters */}
                <div className="card-glass">
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                        {Object.entries(roleConfig).map(([key, config]) => (
                            <button
                                key={key}
                                onClick={() => setFilterRole(key)}
                                className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 ${filterRole === key
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span className="flex items-center space-x-2">
                                    <span>{config.label}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filterRole === key
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

                {/* Search */}
                <div className="card-glass">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            placeholder="Search users by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field pl-12"
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="card-glass overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Branch</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Last Login</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Transfers</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredUsers.map((user, index) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getRoleBadge(user.role)}`}>
                                                {formatRole(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{user.branch}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${getStatusBadge(user.status)}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                            {user.lastLogin}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.transfersCount}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="View">
                                                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Edit">
                                                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
