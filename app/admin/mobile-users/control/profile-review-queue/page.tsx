'use client';

import React, { useEffect, useState } from 'react';
import { Download, FileText, Image, RefreshCcw, Search, X } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../../components/ConfirmModal';
import type { QueueUser } from '../_shared';

export default function MobileProfileReviewQueuePage() {
    const [loading, setLoading] = useState(true);
    const [queue, setQueue] = useState<QueueUser[]>([]);
    const [queueStatus, setQueueStatus] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
    const [queueSearch, setQueueSearch] = useState('');
    const [mediaModal, setMediaModal] = useState<{
        isOpen: boolean;
        loading: boolean;
        user: QueueUser | null;
        media: Array<Record<string, unknown>>;
    }>({ isOpen: false, loading: false, user: null, media: [] });
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

    const value = (input: unknown) => {
        const text = input === null || input === undefined ? '' : String(input);
        return text.trim() || '-';
    };

    const mediaLabel = (item: Record<string, unknown>, index: number) => {
        return value(
            item.name ||
            item.context ||
            item.type ||
            item.mimeType ||
            item.mimetype ||
            `Media ${index + 1}`
        );
    };

    const mediaId = (item: Record<string, unknown>) => {
        return value(item.id || item.mediaId || item.media_id);
    };

    const openVerificationReport = (user: QueueUser) => {
        const rows = [
            ['Profile ID', user.id],
            ['Name', user.name],
            ['Email', user.email],
            ['Phone', user.phone],
            ['Country', user.country],
            ['KYC Status', user.kyc_status],
            ['Account Status', user.status],
            ['Mobile Verified At', user.mobile_verified_at],
            ['Veriff Session ID', user.veriff_session_id],
            ['Veriff Attempt ID', user.veriff_attempt_id],
            ['Veriff Status', user.veriff_status],
            ['Veriff Decision', user.veriff_decision],
            ['Veriff Code', user.veriff_code],
            ['Veriff Reason Code', user.veriff_reason_code],
            ['Veriff Reason', user.veriff_reason],
            ['Veriff Checked At', user.veriff_checked_at],
            ['Veriff Decision Time', user.veriff_decision_time],
            ['Verified Person Name', user.veriff_person_name],
            ['Document Type', user.veriff_document_type],
            ['Document Country', user.veriff_document_country],
            ['Document Number', user.veriff_document_number],
            ['PEP/Sanctions Match', user.veriff_pep_sanction_match],
            ['Sanction Status', user.sanction_status],
            ['Sanction Reason', user.sanction_reason],
            ['Sanction Checked At', user.sanction_checked_at],
            ['Created At', user.created_at],
            ['Updated At', user.updated_at],
        ];

        const reportWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
        if (!reportWindow) {
            showModal('Report Blocked', 'Please allow pop-ups to open the verification report.', 'warning');
            return;
        }

        const rowHtml = rows.map(([label, data]) => `
            <tr>
                <th>${String(label)}</th>
                <td>${String(value(data)).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))}</td>
            </tr>
        `).join('');

        reportWindow.document.open();
        reportWindow.document.write(`<!doctype html>
<html>
<head>
  <title>LinkForex Veriff Report - ${value(user.name)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 36px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 24px; }
    p { margin: 4px 0; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { text-align: left; vertical-align: top; padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; }
    th { width: 260px; background: #f9fafb; font-weight: 700; }
    .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; text-transform:; }
    .actions { margin-top: 20px; }
    button { border: 0; border-radius: 999px; background: #111827; color: white; padding: 10px 16px; font-weight: 700; cursor: pointer; }
    @media print { .actions { display: none; } body { margin: 18px; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>LinkForex Identity Verification Report</h1>
      <p>Generated ${new Date().toLocaleString()}</p>
      <p>Use browser print to save this report as PDF.</p>
    </div>
    <span class="badge">${value(user.kyc_status)}</span>
  </header>
  <table>${rowHtml}</table>
  <div class="actions"><button onclick="window.print()">Save / Print PDF</button></div>
</body>
</html>`);
        reportWindow.document.close();
    };

    const openMediaModal = async (user: QueueUser) => {
        setMediaModal({ isOpen: true, loading: true, user, media: [] });
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_MEDIA(user.id));
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showModal('Media Unavailable', data?.message || 'Could not load Veriff media.', 'warning');
                setMediaModal((prev) => ({ ...prev, loading: false }));
                return;
            }
            const media = Array.isArray(data.media) ? data.media : [];
            setMediaModal({ isOpen: true, loading: false, user, media });
        } catch {
            showModal('Media Unavailable', 'Could not load Veriff media.', 'warning');
            setMediaModal((prev) => ({ ...prev, loading: false }));
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

            {mediaModal.isOpen ? (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-3xl border border-slate-200/70 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Veriff Media</h2>
                                <p className="mt-1 text-sm text-slate-500">{mediaModal.user?.name || '-'}</p>
                            </div>
                            <button
                                onClick={() => setMediaModal({ isOpen: false, loading: false, user: null, media: [] })}
                                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {mediaModal.loading ? (
                            <div className="py-10 text-center text-sm font-semibold text-slate-500">Loading Veriff media...</div>
                        ) : mediaModal.media.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                                No Veriff media is available yet. Complete the Veriff flow first, then sync the result.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {mediaModal.media.map((item, index) => {
                                    const id = mediaId(item);
                                    return (
                                        <div key={`${id}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <Image className="h-5 w-5 shrink-0 text-teal-500" />
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{mediaLabel(item, index)}</div>
                                                    <div className="truncate text-xs text-slate-500">{id}</div>
                                                </div>
                                            </div>
                                            {mediaModal.user && id !== '-' ? (
                                                <button
                                                    onClick={() => window.open(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_MEDIA_DOWNLOAD(mediaModal.user!.id, id), '_blank', 'noopener,noreferrer')}
                                                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                    Open
                                                </button>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

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
                                    <td className="text-xs font-bold text-slate-600">{u.kyc_status || '-'}</td>
                                    <td className="text-xs font-bold text-slate-600">{u.status || '-'}</td>
                                    <td className="text-[11px] font-bold text-slate-600">{u.mobile_verified_at ? 'Verified' : 'Pending'}</td>
                                    <td>
                                        <div className="text-[11px] font-bold text-slate-600">{u.veriff_status || '-'}</div>
                                        <div className="text-[10px] text-slate-400">{u.veriff_decision || '-'}</div>
                                        {u.veriff_person_name ? (
                                            <div className="mt-1 text-[10px] text-slate-500">{u.veriff_person_name}</div>
                                        ) : null}
                                        {(u.veriff_document_type || u.veriff_document_country) ? (
                                            <div className="text-[10px] text-slate-500">
                                                {[u.veriff_document_country, u.veriff_document_type].filter(Boolean).join(' • ')}
                                            </div>
                                        ) : null}
                                        {u.veriff_reason ? (
                                            <div className="text-[10px] text-rose-500">{u.veriff_reason}</div>
                                        ) : null}
                                    </td>
                                    <td>
                                        <div className="text-[11px] font-bold text-slate-600">{u.sanction_status || '-'}</div>
                                        <div className="text-[10px] text-slate-400">{u.sanction_checked_at || '-'}</div>
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
                                                onClick={() => openVerificationReport(u)}
                                                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                            >
                                                <FileText className="mr-1 inline-block h-3 w-3" />
                                                Report
                                            </button>
                                            <button
                                                onClick={() => openMediaModal(u)}
                                                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                            >
                                                <Image className="mr-1 inline-block h-3 w-3" />
                                                Media
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
