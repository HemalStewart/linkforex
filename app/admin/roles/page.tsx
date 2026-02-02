'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Shield, PlusCircle, Edit2, Save, X, LayoutDashboard, Users, ArrowRightLeft, UserPlus, UserCheck, BarChart3, TrendingUp, Map, FileCheck, Info } from 'lucide-react';

const ALL_PERMISSIONS = [
    { id: 'view_dashboard', label: 'View Dashboard', icon: LayoutDashboard },
    { id: 'manage_remitters', label: 'Manage Remitters', icon: Users },
    { id: 'manage_transfers', label: 'Manage Transfers', icon: ArrowRightLeft },
    { id: 'manage_users', label: 'Manage Users', icon: UserPlus },
    { id: 'manage_beneficiaries', label: 'Manage Beneficiaries', icon: UserCheck },
    { id: 'view_reports', label: 'View Reports', icon: BarChart3 },
    { id: 'manage_rates', label: 'Manage Rates', icon: TrendingUp },
    { id: 'manage_branches', label: 'Manage Branches', icon: Map },
    { id: 'kyc_approval', label: 'KYC Approval', icon: FileCheck },
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
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <nav className="flex items-center text-sm text-slate-500 mb-2">
                        <Link href="/admin/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
                        <span className="mx-2">/</span>
                        <span className="text-slate-900 dark:text-white font-medium">Roles & Permissions</span>
                    </nav>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Role Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Define user roles and access levels</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="btn-primary flex items-center space-x-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 bg-gradient-to-r from-indigo-500 to-purple-600 border-0 rounded-full px-6"
                >
                    <PlusCircle className="w-5 h-5" />
                    <span>Create Role</span>
                </button>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <div key={role.id} className="card-glass p-8 rounded-[2rem] flex flex-col hover:scale-[1.02] transition-all duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{role.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{role.description || 'No description'}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                                <Shield className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="flex-1">
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 ml-1">Permissions</h4>
                            <div className="flex flex-wrap gap-2">
                                {role.currentPermissions.length > 0 ? (
                                    role.currentPermissions.slice(0, 5).map((p: string) => {
                                        const perm = ALL_PERMISSIONS.find(ap => ap.id === p);
                                        const Icon = perm?.icon || Info;
                                        return (
                                            <span key={p} className="px-3 py-1.5 bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-600 flex items-center space-x-1 shadow-sm">
                                                <Icon className="w-3 h-3 text-slate-400" />
                                                <span>{perm?.label || p}</span>
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span className="text-sm text-slate-400 italic font-medium px-2">No permissions assigned</span>
                                )}
                                {role.currentPermissions.length > 5 && (
                                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold border border-transparent">
                                        +{role.currentPermissions.length - 5} more
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
                            <button
                                onClick={() => openEditModal(role)}
                                className="flex items-center space-x-2 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white font-bold text-sm transition-colors group"
                            >
                                <Edit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span>Edit Role</span>
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
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Role Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Branch Manager"
                            className="input-glass w-full"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                        <textarea
                            rows={3}
                            placeholder="Brief description of this role..."
                            className="input-glass w-full resize-none"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-900 dark:text-white mb-4">Permissions</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                            {ALL_PERMISSIONS.map(perm => {
                                const Icon = perm.icon;
                                const isChecked = formData.permissions.includes(perm.id);
                                return (
                                    <label
                                        key={perm.id}
                                        className={`flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 border ${isChecked
                                            ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 shadow-sm'
                                            : 'hover:bg-white dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${isChecked
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                                            }`}>
                                            {isChecked && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isChecked}
                                            onChange={() => togglePermission(perm.id)}
                                        />
                                        <div className="flex items-center space-x-2">
                                            <Icon className={`w-4 h-4 ${isChecked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                            <span className={`text-sm font-medium ${isChecked ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {perm.label}
                                            </span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 space-x-3 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-3 rounded-full font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary rounded-full px-8"
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
