'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import { ArrowLeft, Shield, Save, Trash2 } from 'lucide-react';

export default function EditRolePage() {
    const router = useRouter();
    const params = useParams();
    const roleId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enteredBy, setEnteredBy] = useState('');

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
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setEnteredBy(parsed.username || parsed.name || '');
            } catch (e) {
                setEnteredBy('');
            }
        }
    }, []);

    useEffect(() => {
        const fetchRole = async () => {
            if (!roleId) return;
            setLoading(true);
            try {
                const res = await fetch(ENDPOINTS.ROLES.DETAIL(roleId));
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        id: data.id,
                        name: data.name || '',
                        description: data.description || '',
                        system_defined: data.system_defined || 'no'
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, [roleId]);

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
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Role updated successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true
                });
            } else {
                const err = await res.text();
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: err || 'Failed to update role',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to update role',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!roleId) return;
        const res = await fetch(ENDPOINTS.ROLES.DETAIL(roleId), { method: 'DELETE' });
        if (res.ok) {
            router.push('/admin/roles');
        } else {
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to delete role',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
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

            <div className="mb-8 flex items-center justify-between">
                <div>
                    <Link href="/admin/roles" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Roles
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Edit Role</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2">Update role details.</p>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={formData.system_defined === 'yes'}
                    className={`px-5 py-3 rounded-full text-sm font-bold transition-colors flex items-center space-x-2 ${formData.system_defined === 'yes'
                        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                        : 'glass-effect text-slate-600 dark:text-slate-300 hover:text-red-600'
                        }`}
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                </button>
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
                                placeholder="e.g. Admin"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">System Defined</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Shield className="w-5 h-5" />
                            </span>
                            <select
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                                value={formData.system_defined}
                                onChange={(e) => setFormData({ ...formData, system_defined: e.target.value })}
                            >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">⌄</span>
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
                        disabled={saving}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Update Role'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
