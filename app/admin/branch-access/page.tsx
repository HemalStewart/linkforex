'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { isPrivilegedUser as getIsPrivilegedUser, useAuditColumns, usePagePermissions } from '@/app/lib/permissions';
import ConfirmModal from '../components/ConfirmModal';
import Badge from '../components/ui/Badge';
import { CheckCircle2, XCircle, RefreshCcw, AlertTriangle, Search, Info, Clock, Archive } from 'lucide-react';
import RemitterOverviewModal from '@/app/admin/components/RemitterOverviewModal';
import { formatDateTime } from '@/app/lib/dateUtils';

type BranchAccessRow = {
    id: number;
    remitter_id: number;
    sender_id?: string;
    sender_name?: string;
    origin_branch_code: string;
    origin_branch_name?: string;
    requested_branch_code: string;
    requested_branch_name?: string;
    requested_by_username?: string;
    status: 'pending' | 'approved' | 'rejected';
    can_review?: boolean;
    created_at?: string;
    updated_at?: string;
    entered_user?: string;
    modified_user?: string;
    created_by?: string;
    updated_by?: string;
    note?: string;
};

// Approved and rejected are opposite outcomes and must not look alike.
const statusTone = (status?: string): 'yes' | 'danger' | 'warning' | 'neutral' => {
    switch (String(status || '').toLowerCase()) {
        case 'approved': return 'yes';
        case 'rejected': return 'danger';
        case 'pending':  return 'warning';
        default:         return 'neutral';
    }
};

