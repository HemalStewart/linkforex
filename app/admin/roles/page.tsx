'use client';

import React, { useState, useEffect } from 'react';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../components/ConfirmModal';
import Badge from '../components/ui/Badge';
import { formatDateTime } from '@/app/lib/dateUtils';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Search, PlusCircle, Trash2, Edit3, Shield, ChevronRight } from 'lucide-react';
import { useAuditColumns } from '@/app/lib/permissions';

export default function RolesPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('ROLES');
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [systemDefinedFilter, setSystemDefinedFilter] = useState('any');
    const [sortKey, setSortKey] = useState<string>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [roleToDelete, setRoleToDelete] = useState<any | null>(null);
    const [confirmAction, setConfirmAction] = useState<'delete' | 'bulk_delete' | null>(null);

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
                    setRoles(data);
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
    const toYesNoLabel = (value: any) => (normalizeYesNo(value) === 'yes' ? 'Yes' : 'No');

    const searchedRoles = searchQuery.trim()
        ? roles.filter((r) => {
            const haystack = [
                r.name,
                r.description,
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

    const filteredRoles = searchedRoles.filter((r) => {
        if (systemDefinedFilter === 'any') return true;
        return normalizeYesNo(r.system_defined) === systemDefinedFilter;
    });

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const getSortValue = (role: any, key: string) => {
        switch (key) {
            case 'name':
                return role.name || '';
            case 'description':
                return role.description || '';
            case 'system_defined':
                return normalizeYesNo(role.system_defined);
            case 'created_by':
                return role.created_by || '';
            case 'updated_by':
                return role.updated_by || '';
            case 'created_at':
                return role.created_at ? new Date(role.created_at).getTime() : 0;
            case 'updated_at':
                return role.updated_at ? new Date(role.updated_at).getTime() : 0;
            default:
                return role[key] || '';
        }
    };

    const sortedRoles = [...filteredRoles].sort((a, b) => {
        const aVal = getSortValue(a, sortKey);
        const bVal = getSortValue(b, sortKey);
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const result = collator.compare(String(aVal), String(bVal));
        return sortDir === 'asc' ? result : -result;
    });

    const totalRows = sortedRoles.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const pagedRoles = sortedRoles.slice(startIndex, endIndex);

    useEffect(() => { setPage(1); }, [searchQuery, systemDefinedFilter, sortKey, sortDir, rowsPerPage]);

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



    const promptDelete = (role: any) => {
        setRoleToDelete(role);
        setConfirmAction('delete');
        setConfirmModal({
            isOpen: true,
            title: 'Delete Role',
            message: 'Are you sure you want to delete this role? This action cannot be undone.',
            type: 'danger',
            isAlert: false
        });
    };

    const promptBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setConfirmAction('bulk_delete');
        setConfirmModal({
            isOpen: true,
            title: 'Delete Selected Roles',
            message: 'Are you sure you want to delete selected roles? System defined roles will be skipped.',
            type: 'danger',
            isAlert: false
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
                    message: 'Role deleted successfully',
                    type: 'info',
                    isAlert: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to delete role',
                    type: 'danger',
                    isAlert: true
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Error deleting role',
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
                message: 'No deletable roles selected.',
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
                message: 'Selected roles deleted successfully',
                type: 'info',
                isAlert: true
            });
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to delete selected roles',
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

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Roles</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Manage roles for system users</p>
                </div>
                <Link href="/admin/roles/create" className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 rounded-full px-6">
                    <PlusCircle className="w-5 h-5" />
                    <span>Add Role</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="card-glass p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                placeholder="Role name"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-glass w-full text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">System Defined</label>
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
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Shield className="w-6 h-6 text-slate-400" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Roles Directory</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Showing {totalRows === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRows}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <button
                            onClick={() => setSelectedIds(sortedRoles.map(r => r.id))}
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
                    </div>
                </div>

                <div className="table-scroll">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300"></th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">No.</th>
                                <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-300" title="Edit"><Edit3 className="w-4 h-4 mx-auto text-slate-400" /></th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                                        Role <span className="text-slate-400 dark:text-slate-300">{sortIndicator('name')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('description')} className="flex items-center gap-1">
                                        Description <span className="text-slate-400 dark:text-slate-300">{sortIndicator('description')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('system_defined')} className="flex items-center gap-1">
                                        System Defined <span className="text-slate-400 dark:text-slate-300">{sortIndicator('system_defined')}</span>
                                    </button>
                                </th>
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
                                <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-300" title="Delete"><Trash2 className="w-4 h-4 mx-auto text-slate-400" /></th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {pagedRoles.map((role, idx) => {
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
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                        <td className="px-2 py-4 text-center">
                                            {systemDefined ? (
                                                <span className="p-2 rounded-xl text-slate-400 opacity-35 cursor-not-allowed inline-flex items-center justify-center" title="System defined">
                                                    <Edit3 className="w-5 h-5" />
                                                </span>
                                            ) : (
                                                <Link
                                                    href={`/admin/roles/${role.id}`}
                                                    className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex items-center justify-center"
                                                    title="Edit role"
                                                >
                                                    <Edit3 className="w-5 h-5" />
                                                </Link>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{role.name || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{role.description || '-'}</td>
                                        <td className="px-4 py-4">
                                            <Badge type={normalizeYesNo(role.system_defined)}>
                                                {toYesNoLabel(role.system_defined)}
                                            </Badge>
                                        </td>
                                        {showCreatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{role.created_by || '-'}</td>}
                                        {showCreatedAt && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime(role.created_at)}</td>}
                                        {showUpdatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{role.updated_by || '-'}</td>}
                                        {showUpdatedAt && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime(role.updated_at)}</td>}
                                        <td className="px-2 py-4 text-center">
                                            <button
                                                onClick={() => promptDelete(role)}
                                                disabled={systemDefined}
                                                className={`p-2 rounded-xl transition-all ${systemDefined
                                                    ? 'text-slate-400 opacity-35 cursor-not-allowed'
                                                    : 'hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600'
                                                    }`}
                                                title={systemDefined ? 'System defined' : 'Delete role'}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
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
                    onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setPage(1); }}
                />
            </div>
        </div>
    );
}
