'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import { ArrowLeft, User, Mail, Lock, Shield, Building, Save, Loader2, CheckSquare, Square, Check } from 'lucide-react';

export default function CreateUserPage() {
    const router = useRouter();

    const [branches, setBranches] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                // Parallel fetch roles and branches
                const [branchesRes, rolesRes] = await Promise.all([
                    fetch(ENDPOINTS.BRANCHES.LIST),
                    fetch(ENDPOINTS.ROLES.LIST)
                ]);

                if (branchesRes.ok) {
                    setBranches(await branchesRes.json());
                }
                if (rolesRes.ok) {
                    setRoles(await rolesRes.json());
                }
            } catch (e) {
                console.error("Failed to fetch data", e);
            }
        };
        fetchData();
    }, []);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false
    });

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        roleId: '', // We use roleId now
        branch: '',
        password: '',
        confirmPassword: '',
        permissions: [] as string[] // Added strictly for UI state if needed, though role usually dictates permissions
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Passwords do not match!',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
            return;
        }

        try {
            const res = await fetch(ENDPOINTS.USERS.LIST, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    username: formData.username,
                    email: formData.email,
                    role_id: formData.roleId,
                    role: roles.find(r => r.id.toString() === formData.roleId)?.name || 'staff', // Fallback for legacy
                    branch: formData.branch,
                    password: formData.password,
                    status: 'active'
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to create user: ' + (err.messages ? JSON.stringify(err.messages) : 'Unknown error'),
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
                return;
            }

            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: 'System User Created Successfully!',
                type: 'success',
                isAlert: true,
                shouldRedirect: true
            });
        } catch (e) {
            console.error(e);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/users');
        }
    };

    return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in-up">
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
      <div className="mb-8">
        <Link href="/admin/users" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
          <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Users
                </Link>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Add System User</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Create a new staff account for system access.</p>
            </div>

      <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Access Credentials */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
              <Shield className="w-5 h-5 mr-2 text-teal-500" />
                            Account Credentials
                        </h3>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Username <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                required
                className="input-glass w-full pl-12"
                                placeholder="e.g. jdoe"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Email Address <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                required
                className="input-glass w-full pl-12"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                required
                className="input-glass w-full pl-12"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                required
                className="input-glass w-full pl-12"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Personal & Access Info */}
          <div className="md:col-span-2 mt-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
              <User className="w-5 h-5 mr-2 text-teal-500" />
                            Personal & Access Details
                        </h3>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                required
                className="input-glass w-full pl-12"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Assigned Role</label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <select
                className="input-glass w-full pl-12 appearance-none cursor-pointer"
                                value={formData.roleId}
                                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                            >
                                <option value="">Select Role...</option>
                                {roles.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Assigned Branch</label>
            <div className="relative">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <select
                className="input-glass w-full pl-12 appearance-none cursor-pointer"
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                            >
                                <option value="">Select Branch...</option>
                                {branches.map((b: any) => (
                                    <option key={b.id} value={b.code || b.name}>
                                        {b.name} ({b.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

        <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/users"
            className="px-6 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors border border-slate-200 dark:border-slate-600"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
            className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
            <Save className="w-4 h-4" />
                        <span>Create User</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
