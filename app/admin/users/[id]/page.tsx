'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import { ArrowLeft, User, Mail, Shield, Building, Lock, Check, Save, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        role: 'agent',
        status: 'active',
        branch: '',
        password: '',
        permissions: [] as string[],
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false
    });

    useEffect(() => {
        if (id) {
            fetchUser();
        }
    }, [id]);

    const fetchUser = async () => {
        try {
            const res = await fetch(ENDPOINTS.USERS.DETAIL(id));
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    name: data.name || '',
                    username: data.username || '',
                    email: data.email || '',
                    role: data.role || 'agent',
                    status: data.status || 'active',
                    branch: data.branch || '',
                    password: '',
                    permissions: data.permissions ? JSON.parse(data.permissions) : [],
                });
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Don't send password if empty
        const { password, ...restData } = formData;
        let dataToSend: any = password ? formData : restData;

        // Convert permissions array to JSON string
        dataToSend = {
            ...dataToSend,
            permissions: JSON.stringify(dataToSend.permissions)
        };

        try {
            const res = await fetch(ENDPOINTS.USERS.DETAIL(id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend),
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'User updated successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to update user',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
            }
        } catch (error) {
            console.error('Failed to submit:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Error updating user',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/users');
        }
    };

    if (loading) {
        return <div className="max-w-4xl mx-auto p-12 text-center text-slate-500 font-medium animate-pulse">Loading user details...</div>;
    }

    const permissionOptions = [
        { id: 'view_dashboard', label: 'View Dashboard' },
        { id: 'manage_remitters', label: 'Manage Remitters' },
        { id: 'manage_transfers', label: 'Manage Transfers' },
        { id: 'manage_users', label: 'Manage Users' },
        { id: 'manage_beneficiaries', label: 'Manage Beneficiaries' },
        { id: 'view_reports', label: 'View Reports' },
        { id: 'manage_rates', label: 'Manage Rates' },
        { id: 'manage_branches', label: 'Manage Branches' },
        { id: 'kyc_approval', label: 'KYC Approval' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalClose}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link href="/admin/users" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Users
                    </Link>
                    <div className="flex items-center space-x-4">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Edit User
                        </h1>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                            ID: {id}
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Personal Info */}
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <User className="w-5 h-5 mr-2 text-indigo-500" />
                            Personal Information
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Name <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-glass w-full pl-12"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Username <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                required
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="input-glass w-full pl-12"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Email <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input-glass w-full pl-12"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch</label>
                        <div className="relative">
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                className="input-glass w-full pl-12"
                            />
                        </div>
                    </div>

                    {/* Role & Status */}
                    <div className="md:col-span-2 mt-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <Shield className="w-5 h-5 mr-2 text-indigo-500" />
                            Access Control
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Role</label>
                        <div className="relative">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="input-glass w-full pl-12 appearance-none cursor-pointer"
                            >
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="agent">Agent</option>
                                <option value="support">Support</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Status</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                <div className={`w-2.5 h-2.5 rounded-full ${formData.status === 'active' ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-red-500'}`}></div>
                            </div>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="input-glass w-full pl-12 appearance-none cursor-pointer"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                            Reset Password
                            <span className="text-xs text-slate-400 ml-2 font-normal">(leave empty to keep current)</span>
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="input-glass w-full pl-12"
                                placeholder="New password"
                            />
                        </div>
                    </div>
                </div>

                {/* Permissions Section */}
                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <label className="block text-lg font-bold text-slate-900 dark:text-white mb-6">Permission Settings</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {permissionOptions.map((permission) => (
                            <label
                                key={permission.id}
                                className={`
                                    flex items-center space-x-3 p-4 rounded-xl cursor-pointer transition-all duration-300 border
                                    ${formData.permissions.includes(permission.id)
                                        ? 'bg-indigo-500/5 border-indigo-500/30'
                                        : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:bg-white hover:border-slate-200'
                                    }
                                `}
                            >
                                <div className={`
                                    w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                                    ${formData.permissions.includes(permission.id)
                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                        : 'border-slate-300 dark:border-slate-600'
                                    }
                                `}>
                                    {formData.permissions.includes(permission.id) && <Check className="w-3 h-3" />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.permissions.includes(permission.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setFormData({
                                                ...formData,
                                                permissions: [...formData.permissions, permission.id]
                                            });
                                        } else {
                                            setFormData({
                                                ...formData,
                                                permissions: formData.permissions.filter(p => p !== permission.id)
                                            });
                                        }
                                    }}
                                    className="hidden"
                                />
                                <span className={`text-sm font-medium ${formData.permissions.includes(permission.id) ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {permission.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-6 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/users"
                        className="px-6 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors border border-slate-200 dark:border-slate-600"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Updating...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </form >
        </div >
    );
}
