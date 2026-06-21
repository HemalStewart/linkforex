'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { ShieldCheck, FileText, X, Loader2, RefreshCcw, Download, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/app/lib/dateUtils';
import { getCurrentAdminUser, withActingUserParam } from '@/app/lib/adminUserScope';
import { ENDPOINTS } from '@/app/lib/api';

interface VeriffReport {
    id: string | number;
    remitter_id: string | number;
    session_id: string;
    pdf_path: string;
    status: string;
    created_by: string;
    created_at: string;
}

interface VeriffReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    remitterId: string | number;
    remitterName: string;
    veriffSessionId: string;
}

export default function VeriffReportsModal({
    isOpen,
    onClose,
    remitterId,
    remitterName,
    veriffSessionId,
}: VeriffReportsModalProps) {
    const currentUser = useMemo(() => getCurrentAdminUser(), []);
    const [reports, setReports] = useState<VeriffReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger' | 'warning' | 'success';
        isAlert: boolean;
        targetReportId?: string | number | null;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isAlert: false,
        targetReportId: null,
    });

    useEffect(() => {
        if (isOpen && remitterId) {
            void fetchReports();
        }
    }, [isOpen, remitterId]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const url = withActingUserParam(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_REPORTS_LIST(remitterId), currentUser);
            const res = await fetch(url);
            const data = await res.json().catch(() => []);
            if (res.ok && Array.isArray(data)) {
                setReports(data);
            } else {
                setReports([]);
            }
        } catch (error) {
            console.error('Failed to fetch Veriff reports:', error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!remitterId) return;
        setGenerating(true);
        try {
            const url = withActingUserParam(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_REPORT_GENERATE(remitterId), currentUser);
            const res = await fetch(url, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                await fetchReports();
                setConfirmModal({
                    isOpen: true,
                    title: 'Pull Success',
                    message: 'A new Veriff KYC PDF report has been generated successfully.',
                    type: 'success',
                    isAlert: true,
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Pull Failed',
                    message: data?.message || 'Failed to pull Veriff report.',
                    type: 'danger',
                    isAlert: true,
                });
            }
        } catch (error) {
            console.error('Failed to generate report:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while pulling report.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setGenerating(false);
        }
    };

    const confirmDeleteReport = (reportId: string | number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Veriff Report',
            message: 'Are you sure you want to delete this Veriff report? This action cannot be undone.',
            type: 'danger',
            isAlert: false,
            targetReportId: reportId,
        });
    };

    const handleConfirmDelete = async () => {
        if (confirmModal.isAlert) {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            return;
        }

        const reportId = confirmModal.targetReportId;
        if (!reportId || !remitterId) return;

        setDeleteLoading(true);
        try {
            const url = withActingUserParam(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_REPORT_DELETE(remitterId, reportId), currentUser);
            const res = await fetch(url, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setReports((prev) => prev.filter((r) => r.id !== reportId));
                setConfirmModal({
                    isOpen: true,
                    title: 'Deleted',
                    message: 'Veriff report has been deleted.',
                    type: 'success',
                    isAlert: true,
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Delete Failed',
                    message: data?.message || 'Failed to delete report.',
                    type: 'danger',
                    isAlert: true,
                });
            }
        } catch (error) {
            console.error('Failed to delete report:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while deleting the report.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setDeleteLoading(false);
        }
    };

    const getStatusBadgeClass = (status: string) => {
        const norm = (status || '').toLowerCase().trim();
        switch (norm) {
            case 'approved':
            case 'passed':
            case 'clear':
                return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'rejected':
            case 'declined':
            case 'failed':
                return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800';
            case 'pending':
            case 'submitted':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-750';
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmDelete}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.isAlert ? 'OK' : 'Delete'}
                cancelText="Cancel"
                loading={deleteLoading}
            />

            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md transition-all duration-300">
                <div className="w-full max-w-4xl rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-700/50 dark:bg-slate-900/95 backdrop-blur-lg transform transition-all duration-300 scale-100">
                    <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                                </span>
                                <ShieldCheck className="h-6 w-6 text-teal-500" />
                                Veriff KYC PDF Reports
                            </h2>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                Manage, view, pull, or delete PDF verification reports for {remitterName || '-'}.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Actions & Info bar */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-teal-50/40 p-4 dark:bg-slate-800/40 border border-teal-100/30 dark:border-slate-700/50">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                            Veriff Key (Session ID): <span className="font-mono font-bold text-teal-600 dark:text-teal-400 break-all">{veriffSessionId || 'N/A'}</span>
                        </div>
                        <button
                            type="button"
                            disabled={generating || !veriffSessionId}
                            onClick={handleGenerateReport}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-teal-600/10 hover:shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Pulling Veriff Report...
                                </>
                            ) : (
                                <>
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                    Pull New Reports
                                </>
                            )}
                        </button>
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="py-20 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-500" />
                            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Loading reports...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
                            <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Veriff reports pulled yet</h4>
                            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                                Click "Pull New Reports" above to request and save the Veriff verification document.
                            </p>
                        </div>
                    ) : (
                        <div className="max-h-[350px] overflow-y-auto pr-1">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-4">Date Generated</th>
                                        <th className="py-3 px-4">Veriff Key (Session ID)</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Generated By</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {reports.map((report) => (
                                        <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="py-4 px-4 text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                                {formatDateTime(report.created_at)}
                                            </td>
                                            <td className="py-4 px-4 font-mono text-xs text-slate-505 dark:text-slate-400">
                                                {report.session_id}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold border ${getStatusBadgeClass(report.status)}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-450">
                                                {report.created_by || 'Admin'}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => window.open(withActingUserParam(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_REPORT_DOWNLOAD(remitterId, report.id), currentUser), '_blank', 'noopener,noreferrer')}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98]"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        Open PDF
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={deleteLoading}
                                                        onClick={() => confirmDeleteReport(report.id)}
                                                        className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 hover:bg-red-105 p-1.5 text-red-650 transition dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 hover:scale-105"
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
                    )}
                </div>
            </div>
        </>
    );
}
