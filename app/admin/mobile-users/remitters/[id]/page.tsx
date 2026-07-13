'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../../components/ConfirmModal';
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Flag, Save, Loader2, CheckCircle, AlertTriangle, Building, ChevronDown, ChevronUp, ExternalLink, Trash2, ShieldCheck, IdCard, Image, Download, FileText, RefreshCcw, X } from 'lucide-react';
import { resolveUploadsUrl } from '@/app/lib/uploads';
import { usePagePermissions } from '@/app/lib/permissions';

type MobileProfileForm = {
    name: string;
    email?: string;
    phone: string;
    status: string;
    kyc_status: string;
    client_type?: string;
    dob?: string;
    address_1?: string;
    city?: string;
    postcode?: string;
    country?: string;
    mobile_verified_at?: string;
    veriff_session_id?: string;
    veriff_attempt_id?: string;
    veriff_status?: string;
    veriff_decision?: string;
    veriff_code?: string;
    veriff_reason_code?: string;
    veriff_reason?: string;
    veriff_checked_at?: string;
    veriff_decision_time?: string;
    veriff_person_name?: string;
    veriff_document_type?: string;
    veriff_document_country?: string;
    veriff_document_number?: string;
    veriff_pep_sanction_match?: string;
    veriff_media_synced_at?: string;
    kyc_status_change_reason?: string;
    veriff_raw_payload?: string;
};

