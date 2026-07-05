'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../../components/ConfirmModal';
import { showToast, queueToast } from '@/app/lib/toast';
import { ArrowLeft, Shield, Save, Trash2 } from 'lucide-react';

export default function EditRolePage() {
    const router = useRouter();
    const params = useParams();
    const roleId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enteredBy, setEnteredBy] = useState('');
    const [users, setUsers] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        id: null as number | null,
        name: '',
        description: '',
        system_defined: 'no'
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
        const parsed = getStoredUser<{ username?: string; name?: string }>();
        setEnteredBy(parsed?.username || parsed?.name || '');
    }, []);

    useEffect(() => {
        const fetchRoleAndUsers = async () => {
            if (!roleId) return;
            setLoading(true);
            try {
                const [roleRes, usersRes] = await Promise.all([
                    fetch(ENDPOINTS.ROLES.DETAIL(roleId)),
                    fetch(ENDPOINTS.USERS.LIST)
                ]);
                if (roleRes.ok) {
                    const data = await roleRes.json();
                    setFormData({
                        id: data.id,
                        name: data.name || '',
                        description: data.description || '',
                        system_defined: data.system_defined || 'no'
                    });
                }
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setUsers(usersData);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchRoleAndUsers();
    }, [roleId]);

    const isRoleAssigned = users.some((u) =>
        (u.role_id && formData.id !== null && String(u.role_id) === String(formData.id)) ||
        (u.role && String(u.role).toLowerCase().trim() === String(formData.name).toLowerCase().trim())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleId) return;
        setSaving(true);
        try {
            const res = await fetch(ENDPOINTS.ROLES.DETAIL(roleId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    updated_by: enteredBy || undefined
                })
            });

            if (res.ok) {
                queueToast('Success', 'Role updated successfully', 'success');
                router.push('/admin/roles');
            } else {
                const err = await res.text();
                showToast('Error', err || 'Failed to update role', 'danger');
            }
        } catch (error) {
            console.error(error);
            showToast('Error', 'Failed to update role', 'danger');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!roleId) return;

        if (isRoleAssigned) {
            showToast('Cannot Delete Role', `The role "${formData.name}" is currently assigned to one or more users and cannot be deleted.`, 'warning');
            return;
        }

        const res = await fetch(ENDPOINTS.ROLES.DETAIL(roleId), { method: 'DELETE' });
        if (res.ok) {
            queueToast('Success', 'Role deleted successfully', 'success');
            router.push('/admin/roles');
        } else {
            showToast('Error', 'Failed to delete role', 'danger');
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/roles');
        }
    };

    if (loading) {
        return <div className="max-w-7xl mx-auto py-20 text-center text-slate-500 dark:text-slate-300">Loading...</div>;
    }

    const isDeletable = formData.system_defined !== 'yes' && !isRoleAssigned;

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
            />

            <div className="mb-8">
                <Link href="/admin/roles" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Roles
                </Link>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Edit Role</h1>
                <p className="text-slate-500 dark:text-slate-300 mt-2">Update role details.</p>
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

                    {/* Empty cell to keep Role Name half-width on desktop */}
                    <div className="hidden md:block"></div>

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
                        disabled={saving}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
