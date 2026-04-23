'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { isPrivilegedUser } from '@/app/lib/permissions';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import { Search, PlusCircle, Trash2, Eye, RefreshCw, Tag, Phone, ArrowRightLeft, GitBranch, Edit2 } from 'lucide-react';

export default function BranchesPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [canEditBranch, setCanEditBranch] = useState(false);
    const [canDeleteBranch, setCanDeleteBranch] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: false
    });
    const [branchToDelete, setBranchToDelete] = useState<any | null>(null);

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    useEffect(() => {
        let ignore = false;

        const resolvePermissions = async () => {
            try {
                const user = getStoredUser<{ role?: string | null; username?: string | null; email?: string | null; name?: string | null; system_defined?: string | null }>();
                if (!user) {
                    if (!ignore) {
                        setCanEditBranch(false);
                        setCanDeleteBranch(false);
                    }
                    return;
                }

                if (isPrivilegedUser(user)) {
                    if (!ignore) {
                        setCanEditBranch(true);
                        setCanDeleteBranch(true);
                    }
                    return;
                }

                const roleName = String(user.role || '').trim().toLowerCase();
                if (!roleName) {
                    if (!ignore) {
                        setCanEditBranch(false);
                        setCanDeleteBranch(false);
                    }
                    return;
                }

                const response = await fetch(ENDPOINTS.PERMISSION_GROUPS.LIST);
                if (!response.ok) {
                    if (!ignore) {
                        setCanEditBranch(false);
                        setCanDeleteBranch(false);
                    }
                    return;
                }

                const data = await response.json();
                const rows = Array.isArray(data) ? data : [];
                const hasPermission = (operationName: 'EDIT' | 'DELETE') => rows.some((row) => {
                    const role = String(row?.role_name || '').trim().toLowerCase();
                    const section = String(row?.page_section || '').trim().toUpperCase();
                    const operation = String(row?.operation || '').trim().toUpperCase();
                    const active = String(row?.active || '').trim().toLowerCase();
                    if (role !== roleName) return false;
                    if (active !== 'yes') return false;
                    if (operation !== operationName) return false;
                    return section === 'BRANCH' || section === 'BRANCHES';
                });

                if (!ignore) {
                    setCanEditBranch(hasPermission('EDIT'));
                    setCanDeleteBranch(hasPermission('DELETE'));
                }
            } catch {
                if (!ignore) {
                    setCanEditBranch(false);
                    setCanDeleteBranch(false);
                }
            }
        };

        void resolvePermissions();

        return () => {
            ignore = true;
        };
    }, []);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.BRANCHES.LIST);
            if (res.ok) {
                const data = await res.json();
                setBranches(data || []);
            } else {
                setBranches([]);
            }
        } catch (error) {
            console.error('Failed to fetch branches', error);
            setBranches([]);
        } finally {
            setLoading(false);
        }
    };

    const normalizedBranches = useMemo(() => {
        return branches.map((b) => ({
            ...b,
            transaction_prefix: b.transaction_prefix ?? b.code ?? '',
            default_transaction_type: b.default_transaction_type ?? b.branch_default_transaction_type ?? '',
            telephone_1: b.telephone_1 ?? b.phone ?? '',
            day_transfer_limit: b.day_transfer_limit ?? 0,
            created_by: b.created_by ?? b.entered_user ?? '',
            updated_by: b.updated_by ?? b.modified_user ?? ''
        }));
    }, [branches]);

    const searchedBranches = searchQuery.trim()
        ? normalizedBranches.filter((b) => {
            const haystack = [
                b.name,
                b.transaction_prefix,
                b.default_transaction_type,
                b.telephone_1,
                b.day_transfer_limit,
                b.created_by,
                b.created_at,
                b.updated_by,
                b.updated_at
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(searchQuery.trim().toLowerCase());
        })
        : normalizedBranches;

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

    const getSortValue = (branch: any, key: string) => {
        switch (key) {
            case 'name':
                return branch.name || '';
            case 'transaction_prefix':
                return branch.transaction_prefix || '';
            case 'default_transaction_type':
                return branch.default_transaction_type || '';
            case 'telephone_1':
                return branch.telephone_1 || '';
            case 'day_transfer_limit':
                return Number(branch.day_transfer_limit || 0);
            case 'created_by':
                return branch.created_by || '';
            case 'updated_by':
                return branch.updated_by || '';
            case 'created_at':
                return branch.created_at ? new Date(branch.created_at).getTime() : 0;
            case 'updated_at':
                return branch.updated_at ? new Date(branch.updated_at).getTime() : 0;
            default:
                return branch[key] || '';
        }
    };

    const sortedBranches = [...searchedBranches].sort((a, b) => {
        const aVal = getSortValue(a, sortKey);
        const bVal = getSortValue(b, sortKey);
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const result = collator.compare(String(aVal), String(bVal));
        return sortDir === 'asc' ? result : -result;
    });

    const total = sortedBranches.length;
    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, total);
    const pagedBranches = sortedBranches.slice(startIndex, endIndex);

    useEffect(() => {
        if (page !== currentPage) {
            setPage(currentPage);
        }
    }, [currentPage, page]);

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

    const formatCurrency = (value: any) => {
        const amount = Number(value || 0);
        return `£${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const promptDelete = (branch: any) => {
        setBranchToDelete(branch);
        setConfirmModal({
            isOpen: true,
            title: 'Delete Branch',
            message: 'Are you sure you want to delete this branch? This action cannot be undone.',
            type: 'danger',
            isAlert: false
        });
    };

    const handleConfirm = async () => {
        if (confirmModal.isAlert) {
            setConfirmModal({ ...confirmModal, isOpen: false });
            return;
        }
        if (!branchToDelete) return;

        try {
            const res = await fetch(ENDPOINTS.BRANCHES.DETAIL(branchToDelete.id), { method: 'DELETE' });
            if (res.ok) {
                setBranches(branches.filter((b) => b.id !== branchToDelete.id));
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Branch deleted successfully',
                    type: 'info',
                    isAlert: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to delete branch',
                    type: 'danger',
                    isAlert: true
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Error deleting branch',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setBranchToDelete(null);
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

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Branches</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Manage branch details and transfer limits</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={fetchBranches}
                        className="px-5 py-3 rounded-full border-0 glass-effect bg-teal-50/60 dark:bg-teal-900/10 text-slate-700 dark:text-slate-300 font-bold hover:bg-teal-100/70 dark:hover:bg-teal-900/20 hover:shadow-lg transition-all group"
                    >
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </span>
                    </button>
                    <Link
                        href="/admin/branches/create"
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 rounded-full px-6"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Add Branch</span>
                    </Link>
                </div>
            </div>

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
                                placeholder="Search branches"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-glass w-full text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center space-x-3">
                    <GitBranch className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Branch Directory</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Showing {total === 0 ? 0 : startIndex + 1} to {endIndex} of {total}</p>
                    </div>
                </div>

                <div className="table-scroll">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">No.</th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                                        Branch Name <span className="text-slate-400 dark:text-slate-300">{sortIndicator('name')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('transaction_prefix')} className="flex items-center gap-1">
                                        Transaction Prefix <span className="text-slate-400 dark:text-slate-300">{sortIndicator('transaction_prefix')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('default_transaction_type')} className="flex items-center gap-1">
                                        Branch Type <span className="text-slate-400 dark:text-slate-300">{sortIndicator('default_transaction_type')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('telephone_1')} className="flex items-center gap-1">
                                        Tele 1 <span className="text-slate-400 dark:text-slate-300">{sortIndicator('telephone_1')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('day_transfer_limit')} className="flex items-center gap-1">
                                        Day Transfer Limit <span className="text-slate-400 dark:text-slate-300">{sortIndicator('day_transfer_limit')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('created_by')} className="flex items-center gap-1">
                                        Entered User <span className="text-slate-400 dark:text-slate-300">{sortIndicator('created_by')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1">
                                        Entered Date <span className="text-slate-400 dark:text-slate-300">{sortIndicator('created_at')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('updated_by')} className="flex items-center gap-1">
                                        Modified User <span className="text-slate-400 dark:text-slate-300">{sortIndicator('updated_by')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('updated_at')} className="flex items-center gap-1">
                                        Modified Date <span className="text-slate-400 dark:text-slate-300">{sortIndicator('updated_at')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {pagedBranches.map((branch, idx) => (
                                <tr key={branch.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">
                                        {startIndex + idx + 1}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{branch.name || '-'}</div>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        <span className="inline-flex items-center gap-2">
                                            <Tag className="w-3.5 h-3.5 text-teal-500" />
                                            {branch.transaction_prefix || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        <span className="inline-flex items-center gap-2">
                                            <ArrowRightLeft className="w-3.5 h-3.5 text-teal-500" />
                                            {branch.default_transaction_type || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                            <Phone className="w-3.5 h-3.5 text-teal-500" />
                                            {branch.telephone_1 || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {formatCurrency(branch.day_transfer_limit)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{branch.created_by || '-'}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{branch.created_at ? new Date(branch.created_at).toLocaleString() : '-'}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{branch.updated_by || '-'}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{branch.updated_at ? new Date(branch.updated_at).toLocaleString() : '-'}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/admin/branches/${branch.id}?mode=view`}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-full glass-effect text-slate-600 transition-colors hover:text-teal-600 dark:text-slate-200 dark:hover:text-teal-300"
                                                title="View branch"
                                                aria-label="View branch"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={`/admin/branches/${branch.id}`}
                                                className={`inline-flex h-9 w-9 items-center justify-center rounded-full glass-effect transition-colors ${canEditBranch ? 'text-slate-600 hover:text-teal-600 dark:text-slate-200 dark:hover:text-teal-300' : 'cursor-not-allowed opacity-50 text-slate-400 dark:text-slate-500 pointer-events-none'}`}
                                                title={canEditBranch ? 'Edit branch' : 'Edit permission required'}
                                                aria-label="Edit branch"
                                                aria-disabled={!canEditBranch}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => promptDelete(branch)}
                                                disabled={!canDeleteBranch}
                                                className={`inline-flex h-9 w-9 items-center justify-center rounded-full glass-effect transition-colors ${canDeleteBranch ? 'text-slate-600 hover:text-red-600 dark:text-slate-200 dark:hover:text-red-400' : 'cursor-not-allowed opacity-50 text-slate-400 dark:text-slate-500'}`}
                                                title={canDeleteBranch ? 'Delete branch' : 'Delete permission required'}
                                                aria-label="Delete branch"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
