'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../components/ConfirmModal';
import { Search, UserPlus, Download, Trash2, Users, UserCheck, User, Shield, QrCode, Eye, RotateCcw, ChevronRight } from 'lucide-react';

export default function UsersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<string>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const [users, setUsers] = useState<any[]>([]);
    const [currentUserName, setCurrentUserName] = useState('');

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: false
    });
    const [userToDelete, setUserToDelete] = useState<number | null>(null);
    const [userToReset, setUserToReset] = useState<any | null>(null);
    const [confirmAction, setConfirmAction] = useState<'delete' | 'reset' | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch(`${ENDPOINTS.USERS.LIST}`);
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
        };

        const debounce = setTimeout(fetchUsers, 200);
        return () => clearTimeout(debounce);
    }, []);

    useEffect(() => {
        const parsed = getStoredUser<{ username?: string; name?: string }>();
        setCurrentUserName(parsed?.username || parsed?.name || '');
    }, []);

    const promptDelete = (id: number) => {
        setUserToDelete(id);
        setConfirmAction('delete');
        setConfirmModal({
            isOpen: true,
            title: 'Delete User',
            message: 'Are you sure you want to delete this user? This action cannot be undone.',
            type: 'danger',
            isAlert: false
        });
    };

    const promptReset = (user: any) => {
        setUserToReset(user);
        setConfirmAction('reset');
        setConfirmModal({
            isOpen: true,
            title: 'Reset Password',
            message: `Reset password for ${user.username || user.name}? A temporary password will be generated.`,
            type: 'warning',
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

    const executeReset = async () => {
        if (!userToReset) return;

        const tempPassword = `${Math.random().toString(36).slice(2, 6)}${Math.random().toString(36).slice(2, 6)}!`;

        try {
            const res = await fetch(ENDPOINTS.USERS.DETAIL(userToReset.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: tempPassword,
                    updated_by: currentUserName || undefined
                })
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Password Reset',
                    message: `Temporary password: ${tempPassword}`,
                    type: 'info',
                    isAlert: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to reset password',
                    type: 'danger',
                    isAlert: true
                });
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Error resetting password',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setUserToReset(null);
        }
    };

    const handleConfirm = () => {
        if (confirmModal.isAlert) {
            setConfirmModal({ ...confirmModal, isOpen: false });
        } else {
            if (confirmAction === 'delete') executeDelete();
            if (confirmAction === 'reset') executeReset();
        }
    };


    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
            inactive: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
            suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        };
        return styles[status as keyof typeof styles] || styles.inactive;
    };
    const getYesNoBadge = (val: any) => {
        const isYes = val === 'yes' || val === true || val === 1;
        return isYes
            ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    };

    const getTwofaBadge = (status: string) => {
        const styles = {
            active: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
            inactive: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
        };
        return styles[status as keyof typeof styles] || styles.inactive;
    };

    const normalizeYesNo = (val: any) => (val === 'yes' || val === true || val === 1) ? 'yes' : 'no';
    const toYesNoLabel = (val: any) => (normalizeYesNo(val) === 'yes' ? 'Yes' : 'No');
    const toTitleLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

    const searchedUsers = searchQuery.trim()
        ? users.filter((u) => {
            const haystack = [
                u.username,
                u.name,
                u.email,
                u.status,
                u.signature ? 'yes' : 'no',
                u.system_defined,
                u.twofa_status,
                u.twofa_qr_code,
                u.created_by,
                u.updated_by,
                u.created_at,
                u.updated_at
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(searchQuery.trim().toLowerCase());
        })
        : users;

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const getSortValue = (user: any, key: string) => {
        switch (key) {
            case 'username':
                return user.username || '';
            case 'name':
                return user.name || '';
            case 'status':
                return user.status || '';
            case 'signature':
                return user.signature ? 'yes' : 'no';
            case 'system_defined':
                return normalizeYesNo(user.system_defined);
            case 'twofa_status':
                return user.twofa_status || '';
            case 'twofa_qr_code':
                return user.twofa_qr_code || '';
            case 'created_by':
                return user.created_by || '';
            case 'updated_by':
                return user.updated_by || '';
            case 'created_at':
                return user.created_at ? new Date(user.created_at).getTime() : 0;
            case 'updated_at':
                return user.updated_at ? new Date(user.updated_at).getTime() : 0;
            default:
                return user[key] || '';
        }
    };

    const filteredUsers = [...searchedUsers].sort((a, b) => {
        const aVal = getSortValue(a, sortKey);
        const bVal = getSortValue(b, sortKey);

        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const result = collator.compare(String(aVal), String(bVal));
        return sortDir === 'asc' ? result : -result;
    });

    const toggleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortIndicator = (key: string) => {
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    const totalUsers = users.length;
    const activeUsers = users.filter(u => (u.status || '').toLowerCase() === 'active').length;
    const systemDefinedUsers = users.filter(u => normalizeYesNo(u.system_defined) === 'yes').length;
    const twofaActiveUsers = users.filter(u => (u.twofa_status || '').toLowerCase() === 'active').length;

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
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Manage users and assign roles</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button className="px-5 py-3 rounded-full border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all">
                        <span className="flex items-center space-x-2">
                            <Download className="w-5 h-5" />
                            <span>Export</span>
                        </span>
                    </button>
                    <Link href="/admin/users/create" className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 rounded-full px-6">
                        <UserPlus className="w-5 h-5" />
                        <span>Add User</span>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Users', value: totalUsers, icon: <Users className="w-6 h-6" /> },
                    { label: 'Active Users', value: activeUsers, icon: <UserCheck className="w-6 h-6" /> },
                    { label: 'System Defined', value: systemDefinedUsers, icon: <Shield className="w-6 h-6" /> },
                    { label: '2FA Active', value: twofaActiveUsers, icon: <User className="w-6 h-6" /> }
                ].map((stat, i) => (
                    <div key={i} className="card-glass p-6 stagger-item hover:scale-[1.02]" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-300 mb-1">{stat.label}</p>
                                <h3 className={`text-3xl font-black text-slate-900 dark:text-white`}>{stat.value}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm bg-gradient-to-br from-teal-500 to-teal-600">
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="card-glass p-6">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                <div className="relative input-icon">
                    <span className="input-icon-left">
                        <Search className="w-4 h-4" />
                    </span>
                    <input
                        type="search"
                        placeholder="Search any column (username, name, status, 2FA, dates, etc.)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-glass w-full text-sm"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex flex-col gap-3">
                    <div className="text-sm text-slate-500 dark:text-slate-300">
                        Results: {filteredUsers.length === 0 ? 0 : 1} - {filteredUsers.length} of {filteredUsers.length}
                    </div>
                </div>

                <div className="table-scroll">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">No.</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('username')} className="flex items-center gap-1">
                                        Username <span className="text-slate-400 dark:text-slate-300">{sortIndicator('username')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                                        Person Name <span className="text-slate-400 dark:text-slate-300">{sortIndicator('name')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1">
                                        Status <span className="text-slate-400 dark:text-slate-300">{sortIndicator('status')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('signature')} className="flex items-center gap-1">
                                        Signature <span className="text-slate-400 dark:text-slate-300">{sortIndicator('signature')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('system_defined')} className="flex items-center gap-1">
                                        System Defined <span className="text-slate-400 dark:text-slate-300">{sortIndicator('system_defined')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('twofa_status')} className="flex items-center gap-1">
                                        2FA Status <span className="text-slate-400 dark:text-slate-300">{sortIndicator('twofa_status')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('twofa_qr_code')} className="flex items-center gap-1">
                                        2FA QR Code <span className="text-slate-400 dark:text-slate-300">{sortIndicator('twofa_qr_code')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">View 2FA QR</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('created_by')} className="flex items-center gap-1">
                                        Entered User <span className="text-slate-400 dark:text-slate-300">{sortIndicator('created_by')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1">
                                        Entered Date <span className="text-slate-400 dark:text-slate-300">{sortIndicator('created_at')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('updated_by')} className="flex items-center gap-1">
                                        Modified User <span className="text-slate-400 dark:text-slate-300">{sortIndicator('updated_by')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('updated_at')} className="flex items-center gap-1">
                                        Modified Date <span className="text-slate-400 dark:text-slate-300">{sortIndicator('updated_at')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Reset Password</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">View</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {filteredUsers.map((user, idx) => {
                                const systemDefined = normalizeYesNo(user.system_defined) === 'yes';
                                return (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200"
                                    >
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{idx + 1}</td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{user.username || '-'}</td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{user.name || '-'}</td>
                                        <td className="px-4 py-4">
                                            <span className={`badge-glass px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-extrabold ${getStatusBadge(user.status)}`}>
                                                {user.status || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`badge-glass px-3 py-1 rounded-full text-[10px] font-extrabold ${user.signature ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                {user.signature ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`badge-glass px-3 py-1 rounded-full text-[10px] font-extrabold ${getYesNoBadge(user.system_defined)}`}>
                                                {toYesNoLabel(user.system_defined)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`badge-glass px-3 py-1 rounded-full text-[10px] font-extrabold ${getTwofaBadge(user.twofa_status)}`}>
                                                {toTitleLabel(String(user.twofa_status || 'inactive'))}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <button className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 transition-colors flex items-center gap-1">
                                                <QrCode className="w-3.5 h-3.5" />
                                                New QR
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <button className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 transition-colors flex items-center gap-1">
                                                <Eye className="w-3.5 h-3.5" />
                                                View QR
                                            </button>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{user.created_by || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{user.updated_by || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{user.updated_at ? new Date(user.updated_at).toLocaleString() : '-'}</td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => promptReset(user)}
                                                className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 transition-colors flex items-center gap-1"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                Reset Password
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Link
                                                href={`/admin/users/${user.id}`}
                                                className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 transition-colors flex items-center gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                View
                                            </Link>
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => promptDelete(user.id)}
                                                disabled={systemDefined}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${systemDefined
                                                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                                                    : 'glass-effect text-slate-600 dark:text-slate-200 hover:text-red-600'
                                                    }`}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
