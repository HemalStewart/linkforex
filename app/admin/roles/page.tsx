'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

const ALL_PERMISSIONS = [
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

export default function RolesPage() {
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        id: null,
        name: '',
        description: '',
        permissions: [] as string[]
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true
    });

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await fetch(ENDPOINTS.ROLES.LIST);
            if (res.ok) {
                const data = await res.json();
                // Ensure permissions is array
                const cleaned = data.map((r: any) => ({
                    ...r,
                    currentPermissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || [])
                }));
                setRoles(cleaned);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const url = formData.id
                ? ENDPOINTS.ROLES.DETAIL(formData.id)
                : ENDPOINTS.ROLES.LIST;

            const method = formData.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchRoles();
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: `Role ${formData.id ? 'updated' : 'created'} successfully`,
                    type: 'info',
                    isAlert: true
                });
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to save role',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openCreateModal = () => {
        setFormData({ id: null, name: '', description: '', permissions: [] });
        setIsModalOpen(true);
    };

    const openEditModal = (role: any) => {
        setFormData({
            id: role.id,
            name: role.name,
            description: role.description || '',
            permissions: role.currentPermissions
        });
        setIsModalOpen(true);
    };

    const togglePermission = (permId: string) => {
        setFormData(prev => {
            if (prev.permissions.includes(permId)) {
                return { ...prev, permissions: prev.permissions.filter(p => p !== permId) };
            } else {
                return { ...prev, permissions: [...prev.permissions, permId] };
            }
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <nav className="flex items-center text-sm text-slate-500 mb-2">
                        <Link href="/admin/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
                        <span className="mx-2">/</span>
                        <span className="text-slate-900 dark:text-white font-medium">Roles & Permissions</span>
                    </nav>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Role Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Define user roles and access levels</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span>Create Role</span>
                </button>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <div key={role.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{role.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{role.description || 'No description'}</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Permissions</h4>
                            <div className="flex flex-wrap gap-2">
                                {role.currentPermissions.length > 0 ? (
                                    role.currentPermissions.slice(0, 5).map((p: string) => (
                                        <span key={p} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">
                                            {ALL_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-400 italic">No permissions assigned</span>
                                )}
                                {role.currentPermissions.length > 5 && (
                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-xs">
                                        +{role.currentPermissions.length - 5} more
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={() => openEditModal(role)}
                                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium text-sm transition-colors"
                            >
                                Edit Role
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={formData.id ? 'Edit Role' : 'Create New Role'}
                size="xl"
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Branch Manager"
                            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            rows={2}
                            placeholder="Brief description of this role..."
                            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-900 dark:text-white mb-3">Permissions</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {ALL_PERMISSIONS.map(perm => (
                                <label key={perm.id} className="flex items-center space-x-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                        checked={formData.permissions.includes(perm.id)}
                                        onChange={() => togglePermission(perm.id)}
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{perm.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : (formData.id ? 'Update Role' : 'Create Role')}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
            />
        </div>
    );
}