export default function BranchAccessPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('BRANCH_ACCESS_REQUESTS');
    const { canApprove, canCancel } = usePagePermissions('BRANCH_ACCESS_REQUESTS');
    const [rows, setRows] = useState<BranchAccessRow[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    // Open requests are the work; decided ones are the record of what happened.
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [overviewRemitter, setOverviewRemitter] = useState<any | null>(null);
    const [overviewReceivers, setOverviewReceivers] = useState<any[]>([]);

    // The row holds only the remitter's name and reference, so the customer and
    // their receivers are loaded before the overview is shown.
    const openOverview = async (row: BranchAccessRow) => {
        setOverviewRemitter({ id: row.remitter_id, sender_name: row.sender_name, sender_id: row.sender_id });
        setOverviewReceivers([]);
        try {
            const [full, recs] = await Promise.all([
                fetch(ENDPOINTS.REMITTERS.DETAIL(row.remitter_id)).then(r => r.ok ? r.json() : null),
                fetch(`${ENDPOINTS.BENEFICIARIES.LIST}?customer_id=${row.remitter_id}`).then(r => r.ok ? r.json() : []),
            ]);
            if (full) setOverviewRemitter(full?.data ?? full);
            setOverviewReceivers(Array.isArray(recs) ? recs : (recs?.data ?? []));
        } catch {
            // the row summary is still shown if the load fails
        }
    };
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [currentUser, setCurrentUser] = useState<{
        id?: number;
        username?: string;
        name?: string;
        branch?: string;
        branch_id?: string;
        role?: string;
        system_defined?: string;
    } | null>(null);

    // Search covers every column shown in the table, as on the other list pages.
    const visibleRows = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();
        return rows.filter((row) => {
            const rowStatus = String(row.status || '').toLowerCase();

            if (activeTab === 'pending') {
                if (rowStatus !== 'pending') return false;
            } else {
                if (rowStatus === 'pending') return false;
                if (statusFilter !== 'all' && rowStatus !== statusFilter) return false;
            }
            if (!term) return true;
            return [
                row.sender_name, row.sender_id, row.origin_branch_name, row.origin_branch_code,
                row.requested_branch_name, row.requested_branch_code, row.status,
                row.requested_by_username, row.entered_user, row.modified_user, row.note,
            ].some((v) => String(v ?? '').toLowerCase().includes(term));
        });
    }, [rows, searchQuery, statusFilter, activeTab]);

    const tabCounts = useMemo(() => {
        let pending = 0;
        let history = 0;
        for (const row of rows) {
            if (String(row.status || '').toLowerCase() === 'pending') pending += 1;
            else history += 1;
        }
        return { pending, history };
    }, [rows]);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
    });

    // Approving grants a sender permanent access to another branch, so the
    // decision is confirmed with the sender and branch spelled out.
    const [reviewModal, setReviewModal] = useState<{ isOpen: boolean; row: BranchAccessRow | null; action: 'approve' | 'reject' }>({
        isOpen: false,
        row: null,
        action: 'approve',
    });

    const userBranch = useMemo(() => {
        return (currentUser?.branch || currentUser?.branch_id || '').trim();
    }, [currentUser]);

    const isPrivilegedUser = useMemo(() => {
        return getIsPrivilegedUser(currentUser);
    }, [currentUser]);

    const withActingUser = (url: string): string => {
        if (!currentUser?.id) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}acting_user_id=${encodeURIComponent(String(currentUser.id))}`;
    };

    useEffect(() => {
        const parsed = getStoredUser<any>();
        if (!parsed) return;
        setCurrentUser({
            ...parsed,
            id: Number.isFinite(Number(parsed.id)) ? Number(parsed.id) : undefined,
        });
    }, []);

    const fetchRows = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            // Both tabs read from one fetch: the pending queue and the record of
            // what was already decided, so every status has to come back.
            const params = new URLSearchParams();
            params.set('status', 'all');

            if (!isPrivilegedUser) {
                if (!userBranch) {
                    setRows([]);
                    return;
                }
            }

            const listUrl = withActingUser(`${ENDPOINTS.BRANCH_ACCESS_REQUESTS.LIST}?${params.toString()}`);
            const res = await fetch(listUrl);
            if (!res.ok) {
                setRows([]);
                return;
            }

            const data = (await res.json()) as BranchAccessRow[];
            setRows(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load branch access requests', error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, [currentUser, isPrivilegedUser, userBranch]);

    const setModal = (title: string, message: string, type: 'info' | 'danger' | 'warning' = 'info') => {
        setConfirmModal({ isOpen: true, title, message, type, isAlert: true });
    };

    const performReview = async (id: number, action: 'approve' | 'reject') => {
        if (!currentUser) return;
        setSubmitting(id);
        try {
            const endpoint =
                action === 'approve'
                    ? ENDPOINTS.BRANCH_ACCESS_REQUESTS.APPROVE(id)
                    : ENDPOINTS.BRANCH_ACCESS_REQUESTS.REJECT(id);

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acting_user_id: currentUser.id,
                    reviewed_by_user_id: currentUser.id,
                    reviewed_by_username: currentUser.username || currentUser.name || '',
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const message = data?.messages?.error || data?.message || `Failed to ${action} request.`;
                setModal('Action Failed', message, 'danger');
                return;
            }

            setModal('Success', `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`, 'info');
            await fetchRows();
        } catch (error) {
            console.error(`Failed to ${action} request`, error);
            setModal('Action Failed', `Failed to ${action} request.`, 'danger');
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-20 animate-fade-in-up space-y-6">
            {overviewRemitter && (
                <RemitterOverviewModal
                    remitter={overviewRemitter}
                    receivers={overviewReceivers}
                    onClose={() => setOverviewRemitter(null)}
                />
            )}

            <ConfirmModal
                isOpen={reviewModal.isOpen}
                onClose={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    const { row, action } = reviewModal;
                    setReviewModal((prev) => ({ ...prev, isOpen: false }));
                    if (row) performReview(row.id, action);
                }}
                title={reviewModal.action === 'approve' ? 'Approve Branch Access' : 'Reject Branch Access'}
                message={
                    reviewModal.row
                        ? (reviewModal.action === 'approve'
                            ? `Approve ${reviewModal.row.sender_name || 'this remitter'} for transfers from ${reviewModal.row.requested_branch_name || reviewModal.row.requested_branch_code || 'the requested branch'}?`
                            : `Reject the request for ${reviewModal.row.sender_name || 'this remitter'} to transfer from ${reviewModal.row.requested_branch_name || reviewModal.row.requested_branch_code || 'the requested branch'}?`)
                        : ''
                }
                confirmText={reviewModal.action === 'approve' ? 'Approve' : 'Reject'}
                cancelText="Cancel"
                type={reviewModal.action === 'approve' ? 'success' : 'danger'}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Branch Access Requests</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2">Approve or reject remitters requesting transfer access from a different branch.</p>
                </div>
                <button
                    type="button"
                    onClick={fetchRows}
                    className="btn-primary flex items-center group"
                >
                    <RefreshCcw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200/60 dark:border-slate-700/60 mb-2">
                <button
                    onClick={() => { setActiveTab('pending'); setStatusFilter('all'); }}
                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-300 flex items-center gap-2 ${activeTab === 'pending'
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    <Clock className="w-4 h-4" />
                    Pending Requests
                    {tabCounts.pending > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            {tabCounts.pending}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab('history'); setStatusFilter('all'); }}
                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-300 flex items-center gap-2 ${activeTab === 'history'
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    <Archive className="w-4 h-4" />
                    Previous Requests
                    {tabCounts.history > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/15 text-slate-600 dark:text-slate-300">
                            {tabCounts.history}
                        </span>
                    )}
                </button>
            </div>

            <div className="card-glass p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Search className="w-4 h-4" /></span>
                            <input
                                type="text"
                                placeholder="Search all columns"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-glass w-full text-sm"
                            />
                        </div>
                    </div>
                    {activeTab === 'history' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Outcome</label>
                            <div className="relative input-icon">
                                <select
                                    className="input-glass w-full text-sm"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                                >
                                    <option value="all">All</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="card-glass p-6 md:p-8">
                {!currentUser ? (
                    <p className="text-sm text-slate-500 dark:text-slate-300">Please login first.</p>
                ) : loading ? (
                    <p className="text-sm text-slate-500 dark:text-slate-300">Loading requests...</p>
                ) : visibleRows.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/40 px-4 py-6 text-sm text-slate-500 dark:text-slate-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {searchQuery.trim() || statusFilter !== 'all'
                            ? 'No requests match your search.'
                            : activeTab === 'pending'
                                ? 'No requests are waiting for review.'
                                : 'No requests have been reviewed yet.'}
                    </div>
                ) : (
                    <div className="table-scroll rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                        <table className="min-w-full">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/60">
                                <tr className="text-left text-xs text-slate-500 dark:text-slate-300">
                                    {activeTab === 'pending' && canApprove && <th className="px-2 py-4 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400" title="Approve"><CheckCircle2 className="w-4 h-4 mx-auto" /></th>}
                                    {activeTab === 'pending' && canCancel && <th className="px-2 py-4 text-center text-xs font-bold text-rose-600 dark:text-rose-400" title="Reject"><XCircle className="w-4 h-4 mx-auto" /></th>}
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="View Overview"><Info className="w-4 h-4 mx-auto text-slate-400" /></th>
                                    <th className="px-4 py-3">Remitter</th>
                                    <th className="px-4 py-3">Branch</th>
                                    <th className="px-4 py-3">Requested Branch</th>
                                    <th className="px-4 py-3">Status</th>
                                    {showCreatedBy && <th className="px-4 py-3">Created By</th>}
                                    {showCreatedAt && <th className="px-4 py-3">Created At</th>}
                                    {showUpdatedBy && <th className="px-4 py-3">Updated By</th>}
                                    {showUpdatedAt && <th className="px-4 py-3">Updated At</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/70 dark:divide-slate-700/60">
                                {visibleRows.map((row) => (
                                    <tr key={row.id} className="text-sm">
                                        {activeTab === 'pending' && canApprove && (
                                            <td className="px-2 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setReviewModal({ isOpen: true, row, action: 'approve' })}
                                                    disabled={submitting === row.id || row.can_review === false}
                                                    className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md dark:text-emerald-400 dark:hover:bg-emerald-900/25 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                                                    title="Approve"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        )}
                                        {activeTab === 'pending' && canCancel && (
                                            <td className="px-2 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setReviewModal({ isOpen: true, row, action: 'reject' })}
                                                    disabled={submitting === row.id || row.can_review === false}
                                                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:shadow-md dark:text-rose-400 dark:hover:bg-rose-900/25 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-2 py-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => void openOverview(row)}
                                                className="p-2 rounded-xl text-slate-400 hover:bg-white hover:text-teal-600 hover:shadow-md dark:hover:bg-slate-700 transition-all"
                                                title="View Overview"
                                            >
                                                <Info className="w-5 h-5" />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-900 dark:text-white">{row.sender_name || '-'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-300">{row.sender_id || '-'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.origin_branch_name || row.origin_branch_code}</td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.requested_branch_name || row.requested_branch_code}</td>
                                        <td className="px-4 py-3">
                                            <Badge type={statusTone(row.status)}>
                                                {row.status}
                                            </Badge>
                                            {row.can_review === false ? (
                                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                                                    Waiting previous branch approval
                                                </p>
                                            ) : null}
                                        </td>
                                        {showCreatedBy && <td className="px-4 py-3 text-slate-500 dark:text-slate-300">{row.entered_user || row.created_by || row.requested_by_username || '—'}</td>}
                                        {showCreatedAt && (
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                                {formatDateTime(row.created_at)}
                                            </td>
                                        )}
                                        {showUpdatedBy && <td className="px-4 py-3 text-slate-500 dark:text-slate-300">{row.modified_user || row.updated_by || '—'}</td>}
                                        {showUpdatedAt && (
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                                {row.updated_at ? formatDateTime(row.updated_at) : '—'}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
