'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../components/ConfirmModal';
import { Search, UserPlus, Download, Edit, Trash2, Users, UserCheck, User, Shield } from 'lucide-react';

export default function UsersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: false
    });
    const [userToDelete, setUserToDelete] = useState<number | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (filterRole !== 'all') params.append('role', filterRole);
                if (searchQuery) params.append('search', searchQuery);

                // Using users API
                const res = await fetch(`${ENDPOINTS.USERS.LIST}?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    const mappedData = data.map((u: any) => ({
                        ...u,
                        lastLogin: u.last_login || 'Never',
                        joinedDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'
                    }));
                    setUsers(mappedData);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };

        const debounce = setTimeout(fetchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, filterRole]);

    const promptDelete = (id: number) => {
        setUserToDelete(id);
        setConfirmModal({
            isOpen: true,
            title: 'Delete User',
            message: 'Are you sure you want to delete this user? This action cannot be undone.',
            type: 'danger',
            isAlert: false
        });
    };

    const executeDelete = async () => {
        if (!userToDelete) return;

        try {
            const res = await fetch(ENDPOINTS.USERS.DETAIL(userToDelete), {
                method: 'DELETE'
            });

            if (res.ok) {
                setUsers(users.filter(u => u.id !== userToDelete));
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'User deleted successfully',
                    type: 'info',
                    isAlert: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to delete user',
                    type: 'danger',
                    isAlert: true
                });
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Error deleting user',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setUserToDelete(null);
        }
    };

    const handleConfirm = () => {
        if (confirmModal.isAlert) {
            setConfirmModal({ ...confirmModal, isOpen: false });
        } else {
            executeDelete();
        }
    };


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
            super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
            admin: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
            branch: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
            agent: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
            support: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
            customer: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
        };
        return styles[role as keyof typeof styles] || styles.customer;
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
            inactive: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
            suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        };
        return styles[status as keyof typeof styles] || styles.inactive;
    };

    const formatRole = (role: string) => {
        return (role || '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const filteredUsers = users;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.isAlert ? "OK" : "Delete"}
                cancelText="Cancel"
            />
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Users</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage users and assign roles</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button className="px-5 py-3 rounded-full border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all">
                        <span className="flex items-center space-x-2">
                            <Download className="w-5 h-5" />
                            <span>Export</span>
                        </span>
                    </button>
                    <Link href="/admin/users/create" className="btn-primary flex items-center space-x-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 bg-gradient-to-r from-emerald-500 to-teal-600 border-0 rounded-full px-6">
                        <UserPlus className="w-5 h-5" />
                        <span>Add User</span>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Users', value: users.length, icon: <Users className="w-6 h-6" />, color: 'blue' },
                    { label: 'Active Users', value: users.filter(u => u.status === 'active').length, icon: <UserCheck className="w-6 h-6" />, color: 'emerald' },
                    { label: 'Customers', value: roleConfig.customer.count, icon: <User className="w-6 h-6" />, color: 'cyan' },
                    { label: 'Staff Members', value: users.filter(u => u.role !== 'customer').length, icon: <Shield className="w-6 h-6" />, color: 'indigo' }
                ].map((stat, i) => (
                    <div key={i} className="card-glass p-6 stagger-item hover:scale-[1.02]" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                                <h3 className={`text-3xl font-black text-slate-900 dark:text-white`}>{stat.value}</h3>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg bg-gradient-to-br from-${stat.color}-400 to-${stat.color}-600`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Role Filters */}
            <div className="card-glass p-1.5 rounded-[2rem] inline-flex flex-wrap w-full md:w-auto overflow-hidden">
                <div className="flex items-center space-x-1 overflow-x-auto p-1 no-scrollbar w-full">
                    {Object.entries(roleConfig).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setFilterRole(key)}
                            className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-300 ${filterRole === key
                                ? 'bg-white shadow text-slate-900 dark:bg-slate-700 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            <span className="flex items-center space-x-2">
                                <span>{config.label}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${filterRole === key
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

            {/* Search */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                    type="search"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-glass w-full pl-12 py-3 text-base shadow-sm hover:shadow-md transition-shadow"
                />
            </div>

            {/* Users Table */}
            <div className="card-glass overflow-hidden rounded-[2rem] shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
                            <tr>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Branch</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Login</th>
                                <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                            {filteredUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className="hover:bg-blue-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm ring-2 ring-white dark:ring-slate-800 shadow-sm">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-[15px]">{user.name}</p>
                                                {user.username && <p className="text-xs text-slate-400 font-mono mt-0.5">@{user.username}</p>}
                                                <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`badge-glass px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-extrabold ${getRoleBadge(user.role)}`}>
                                            {formatRole(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{user.branch}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`badge-glass px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-extrabold ${getStatusBadge(user.status)}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-slate-500">
                                        {user.lastLogin}
                                    </td>

                                    <td className="px-8 py-5 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <Link href={`/admin/users/${user.id}`} className="p-2 rounded-full hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-all">
                                                <Edit className="w-5 h-5" />
                                            </Link>
                                            <button
                                                onClick={() => promptDelete(user.id)}
                                                className="p-2 rounded-full hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
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
    );
}
