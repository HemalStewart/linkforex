'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { ShieldCheck, FileText, X, Loader2, RefreshCcw, Download, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/app/lib/dateUtils';
import { getCurrentAdminUser, withActingUserParam } from '@/app/lib/adminUserScope';
import { ENDPOINTS } from '@/app/lib/api';
import { openPdfReport } from '@/app/lib/openPdfReport';
import { showToast } from '@/app/lib/toast';
import { usePagePermissions } from '@/app/lib/permissions';

interface DilisenseReport {
    id: string | number;
    beneficiary_id: string | number;
    reference: string;
    pdf_path: string;
    created_by: string;
    created_at: string;
    provider?: string;
}

interface ReceiverReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    receiverId: string | number;
    receiverName: string;
    dateOfBirth?: string;
    onUpdated?: () => void;
}

export default function ReceiverReportsModal({
    isOpen,
    onClose,
    receiverId,
    receiverName,
    dateOfBirth,
    onUpdated,
}: ReceiverReportsModalProps) {
    const currentUser = useMemo(() => getCurrentAdminUser(), []);
    const { canDeleteComplianceReport, canDelete } = usePagePermissions('RECEIVERS');
    const allowDelete = canDeleteComplianceReport ?? canDelete ?? true;

    const [reports, setReports] = useState<DilisenseReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showRescreenConfirm, setShowRescreenConfirm] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<string | number | null>(null);

    const fetchReports = async () => {
        if (!receiverId) return;
        setLoading(true);
        try {
            const url = withActingUserParam(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORTS_LIST(receiverId), currentUser);
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setReports(data);
                } else {
                    setReports([]);
                }
            } else {
                setReports([]);
            }
        } catch (e) {
            console.error('Failed to fetch receiver AML reports:', e);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && receiverId) {
            void fetchReports();
        }
    }, [isOpen, receiverId]);

    const handleStartRescreen = async () => {
        setGenerating(true);
        try {
            const payload: any = {
                name: receiverName,
            };
            if (dateOfBirth) payload.dob = dateOfBirth;

            const url = withActingUserParam(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORT_GENERATE(receiverId), currentUser);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || errData.error || 'Failed to generate AML screening report.');
            }

            showToast('Success', 'New Dilisense AML check completed successfully!', 'success');
            await fetchReports();
            if (onUpdated) onUpdated();
        } catch (e: any) {
            showToast('Error', e.message || 'Failed to generate AML report', 'danger');
        } finally {
            setGenerating(false);
            setShowRescreenConfirm(false);
        }
    };

    const handleDeleteReport = async () => {
        if (!reportToDelete) return;
        setDeleteLoading(true);
        try {
            const url = withActingUserParam(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORT_DELETE(receiverId, reportToDelete), currentUser);
            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || errData.error || 'Failed to delete report.');
            }

            showToast('Success', 'AML Report deleted successfully.', 'success');
            await fetchReports();
            if (onUpdated) onUpdated();
        } catch (e: any) {
            showToast('Error', e.message || 'Failed to delete report', 'danger');
        } finally {
            setDeleteLoading(false);
            setReportToDelete(null);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                                </span>
                                <ShieldCheck className="h-6 w-6 text-teal-500" />
                                AML Reports
                            </h2>
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                Manage, view, run checks, or delete AML Reports for <span className="font-bold text-slate-700 dark:text-slate-200">{receiverName || '-'}</span>.
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-teal-50/40 p-4 dark:bg-slate-800/40 border border-teal-100/30 dark:border-slate-700/50">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Receiver Name: <span className="font-bold text-teal-600 dark:text-teal-400">{receiverName || 'N/A'}</span>
                        </div>
                        <button
                            type="button"
                            disabled={generating || !receiverName}
                            onClick={() => setShowRescreenConfirm(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-teal-600/10 hover:shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Checking Dilisense...
                                </>
                            ) : (
                                <>
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                    New Check
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
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Dilisense reports run yet</h4>
                            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                                Click "New Check" above to query Dilisense name screening.
                            </p>
                        </div>
                    ) : (
                        <div className="max-h-[350px] overflow-y-auto pr-1">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-400">
                                        <th className="py-3 px-4">Date Checked</th>
                                        <th className="py-3 px-4">Provider</th>
                                        <th className="py-3 px-4">Reference</th>
                                        <th className="py-3 px-4">Checked By</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {reports.map((report) => (
                                        <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="py-4 px-4 text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                                {formatDateTime(report.created_at)}
                                            </td>
                                            <td className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                {report.provider || (report.reference?.startsWith('VERIFF') ? 'Veriff' : 'Dilisense')}
                                            </td>
                                            <td className="py-4 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {report.reference}
                                            </td>
                                            <td className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                {report.created_by && report.created_by.toLowerCase() === 'admin' ? 'Admin' : (report.created_by || 'system')}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void openPdfReport(
                                                                withActingUserParam(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORT_DOWNLOAD(receiverId, report.id), currentUser),
                                                                currentUser
                                                            );
                                                        }}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        Open PDF
                                                    </button>
                                                    {allowDelete && (
                                                        <button
                                                            type="button"
                                                            disabled={deleteLoading && reportToDelete === report.id}
                                                            onClick={() => setReportToDelete(report.id)}
                                                            className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 hover:bg-red-100 p-1.5 text-red-600 transition dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 hover:scale-105 cursor-pointer"
                                                        >
                                                            {deleteLoading && reportToDelete === report.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Rescreen Confirm Modal */}
            {showRescreenConfirm && (
                <Modal isOpen={showRescreenConfirm} onClose={() => setShowRescreenConfirm(false)} size="md">
                    <div className="p-6 text-center space-y-4">
                        <ShieldCheck className="mx-auto h-12 w-12 text-teal-500" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Rescreening</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Are you sure you want to rescreen <strong>{receiverName}</strong>?
                        </p>
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowRescreenConfirm(false)}
                                className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={generating}
                                onClick={handleStartRescreen}
                                className="flex-1 rounded-2xl bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {reportToDelete && (
                <ConfirmModal
                    isOpen={!!reportToDelete}
                    title="Delete AML Report"
                    message="Are you sure you want to delete this AML Report? This action cannot be undone."
                    type="danger"
                    onConfirm={handleDeleteReport}
                    onClose={() => setReportToDelete(null)}
                />
            )}
        </>
    );
}
