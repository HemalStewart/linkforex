'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../../components/ConfirmModal';
import { showToast, queueToast } from '@/app/lib/toast';
import { ArrowLeft, Shield, Save, ChevronRight } from 'lucide-react';

export default function CreateRolePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [enteredBy, setEnteredBy] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        system_defined: 'no',
        copy_from_role_id: ''
    });

    const [existingRoles, setExistingRoles] = useState<{ id: number; name: string }[]>([]);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false
    });

    useEffect(() => {
        const parsed = getStoredUser<{ username?: string; name?: string }>();
        setEnteredBy(parsed?.username || parsed?.name || '');
    }, []);

    useEffect(() => {
        const fetchExistingRoles = async () => {
            try {
                const res = await fetch(ENDPOINTS.ROLES.LIST);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setExistingRoles(data);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch existing roles:', err);
            }
        };
        fetchExistingRoles();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setConfirmModal({
            isOpen: true,
            title: 'Creating Role',
            message: 'Creating the role and initializing permission records. Please wait...',
            type: 'info',
            isAlert: false,
            shouldRedirect: false
        });

        try {
            const res = await fetch(ENDPOINTS.ROLES.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    created_by: enteredBy || undefined,
                    updated_by: enteredBy || undefined
                })
            });

            if (res.ok) {
                const createdRole = await res.json();
                
                // Show that we are initializing permissions
                setConfirmModal(prev => ({
                    ...prev,
                    message: 'Initializing role permissions...'
                }));

                // Run the validation endpoint to populate all permission records
                const validateRes = await fetch(`${ENDPOINTS.ROLES.LIST}/validate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (validateRes.ok) {
                    setConfirmModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'Role created and permission records initialized successfully.',
                        type: 'success',
                        isAlert: false,
                        shouldRedirect: true
                    });
                } else {
                    setConfirmModal({
                        isOpen: true,
                        title: 'Partial Success',
                        message: 'Role created, but we could not initialize all permission records automatically. You can validate them later from the roles list page.',
                        type: 'warning',
                        isAlert: false,
                        shouldRedirect: true
                    });
                }
            } else {
                const err = await res.text();
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: err || 'Failed to create role',
                    type: 'danger',
                    isAlert: false,
                    shouldRedirect: false
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An unexpected error occurred while creating the role.',
                type: 'danger',
                isAlert: false,
                shouldRedirect: false
            });
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        if (loading) return; // Prevent closing while processing is active
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/roles');
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalClose}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
                loading={loading}
            />

            <div className="mb-8">
                <Link href="/admin/roles" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Roles
                </Link>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Add Role</h1>
                <p className="text-slate-500 dark:text-slate-300 mt-2">Create a new role.</p>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Role Name <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Shield className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                required
                                className="input-glass w-full"
                                placeholder="Role name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Duplicate/Copy from existing role</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Shield className="w-5 h-5" />
                            </span>
                            <select
                                className="input-glass w-full pr-10 appearance-none cursor-pointer text-slate-700 dark:text-slate-200 font-semibold"
                                value={formData.copy_from_role_id}
                                onChange={(e) => setFormData({ ...formData, copy_from_role_id: e.target.value })}
                            >
                                <option value="" className="text-slate-900 dark:text-slate-900">None</option>
                                {existingRoles.map((role) => (
                                    <option key={role.id} value={role.id} className="text-slate-900 dark:text-slate-900">
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Description</label>
                        <textarea
                            rows={3}
                            className="input-glass w-full resize-none"
                            placeholder="Brief description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/roles"
                        className="px-6 py-3 rounded-full glass-effect text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        <Save className="w-4 h-4" />
                        <span>{loading ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
