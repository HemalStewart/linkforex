'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import { ArrowLeft, User, Mail, Shield, Building, Save, Loader2, ChevronRight } from 'lucide-react';

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        role: 'agent',
        status: 'active',
        branch: ''
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
            const loadData = async () => {
                setLoading(true);
                await Promise.all([fetchUser(), fetchBranches()]);
                setLoading(false);
            };
            loadData();
        }
    }, [id]);

    const fetchBranches = async () => {
        try {
            const res = await fetch(ENDPOINTS.BRANCHES.LIST);
            if (res.ok) {
                setBranches(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        }
    };

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
                    branch: data.branch || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(ENDPOINTS.USERS.DETAIL(id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
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
        return <div className="max-w-7xl mx-auto p-12 text-center text-slate-500 font-medium animate-pulse">Loading user details...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
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
                    <Link href="/admin/users" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Users
                    </Link>
                    <div className="flex items-center space-x-4">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Edit User
                        </h1>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold">
                            ID: {id}
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Personal Info */}
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <User className="w-5 h-5 mr-2 text-teal-500" />
                            Personal Information
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Name <span className="text-red-500">*</span></label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <User className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-glass w-full"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Username <span className="text-red-500">*</span></label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <User className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="text"
                                required
                                autoComplete="off"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="input-glass w-full"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Email <span className="text-red-500">*</span></label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <Mail className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="email"
                                required
                                autoComplete="off"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input-glass w-full"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <Building className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <select
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                            >
                                <option value="">Select Branch...</option>
                                {branches.map((b: any) => (
                                    <option key={b.id} value={b.code || b.name}>
                                        {b.name} ({b.code})
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
                    </div>

                    {/* Role & Status */}
                    <div className="md:col-span-2 mt-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <Shield className="w-5 h-5 mr-2 text-teal-500" />
                            Access Control
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Role</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <Shield className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="input-glass w-full appearance-none cursor-pointer"
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
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <span className={`w-2.5 h-2.5 rounded-full inline-block ${formData.status === 'active' ? 'bg-teal-500 ring-4 ring-teal-500/20' : 'bg-red-500'}`}></span>
                            </span>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="input-glass w-full appearance-none cursor-pointer"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
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
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Updating...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save</span>
                            </>
                        )}
                    </button>
                </div>
            </form >
        </div >
    );
}
