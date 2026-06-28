'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { isPrivilegedUser, useAuditColumns, usePagePermissions } from '@/app/lib/permissions';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateTime } from '@/app/lib/dateUtils';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Search, PlusCircle, Trash2, Eye, RefreshCw, Tag, Phone, ArrowRightLeft, GitBranch, Edit2 } from 'lucide-react';

export default function BranchesPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('BRANCHES');
    const { canAdd, canEdit, canDelete } = usePagePermissions('BRANCHES');
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);

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
        return <SortIndicator active={sortKey === key} dir={sortDir} className="text-slate-400 dark:text-slate-300" />;
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
                const errorData = await res.json().catch(() => null);
                const errorMessage =
                    errorData?.messages?.error ||
                    errorData?.message ||
                    errorData?.error ||
                    'Failed to delete branch';
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: errorMessage,
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
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 border-0 group"
                    >
                        <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    {canAdd && (
                        <Link
                            href="/admin/branches/create"
                            className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 rounded-full px-6"
                        >
                            <PlusCircle className="w-5 h-5" />
                            <span>Add Branch</span>
                        </Link>
                    )}
                </div>
            </div>

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
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">No.</th>
                                {canEdit && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-300" title="Edit"><Edit2 className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                                        Branch Name <span className="text-slate-400 dark:text-slate-300">{sortIndicator('name')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('transaction_prefix')} className="flex items-center gap-1">
                                        Transaction Prefix <span className="text-slate-400 dark:text-slate-300">{sortIndicator('transaction_prefix')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('default_transaction_type')} className="flex items-center gap-1">
                                        Branch Type <span className="text-slate-400 dark:text-slate-300">{sortIndicator('default_transaction_type')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('telephone_1')} className="flex items-center gap-1">
                                        Tele 1 <span className="text-slate-400 dark:text-slate-300">{sortIndicator('telephone_1')}</span>
                                    </button>
                                </th>
                                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <button onClick={() => toggleSort('day_transfer_limit')} className="flex items-center gap-1">
                                        Day Transfer Limit <span className="text-slate-400 dark:text-slate-300">{sortIndicator('day_transfer_limit')}</span>
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
                                {canDelete && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-300" title="Delete"><Trash2 className="w-4 h-4 mx-auto text-slate-400" /></th>}
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {pagedBranches.map((branch, idx) => (
                                <tr key={branch.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">
                                        {startIndex + idx + 1}
                                    </td>
                                    {canEdit && (
                                        <td className="px-2 py-4 text-center">
                                            <Link
                                                href={`/admin/branches/${branch.id}`}
                                                className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex items-center justify-center"
                                                title="Edit branch"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </Link>
                                        </td>
                                    )}
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
                                    {showCreatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{branch.created_by || '-'}</td>}
                                    {showCreatedAt && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime(branch.created_at)}</td>}
                                    {showUpdatedBy && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{branch.updated_by || '-'}</td>}
                                    {showUpdatedAt && <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime(branch.updated_at)}</td>}
                                    {canDelete && (
                                        <td className="px-2 py-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => promptDelete(branch)}
                                                className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all"
                                                title="Delete branch"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    )}
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
