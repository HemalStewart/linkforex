'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../../components/ConfirmModal';
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Flag, Save, Loader2, CheckCircle, AlertTriangle, Building, ChevronDown, Trash2, ShieldCheck, IdCard, Image, Download, FileText, RefreshCcw, X } from 'lucide-react';

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
};

export default function EditRemitterPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
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
    });
    const [mediaModal, setMediaModal] = useState<{
        isOpen: boolean;
        loading: boolean;
        media: Array<Record<string, unknown>>;
        cached?: boolean;
        syncedAt?: string | null;
    }>({ isOpen: false, loading: false, media: [] });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false
    });

    useEffect(() => {
        if (id) {
            fetchRemitter();
        }
    }, [id]);

    const fetchRemitter = async () => {
        try {
            const res = await fetch(ENDPOINTS.REMITTERS.DETAIL(id));
            if (res.ok) {
                const data = await res.json();
                setFormData(data);
            }
        } catch (error) {
            console.error('Failed to fetch remitter:', error);
        } finally {
            setLoading(false);
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

    const openVerificationReport = () => {
        const rows = [
            ['Profile ID', id],
            ['Name', formData.name],
            ['Email', formData.email],
            ['Phone', formData.phone],
            ['KYC Status', formData.kyc_status],
            ['Account Status', formData.status],
            ['Mobile Verified At', formData.mobile_verified_at],
            ['Veriff Session ID', formData.veriff_session_id],
            ['Veriff Attempt ID', formData.veriff_attempt_id],
            ['Veriff Status', formData.veriff_status],
            ['Veriff Decision', formData.veriff_decision],
            ['Veriff Code', formData.veriff_code],
            ['Veriff Reason Code', formData.veriff_reason_code],
            ['Veriff Reason', formData.veriff_reason],
            ['Veriff Checked At', formData.veriff_checked_at],
            ['Veriff Decision Time', formData.veriff_decision_time],
            ['Verified Person Name', formData.veriff_person_name],
            ['Document Type', formData.veriff_document_type],
            ['Document Country', formData.veriff_document_country],
            ['Document Number', formData.veriff_document_number],
            ['PEP/Sanctions Match', formData.veriff_pep_sanction_match],
            ['Media Synced At', formData.veriff_media_synced_at],
        ];

        const reportWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
        if (!reportWindow) {
            setConfirmModal({
                isOpen: true,
                title: 'Report Blocked',
                message: 'Please allow pop-ups to open the verification report.',
                type: 'warning',
                isAlert: true,
                shouldRedirect: false,
            });
            return;
        }

        const escapeHtml = (text: unknown) => String(value(text)).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
        reportWindow.document.open();
        reportWindow.document.write(`<!doctype html>
<html>
<head>
  <title>LinkForex Veriff Report - ${escapeHtml(formData.name)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 36px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 24px; }
    p { margin: 4px 0; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { text-align: left; vertical-align: top; padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; }
    th { width: 260px; background: #f9fafb; font-weight: 700; }
    .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; text-transform: uppercase; }
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
    <span class="badge">${escapeHtml(formData.kyc_status)}</span>
  </header>
  <table>
    ${rows.map(([label, data]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(data)}</td></tr>`).join('')}
  </table>
  <div class="actions"><button onclick="window.print()">Save / Print PDF</button></div>
</body>
</html>`);
        reportWindow.document.close();
    };

    if (loading) {
        return <div className="w-full p-12 text-center text-slate-500 font-medium animate-pulse">Loading remitter details...</div>;
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
            console.error('Failed to delete remitter:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Delete Failed',
                message: 'An error occurred while deleting the mobile user.',
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

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">KYC Status</label>
                        <div className="relative input-icon group">
                            <span className="input-icon-left">
                                <AlertTriangle className={`w-5 h-5 ${formData.kyc_status === 'verified' ? 'text-teal-500' : formData.kyc_status === 'rejected' ? 'text-red-500' : 'text-amber-500'}`} />
                            </span>
                            <select
                                value={formData.kyc_status}
                                onChange={(e) => setFormData({ ...formData, kyc_status: e.target.value })}
                                className="input-glass w-full py-3 pr-10 appearance-none cursor-pointer"
                            >
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-300 pointer-events-none" />
                        </div>
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
                                        onClick={fetchRemitter}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        <RefreshCcw className="h-3.5 w-3.5" />
                                        Refresh
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openVerificationReport}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        Report
                                    </button>
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
                                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{label}</div>
                                        <div className="mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-100">{value(data)}</div>
                                    </div>
                                ))}
                            </div>

                            {formData.veriff_reason ? (
                                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                                    Reason: {formData.veriff_reason}
                                </div>
                            ) : null}
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
        </div>
    );
}
