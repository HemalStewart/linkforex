'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../components/ConfirmModal';

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

const normalizeDate = (value?: string | null) => {
    if (!value) return '';
    return value.includes('T') ? value : value.replace(' ', 'T');
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '';
    return value;
};

export default function PermissionGroupsPage() {
    const [rows, setRows] = useState<PermissionGroupRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<string>('role_name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
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

    useEffect(() => {
        const fetchRows = async () => {
            setLoading(true);
            try {
                const res = await fetch(ENDPOINTS.PERMISSION_GROUPS.LIST);
                if (res.ok) {
                    const data = await res.json();
                    setRows(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchRows();
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setCurrentUserName(parsed.username || parsed.name || parsed.email || '');
            } catch (e) {
                setCurrentUserName('');
            }
        }
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
        const list = [...searched];
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
    }, [searched, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, pageSize]);

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
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    const badgeClass = (value: string) =>
        value === 'yes'
            ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';

    const promptToggle = (row: PermissionGroupRow, nextActive: 'yes' | 'no') => {
        setPendingToggle({ row, nextActive });
        setConfirmModal({
            isOpen: true,
            title: nextActive === 'yes' ? 'Activate Permission' : 'Deactivate Permission',
            message: `Are you sure you want to ${nextActive === 'yes' ? 'activate' : 'deactivate'} this permission for ${row.role_name}?`,
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
                    active: nextActive,
                    updated_by: currentUserName || undefined
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setRows((prev) =>
                    prev.map((item) =>
                        item.id === row.id
                            ? {
                                ...item,
                                active: updated.active ?? nextActive,
                                updated_by: updated.updated_by ?? (currentUserName || item.updated_by),
                                updated_at: updated.updated_at ?? item.updated_at
                            }
                            : item
                    )
                );
                setConfirmModal({
                    isOpen: true,
                    title: 'Updated',
                    message: `Permission ${nextActive === 'yes' ? 'activated' : 'deactivated'} successfully.`,
                    type: 'success',
                    isAlert: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to update permission status.',
                    type: 'danger',
                    isAlert: true
                });
            }
        } catch (e) {
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Network error while updating permission.',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setSavingId(null);
            setPendingToggle(null);
        }
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Permission Groups</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Manage role permissions by page and operation</p>
                </div>
            </div>

            <div className="card-glass p-6">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                <div className="relative input-icon">
                    <span className="input-icon-left">
                        <Search className="w-4 h-4" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search across all columns"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-glass w-full text-sm"
                    />
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60">
                    <div className="text-sm text-slate-500 dark:text-slate-300">
                        Results: {sorted.length === 0 ? 0 : startIndex + 1} - {endIndex} of {sorted.length}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">No.</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('role_name')} className="flex items-center gap-1">
                                        Role Permission Group <span className="text-slate-400 dark:text-slate-300">{sortIndicator('role_name')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('page_section')} className="flex items-center gap-1">
                                        Page (Section) <span className="text-slate-400 dark:text-slate-300">{sortIndicator('page_section')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('operation')} className="flex items-center gap-1">
                                        Operation <span className="text-slate-400 dark:text-slate-300">{sortIndicator('operation')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('system_defined')} className="flex items-center gap-1">
                                        System Defined <span className="text-slate-400 dark:text-slate-300">{sortIndicator('system_defined')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('active')} className="flex items-center gap-1">
                                        Active <span className="text-slate-400 dark:text-slate-300">{sortIndicator('active')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Entered User</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1">
                                        Entered Date <span className="text-slate-400 dark:text-slate-300">{sortIndicator('created_at')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Modified User</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
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
                                        Loading permission groups...
                                    </td>
                                </tr>
                            ) : (
                                paged.map((row, idx) => (
                                    <tr key={row.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{row.role_name}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.page_section}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.operation}</td>
                                        <td className="px-4 py-4 text-sm">
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${badgeClass(row.system_defined)}`}>
                                                {row.system_defined || 'no'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            <label className="inline-flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={row.active === 'yes'}
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
                <div className="px-6 py-4 border-t border-slate-100/70 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-300">
                        <span className="font-semibold">Rows per page</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="input-glass h-9 text-sm px-3"
                        >
                            {[25, 50, 100, 250].map((size) => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-4 py-2 rounded-full text-xs font-bold glass-effect border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Prev
                        </button>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-4 py-2 rounded-full text-xs font-bold glass-effect border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
