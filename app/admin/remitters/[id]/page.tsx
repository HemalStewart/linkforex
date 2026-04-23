'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import {
    getAdminBranchCode,
    getCurrentAdminUser,
    isPrivilegedAdminUser,
    withActingUserParam,
} from '@/app/lib/adminUserScope';
import ConfirmModal from '../../components/ConfirmModal';
import {
    ArrowLeft,
    Save,
    Trash2,
    Building,
    Tag,
    User,
    Calendar,
    Phone,
    MapPin,
    Globe,
    Briefcase,
    CreditCard,
    Shield,
    Layers,
    FileText,
    RefreshCcw,
    ExternalLink
} from 'lucide-react';

const idTypesRequiringIssuedDate = new Set(['passport', 'driving license', 'residence permit']);

const idTypeNeedsIssuedDate = (idType: string): boolean => idTypesRequiringIssuedDate.has(idType.trim().toLowerCase());

const isUkCountry = (country: string): boolean => {
    const normalized = country.trim().toLowerCase();
    return ['uk', 'gb', 'great britain', 'united kingdom', 'england', 'scotland', 'wales', 'northern ireland'].includes(normalized);
};

const isValidUkPassportNumber = (value: string): boolean => /^\d{9}$/.test(value.trim());

export default function EditRemitterPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const currentUser = React.useMemo(() => getCurrentAdminUser(), []);
    const isPrivilegedUser = React.useMemo(() => isPrivilegedAdminUser(currentUser), [currentUser]);
    const scopedBranchCode = React.useMemo(() => getAdminBranchCode(currentUser), [currentUser]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<any>({
        company: '',
        company_name: '',
        company_type: '',
        company_reg_no: '',
        branch: '',
        sender_id: '',
        sender_name: '',
        status: 'active',
        dob: '',
        place_of_birth: '',
        phone: '',
        postcode: '',
        address_1: '',
        address_2: '',
        city: '',
        county: '',
        country: '',
        occupation: '',
        id_verified: 'no',
        proof_of_funds: 'no',
        id_type: '',
        id_number: '',
        id_issued_date: '',
        id_expiry: '',
        other_info: '',
        use_in: 'All',
        id_copy: '',
        other_doc: '',
        work_related_docs: '',
        sender_details_aml_screening_doc: '',
        sender_aml_result: '',
        rescreening_sender: '',
        veriff_status: '',
        veriff_decision: '',
        veriff_reason: '',
        veriff_checked_at: '',
        veriff_url: '',
        verification_state: 'not_started',
        id_expired: false,
        branch_veriff_enabled: false,
        created_by: '',
        created_at: '',
        updated_by: '',
        updated_at: ''
    });
    const [veriffLoading, setVeriffLoading] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false
    });

    useEffect(() => {
        if (id) fetchRemitter();
    }, [id]);

    const fetchRemitter = async () => {
        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(id), currentUser));
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    company: data.company || data.company_name || '',
                    company_name: data.company_name || '',
                    company_type: data.company_type || '',
                    company_reg_no: data.company_reg_no || '',
                    branch: data.branch || '',
                    sender_id: data.sender_id || '',
                    sender_name: data.sender_name || data.name || '',
                    status: data.status || 'active',
                    dob: data.dob || '',
                    place_of_birth: data.place_of_birth || '',
                    phone: data.phone || '',
                    postcode: data.postcode || '',
                    address_1: data.address_1 || '',
                    address_2: data.address_2 || '',
                    city: data.city || '',
                    county: data.county || '',
                    country: data.country || '',
                    occupation: data.occupation || '',
                    id_verified: data.id_verified || 'no',
                    proof_of_funds: data.proof_of_funds || 'no',
                    id_type: data.id_type || '',
                    id_number: data.id_number || '',
                    id_issued_date: data.id_issued_date || '',
                    id_expiry: data.id_expiry || '',
                    other_info: data.other_info || '',
                    use_in: data.use_in || 'All',
                    id_copy: data.id_copy || data.passport_copy || '',
                    other_doc: data.other_doc || '',
                    work_related_docs: data.work_related_docs || '',
                    sender_details_aml_screening_doc: data.sender_details_aml_screening_doc || '',
                    sender_aml_result: data.sender_aml_result || '',
                    rescreening_sender: data.rescreening_sender || '',
                    veriff_status: data.veriff_status || '',
                    veriff_decision: data.veriff_decision || '',
                    veriff_reason: data.veriff_reason || '',
                    veriff_checked_at: data.veriff_checked_at || '',
                    veriff_url: data.veriff_url || '',
                    verification_state: data.verification_state || 'not_started',
                    id_expired: Boolean(data.id_expired),
                    branch_veriff_enabled: Boolean(data.branch_veriff_enabled),
                    created_by: data.created_by || '',
                    created_at: data.created_at || '',
                    updated_by: data.updated_by || '',
                    updated_at: data.updated_at || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch remitter:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.id_type?.trim()) {
            setConfirmModal({ isOpen: true, title: 'Validation Error', message: 'ID Type is required.', type: 'warning', isAlert: true, shouldRedirect: false });
            return;
        }
        if (!formData.id_number?.trim()) {
            setConfirmModal({ isOpen: true, title: 'Validation Error', message: 'ID Number is required.', type: 'warning', isAlert: true, shouldRedirect: false });
            return;
        }
        if (!formData.id_expiry?.trim()) {
            setConfirmModal({ isOpen: true, title: 'Validation Error', message: 'ID Expiry Date is required.', type: 'warning', isAlert: true, shouldRedirect: false });
            return;
        }
        if (idTypeNeedsIssuedDate(formData.id_type) && !formData.id_issued_date?.trim()) {
            setConfirmModal({ isOpen: true, title: 'Validation Error', message: 'ID Issued Date is required for the selected ID type.', type: 'warning', isAlert: true, shouldRedirect: false });
            return;
        }
        if (String(formData.id_type || '').trim().toLowerCase() === 'passport'
            && isUkCountry(String(formData.country || ''))
            && !isValidUkPassportNumber(String(formData.id_number || ''))) {
            setConfirmModal({ isOpen: true, title: 'Validation Error', message: 'UK passport number must be exactly 9 digits.', type: 'warning', isAlert: true, shouldRedirect: false });
            return;
        }

        setSubmitting(true);

        const payload = {
            ...formData,
            branch: isPrivilegedUser ? formData.branch : (scopedBranchCode || formData.branch),
            name: formData.sender_name,
            sender_name: formData.sender_name,
            active: formData.status === 'active' ? 'Active' : 'Inactive'
        };

        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(id), currentUser), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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
            console.error(error);
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

    const handleDelete = async () => {
        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(id), currentUser), { method: 'DELETE' });
            if (res.ok) {
                router.push('/admin/remitters');
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to delete remitter',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to delete remitter',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/remitters');
        }
    };

    const yesNoText = (value: string) => (String(value).toLowerCase() === 'yes' ? 'Yes' : 'No');
    const displayText = (value: string | null | undefined) => (value && String(value).trim() ? value : '-');

    const isActive = formData.status === 'active';
    const yesNoBadge = (value: string) =>
        String(value).toLowerCase() === 'yes'
            ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300'
            : 'bg-slate-500/15 text-slate-600 dark:text-slate-300';

    const verificationLabel = (state?: string) => {
        const normalized = (state || '').toLowerCase();
        if (normalized === 'verified') return 'Already Verified';
        if (normalized === 'pending') return 'Pending';
        if (normalized === 'rejected') return 'Rejected';
        if (normalized === 'expired') return 'Expired ID';
        return 'Not Verified';
    };

    const verificationBadgeClass = (state?: string) => {
        const normalized = (state || '').toLowerCase();
        if (normalized === 'verified') return 'bg-teal-500/15 text-teal-600 dark:text-teal-300';
        if (normalized === 'pending') return 'bg-amber-500/15 text-amber-600 dark:text-amber-300';
        if (normalized === 'rejected') return 'bg-rose-500/15 text-rose-600 dark:text-rose-300';
        if (normalized === 'expired') return 'bg-red-500/15 text-red-600 dark:text-red-300';
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-300';
    };

    const syncVeriff = async (action: 'start' | 'sync') => {
        setVeriffLoading(true);
        try {
            const endpoint = action === 'start'
                ? ENDPOINTS.REMITTERS.VERIFF_START(id)
                : ENDPOINTS.REMITTERS.VERIFF_SYNC(id);
            const response = await fetch(withActingUserParam(endpoint, currentUser), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Verification Error',
                    message: data?.message || 'Unable to run verification action.',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
                return;
            }

            if (data?.session_url && action === 'start') {
                window.open(data.session_url, '_blank', 'noopener,noreferrer');
            }

            await fetchRemitter();
        } catch (error) {
            console.error('Verification request failed', error);
            setConfirmModal({
                isOpen: true,
                title: 'Verification Error',
                message: 'Unable to run verification action.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        } finally {
            setVeriffLoading(false);
        }
    };

    const refreshCompliance = async () => {
        setVeriffLoading(true);
        try {
            await fetchRemitter();
        } catch (error) {
            console.error('Failed to refresh remitter state', error);
        } finally {
            setVeriffLoading(false);
        }
    };

    if (loading) {
        return <div className="max-w-7xl mx-auto p-12 text-center text-slate-500 dark:text-slate-300">Loading remitter details...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalClose}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
            />

            <div className="flex items-center justify-between">
                <div>
                    <Link href="/admin/remitters" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Remitters
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Remitter Details</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2">Field view and edit for sender profile</p>
                </div>
                <button
                    onClick={handleDelete}
                    className="px-5 py-3 rounded-full text-sm font-bold transition-colors flex items-center space-x-2 glass-effect text-slate-600 dark:text-slate-300 hover:text-red-600"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                </button>
            </div>

            <div className="card-glass p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Remitter Overview</p>
                        <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{displayText(formData.sender_name)}</h2>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${isActive ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300' : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Identity</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Sender Id: {displayText(formData.sender_id)}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">DOB: {displayText(formData.dob)}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Place: {displayText(formData.place_of_birth)}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Branch & Use</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{displayText(formData.branch)}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Use In: {displayText(formData.use_in)}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Occupation: {displayText(formData.occupation)}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Compliance</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-sm text-slate-600 dark:text-slate-300">ID Verified</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${yesNoBadge(formData.id_verified)}`}>{yesNoText(formData.id_verified)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-sm text-slate-600 dark:text-slate-300">Proof Of Funds</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${yesNoBadge(formData.proof_of_funds)}`}>{yesNoText(formData.proof_of_funds)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-sm text-slate-600 dark:text-slate-300">Verification</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${verificationBadgeClass(formData.verification_state)}`}>
                                {verificationLabel(formData.verification_state)}
                            </span>
                        </div>
                        {formData.id_expired ? (
                            <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">ID expired: transfer will be blocked until re-verified.</p>
                        ) : null}
                        {formData.veriff_reason ? (
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Reason: {formData.veriff_reason}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => void refreshCompliance()}
                                disabled={veriffLoading}
                                className="px-2.5 py-1.5 rounded-full text-[11px] font-bold glass-effect text-slate-700 dark:text-slate-200 disabled:opacity-40"
                            >
                                <RefreshCcw className={`inline-block w-3 h-3 mr-1 ${veriffLoading ? 'animate-spin' : ''}`} />
                                Refresh Status
                            </button>
                            <button
                                type="button"
                                onClick={() => syncVeriff('start')}
                                disabled={veriffLoading || formData.branch_veriff_enabled === false || (formData.verification_state === 'verified' && !formData.id_expired)}
                                className="px-2.5 py-1.5 rounded-full text-[11px] font-bold glass-effect text-slate-700 dark:text-slate-200 disabled:opacity-40"
                            >
                                {veriffLoading ? 'Working...' : 'Start Verification'}
                            </button>
                            <button
                                type="button"
                                onClick={() => syncVeriff('sync')}
                                disabled={veriffLoading || formData.branch_veriff_enabled === false}
                                className="px-2.5 py-1.5 rounded-full text-[11px] font-bold glass-effect text-slate-700 dark:text-slate-200 disabled:opacity-40"
                            >
                                <RefreshCcw className="inline-block w-3 h-3 mr-1" />
                                Sync Result
                            </button>
                            {formData.veriff_url ? (
                                <button
                                    type="button"
                                    onClick={() => window.open(formData.veriff_url, '_blank', 'noopener,noreferrer')}
                                    className="px-2.5 py-1.5 rounded-full text-[11px] font-bold glass-effect text-slate-700 dark:text-slate-200"
                                >
                                    <ExternalLink className="inline-block w-3 h-3 mr-1" />
                                    Open Link
                                </button>
                            ) : null}
                        </div>
                        {formData.branch_veriff_enabled === false ? (
                            <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">Branch verification is currently disabled by backend flag.</p>
                        ) : null}
                    </div>

                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Audit</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Entered: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.created_by)}</span></p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formData.created_at ? new Date(formData.created_at).toLocaleString() : '-'}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Modified: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.updated_by)}</span></p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formData.updated_at ? new Date(formData.updated_at).toLocaleString() : '-'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Address</p>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{displayText(formData.address_1)}</p>
                        {displayText(formData.address_2) !== '-' && <p className="text-sm text-slate-700 dark:text-slate-200">{displayText(formData.address_2)}</p>}
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {displayText(formData.city)}, {displayText(formData.county)}, {displayText(formData.country)} {displayText(formData.postcode)}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">ID & AML</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">ID Type: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.id_type)}</span></p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">ID No: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.id_number)}</span></p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">ID Issued: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.id_issued_date)}</span></p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">ID Expiry: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.id_expiry)}</span></p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Veriff Decision: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.veriff_decision)}</span></p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Veriff Checked: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.veriff_checked_at)}</span></p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">AML Result: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.sender_aml_result)}</span></p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Building className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Id</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Tag className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.sender_id} onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Name</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><User className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.sender_name} onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Date Of Birth</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Calendar className="w-5 h-5" /></span>
                            <input type="date" className="input-glass w-full" value={formData.dob || ''} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Place of Birth</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Globe className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.place_of_birth} onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Telephone</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Phone className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Postcode</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><MapPin className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.postcode} onChange={(e) => setFormData({ ...formData, postcode: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address 1</label>
                        <input className="input-glass w-full" value={formData.address_1} onChange={(e) => setFormData({ ...formData, address_1: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address 2</label>
                        <input className="input-glass w-full" value={formData.address_2} onChange={(e) => setFormData({ ...formData, address_2: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">City</label>
                        <input className="input-glass w-full" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">County</label>
                        <input className="input-glass w-full" value={formData.county} onChange={(e) => setFormData({ ...formData, county: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Country</label>
                        <input className="input-glass w-full" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Occupation</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Briefcase className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID Type</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><CreditCard className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.id_type} onChange={(e) => setFormData({ ...formData, id_type: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID No</label>
                        <input className="input-glass w-full" value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID Issued Date</label>
                        <input
                            type="date"
                            className="input-glass w-full"
                            value={formData.id_issued_date || ''}
                            required={idTypeNeedsIssuedDate(formData.id_type)}
                            onChange={(e) => setFormData({ ...formData, id_issued_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID Expire Date</label>
                        <input type="date" className="input-glass w-full" value={formData.id_expiry || ''} onChange={(e) => setFormData({ ...formData, id_expiry: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID Verified</label>
                        <select className="input-glass w-full" value={formData.id_verified} onChange={(e) => setFormData({ ...formData, id_verified: e.target.value })}>
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Proof Of Funds</label>
                        <select className="input-glass w-full" value={formData.proof_of_funds} onChange={(e) => setFormData({ ...formData, proof_of_funds: e.target.value })}>
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Use In</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Layers className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.use_in} onChange={(e) => setFormData({ ...formData, use_in: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender AML Result</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Shield className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.sender_aml_result} onChange={(e) => setFormData({ ...formData, sender_aml_result: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Re/screening Sender</label>
                        <input className="input-glass w-full" value={formData.rescreening_sender} onChange={(e) => setFormData({ ...formData, rescreening_sender: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Other Info</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><FileText className="w-5 h-5" /></span>
                            <textarea rows={3} className="input-glass w-full resize-none" value={formData.other_info} onChange={(e) => setFormData({ ...formData, other_info: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-6 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/remitters"
                        className="px-6 py-3 rounded-full glass-effect text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        <Save className="w-4 h-4" />
                        <span>{submitting ? 'Updating...' : 'Save'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
