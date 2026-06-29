'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import { PlusCircle, Search, Key, Save, X, Shield, Lock, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateTime } from '@/app/lib/dateUtils';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { ADMIN_PAGES_CONFIG, useAuditColumns } from '@/app/lib/permissions';

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

const OPERATION_OPTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'CANCEL', 'PDF', 'EXPORT', 'PRINT', 'SIGN'];

const normalizeDate = (value?: string | null) => {
    if (!value) return '';
    return value.includes('T') ? value : value.replace(' ', 'T');
};

const normalizeYesNo = (value?: string | null) => (String(value || '').toLowerCase() === 'yes' ? 'yes' : 'no');
const toYesNoLabel = (value?: string | null) => (normalizeYesNo(value) === 'yes' ? 'Yes' : 'No');

const getPageNameFromSection = (section: string): string => {
    const s = String(section || '').trim().toUpperCase();
    for (const cat of ADMIN_PAGES_CONFIG) {
        const found = cat.pages.find(p => {
            const ps = p.section.toUpperCase();
            return ps === s ||
                   ps === s + 'S' ||
                   s === ps + 'S' ||
                   (ps === 'KYC_REVIEWS' && s === 'KYC') ||
                   (ps === 'BRANCH_CURRENCY_RATES' && s === 'BRANCH_CURRENCY_RATE') ||
                   (ps === 'BRANCH_ACCESS_REQUESTS' && s === 'BRANCH_ACCESS') ||
                   (ps === 'SYSTEM_USERS' && s === 'SYSUSERS');
        });
        if (found) return found.name;
    }
    return s
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
};

