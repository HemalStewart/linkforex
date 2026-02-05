'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';
import { Search, PlusCircle, Trash2, Eye, Shield, ChevronRight } from 'lucide-react';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [systemDefinedFilter, setSystemDefinedFilter] = useState('any');
    const [searchType, setSearchType] = useState<'and' | 'or'>('and');

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [roleToDelete, setRoleToDelete] = useState<any | null>(null);
    const [confirmAction, setConfirmAction] = useState<'delete' | 'bulk_delete' | 'simulate' | null>(null);
    const [permissionsRole, setPermissionsRole] = useState<any | null>(null);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: false
    });

    useEffect(() => {
        const fetchRoles = async () => {
            setLoading(true);
            try {
                const res = await fetch(ENDPOINTS.ROLES.LIST);
                if (res.ok) {
                    const data = await res.json();
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

        fetchRoles();
    }, []);

    const normalizeYesNo = (val: any) => (val === 'yes' || val === true || val === 1) ? 'yes' : 'no';

    const searched = searchQuery.trim()
        ? roles.filter((r) => {
            const haystack = [
                r.name,
                r.system_defined,
                r.created_by,
                r.updated_by,
                r.created_at,
                r.updated_at
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(searchQuery.trim().toLowerCase());
        })
        : roles;

    const systemFiltered = systemDefinedFilter === 'any'
        ? roles
        : roles.filter((r) => normalizeYesNo(r.system_defined) === systemDefinedFilter);

    const searchedIds = new Set(searched.map(r => r.id));
    const systemIds = new Set(systemFiltered.map(r => r.id));

    const filteredRoles = roles.filter((r) => {
        if (!searchQuery.trim() && systemDefinedFilter === 'any') return true;
        if (searchType === 'and') {
            return searchedIds.has(r.id) && systemIds.has(r.id);
        }
        return searchedIds.has(r.id) || systemIds.has(r.id);
    });

    const getYesNoBadge = (val: any) => {
        const isYes = normalizeYesNo(val) === 'yes';
        return isYes
            ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    };

    const promptDelete = (role: any) => {
        setRoleToDelete(role);
        setConfirmAction('delete');
        setConfirmModal({
            isOpen: true,
            title: 'Delete Security Group',
            message: 'Are you sure you want to delete this group? This action cannot be undone.',
            type: 'danger',
            isAlert: false
        });
    };

    const promptBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setConfirmAction('bulk_delete');
        setConfirmModal({
            isOpen: true,
            title: 'Delete Selected Groups',
            message: 'Are you sure you want to delete selected groups? System defined groups will be skipped.',
            type: 'danger',
            isAlert: false
        });
    };

    const promptSimulate = () => {
        setConfirmAction('simulate');
        setConfirmModal({
            isOpen: true,
            title: 'Simulate Group Permission',
            message: 'Simulation is not implemented yet. This will open a simulator in a future update.',
            type: 'info',
            isAlert: true
        });
    };

    const executeDelete = async () => {
        if (!roleToDelete) return;

        try {
            const res = await fetch(ENDPOINTS.ROLES.DETAIL(roleToDelete.id), { method: 'DELETE' });
            if (res.ok) {
                setRoles(roles.filter(r => r.id !== roleToDelete.id));
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Group deleted successfully',
                    type: 'info',
                    isAlert: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to delete group',
                    type: 'danger',
                    isAlert: true
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Error deleting group',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setRoleToDelete(null);
        }
    };

    const executeBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        const deletable = selectedIds.filter((id) => {
            const role = roles.find(r => r.id === id);
            return role ? normalizeYesNo(role.system_defined) !== 'yes' : false;
        });

        if (deletable.length === 0) {
            setConfirmModal({
                isOpen: true,
                title: 'Info',
                message: 'No deletable groups selected.',
                type: 'info',
                isAlert: true
            });
            return;
        }

        try {
            await Promise.all(
                deletable.map((id) => fetch(ENDPOINTS.ROLES.DETAIL(id), { method: 'DELETE' }))
            );
            setRoles(roles.filter(r => !deletable.includes(r.id)));
            setSelectedIds([]);
            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: 'Selected groups deleted successfully',
                type: 'info',
                isAlert: true
            });
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to delete selected groups',
                type: 'danger',
                isAlert: true
            });
        }
    };

    const handleConfirm = () => {
        if (confirmModal.isAlert) {
            setConfirmModal({ ...confirmModal, isOpen: false });
        } else {
            if (confirmAction === 'delete') executeDelete();
            if (confirmAction === 'bulk_delete') executeBulkDelete();
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.isAlert ? 'OK' : 'Delete'}
                cancelText="Cancel"
            />

            <Modal
                isOpen={!!permissionsRole}
                onClose={() => setPermissionsRole(null)}
                title={`Permission Sets - ${permissionsRole?.name || ''}`}
                size="lg"
            >
                <div className="space-y-3">
                    {(permissionsRole?.currentPermissions || []).length === 0 && (
                        <div className="text-slate-500 dark:text-slate-300">No permissions assigned.</div>
                    )}
                    {(permissionsRole?.currentPermissions || []).map((p: string) => {
                        const label = ALL_PERMISSIONS.find(ap => ap.id === p)?.label || p;
                        return (
                            <div key={p} className="px-4 py-2 rounded-full glass-effect text-sm font-semibold text-slate-600 dark:text-slate-200">
                                {label}
                            </div>
                        );
                    })}
                </div>
            </Modal>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Security Groups</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Manage security groups and permissions</p>
                </div>
                <Link href="/admin/roles/create" className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 rounded-full px-6">
                    <PlusCircle className="w-5 h-5" />
                    <span>Add Group</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="card-glass p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                placeholder="Security group like"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-glass w-full text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">System Defined</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Shield className="w-4 h-4" />
                            </span>
                            <select
                                className="input-glass w-full pr-10 appearance-none cursor-pointer text-sm"
                                value={systemDefinedFilter}
                                onChange={(e) => setSystemDefinedFilter(e.target.value)}
                            >
                                <option value="any">-- any --</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search Type</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <select
                                className="input-glass w-full pr-10 appearance-none cursor-pointer text-sm"
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value as 'and' | 'or')}
                            >
                                <option value="and">and</option>
                                <option value="or">or</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex flex-col gap-3">
                    <div className="text-sm text-slate-500 dark:text-slate-300">
                        Results: {filteredRoles.length === 0 ? 0 : 1} - {filteredRoles.length} of {filteredRoles.length}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <button
                            onClick={() => setSelectedIds(filteredRoles.map(r => r.id))}
                            className="px-3 py-1.5 rounded-full glass-effect text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 transition-colors"
                        >
                            Check All
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="px-3 py-1.5 rounded-full glass-effect text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 transition-colors"
                        >
                            Uncheck All
                        </button>
                        <span className="text-slate-400 dark:text-slate-300">With selected:</span>
                        <select className="input-glass px-3 py-1.5 text-sm">
                            <option>Delete</option>
                        </select>
                        <button
                            onClick={promptBulkDelete}
                            className="px-3 py-1.5 rounded-full btn-primary text-sm"
                        >
                            Apply
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider"></th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">No.</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Security Group</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">System Defined</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Entered User</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Entered Date</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Modified User</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Modified Date</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Permission</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Simulate Group Permission</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">View</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {filteredRoles.map((role, idx) => {
                                const systemDefined = normalizeYesNo(role.system_defined) === 'yes';
                                return (
                                    <tr key={role.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(role.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedIds([...selectedIds, role.id]);
                                                    } else {
                                                        setSelectedIds(selectedIds.filter(id => id !== role.id));
                                                    }
                                                }}
                                                className="w-4 h-4 accent-teal-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{idx + 1}</td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{role.name || '-'}</td>
                                        <td className="px-4 py-4">
                                            <span className={`badge-glass px-3 py-1 rounded-full text-[10px] font-extrabold ${getYesNoBadge(role.system_defined)}`}>
                                                {normalizeYesNo(role.system_defined)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{role.created_by || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{role.created_at ? new Date(role.created_at).toLocaleString() : '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{role.updated_by || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{role.updated_at ? new Date(role.updated_at).toLocaleString() : '-'}</td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => setPermissionsRole(role)}
                                                className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 transition-colors flex items-center gap-1"
                                            >
                                                Validate
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={promptSimulate}
                                                className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 transition-colors flex items-center gap-1"
                                            >
                                                Simulate
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Link
                                                href={`/admin/roles/${role.id}`}
                                                className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 transition-colors flex items-center gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                View
                                            </Link>
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => promptDelete(role)}
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
