'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { isPrivilegedUser as getIsPrivilegedUser, useAuditColumns } from '@/app/lib/permissions';
import ConfirmModal from '../components/ConfirmModal';
import Badge from '../components/ui/Badge';
import { CheckCircle2, XCircle, RefreshCcw, AlertTriangle } from 'lucide-react';
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

export default function BranchAccessPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('BRANCH_ACCESS_REQUESTS');
    const [rows, setRows] = useState<BranchAccessRow[]>([]);
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

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
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
            const params = new URLSearchParams();
            params.set('status', 'pending');

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
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
            />

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Branch Access Flags</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2">Approve or reject senders requesting transfer access from a different branch.</p>
                </div>
                <button
                    type="button"
                    onClick={fetchRows}
                    className="px-5 py-2.5 rounded-full glass-effect text-sm font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 flex items-center gap-2"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            <div className="card-glass p-6 md:p-8">
                {!currentUser ? (
                    <p className="text-sm text-slate-500 dark:text-slate-300">Please login first.</p>
                ) : loading ? (
                    <p className="text-sm text-slate-500 dark:text-slate-300">Loading requests...</p>
                ) : rows.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/40 px-4 py-6 text-sm text-slate-500 dark:text-slate-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        No pending cross-branch access requests.
                    </div>
                ) : (
                    <div className="table-scroll rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                        <table className="min-w-full">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/60">
                                <tr className="text-left text-xs text-slate-500 dark:text-slate-300">
                                    <th className="px-4 py-3">Sender</th>
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Approve"><CheckCircle2 className="w-4 h-4 mx-auto text-slate-400" /></th>
                                    <th className="px-4 py-3">Previous Branch</th>
                                    <th className="px-4 py-3">Requested Branch</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Requested By</th>
                                    {showCreatedBy && <th className="px-4 py-3">Created By</th>}
                                    {showCreatedAt && <th className="px-4 py-3">Created At</th>}
                                    {showUpdatedBy && <th className="px-4 py-3">Updated By</th>}
                                    {showUpdatedAt && <th className="px-4 py-3">Updated At</th>}
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Reject"><XCircle className="w-4 h-4 mx-auto text-slate-400" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/70 dark:divide-slate-700/60">
                                {rows.map((row) => (
                                    <tr key={row.id} className="text-sm">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-900 dark:text-white">{row.sender_name || '-'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-300">{row.sender_id || '-'}</p>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => performReview(row.id, 'approve')}
                                                disabled={submitting === row.id || row.can_review === false}
                                                className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                                                title="Approve"
                                            >
                                                <CheckCircle2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.origin_branch_name || row.origin_branch_code}</td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.requested_branch_name || row.requested_branch_code}</td>
                                        <td className="px-4 py-3">
                                            <Badge type="warning">
                                                {row.status}
                                            </Badge>
                                            {row.can_review === false ? (
                                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                                                    Waiting previous branch approval
                                                </p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-300">{row.requested_by_username || '-'}</td>
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
                                        <td className="px-2 py-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => performReview(row.id, 'reject')}
                                                disabled={submitting === row.id || row.can_review === false}
                                                className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                                                title="Reject"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </td>
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
