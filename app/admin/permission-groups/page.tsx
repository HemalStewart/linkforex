'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import { PlusCircle, Search, Key, Save, X } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../components/ConfirmModal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';

type PermissionGroupRow = {
    id: number;
    role_name: string;
    page_section: string;
    operation: string;
    system_defined: string;
    active: string;
    created_by: string | null;
    created_at: string | null;
    updated_by: string | null;
    updated_at: string | null;
};

type RoleOption = {
    id: number | string;
    name: string;
};

const OPERATION_OPTIONS = ['VIEW', 'ADD', 'EDIT', 'DELETE', 'APPROVE', 'CANCEL'];

const normalizeDate = (value?: string | null) => {
    if (!value) return '';
    return value.includes('T') ? value : value.replace(' ', 'T');
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '';
    return value;
};

const normalizeYesNo = (value?: string | null) => (String(value || '').toLowerCase() === 'yes' ? 'yes' : 'no');
const toYesNoLabel = (value?: string | null) => (normalizeYesNo(value) === 'yes' ? 'Yes' : 'No');

export default function PermissionGroupsPage() {
    const [rows, setRows] = useState<PermissionGroupRow[]>([]);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [pageSectionFilter, setPageSectionFilter] = useState('all');
    const [operationFilter, setOperationFilter] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');
    const [systemDefinedFilter, setSystemDefinedFilter] = useState('all');
    const [sortKey, setSortKey] = useState<string>('role_name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useRowsPerPage(10);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        role_name: '',
        page_section: '',
        operation: 'VIEW',
        active: 'yes' as 'yes' | 'no'
    });
    const [currentUserName, setCurrentUserName] = useState('');
    const [savingId, setSavingId] = useState<number | null>(null);
    const [pendingToggle, setPendingToggle] = useState<{
        row: PermissionGroupRow;
        nextActive: 'yes' | 'no';
    } | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: false
    });

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.PERMISSION_GROUPS.LIST);
            if (res.ok) {
                const data = await res.json();
                setRows(Array.isArray(data) ? data : []);
            } else {
                setRows([]);
            }
        } catch (e) {
            console.error(e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRoles = useCallback(async () => {
        try {
            const res = await fetch(ENDPOINTS.ROLES.LIST);
            if (!res.ok) return;
            const data = await res.json();
            const mapped = Array.isArray(data)
                ? data
                    .filter((item) => item && typeof item.name === 'string')
                    .map((item) => ({ id: item.id, name: item.name }) as RoleOption)
                : [];
            setRoles(mapped);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchRows();
        fetchRoles();
    }, [fetchRows, fetchRoles]);

    useEffect(() => {
        const parsed = getStoredUser<{ username?: string; name?: string; email?: string }>();
        setCurrentUserName(parsed?.username || parsed?.name || parsed?.email || '');
    }, []);

    const searched = useMemo(() => {
        if (!searchQuery.trim()) return rows;
        const term = searchQuery.trim().toLowerCase();
        return rows.filter((row) => {
            const haystack = [
                row.role_name,
                row.page_section,
                row.operation,
                row.system_defined,
                row.active,
                row.created_by,
                row.created_at,
                row.updated_by,
                row.updated_at
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [rows, searchQuery]);

    const roleOptions = useMemo(() => {
        const roleNames = new Set<string>();
        roles.forEach((role) => {
            const trimmed = (role.name || '').trim();
            if (trimmed) roleNames.add(trimmed);
        });
        rows.forEach((row) => {
            const trimmed = (row.role_name || '').trim();
            if (trimmed) roleNames.add(trimmed);
        });
        return Array.from(roleNames).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [roles, rows]);

    const sectionOptions = useMemo(() => {
        return Array.from(new Set(rows.map((row) => (row.page_section || '').trim()).filter(Boolean))).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        );
    }, [rows]);

    const operationOptions = useMemo(() => {
        return Array.from(new Set([...OPERATION_OPTIONS, ...rows.map((row) => (row.operation || '').trim().toUpperCase()).filter(Boolean)])).sort(
            (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })
        );
    }, [rows]);

    const filtered = useMemo(() => {
        const normalizedRoleFilter = roleFilter.trim().toLowerCase();
        return searched.filter((row) => {
            if (normalizedRoleFilter && !(row.role_name || '').toLowerCase().includes(normalizedRoleFilter)) return false;
            if (pageSectionFilter !== 'all' && row.page_section !== pageSectionFilter) return false;
            if (operationFilter !== 'all' && row.operation.toUpperCase() !== operationFilter.toUpperCase()) return false;
            if (activeFilter !== 'all' && normalizeYesNo(row.active) !== activeFilter) return false;
            if (systemDefinedFilter !== 'all' && normalizeYesNo(row.system_defined) !== systemDefinedFilter) return false;
            return true;
        });
    }, [searched, roleFilter, pageSectionFilter, operationFilter, activeFilter, systemDefinedFilter]);

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const getSortValue = (row: PermissionGroupRow, key: string) => {
        switch (key) {
            case 'role_name':
                return row.role_name || '';
            case 'page_section':
                return row.page_section || '';
            case 'operation':
                return row.operation || '';
            case 'system_defined':
                return row.system_defined || '';
            case 'active':
                return row.active || '';
            case 'created_by':
                return row.created_by || '';
            case 'created_at':
                return new Date(normalizeDate(row.created_at)).getTime() || 0;
            case 'updated_by':
                return row.updated_by || '';
            case 'updated_at':
                return new Date(normalizeDate(row.updated_at)).getTime() || 0;
            default:
                return (row as any)[key] || '';
        }
    };

    const sorted = useMemo(() => {
        const list = [...filtered];
        list.sort((a, b) => {
            const aVal = getSortValue(a, sortKey);
            const bVal = getSortValue(b, sortKey);
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const result = collator.compare(String(aVal), String(bVal));
            return sortDir === 'asc' ? result : -result;
        });
        return list;
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, roleFilter, pageSectionFilter, operationFilter, activeFilter, systemDefinedFilter, pageSize]);

    const startIndex = sorted.length === 0 ? 0 : (page - 1) * pageSize;
    const endIndex = sorted.length === 0 ? 0 : Math.min(startIndex + pageSize, sorted.length);
    const paged = sorted.slice(startIndex, endIndex);

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

    const badgeClass = (value: string) =>
        normalizeYesNo(value) === 'yes'
            ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';

    const submitCreatePermission = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (creating) return;

        const roleName = createForm.role_name.trim();
        const pageSection = createForm.page_section.trim().toUpperCase();
        const operation = createForm.operation.trim().toUpperCase();

        if (!roleName || !pageSection || !operation) {
            setConfirmModal({
                isOpen: true,
                title: 'Missing Fields',
                message: 'Role, page section, and operation are required.',
                type: 'warning',
                isAlert: true
            });
            return;
        }

        const existingPermission = rows.find((row) =>
            row.role_name === roleName &&
            (row.page_section || '').trim().toUpperCase() === pageSection &&
            (row.operation || '').trim().toUpperCase() === operation
        );

        if (existingPermission) {
            const existingActive = normalizeYesNo(existingPermission.active);
            if (existingActive === createForm.active) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Already Exists',
                    message: `This role permission already exists and is already ${existingActive}.`,
                    type: 'warning',
                    isAlert: true
                });
                return;
            }

            setCreating(true);
            try {
                const updateResponse = await fetch(ENDPOINTS.PERMISSION_GROUPS.DETAIL(existingPermission.id), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role_name: existingPermission.role_name,
                        page_section: existingPermission.page_section,
                        operation: existingPermission.operation,
                        system_defined: existingPermission.system_defined,
                        active: createForm.active,
                        updated_by: currentUserName || 'Admin'
                    })
                });

                if (!updateResponse.ok) {
                    let message = 'Failed to update existing role permission.';
                    try {
                        const errorPayload = await updateResponse.json();
                        if (errorPayload?.messages) {
                            message = Object.values(errorPayload.messages).join(', ');
                        } else if (errorPayload?.message) {
                            message = String(errorPayload.message);
                        }
                    } catch (_error) {
                        // ignore parsing errors
                    }
                    throw new Error(message);
                }

                await fetchRows();
                setShowCreateForm(false);
                setCreateForm({
                    role_name: '',
                    page_section: '',
                    operation: 'VIEW',
                    active: 'yes'
                });
                setConfirmModal({
                    isOpen: true,
                    title: 'Updated',
                    message: `Existing role permission updated to ${createForm.active}.`,
                    type: 'success',
                    isAlert: true
                });
            } catch (error) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: error instanceof Error ? error.message : 'Failed to update existing role permission.',
                    type: 'danger',
                    isAlert: true
                });
            } finally {
                setCreating(false);
            }
            return;
        }

        const role = roles.find((item) => item.name === roleName);
        setCreating(true);

        try {
            const response = await fetch(ENDPOINTS.PERMISSION_GROUPS.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role_id: role?.id,
                    role_name: roleName,
                    page_section: pageSection,
                    operation,
                    system_defined: 'no',
                    active: createForm.active,
                    created_by: currentUserName || 'Admin',
                    updated_by: currentUserName || 'Admin'
                })
            });

            if (!response.ok) {
                let message = 'Failed to create role permission.';
                try {
                    const errorPayload = await response.json();
                    if (errorPayload?.messages) {
                        message = Object.values(errorPayload.messages).join(', ');
                    } else if (errorPayload?.message) {
                        message = String(errorPayload.message);
                    }
                } catch (_e) {
                    // ignore json parse errors
                }
                throw new Error(message);
            }

            await fetchRows();
            setShowCreateForm(false);
            setCreateForm({
                role_name: '',
                page_section: '',
                operation: 'VIEW',
                active: 'yes'
            });
            setConfirmModal({
                isOpen: true,
                title: 'Created',
                message: 'Role permission added successfully.',
                type: 'success',
                isAlert: true
            });
        } catch (error) {
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to create role permission.',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setCreating(false);
        }
    };

    const promptToggle = (row: PermissionGroupRow, nextActive: 'yes' | 'no') => {
        setPendingToggle({ row, nextActive });
        setConfirmModal({
            isOpen: true,
            title: nextActive === 'yes' ? 'Activate Role Permission' : 'Deactivate Role Permission',
            message: `Are you sure you want to ${nextActive === 'yes' ? 'activate' : 'deactivate'} this role permission for ${row.role_name}?`,
            type: nextActive === 'yes' ? 'info' : 'warning',
            isAlert: false
        });
    };

    const handleConfirm = async () => {
        if (!pendingToggle) {
            setConfirmModal({ ...confirmModal, isOpen: false });
            return;
        }

        const { row, nextActive } = pendingToggle;
        setSavingId(row.id);

        try {
            const res = await fetch(ENDPOINTS.PERMISSION_GROUPS.DETAIL(row.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role_name: row.role_name,
                    page_section: row.page_section,
                    operation: row.operation,
                    system_defined: row.system_defined,
                    active: nextActive,
                    updated_by: currentUserName || row.updated_by || 'Admin'
                })
            });

            if (res.ok) {
                let responsePayload: any = {};
                try {
                    responsePayload = await res.json();
                } catch (_error) {
                    responsePayload = {};
                }
                const updated = responsePayload?.data && typeof responsePayload.data === 'object'
                    ? responsePayload.data
                    : responsePayload;

                setRows((prev) =>
                    prev.map((item) =>
                        item.id === row.id
                            ? {
                                ...item,
                                active: normalizeYesNo(updated?.active ?? nextActive),
                                updated_by: updated?.updated_by ?? (currentUserName || item.updated_by),
                                updated_at: updated.updated_at ?? item.updated_at
                            }
                            : item
                    )
                );
                setConfirmModal({
                    isOpen: true,
                    title: 'Updated',
                    message: `Role permission ${nextActive === 'yes' ? 'activated' : 'deactivated'} successfully.`,
                    type: 'success',
                    isAlert: true
                });
            } else {
                let message = 'Failed to update role permission status.';
                try {
                    const errorPayload = await res.json();
                    if (errorPayload?.messages) {
                        message = Object.values(errorPayload.messages).join(', ');
                    } else if (errorPayload?.message) {
                        message = String(errorPayload.message);
                    }
                } catch (_error) {
                    // ignore parsing error
                }
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message,
                    type: 'danger',
                    isAlert: true
                });
            }
        } catch (e) {
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Network error while updating role permission.',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setSavingId(null);
            setPendingToggle(null);
        }
    };

    const hasActiveFilters = Boolean(
        roleFilter.trim() ||
        pageSectionFilter !== 'all' ||
        operationFilter !== 'all' ||
        activeFilter !== 'all' ||
        systemDefinedFilter !== 'all'
    );

    const clearFilters = () => {
        setRoleFilter('');
        setPageSectionFilter('all');
        setOperationFilter('all');
        setActiveFilter('all');
        setSystemDefinedFilter('all');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => {
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    setPendingToggle(null);
                }}
                onConfirm={confirmModal.isAlert ? () => setConfirmModal({ ...confirmModal, isOpen: false }) : handleConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                loading={savingId !== null}
                confirmText={confirmModal.isAlert ? 'OK' : 'Confirm'}
                isAlert={confirmModal.isAlert}
            />
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Role Permissions</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Manage role permissions by page section and operation</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCreateForm((prev) => !prev)}
                    className="btn-primary px-5 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2"
                >
                    {showCreateForm ? (
                        <>
                            <X className="w-4 h-4" />
                            Close
                        </>
                    ) : (
                        <>
                            <PlusCircle className="w-4 h-4" />
                            Add Permission
                        </>
                    )}
                </button>
            </div>

            {showCreateForm && (
                <div className="card-glass p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Role Permission</h2>
                    <form onSubmit={submitCreatePermission} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Role</label>
                            <select
                                value={createForm.role_name}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, role_name: e.target.value }))}
                                className="input-glass w-full text-sm"
                                required
                            >
                                <option value="">Select role</option>
                                {roles.map((role) => (
                                    <option key={role.id} value={role.name}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Page Section</label>
                            <input
                                list="page-section-options"
                                value={createForm.page_section}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, page_section: e.target.value.toUpperCase() }))}
                                placeholder="Page section code"
                                className="input-glass w-full text-sm"
                                required
                            />
                            <datalist id="page-section-options">
                                {sectionOptions.map((section) => (
                                    <option key={section} value={section} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Operation</label>
                            <select
                                value={createForm.operation}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, operation: e.target.value }))}
                                className="input-glass w-full text-sm"
                                required
                            >
                                {OPERATION_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Active</label>
                            <select
                                value={createForm.active}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, active: e.target.value as 'yes' | 'no' }))}
                                className="input-glass w-full text-sm"
                            >
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div className="flex items-end justify-end">
                            <button
                                type="submit"
                                disabled={creating}
                                className="btn-primary px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                            >  <Save className="w-4 h-4" />
                                {creating ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card-glass p-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Global Search</label>
                    <div className="relative input-icon">
                        <span className="input-icon-left">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search all columns"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-glass w-full text-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Role</label>
                        <input
                            list="role-filter-options"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            placeholder="Search role"
                            className="input-glass w-full text-sm"
                        />
                        <datalist id="role-filter-options">
                            {roleOptions.map((role) => (
                                <option key={role} value={role} />
                            ))}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Page Section</label>
                        <select
                            value={pageSectionFilter}
                            onChange={(e) => setPageSectionFilter(e.target.value)}
                            className="input-glass w-full text-sm"
                        >
                            <option value="all">All</option>
                            {sectionOptions.map((section) => (
                                <option key={section} value={section}>{section}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Operation</label>
                        <select
                            value={operationFilter}
                            onChange={(e) => setOperationFilter(e.target.value)}
                            className="input-glass w-full text-sm"
                        >
                            <option value="all">All</option>
                            {operationOptions.map((operation) => (
                                <option key={operation} value={operation}>{operation}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Status</label>
                        <div className="flex items-center gap-2">
                            <select
                                value={activeFilter}
                                onChange={(e) => setActiveFilter(e.target.value)}
                                className="input-glass w-full text-sm"
                            >
                                <option value="all">All Active</option>
                                <option value="yes">Active</option>
                                <option value="no">Inactive</option>
                            </select>
                            <select
                                value={systemDefinedFilter}
                                onChange={(e) => setSystemDefinedFilter(e.target.value)}
                                className="input-glass w-full text-sm"
                            >
                                <option value="all">All System</option>
                                <option value="yes">System Yes</option>
                                <option value="no">System No</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                        className="px-4 py-2 rounded-full text-xs font-semibold glass-effect text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center space-x-3">
                    <Key className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Permission Groups</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Showing {sorted.length === 0 ? 0 : startIndex + 1} to {endIndex} of {sorted.length}</p>
                    </div>
                </div>
                <div className="table-scroll">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">No.</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('role_name')} className="flex items-center gap-1">
                                        Role <span className="text-slate-400 dark:text-slate-300">{sortIndicator('role_name')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('page_section')} className="flex items-center gap-1">
                                        Page Section <span className="text-slate-400 dark:text-slate-300">{sortIndicator('page_section')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('operation')} className="flex items-center gap-1">
                                        Operation <span className="text-slate-400 dark:text-slate-300">{sortIndicator('operation')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('system_defined')} className="mx-auto flex items-center gap-1">
                                        System Defined <span className="text-slate-400 dark:text-slate-300">{sortIndicator('system_defined')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('active')} className="mx-auto flex items-center gap-1">
                                        Active <span className="text-slate-400 dark:text-slate-300">{sortIndicator('active')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Entered User</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1">
                                        Entered Date <span className="text-slate-400 dark:text-slate-300">{sortIndicator('created_at')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Modified User</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('updated_at')} className="flex items-center gap-1">
                                        Modified Date <span className="text-slate-400 dark:text-slate-300">{sortIndicator('updated_at')}</span>
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-10 text-center text-slate-500 dark:text-slate-300">
                                        Loading role permissions...
                                    </td>
                                </tr>
                            ) : (
                                paged.map((row, idx) => (
                                    <tr key={row.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{row.role_name}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.page_section}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.operation}</td>
                                        <td className="px-4 py-4 text-sm text-center">
                                            <label className="inline-flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={normalizeYesNo(row.system_defined) === 'yes'}
                                                    disabled
                                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
                                                />
                                            </label>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-center">
                                            <label className="inline-flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={normalizeYesNo(row.active) === 'yes'}
                                                    onChange={(e) => promptToggle(row, e.target.checked ? 'yes' : 'no')}
                                                    disabled={savingId === row.id}
                                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
                                                />
                                            </label>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.created_by || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.updated_by || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime(row.updated_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    rowsPerPage={pageSize}
                    onPageChange={setPage}
                    onRowsPerPageChange={(rows) => { setPageSize(rows); setPage(1); }}
                />
            </div>
        </div>
    );
}
