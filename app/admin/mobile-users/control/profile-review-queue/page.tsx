'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../../components/ConfirmModal';
import type { QueueUser } from '../_shared';

export default function MobileProfileReviewQueuePage() {
    const [loading, setLoading] = useState(true);
    const [queue, setQueue] = useState<QueueUser[]>([]);
    const [queueStatus, setQueueStatus] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
    const [queueSearch, setQueueSearch] = useState('');
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'danger' | 'success',
    });

    const showModal = (title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info') => {
        setConfirmModal({ isOpen: true, title, message, type });
    };

    const loadQueue = async (status = queueStatus, search = queueSearch) => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            query.set('status', status);
            if (search.trim()) query.set('search', search.trim());
            const res = await fetch(`${ENDPOINTS.MOBILE_ADMIN.REVIEW_QUEUE}?${query.toString()}`);
            if (!res.ok) return;
            const data = await res.json();
            setQueue(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQueue('pending', '');
    }, []);

    useEffect(() => {
        const t = window.setTimeout(() => {
            loadQueue(queueStatus, queueSearch);
        }, 300);
        return () => window.clearTimeout(t);
    }, [queueStatus, queueSearch]);

    const syncLivenessForUser = async (user: QueueUser) => {
        if (!user?.email) {
            showModal('Sync Failed', 'User email is missing.', 'warning');
            return;
        }

        try {
            const res = await fetch(ENDPOINTS.MOBILE_AUTH.SYNC_LIVENESS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showModal('Sync Failed', data?.message || 'Could not sync liveness decision.', 'danger');
                return;
            }

            await loadQueue();
            showModal('Synced', 'Latest liveness decision pulled from Veriff.', 'success');
        } catch {
            showModal('Sync Failed', 'Could not sync liveness decision.', 'danger');
        }
    };

    const approveQueueUser = async (user: QueueUser) => {
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.REVIEW_APPROVE(user.id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showModal('Approve Failed', data?.message || 'Could not approve mobile profile.', 'danger');
                return;
            }
            await loadQueue();
            showModal('Approved', 'Mobile profile approved successfully.', 'success');
        } catch {
            showModal('Approve Failed', 'Could not approve mobile profile.', 'danger');
        }
    };

    const rejectQueueUser = async (user: QueueUser) => {
        const reason = window.prompt('Reject reason (optional):', 'Rejected by admin review.');
        if (reason === null) return;

        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.REVIEW_REJECT(user.id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showModal('Reject Failed', data?.message || 'Could not reject mobile profile.', 'danger');
                return;
            }

            await loadQueue();
            showModal('Rejected', 'Mobile profile rejected.', 'success');
        } catch {
            showModal('Reject Failed', 'Could not reject mobile profile.', 'danger');
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert
                confirmText="OK"
            />

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Profile Review Queue</h1>
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                        Review pending profile checks and perform sync/approve/reject actions.
                    </p>
                </div>
                <button onClick={() => loadQueue()} className="btn-primary flex items-center gap-2 rounded-full px-5">
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="card-glass p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <select
                            value={queueStatus}
                            onChange={(e) => setQueueStatus(e.target.value as 'pending' | 'verified' | 'rejected' | 'all')}
                            className="input-glass rounded-full px-3 py-2 text-xs font-bold"
                        >
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                </div>

                <div className="input-icon relative mb-3">
                    <div className="input-icon-left">
                        <Search className="h-4 w-4" />
                    </div>
                    <input
                        value={queueSearch}
                        onChange={(e) => setQueueSearch(e.target.value)}
                        placeholder="Search by name, email, phone, ID"
                        className="input-glass w-full py-2.5 text-sm"
                    />
                </div>

                <div className="table-scroll max-h-[540px] rounded-2xl border border-slate-200/70 dark:border-slate-700">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th>User</th>
                                <th>KYC</th>
                                <th>Status</th>
                                <th>Mobile</th>
                                <th>Liveness</th>
                                <th>Sanction</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {queue.slice(0, 100).map((u) => (
                                <tr key={u.id}>
                                    <td>
                                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{u.name || '-'}</div>
                                        <div className="text-xs text-slate-500">{u.email || '-'}</div>
                                    </td>
                                    <td className="text-xs font-bold uppercase text-slate-600">{u.kyc_status || '-'}</td>
                                    <td className="text-xs font-bold uppercase text-slate-600">{u.status || '-'}</td>
                                    <td className="text-[11px] font-bold uppercase text-slate-600">{u.mobile_verified_at ? 'Verified' : 'Pending'}</td>
                                    <td>
                                        <div className="text-[11px] font-bold uppercase text-slate-600">{u.veriff_status || '-'}</div>
                                        <div className="text-[10px] uppercase text-slate-400">{u.veriff_decision || '-'}</div>
                                    </td>
                                    <td>
                                        <div className="text-[11px] font-bold uppercase text-slate-600">{u.sanction_status || '-'}</div>
                                        <div className="text-[10px] uppercase text-slate-400">{u.sanction_checked_at || '-'}</div>
                                    </td>
                                    <td className="text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <button
                                                onClick={() => syncLivenessForUser(u)}
                                                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                            >
                                                Sync
                                            </button>
                                            <button
                                                onClick={() => approveQueueUser(u)}
                                                className="rounded-full border border-emerald-300 px-3 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => rejectQueueUser(u)}
                                                className="rounded-full border border-rose-300 px-3 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {queue.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                                        {loading ? 'Loading...' : 'No users in queue'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