export default function EditRemitterPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const { canPdf } = usePagePermissions('MOBILE_PROFILES');
    const [notFound, setNotFound] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [initialKycStatus, setInitialKycStatus] = useState<string>('pending');
    const [enableKycOverride, setEnableKycOverride] = useState(false);

    // Dilisense AML screening states
    const [sanctionReference, setSanctionReference] = useState<string>('');
    const [sanctionCheckedAt, setSanctionCheckedAt] = useState<string>('');
    const [sanctionRawPayload, setSanctionRawPayload] = useState<string>('');
    const [senderDetailsAmlScreeningDoc, setSenderDetailsAmlScreeningDoc] = useState<string>('');
    const [sanctionScore, setSanctionScore] = useState<number>(0);
    const [showRawPayload, setShowRawPayload] = useState<boolean>(false);
    const [showVeriffRawPayload, setShowVeriffRawPayload] = useState<boolean>(false);

    const [formData, setFormData] = useState<MobileProfileForm>({
        name: '',
        email: '',
        phone: '',
        status: 'active',
        kyc_status: 'pending',
        client_type: 'individual',
        dob: '',
        address_1: '',
        city: '',
        postcode: '',
        country: 'United Kingdom',
        kyc_status_change_reason: '',
    });
    const [mediaModal, setMediaModal] = useState<{
        isOpen: boolean;
        loading: boolean;
        media: Array<Record<string, unknown>>;
        cached?: boolean;
        syncedAt?: string | null;
    }>({ isOpen: false, loading: false, media: [] });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger' | 'warning' | 'success';
        isAlert: boolean;
        shouldRedirect: boolean;
        actionType?: 'delete_user' | 'delete_report';
        targetReportId?: string | number | null;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isAlert: true,
        shouldRedirect: false,
        actionType: 'delete_user',
        targetReportId: null
    });

    const [reportsModal, setReportsModal] = useState<{
        isOpen: boolean;
        loading: boolean;
        generating: boolean;
        deletingId: string | number | null;
        reports: Array<{
            id: string | number;
            remitter_id: string | number;
            session_id: string;
            pdf_path: string;
            status?: string;
            created_by: string;
            created_at: string;
        }>;
    }>({
        isOpen: false,
        loading: false,
        generating: false,
        deletingId: null,
        reports: []
    });

    useEffect(() => {
        if (id) {
            fetchRemitter();
        }
    }, [id]);

    const fetchRemitter = async () => {
        try {
            const res = await fetch(ENDPOINTS.REMITTERS.DETAIL(id));
            if (!res.ok) {
                setNotFound(true);
                return;
            }

            const data = await res.json();
            setFormData({
                ...data,
                kyc_status: data.kyc_status || 'pending',
                kyc_status_change_reason: data.kyc_status_change_reason || '',
            });
            setInitialKycStatus(data.kyc_status || 'pending');
            setSanctionReference(data.sanction_reference ?? '');
            setSanctionCheckedAt(data.sanction_checked_at ?? '');
            setSanctionRawPayload(data.sanction_raw_payload ?? '');
            setSenderDetailsAmlScreeningDoc(data.sender_details_aml_screening_doc ?? '');
            setSanctionScore(Number(data.sanction_score ?? 0));
        } catch (error) {
            console.error('Failed to fetch remitter:', error);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const [syncingVeriff, setSyncingVeriff] = useState(false);

    const handleSyncVeriff = async () => {
        setSyncingVeriff(true);
        try {
            const res = await fetch(ENDPOINTS.REMITTERS.VERIFF_SYNC(id), {
                method: 'POST',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                if (data.remitter) {
                    setFormData({
                        ...data.remitter,
                        kyc_status: data.remitter.kyc_status || 'pending',
                        kyc_status_change_reason: data.remitter.kyc_status_change_reason || '',
                    });
                    setInitialKycStatus(data.remitter.kyc_status || 'pending');
                    setSanctionReference(data.remitter.sanction_reference ?? '');
                    setSanctionCheckedAt(data.remitter.sanction_checked_at ?? '');
                    setSanctionRawPayload(data.remitter.sanction_raw_payload ?? '');
                    setSenderDetailsAmlScreeningDoc(data.remitter.sender_details_aml_screening_doc ?? '');
                    setSanctionScore(Number(data.remitter.sanction_score ?? 0));
                }
                setConfirmModal({
                    isOpen: true,
                    title: 'Sync Success',
                    message: data.message || 'Veriff verification synced successfully.',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: false,
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Sync Failed',
                    message: data.message || 'Failed to sync Veriff decision.',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false,
                });
            }
        } catch (error) {
            console.error('Failed to sync Veriff:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Sync Error',
                message: 'An error occurred while syncing with Veriff.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
            });
        } finally {
            setSyncingVeriff(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(ENDPOINTS.REMITTERS.DETAIL(id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Remitter updated successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to update remitter',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
            }
        } catch (error) {
            console.error('Failed to submit:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Error updating remitter',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        } finally {
            setSubmitting(false);
        }
    };

    const value = (input: unknown) => {
        const text = input === null || input === undefined ? '' : String(input);
        return text.trim() || '-';
    };

    const mediaLabel = (item: Record<string, unknown>, index: number) => value(
        item.name ||
        item.context ||
        item.type ||
        item.mimeType ||
        item.mimetype ||
        `Media ${index + 1}`
    );

    const mediaId = (item: Record<string, unknown>) => value(item.id || item.mediaId || item.media_id);

    const mediaDownloadUrl = (item: Record<string, unknown>) => {
        const itemId = mediaId(item);
        return itemId === '-' ? '' : ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_MEDIA_DOWNLOAD(id, itemId);
    };

    const openMediaModal = async () => {
        setMediaModal({ isOpen: true, loading: true, media: [] });
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_MEDIA(id));
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMediaModal((prev) => ({ ...prev, loading: false }));
                setConfirmModal({
                    isOpen: true,
                    title: 'Media Unavailable',
                    message: data?.message || 'Could not load Veriff media for this profile.',
                    type: 'warning',
                    isAlert: true,
                    shouldRedirect: false,
                });
                return;
            }
            setMediaModal({
                isOpen: true,
                loading: false,
                media: Array.isArray(data.media) ? data.media : [],
                cached: Boolean(data.cached),
                syncedAt: data.synced_at || null,
            });
        } catch {
            setMediaModal((prev) => ({ ...prev, loading: false }));
            setConfirmModal({
                isOpen: true,
                title: 'Media Unavailable',
                message: 'Could not load Veriff media for this profile.',
                type: 'warning',
                isAlert: true,
                shouldRedirect: false,
            });
        }
    };

    const fetchReports = async () => {
        setReportsModal((prev) => ({ ...prev, loading: true }));
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_REPORTS_LIST(id));
            const data = await res.json().catch(() => []);
            if (res.ok && Array.isArray(data)) {
                setReportsModal((prev) => ({ ...prev, loading: false, reports: data }));
            } else {
                setReportsModal((prev) => ({ ...prev, loading: false }));
                setConfirmModal({
                    isOpen: true,
                    title: 'Fetch Failed',
                    message: data?.message || 'Failed to fetch Veriff reports.',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false,
                });
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
            setReportsModal((prev) => ({ ...prev, loading: false }));
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while fetching reports.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
            });
        }
    };

    const openReportsModal = () => {
        setReportsModal({
            isOpen: true,
            loading: true,
            generating: false,
            deletingId: null,
            reports: [],
        });
        fetchReports();
    };

    const handleGenerateReport = async () => {
        setReportsModal((prev) => ({ ...prev, generating: true }));
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_REPORT_GENERATE(id), {
                method: 'POST',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                // Refresh reports list
                const listRes = await fetch(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_REPORTS_LIST(id));
                const listData = await listRes.json().catch(() => []);
                setReportsModal((prev) => ({
                    ...prev,
                    generating: false,
                    reports: Array.isArray(listData) ? listData : prev.reports,
                }));
                setConfirmModal({
                    isOpen: true,
                    title: 'Pull Success',
                    message: 'A new Veriff KYC PDF report has been pulled and saved successfully.',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: false,
                });
            } else {
                setReportsModal((prev) => ({ ...prev, generating: false }));
                setConfirmModal({
                    isOpen: true,
                    title: 'Pull Failed',
                    message: data?.message || 'Failed to pull Veriff PDF report.',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false,
                });
            }
        } catch (error) {
            console.error('Failed to pull report:', error);
            setReportsModal((prev) => ({ ...prev, generating: false }));
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while generating the report.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
            });
        }
    };

    const confirmDeleteReport = (reportId: string | number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Veriff Report',
            message: 'Are you sure you want to delete this Veriff report? This action cannot be undone.',
            type: 'danger',
            isAlert: false,
            shouldRedirect: false,
            actionType: 'delete_report',
            targetReportId: reportId
        });
    };



    if (loading) {
        return <div className="w-full p-12 text-center text-slate-500 font-medium animate-pulse">Loading remitter details...</div>;
    }

    if (notFound) {
        return (
            <div className="max-w-3xl mx-auto p-12 text-center space-y-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mobile profile not found</h1>
                <p className="text-slate-500 dark:text-slate-300">This mobile profile link is invalid or the record no longer exists.</p>
                <Link
                    href="/admin/mobile-profiles"
                    className="inline-flex items-center rounded-xl bg-teal-600 px-5 py-3 text-white font-semibold hover:bg-teal-700 transition-colors"
                >
                    Back to Mobile Profiles
                </Link>
            </div>
        );
    }

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/mobile-profiles');
        }
    };

    const handleModalConfirm = async () => {
        if (confirmModal.isAlert) {
            handleModalClose();
            return;
        }

        setDeleteLoading(true);
        try {
            if (confirmModal.actionType === 'delete_report') {
                const reportId = confirmModal.targetReportId;
                if (reportId) {
                    const res = await fetch(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_REPORT_DELETE(id, reportId), {
                        method: 'DELETE',
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                        // Refresh reports list
                        const listRes = await fetch(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_REPORTS_LIST(id));
                        const listData = await listRes.json().catch(() => []);
                        setReportsModal((prev) => ({
                            ...prev,
                            reports: Array.isArray(listData) ? listData : prev.reports.filter((r) => r.id !== reportId),
                        }));
                        setConfirmModal({
                            isOpen: true,
                            title: 'Deleted',
                            message: 'Veriff report has been deleted.',
                            type: 'success',
                            isAlert: true,
                            shouldRedirect: false,
                        });
                    } else {
                        setConfirmModal({
                            isOpen: true,
                            title: 'Delete Failed',
                            message: data?.message || 'Failed to delete Veriff report.',
                            type: 'danger',
                            isAlert: true,
                            shouldRedirect: false,
                        });
                    }
                }
                return;
            }

            const res = await fetch(ENDPOINTS.REMITTERS.DETAIL(id), { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Deleted',
                    message: 'Mobile user deleted successfully.',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true,
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Delete Failed',
                    message: data?.messages?.error || data?.message || 'Failed to delete mobile user.',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false,
                });
            }
        } catch (error) {
            console.error('Failed to perform delete:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Delete Failed',
                message: 'An error occurred while deleting.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
            });
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="w-full max-w-none space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.isAlert ? 'OK' : 'Delete'}
                cancelText="Cancel"
                loading={deleteLoading}
            />

            {mediaModal.isOpen ? (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-4xl rounded-3xl border border-slate-200/70 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Veriff ID and Face Images</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {formData.name || '-'} {mediaModal.cached ? '• showing cached webhook media' : ''}
                                    {mediaModal.syncedAt ? ` • synced ${mediaModal.syncedAt}` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMediaModal({ isOpen: false, loading: false, media: [] })}
                                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {mediaModal.loading ? (
                            <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading Veriff media...</div>
                        ) : mediaModal.media.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                                No ID or face images are available yet. Complete the Veriff flow, then sync or wait for the webhook.
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {mediaModal.media.map((item, index) => {
                                    const downloadUrl = mediaDownloadUrl(item);
                                    return (
                                        <div key={`${mediaId(item)}-${index}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{mediaLabel(item, index)}</div>
                                                    <div className="truncate text-xs text-slate-500">{mediaId(item)}</div>
                                                </div>
                                                {downloadUrl ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')}
                                                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        Open
                                                    </button>
                                                ) : null}
                                            </div>
                                            {downloadUrl ? (
                                                <button type="button" onClick={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')} className="block w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                                    <img src={downloadUrl} alt={mediaLabel(item, index)} className="h-56 w-full object-contain" />
                                                </button>
                                            ) : (
                                                <div className="flex h-56 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">
                                                    Preview unavailable
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            {reportsModal.isOpen ? (
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
                                    Manage, view, pull, or delete PDF verification reports for {formData.name || '-'}.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReportsModal((prev) => ({ ...prev, isOpen: false }))}
                                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Actions & Info bar */}
                        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-teal-50/40 p-4 dark:bg-slate-800/40 border border-teal-100/30 dark:border-slate-700/50">
                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Veriff Key (Session ID): <span className="font-mono text-teal-600 dark:text-teal-400">{formData.veriff_session_id || 'N/A'}</span>
                            </div>
                            <button
                                type="button"
                                disabled={reportsModal.generating || !formData.veriff_session_id}
                                onClick={handleGenerateReport}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-teal-600/10 hover:shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {reportsModal.generating ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Pulling...
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
                        {reportsModal.loading ? (
                            <div className="py-20 text-center">
                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-500" />
                                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Loading reports...</p>
                            </div>
                        ) : reportsModal.reports.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
                                <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No reports pulled yet</h4>
                                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                                    Click "Pull New Reports" above to pull a fresh KYC verification report.
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-[350px] overflow-y-auto pr-1">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-400">
                                            <th className="py-3 px-4">Date Generated</th>
                                            <th className="py-3 px-4">Veriff Key (Session ID)</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4">Generated By</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {reportsModal.reports.map((report) => (
                                            <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="py-4 px-4 text-sm font-bold text-slate-800 dark:text-slate-100">
                                                    {new Date(report.created_at).toLocaleString()}
                                                </td>
                                                <td className="py-4 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                    {report.session_id}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${String(report.status || 'not_started').toLowerCase() === 'approved'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : String(report.status || 'not_started').toLowerCase() === 'rejected' || String(report.status || 'not_started').toLowerCase() === 'declined'
                                                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                                                        }`}>
                                                        {report.status || 'Not Started'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                    {report.created_by || 'system'}
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => window.open(ENDPOINTS.MOBILE_ADMIN.REVIEW_VERIFF_REPORT_DOWNLOAD(id, report.id), '_blank', 'noopener,noreferrer')}
                                                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98]"
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                            Open PDF
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={deleteLoading && confirmModal.targetReportId === report.id}
                                                            onClick={() => confirmDeleteReport(report.id)}
                                                            className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 hover:bg-red-100 p-1.5 text-red-600 transition dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 hover:scale-105"
                                                        >
                                                            {deleteLoading && confirmModal.targetReportId === report.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
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
            ) : null}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link href="/admin/mobile-profiles" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Mobile Profiles
                    </Link>
                    <div className="flex items-center space-x-4">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Edit Mobile Profile
                        </h1>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold">
                            Profile ID: {id}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setConfirmModal({
                        isOpen: true,
                        title: 'Delete Mobile User',
                        message: 'Delete this mobile user and linked profile data? This action cannot be undone.',
                        type: 'danger',
                        isAlert: false,
                        shouldRedirect: false,
                    })}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                    <Trash2 className="h-4 w-4" />
                    Delete User
                </button>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Personal Info */}
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <User className="w-5 h-5 mr-2 text-teal-500" />
                            Personal Details
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Name <span className="text-red-500">*</span></label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <User className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-glass w-full py-3"
                                placeholder="Full name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Email Address</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <Mail className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input-glass w-full py-3"
                                placeholder="Email address"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Phone Number <span className="text-red-500">*</span></label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <Phone className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="input-glass w-full py-3"
                                placeholder="Phone number"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Date of Birth</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <Calendar className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="date"
                                value={formData.dob || ''}
                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                className="input-glass w-full py-3"
                            />
                        </div>
                    </div>

                    {/* Status & KYC */}
                    <div className="md:col-span-2 mt-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <CheckCircle className="w-5 h-5 mr-2 text-teal-500" />
                            Account and Verification
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Status</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <div className="w-5 h-5 flex items-center justify-center pointer-events-none">
                                    <div className={`w-2.5 h-2.5 rounded-full ${formData.status === 'active' ? 'bg-teal-500 ring-4 ring-teal-500/20' : formData.status === 'suspended' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                </div>
                            </span>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="input-glass w-full py-3 pr-10 appearance-none cursor-pointer"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-300 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">KYC Status</label>

                        {initialKycStatus === 'pending' && (
                            <div className="flex items-start space-x-3 bg-teal-50/50 dark:bg-slate-800/40 border border-teal-100/50 dark:border-slate-700/60 p-4 rounded-2xl mb-1">
                                <input
                                    type="checkbox"
                                    id="enableKycOverride"
                                    checked={enableKycOverride}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setEnableKycOverride(checked);
                                        if (!checked) {
                                            setFormData((prev) => ({ ...prev, kyc_status: 'pending' }));
                                        }
                                    }}
                                    className="checkbox-glass mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500 rounded border-slate-300 cursor-pointer"
                                />
                                <label htmlFor="enableKycOverride" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                                    Manually Pass KYC
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 leading-normal">
                                        Check this box to enable manually passing this pending verification profile.
                                    </span>
                                </label>
                            </div>
                        )}

                        {initialKycStatus === 'verified' && (
                            <div className="flex items-start space-x-3 bg-amber-50/50 dark:bg-slate-800/40 border border-amber-100/50 dark:border-slate-700/60 p-4 rounded-2xl mb-1">
                                <input
                                    type="checkbox"
                                    id="enableKycRevert"
                                    checked={enableKycOverride}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setEnableKycOverride(checked);
                                        if (!checked) {
                                            setFormData((prev) => ({ ...prev, kyc_status: 'verified' }));
                                        }
                                    }}
                                    className="checkbox-glass mt-0.5 h-4 w-4 text-amber-600 focus:ring-amber-500 rounded border-slate-300 cursor-pointer"
                                />
                                <label htmlFor="enableKycRevert" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                                    Revert Verified Status
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 leading-normal">
                                        Check this box to enable changing this verified profile back to pending.
                                    </span>
                                </label>
                            </div>
                        )}

                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <AlertTriangle className={`w-5 h-5 ${formData.kyc_status === 'verified' ? 'text-teal-500' : formData.kyc_status === 'rejected' ? 'text-red-500' : 'text-amber-500'}`} />
                            </span>
                            <select
                                value={formData.kyc_status}
                                disabled={(initialKycStatus !== 'pending' && initialKycStatus !== 'verified') || !enableKycOverride}
                                onChange={(e) => setFormData({ ...formData, kyc_status: e.target.value })}
                                className="input-glass w-full py-3 pr-10 appearance-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {initialKycStatus === 'pending' ? (
                                    <>
                                        <option value="pending">Pending</option>
                                        {enableKycOverride && <option value="verified">Manually Passed</option>}
                                    </>
                                ) : initialKycStatus === 'verified' ? (
                                    <>
                                        <option value="verified">Verified</option>
                                        {enableKycOverride && <option value="pending">Pending</option>}
                                    </>
                                ) : (
                                    <>
                                        <option value="pending">Pending</option>
                                        <option value="verified">Verified</option>
                                        <option value="rejected">Rejected</option>
                                    </>
                                )}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-300 pointer-events-none" />
                        </div>

                        {formData.kyc_status !== initialKycStatus && (
                            <div className="mt-3 space-y-2 animate-fade-in">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
                                    Reason for KYC Status Change <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.kyc_status_change_reason || ''}
                                    required
                                    onChange={(e) => setFormData({ ...formData, kyc_status_change_reason: e.target.value })}
                                    className="input-glass w-full py-3 px-4 rounded-2xl"
                                    placeholder="Please provide the reason for manually updating the KYC status of this user."
                                    rows={3}
                                />
                            </div>
                        )}

                        {formData.kyc_status === initialKycStatus && formData.kyc_status_change_reason && (
                            <div className="mt-3 space-y-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                                    Last KYC Status Change Reason
                                </label>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                                    {formData.kyc_status_change_reason}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2 mt-2">
                        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 dark:border-slate-700/60 dark:bg-slate-900/50">
                            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <h3 className="flex items-center text-lg font-bold text-slate-900 dark:text-white">
                                        <ShieldCheck className="mr-2 h-5 w-5 text-teal-500" />
                                        Veriff Identity Data
                                    </h3>
                                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                        Decision details are stored from Veriff webhook/sync and attached to this profile.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={syncingVeriff}
                                        onClick={handleSyncVeriff}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {syncingVeriff ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCcw className="h-3.5 w-3.5" />
                                        )}
                                        Sync Veriff KYC
                                    </button>

                                    {canPdf && (
                                        <button
                                            type="button"
                                            onClick={openReportsModal}
                                            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            Veriff Reports
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={openMediaModal}
                                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                                    >
                                        <Image className="h-3.5 w-3.5" />
                                        View ID / Face Images
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                {[
                                    ['Veriff status', formData.veriff_status],
                                    ['Decision', formData.veriff_decision],
                                    ['KYC status', formData.kyc_status],
                                    ['Person name', formData.veriff_person_name],
                                    ['Document type', formData.veriff_document_type],
                                    ['Document country', formData.veriff_document_country],
                                    ['Document number', formData.veriff_document_number],
                                    ['PEP/Sanctions match', formData.veriff_pep_sanction_match],
                                    ['Decision time', formData.veriff_decision_time],
                                    ['Checked at', formData.veriff_checked_at],
                                    ['Media synced at', formData.veriff_media_synced_at],
                                    ['Session ID', formData.veriff_session_id],
                                ].map(([label, data]) => (
                                    <div key={label} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-800/40">
                                        <div className="text-[11px] font-extrabold text-slate-400">{label}</div>
                                        <div className="mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-100">{value(data)}</div>
                                    </div>
                                ))}
                            </div>

                            {formData.veriff_reason ? (
                                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                                    Reason: {formData.veriff_reason}
                                </div>
                            ) : null}

                            {formData.veriff_raw_payload && (
                                <div className="mt-4 border border-slate-100 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/10">
                                    <button
                                        type="button"
                                        onClick={() => setShowVeriffRawPayload(!showVeriffRawPayload)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
                                    >
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Raw Veriff Webhook/Sync Payload</span>
                                        <div className="flex items-center space-x-1.5 text-slate-400">
                                            <span className="text-xs font-medium">{showVeriffRawPayload ? 'Collapse' : 'Expand'}</span>
                                            {showVeriffRawPayload ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </div>
                                    </button>
                                    {showVeriffRawPayload && (
                                        <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-950">
                                            <pre className="text-xs font-mono text-emerald-400 overflow-x-auto max-h-80 p-2 leading-relaxed whitespace-pre-wrap select-all">
                                                {(() => {
                                                    try {
                                                        const parsed = typeof formData.veriff_raw_payload === 'string' ? JSON.parse(formData.veriff_raw_payload) : formData.veriff_raw_payload;
                                                        return JSON.stringify(parsed, null, 2);
                                                    } catch (e) {
                                                        return String(formData.veriff_raw_payload);
                                                    }
                                                })()}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Address Info */}
                    <div className="md:col-span-2 mt-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <MapPin className="w-5 h-5 mr-2 text-teal-500" />
                            Address Details
                        </h3>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address Line</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <MapPin className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="text"
                                value={formData.address_1 || ''}
                                onChange={(e) => setFormData({ ...formData, address_1: e.target.value })}
                                className="input-glass w-full py-3"
                                placeholder="Address"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">City</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <Building className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="text"
                                value={formData.city || ''}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="input-glass w-full py-3"
                                placeholder="London"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Postcode</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <MapPin className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="text"
                                value={formData.postcode || ''}
                                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                                className="input-glass w-full py-3"
                                placeholder="Postcode"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Country</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <Flag className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                            </span>
                            <input
                                type="text"
                                value={formData.country || ''}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                className="input-glass w-full py-3"
                                placeholder="United Kingdom"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-6 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/mobile-profiles"
                        className="px-6 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors border border-slate-200 dark:border-slate-600"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="ml-2">Updating...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span className="ml-2">Save</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* AML Screening History (Dilisense) */}
            {sanctionReference && (
                <div className="card-glass p-8 relative overflow-hidden mt-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dilisense AML Screening History</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Watchlist and PEP checks</p>
                            </div>
                        </div>
                        {canPdf && senderDetailsAmlScreeningDoc && (
                            <a
                                href={resolveUploadsUrl(senderDetailsAmlScreeningDoc)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-semibold text-xs transition-all border border-teal-500/20 shadow-sm shadow-teal-500/5 hover:shadow-teal-500/10"
                            >
                                <FileText className="w-4 h-4" />
                                <span>Download PDF Report</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                            <span className="text-xs font-semibold text-slate-400 block mb-1">Screening Reference</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{sanctionReference}</span>
                        </div>
                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                            <span className="text-xs font-semibold text-slate-400 block mb-1">Checked At</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {sanctionCheckedAt ? new Date(sanctionCheckedAt).toLocaleString() : '-'}
                            </span>
                        </div>
                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                            <span className="text-xs font-semibold text-slate-400 block mb-1">Total Hits</span>
                            <div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${sanctionScore > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                    {sanctionScore} {sanctionScore > 0 ? 'HITS DETECTED' : 'CLEAR'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {sanctionRawPayload && (
                        <div className="border border-slate-100 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/10">
                            <button
                                type="button"
                                onClick={() => setShowRawPayload(!showRawPayload)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
                            >
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Raw Dilisense Response Payload</span>
                                <div className="flex items-center space-x-1.5 text-slate-400">
                                    <span className="text-xs font-medium">{showRawPayload ? 'Collapse' : 'Expand'}</span>
                                    {showRawPayload ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </button>
                            {showRawPayload && (
                                <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-950">
                                    <pre className="text-xs font-mono text-emerald-400 overflow-x-auto max-h-80 p-2 leading-relaxed whitespace-pre-wrap select-all">
                                        {(() => {
                                            try {
                                                const parsed = typeof sanctionRawPayload === 'string' ? JSON.parse(sanctionRawPayload) : sanctionRawPayload;
                                                return JSON.stringify(parsed, null, 2);
                                            } catch (e) {
                                                return String(sanctionRawPayload);
                                            }
                                        })()}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
