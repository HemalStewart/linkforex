'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import { formatDateTime } from '@/app/lib/dateUtils';
import ConfirmModal from '../components/ConfirmModal';
import { validatePassword } from '@/app/lib/validation';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Search, UserPlus, Trash2, Users, UserCheck, User, Shield, QrCode, Eye, RotateCcw, ChevronRight, Edit2, Lock, EyeOff } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuditColumns, usePagePermissions } from '@/app/lib/permissions';

export default function UsersPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('SYSTEM_USERS');
    const { canAdd, canEdit, canDelete, canResetPassword } = usePagePermissions('SYSTEM_USERS');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<string>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);

    const [users, setUsers] = useState<any[]>([]);
    const [currentUserName, setCurrentUserName] = useState('');

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: false
    });
    const [userToDelete, setUserToDelete] = useState<number | null>(null);
    const [userToReset, setUserToReset] = useState<any | null>(null);
    const [confirmAction, setConfirmAction] = useState<'delete' | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [activeQrUser, setActiveQrUser] = useState<any | null>(null);

    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetError, setResetError] = useState('');
    const [passwordErrorState, setPasswordErrorState] = useState('');
    const [confirmPasswordErrorState, setConfirmPasswordErrorState] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

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
        setNewPassword('');
        setConfirmPassword('');
        setResetError('');
        setPasswordErrorState('');
        setConfirmPasswordErrorState('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setIsResetPasswordModalOpen(true);
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
                const message = await readErrorMessage(res, 'Failed to delete user');
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message,
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

    const handleResetPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToReset) return;

        const passwordErr = validatePassword(newPassword);
        if (passwordErr) {
            setPasswordErrorState(passwordErr);
            return;
        } else {
            setPasswordErrorState('');
        }

        if (newPassword !== confirmPassword) {
            setConfirmPasswordErrorState('Passwords do not match.');
            return;
        } else {
            setConfirmPasswordErrorState('');
        }

        setResetLoading(true);
        setResetError('');

        try {
            const res = await fetch(ENDPOINTS.USERS.DETAIL(userToReset.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: newPassword,
                    updated_by: currentUserName || undefined
                })
            });

            if (res.ok) {
                setIsResetPasswordModalOpen(false);
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: `Password set successfully for ${userToReset.username || userToReset.name}.`,
                    type: 'success',
                    isAlert: true
                });
            } else {
                let msg = 'Failed to reset password';
                try {
                    const data = await res.json();
                    if (data?.message) msg = data.message;
                    else if (data?.messages) msg = Object.values(data.messages).join(', ');
                } catch { }
                setResetError(msg);
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            setResetError('Network error while resetting password.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleConfirm = () => {
        if (confirmModal.isAlert) {
            setConfirmModal({ ...confirmModal, isOpen: false });
        } else {
            if (confirmAction === 'delete') executeDelete();
        }
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

    const totalRows = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const pagedUsers = filteredUsers.slice(startIndex, endIndex);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, sortKey, sortDir, rowsPerPage]);

    useEffect(() => {
        if (page !== currentPage) {
            setPage(currentPage);
        }
    }, [page, currentPage]);

    const toggleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortIndicator = (key: string) => {
        return <SortIndicator active={sortKey === key} dir={sortDir} className="text-slate-400 dark:text-slate-300" />;
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
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.isAlert ? "OK" : "Delete"}
                cancelText="Cancel"
            />

            {/* 2FA QR Code Modal */}
            <Modal
                isOpen={showQrModal}
                onClose={() => {
                    setShowQrModal(false);
                    setActiveQrUser(null);
                }}
                title={`2FA QR Setup for ${activeQrUser?.username || activeQrUser?.name || 'User'}`}
                size="md"
            >
                <div className="space-y-6 flex flex-col items-center py-4">
                    <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-100">
                        {activeQrUser?.twofa_qr_code ? (
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                    `otpauth://totp/LinkForex:${activeQrUser.email || ''}?secret=${activeQrUser.twofa_qr_code}&issuer=LinkForex`
                                )}`}
                                alt="2FA QR Code"
                                width={200}
                                height={200}
                                className="rounded-lg"
                            />
                        ) : (
                            <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 text-xs">
                                No secret generated
                            </div>
                        )}
                    </div>
                    <div className="text-center space-y-2 max-w-sm">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Scan to configure authenticator app
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Scan the QR code with Google Authenticator, Microsoft Authenticator Authy, or any other TOTP-compliant app.
                        </p>
                    </div>
                    <div className="w-full space-y-2">
                        <p className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Secret key (Manual config)
                        </p>
                        <div className="flex justify-center">
                            <code className="px-4 py-2 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-teal-400 rounded-lg text-base font-mono font-bold tracking-wider select-all border border-slate-200 dark:border-slate-800">
                                {activeQrUser?.twofa_qr_code || '—'}
                            </code>
                        </div>
                    </div>
                    <div className="w-full flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                setShowQrModal(false);
                                setActiveQrUser(null);
                            }}
                            className="btn-secondary py-2 px-6"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                isOpen={isResetPasswordModalOpen}
                onClose={() => setIsResetPasswordModalOpen(false)}
                title={`Set Password for ${userToReset?.username || userToReset?.name || 'User'}`}
                size="sm"
            >
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    {resetError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">
                            {resetError}
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300">New Password</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <Lock className="w-4 h-4 text-slate-400" />
                            </span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    if (passwordErrorState) setPasswordErrorState('');
                                }}
                                placeholder="••••••••"
                                className="input-glass w-full text-sm"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 ml-1 leading-relaxed">
                            Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.
                        </p>
                        {passwordErrorState && (
                            <p className="text-xs text-rose-500 font-semibold mt-1 ml-1">{passwordErrorState}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300">Confirm Password</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <Lock className="w-4 h-4 text-slate-400" />
                            </span>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (confirmPasswordErrorState) setConfirmPasswordErrorState('');
                                }}
                                placeholder="••••••••"
                                className="input-glass w-full text-sm"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {confirmPasswordErrorState && (
                            <p className="text-xs text-rose-500 font-semibold mt-1 ml-1">{confirmPasswordErrorState}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsResetPasswordModalOpen(false)}
                            disabled={resetLoading}
                            className="px-4 py-2 rounded-full text-xs font-semibold glass-effect text-slate-600 dark:text-slate-300 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={resetLoading}
                            className="btn-primary px-4 py-2 rounded-full text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {resetLoading ? 'Setting...' : 'Set Password'}
                        </button>
                    </div>
                </form>
            </Modal>
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Users</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Manage users and assign roles</p>
                </div>
                <div className="flex items-center space-x-4">
                    {canAdd && (
                        <Link href="/admin/users/create" className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 rounded-full px-6">
                            <UserPlus className="w-5 h-5" />
                            <span>Add User</span>
                        </Link>
                    )}
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
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Search</label>
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
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center space-x-3">
                    <Users className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Directory</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Showing {totalRows === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRows}
                        </p>
                    </div>
                </div>

                <div className="table-scroll">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">No.</th>
                                {canEdit && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Edit"><Edit2 className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('username')} className="flex items-center gap-1">
                                        Username <span className="text-slate-400 dark:text-slate-300">{sortIndicator('username')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                                        Person Name <span className="text-slate-400 dark:text-slate-300">{sortIndicator('name')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1">
                                        Status <span className="text-slate-400 dark:text-slate-300">{sortIndicator('status')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('twofa_status')} className="flex items-center gap-1">
                                        2FA Status <span className="text-slate-400 dark:text-slate-300">{sortIndicator('twofa_status')}</span>
                                    </button>
                                </th>
                                <td className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <div className="flex items-center gap-1">
                                        <span>2FA QR</span>
                                        <QrCode className="w-4 h-4 text-slate-400" />
                                    </div>
                                </td>
                                {showCreatedBy && (
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('created_by')} className="flex items-center gap-1">
                                            Created By <span className="text-slate-400 dark:text-slate-300">{sortIndicator('created_by')}</span>
                                        </button>
                                    </th>
                                )}
                                {showCreatedAt && (
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1">
                                            Created At <span className="text-slate-400 dark:text-slate-300">{sortIndicator('created_at')}</span>
                                        </button>
                                    </th>
                                )}
                                {showUpdatedBy && (
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('updated_by')} className="flex items-center gap-1">
                                            Updated By <span className="text-slate-400 dark:text-slate-300">{sortIndicator('updated_by')}</span>
                                        </button>
                                    </th>
                                )}
                                {showUpdatedAt && (
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('updated_at')} className="flex items-center gap-1">
                                            Updated At <span className="text-slate-400 dark:text-slate-300">{sortIndicator('updated_at')}</span>
                                        </button>
                                    </th>
                                )}
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('signature')} className="flex items-center gap-1">
                                        Signature <span className="text-slate-400 dark:text-slate-300">{sortIndicator('signature')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('system_defined')} className="flex items-center gap-1">
                                        System Defined <span className="text-slate-400 dark:text-slate-300">{sortIndicator('system_defined')}</span>
                                    </button>
                                </th>
                                {canResetPassword && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Reset Password</th>}
                                {canDelete && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Delete"><Trash2 className="w-4 h-4 mx-auto text-slate-400" /></th>}
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {pagedUsers.map((user, idx) => {
                                const systemDefined = normalizeYesNo(user.system_defined) === 'yes';
                                return (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200"
                                    >
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                        {canEdit && (
                                            <td className="px-2 py-4 text-center">
                                                {systemDefined ? (
                                                    <span className="p-2 rounded-xl text-slate-400 opacity-35 cursor-not-allowed inline-flex" title="System defined user, edit disabled">
                                                        <Edit2 className="w-5 h-5" />
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href={`/admin/users/${user.id}`}
                                                        className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </Link>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{user.username || '-'}</td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{user.name || '-'}</td>
                                        <td className="px-4 py-4">
                                            <Badge type={(user.status || 'inactive').toLowerCase()}>
                                                {user.status || '-'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge type={(user.twofa_status || 'inactive').toLowerCase()}>
                                                {toTitleLabel(String(user.twofa_status || 'inactive'))}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4 text-left">
                                            {user.twofa_qr_code ? (
                                                <button
                                                    onClick={() => {
                                                        setActiveQrUser(user);
                                                        setShowQrModal(true);
                                                    }}
                                                    className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                    title="View 2FA QR"
                                                >
                                                    <QrCode className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <span className="p-2 rounded-xl text-slate-400 opacity-35 cursor-not-allowed inline-flex" title="2FA QR code not generated">
                                                    <QrCode className="w-5 h-5" />
                                                </span>
                                            )}
                                        </td>
                                        {showCreatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{user.created_by || '-'}</td>}
                                        {showCreatedAt && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime(user.created_at)}</td>}
                                        {showUpdatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{user.updated_by || '-'}</td>}
                                        {showUpdatedAt && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime(user.updated_at)}</td>}
                                        <td className="px-4 py-4">
                                            <Badge type={user.signature ? 'yes' : 'no'}>
                                                {user.signature ? 'Yes' : 'No'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge type={normalizeYesNo(user.system_defined)}>
                                                {toYesNoLabel(user.system_defined)}
                                            </Badge>
                                        </td>
                                        {canResetPassword && (
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => promptReset(user)}
                                                    className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 transition-colors flex items-center gap-1"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Reset Password
                                                </button>
                                            </td>
                                        )}
                                        {canDelete && (
                                            <td className="px-2 py-4 text-center">
                                                <button
                                                    onClick={() => promptDelete(user.id)}
                                                    disabled={systemDefined}
                                                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(rows) => {
                        setRowsPerPage(rows);
                        setPage(1);
                    }}
                />
            </div>
        </div>
    );
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
        const data = await res.json();
        if (typeof data?.message === 'string' && data.message.trim() !== '') {
            return data.message;
        }
        if (data?.messages && typeof data.messages === 'object') {
            const joined = Object.values(data.messages)
                .flat()
                .filter(Boolean)
                .join(' ');
            if (joined) return joined;
        }
    } catch {
        // Ignore parse errors.
    }
    return fallback;
}