export default function PermissionGroupsPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('PERMISSION_GROUPS');
    const [activeTab, setActiveTab] = useState<'grid' | 'list'>('list');
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [toggling, setToggling] = useState<string>(''); // section|op

    const [rows, setRows] = useState<PermissionGroupRow[]>([]);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [pageSectionFilter, setPageSectionFilter] = useState('all');
    const [operationFilter, setOperationFilter] = useState('');
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

    const hasInitializedRef = useRef(false);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        hasInitializedRef.current = false;
        try {
            const res = await fetch(`${ENDPOINTS.PERMISSION_GROUPS.LIST}?t=${Date.now()}`, { cache: 'no-store' });
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
            const res = await fetch(`${ENDPOINTS.ROLES.LIST}?t=${Date.now()}`, { cache: 'no-store' });
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

    const initializeMissingPermissions = useCallback(async (allRows: PermissionGroupRow[], allRoles: RoleOption[]) => {
        const missing: Array<{ role: RoleOption; section: string; operation: string }> = [];

        for (const role of allRoles) {
            const roleNameLower = role.name.toLowerCase();
            if (roleNameLower.includes('admin') || roleNameLower.includes('super')) continue;

            for (const cat of ADMIN_PAGES_CONFIG) {
                for (const page of cat.pages) {
                    for (const op of page.operations) {
                        const exists = allRows.some(row =>
                            row.role_name === role.name &&
                            row.page_section === page.section &&
                            row.operation === op
                        );
                        if (!exists) {
                            missing.push({ role, section: page.section, operation: op });
                        }
                    }
                }
            }
        }

        if (missing.length === 0) return;

        let createdAny = false;
        for (const item of missing) {
            try {
                const res = await fetch(ENDPOINTS.PERMISSION_GROUPS.LIST, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role_id: item.role.id,
                        role_name: item.role.name,
                        page_section: item.section,
                        operation: item.operation,
                        system_defined: 'no',
                        active: 'no',
                        created_by: 'System',
                        updated_by: 'System'
                    })
                });
                if (res.ok) {
                    createdAny = true;
                }
            } catch (e) {
                console.error('Failed to auto-create permission:', e);
            }
        }

        if (createdAny) {
            await fetchRows();
        }
    }, [fetchRows]);

    useEffect(() => {
        if (!loading && roles.length > 0 && rows.length > 0 && !hasInitializedRef.current) {
            hasInitializedRef.current = true;
            initializeMissingPermissions(rows, roles);
        }
    }, [rows, roles, loading, initializeMissingPermissions]);

    // Set default selected role for grid view to the logged-in user's role
    useEffect(() => {
        if (roles.length > 0 && !selectedRole) {
            const parsed = getStoredUser<{ role?: string }>();
            const currentUserRole = parsed?.role ? String(parsed.role).trim() : '';
            const matchedRole = roles.find(r => r.name.toLowerCase() === currentUserRole.toLowerCase());

            if (matchedRole) {
                setSelectedRole(matchedRole.name);
            } else {
                setSelectedRole(roles[0].name);
            }
        }
    }, [roles, selectedRole]);

    // Helpers for checking permission state
    const getPermissionState = useCallback((section: string, op: string) => {
        const isAdmin = selectedRole.toLowerCase().includes('admin') || selectedRole.toLowerCase().includes('super');
        if (isAdmin) {
            return { active: true, record: null };
        }

        const match = rows.find(r =>
            r.role_name === selectedRole &&
            r.page_section === section &&
            r.operation === op
        );
        return {
            active: match ? normalizeYesNo(match.active) === 'yes' : false,
            record: match || null
        };
    }, [selectedRole, rows]);

    const togglePermission = async (section: string, op: string) => {
        const isAdmin = selectedRole.toLowerCase().includes('admin') || selectedRole.toLowerCase().includes('super');
        if (isAdmin) return;

        const { active, record } = getPermissionState(section, op);
        if (record && normalizeYesNo(record.system_defined) === 'yes') return;

        const nextActive = active ? 'no' : 'yes';

        const key = `${section}|${op}`;
        setToggling(key);

        try {
            if (record) {
                const res = await fetch(ENDPOINTS.PERMISSION_GROUPS.DETAIL(record.id), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role_name: record.role_name,
                        page_section: record.page_section,
                        operation: record.operation,
                        system_defined: record.system_defined,
                        active: nextActive,
                        updated_by: currentUserName || 'Admin'
                    })
                });

                if (res.ok) {
                    setRows(prev => prev.map(r => r.id === record.id ? { ...r, active: nextActive, updated_by: currentUserName || 'Admin', updated_at: new Date().toISOString() } : r));
                } else {
                    throw new Error('Failed to update permission');
                }
            } else {
                const roleObj = roles.find(r => r.name === selectedRole);
                const res = await fetch(ENDPOINTS.PERMISSION_GROUPS.LIST, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role_id: roleObj?.id,
                        role_name: selectedRole,
                        page_section: section,
                        operation: op,
                        system_defined: 'no',
                        active: nextActive,
                        created_by: currentUserName || 'Admin',
                        updated_by: currentUserName || 'Admin'
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    const newRecord = data?.data || data;
                    if (newRecord && typeof newRecord === 'object' && newRecord.id) {
                        setRows(prev => [...prev, newRecord]);
                    } else {
                        await fetchRows();
                    }
                } else {
                    throw new Error('Failed to create permission');
                }
            }

            // Enforce View Rule: If View is set to "no", deactivate all other operations on this section
            if (op === 'VIEW' && nextActive === 'no') {
                const activeOps = ADMIN_PAGES_CONFIG.flatMap(cat => cat.pages)
                    .find(p => p.section === section)
                    ?.operations.filter(o => o !== 'VIEW') || [];

                for (const otherOp of activeOps) {
                    const opState = getPermissionState(section, otherOp);
                    if (opState.active && opState.record) {
                        await fetch(ENDPOINTS.PERMISSION_GROUPS.DETAIL(opState.record.id), {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                role_name: opState.record.role_name,
                                page_section: opState.record.page_section,
                                operation: opState.record.operation,
                                system_defined: opState.record.system_defined,
                                active: 'no',
                                updated_by: currentUserName || 'Admin'
                            })
                        });
                    }
                }
                await fetchRows();
            }
        } catch (e) {
            console.error(e);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to save permission change. Please try again.',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setToggling('');
        }
    };

    const renderCategoryCard = (cat: typeof ADMIN_PAGES_CONFIG[number]) => {
        const ORDERED_OPS = ['VIEW', 'CREATE', 'EDIT', 'DELETE'];
        const displayOps = ORDERED_OPS.filter(op => cat.pages.some(page => page.operations.includes(op)));
        const tableMinWidthClass = displayOps.length > 3 ? 'min-w-[700px]' : 'min-w-full';

        return (
            <div key={cat.category} className="card-glass overflow-hidden shadow-lg border border-white/20 dark:border-white/10 rounded-2xl flex flex-col h-full">
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center justify-between">
                    <h2 className="text-md font-bold text-slate-800 dark:text-white tracking-wide">{cat.category}</h2>
                    <Badge type="info" className="text-xs font-semibold">{`${cat.pages.length} Pages`}</Badge>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className={`w-full border-collapse ${tableMinWidthClass}`}>
                        <thead>
                            <tr className="bg-slate-100/30 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 text-xs font-bold border-b border-slate-100/60 dark:border-slate-800/40">
                                <th className="px-6 py-3.5 text-left">Page Name</th>
                                {displayOps.map(op => (
                                    <th key={op} className="px-6 py-3.5 text-center w-24 md:w-32 uppercase">
                                        {op.replaceAll('_', ' ')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/40">
                            {cat.pages.map((page) => {
                                const viewPerm = getPermissionState(page.section, 'VIEW');
                                const isViewActive = viewPerm.active;
                                const isAdmin = selectedRole.toLowerCase().includes('admin') || selectedRole.toLowerCase().includes('super');

                                return (
                                    <tr key={page.name} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors duration-150">
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{page.name}</td>

                                        {displayOps.map((op) => {
                                            const perm = getPermissionState(page.section, op);
                                            const isActive = perm.active;

                                            return (
                                                <td key={op} className="px-6 py-4 text-center">
                                                    {page.operations.includes(op) ? (
                                                        <div className="flex justify-center">
                                                            {toggling === `${page.section}|${op}` ? (
                                                                <RefreshCw className="w-4 h-4 animate-spin text-teal-500" />
                                                            ) : (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={op === 'VIEW' ? isActive : (isViewActive && isActive)}
                                                                    disabled={isAdmin || (op !== 'VIEW' && !isViewActive) || !!(perm.record && normalizeYesNo(perm.record.system_defined) === 'yes')}
                                                                    onChange={() => togglePermission(page.section, op)}
                                                                    className="h-4.5 w-4.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-40 transition-all cursor-pointer"
                                                                    title={op !== 'VIEW' && !isViewActive ? 'VIEW permission must be active first' : ''}
                                                                />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-700 font-mono text-xs">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const searched = useMemo(() => {
        const baseRows = rows.filter((row) => {
            const sec = String(row.page_section || '').trim().toUpperCase();
            const op = String(row.operation || '').trim().toUpperCase();
            if (sec === 'PROFILE' || sec === 'MY_PROFILE') {
                return !['DELETE', 'ADD', 'APPROVE', 'CANCEL', 'VIEW_CREATED_AT', 'VIEW_CREATED_BY', 'VIEW_UPDATED_AT', 'VIEW_UPDATED_BY'].includes(op);
            }
            if (sec === 'REPORTS' || sec === 'DASHBOARD') {
                return op === 'VIEW';
            }
            return true;
        });
        if (!searchQuery.trim()) return baseRows;
        const term = searchQuery.trim().toLowerCase();
        return baseRows.filter((row) => {
            const haystack = [
                row.role_name,
                row.page_section,
                getPageNameFromSection(row.page_section),
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

    const filtered = useMemo(() => {
        const normalizedRoleFilter = roleFilter.trim().toLowerCase();
        return searched.filter((row) => {
            if (normalizedRoleFilter && !(row.role_name || '').toLowerCase().includes(normalizedRoleFilter)) return false;
            if (pageSectionFilter !== 'all' && row.page_section !== pageSectionFilter) return false;
            if (operationFilter.trim() && !row.operation.toLowerCase().includes(operationFilter.trim().toLowerCase())) return false;
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
                return getPageNameFromSection(row.page_section);
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
        
        const opOrder = ['VIEW', 'CREATE', 'EDIT', 'DELETE'];
        const getOpWeight = (op: string) => {
            const idx = opOrder.indexOf(op.toUpperCase());
            return idx !== -1 ? idx : 999;
        };

        list.sort((a, b) => {
            const aVal = getSortValue(a, sortKey);
            const bVal = getSortValue(b, sortKey);
            
            let primaryDiff = 0;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                primaryDiff = aVal - bVal;
            } else {
                primaryDiff = collator.compare(String(aVal), String(bVal));
            }
            
            if (sortDir === 'desc') {
                primaryDiff = -primaryDiff;
            }

            if (primaryDiff !== 0) {
                return primaryDiff;
            }

            // Secondary: Role Name
            if (sortKey !== 'role_name') {
                const roleDiff = collator.compare(a.role_name || '', b.role_name || '');
                if (roleDiff !== 0) return roleDiff;
            }

            // Tertiary: Page Section/Name
            if (sortKey !== 'page_section') {
                const pageA = getPageNameFromSection(a.page_section);
                const pageB = getPageNameFromSection(b.page_section);
                const pageDiff = collator.compare(pageA, pageB);
                if (pageDiff !== 0) return pageDiff;
            }

            // Quaternary: Custom Operation Weight (VIEW, CREATE, EDIT, DELETE first)
            const weightA = getOpWeight(a.operation);
            const weightB = getOpWeight(b.operation);
            if (weightA !== weightB) {
                return weightA - weightB;
            }

            // Fallback: Alphabetical for other operations
            return collator.compare(a.operation || '', b.operation || '');
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
        if (normalizeYesNo(row.system_defined) === 'yes') return;
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
        operationFilter.trim() ||
        activeFilter !== 'all' ||
        systemDefinedFilter !== 'all'
    );

    const clearFilters = () => {
        setRoleFilter('');
        setPageSectionFilter('all');
        setOperationFilter('');
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
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200/60 dark:border-slate-700/60 mb-2">
                <button
                    onClick={() => setActiveTab('grid')}
                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-300 flex items-center gap-2 ${activeTab === 'grid'
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    <Shield className="w-4 h-4" />
                    Permission Matrix
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-300 flex items-center gap-2 ${activeTab === 'list'
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    <Key className="w-4 h-4" />
                    Permission Grid
                </button>
            </div>

            {activeTab === 'grid' ? (
                /* Tab 1: Permissions Grid View */
                <div className="space-y-6 animate-fade-in-up">
                    <div className="card-glass p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-teal-600 bg-teal-100 dark:text-teal-300 dark:bg-teal-900/40">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Role</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Select a role to view and customize page access rules</p>
                            </div>
                        </div>
                        <div className="w-full md:w-72">
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="input-glass w-full font-semibold text-slate-800 dark:text-slate-200"
                            >
                                <option value="" disabled>Select role</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedRole && (selectedRole.toLowerCase().includes('admin') || selectedRole.toLowerCase().includes('super')) && (
                        <div className="p-4 bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-300 rounded-2xl flex items-start gap-3 animate-fade-in">
                            <Info className="w-5 h-5 mt-0.5 shrink-0" />
                            <div>
                                <span className="font-bold">Privileged Role Detected:</span> All permissions are automatically active for the <span className="font-semibold">{selectedRole}</span> role. Permissions cannot be disabled or customized for system admins to prevent security locks.
                            </div>
                        </div>
                    )}

                    {selectedRole && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Small Sections Row (Dashboard, Reports, Configuration) */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {ADMIN_PAGES_CONFIG.filter((cat) =>
                                    ['Dashboard', 'Reports', 'Configuration'].includes(cat.category)
                                ).map((cat) => renderCategoryCard(cat))}
                            </div>

                            {/* Large Sections List (Operations, Master Data, etc.) */}
                            <div className="grid grid-cols-1 gap-6">
                                {ADMIN_PAGES_CONFIG.filter((cat) =>
                                    !['Dashboard', 'Reports', 'Configuration'].includes(cat.category)
                                ).map((cat) => renderCategoryCard(cat))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Tab 2: Advanced List View (Original search table & forms) */
                <div className="space-y-8 animate-fade-in-up">


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
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="input-glass w-full text-sm font-medium"
                                >
                                    <option value="">All Roles</option>
                                    {roleOptions.map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
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
                                        <option key={section} value={section}>{getPageNameFromSection(section)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Operation</label>
                                <input
                                    type="text"
                                    placeholder="Search operation"
                                    value={operationFilter}
                                    onChange={(e) => setOperationFilter(e.target.value)}
                                    className="input-glass w-full text-sm"
                                />
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
                            {(() => {
                                const baseColSpan = 6;
                                const dynamicColSpan = baseColSpan +
                                    (showCreatedBy ? 1 : 0) +
                                    (showCreatedAt ? 1 : 0) +
                                    (showUpdatedBy ? 1 : 0) +
                                    (showUpdatedAt ? 1 : 0);
                                return (
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
                                                        Page <span className="text-slate-400 dark:text-slate-300">{sortIndicator('page_section')}</span>
                                                    </button>
                                                </th>
                                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                                    <button onClick={() => toggleSort('operation')} className="flex items-center gap-1">
                                                        Operation <span className="text-slate-400 dark:text-slate-300">{sortIndicator('operation')}</span>
                                                    </button>
                                                </th>
                                                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-300">
                                                    <button onClick={() => toggleSort('system_defined')} className="mx-auto flex items-center justify-center gap-1">
                                                        System Defined <span className="text-slate-400 dark:text-slate-300">{sortIndicator('system_defined')}</span>
                                                    </button>
                                                </th>
                                                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-300">
                                                    <button onClick={() => toggleSort('active')} className="mx-auto flex items-center justify-center gap-1">
                                                        Active <span className="text-slate-400 dark:text-slate-300">{sortIndicator('active')}</span>
                                                    </button>
                                                </th>
                                                {showCreatedBy && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Created By</th>}
                                                {showCreatedAt && (
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                                        <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1">
                                                            Created At <span className="text-slate-400 dark:text-slate-300">{sortIndicator('created_at')}</span>
                                                        </button>
                                                    </th>
                                                )}
                                                {showUpdatedBy && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Updated By</th>}
                                                {showUpdatedAt && (
                                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                                        <button onClick={() => toggleSort('updated_at')} className="flex items-center gap-1">
                                                            Updated At <span className="text-slate-400 dark:text-slate-300">{sortIndicator('updated_at')}</span>
                                                        </button>
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="table-body">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={dynamicColSpan} className="px-6 py-10 text-center text-slate-500 dark:text-slate-300">
                                                        Loading role permissions...
                                                    </td>
                                                </tr>
                                            ) : (
                                                paged.map((row, idx) => (
                                                    <tr key={row.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{row.role_name}</td>
                                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{getPageNameFromSection(row.page_section)}</td>
                                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.operation}</td>
                                                        <td className="px-4 py-4 text-sm text-center">
                                                            <div className="flex justify-center">
                                                                <Badge type={normalizeYesNo(row.system_defined)}>
                                                                    {toYesNoLabel(row.system_defined)}
                                                                </Badge>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm text-center">
                                                            <label className="inline-flex items-center justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={normalizeYesNo(row.active) === 'yes'}
                                                                    onChange={(e) => promptToggle(row, e.target.checked ? 'yes' : 'no')}
                                                                    disabled={savingId === row.id || normalizeYesNo(row.system_defined) === 'yes'}
                                                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
                                                                />
                                                            </label>
                                                        </td>
                                                        {showCreatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.created_by || '—'}</td>}
                                                        {showCreatedAt && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{row.created_at ? formatDateTime(row.created_at) : '—'}</td>}
                                                        {showUpdatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.updated_by || '—'}</td>}
                                                        {showUpdatedAt && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{row.updated_at ? formatDateTime(row.updated_at) : '—'}</td>}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                );
                            })()}
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
            )}
        </div>
    );
}
