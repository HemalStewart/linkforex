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
import { openPdfReport } from '@/app/lib/openPdfReport';
import ConfirmModal from '../../components/ConfirmModal';
import { showToast, queueToast } from '@/app/lib/toast';
import { usePagePermissions, checkPermission } from '@/app/lib/permissions';
import VeriffReportsModal from '../../components/VeriffReportsModal';
import { formatDateTime } from '@/app/lib/dateUtils';
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
    ExternalLink,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    ShieldCheck,
    X,
    Loader2,
    Download,
    CheckCircle,
    Eye,
    Upload
} from 'lucide-react';
import { resolveUploadsUrl } from '@/app/lib/uploads';

const idTypesRequiringIssuedDate = new Set(['passport', 'driving license', 'residence permit']);

const idTypeNeedsIssuedDate = (idType: string): boolean => idTypesRequiringIssuedDate.has(idType.trim().toLowerCase());

const isUkCountry = (country: string): boolean => {
    const normalized = country.trim().toLowerCase();
    return ['uk', 'gb', 'great britain', 'united kingdom', 'england', 'scotland', 'wales', 'northern ireland'].includes(normalized);
};

const isValidUkPassportNumber = (value: string): boolean => /^\d{9}$/.test(value.trim());

const normalizeAmlResult = (val: string | null | undefined): string => {
    const s = String(val || '').trim().toLowerCase();
    if (s === 'pass' || s === 'passed' || s === 'clear') return 'passed';
    if (s === 'fail' || s === 'hit') return 'hit';
    if (s === 'review') return 'review';
    if (s === 'pending') return 'pending';
    return 'pending';
};

export default function EditRemitterPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const currentUser = React.useMemo(() => getCurrentAdminUser(), []);
    const isPrivilegedUser = React.useMemo(() => isPrivilegedAdminUser(currentUser), [currentUser]);
    const scopedBranchCode = React.useMemo(() => getAdminBranchCode(currentUser), [currentUser]);
    const { canManuallyPassed, canPdf, canReScreening, canDeleteComplianceReport } = usePagePermissions('REMITTERS');
    const { canMultiBranch } = usePagePermissions('BRANCHES');

    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [initialAmlStatus, setInitialAmlStatus] = useState<string>('pending');
    const [enableAmlOverride, setEnableAmlOverride] = useState<boolean>(false);
    const [branches, setBranches] = useState<any[]>([]);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await fetch(ENDPOINTS.BRANCHES.LIST);
                if (res.ok) {
                    const data = await res.json();
                    setBranches(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                console.error("Failed to fetch branches", e);
            }
        };
        fetchBranches();
    }, []);

    useEffect(() => {
        if (!isPrivilegedUser && !canMultiBranch && scopedBranchCode) {
            setFormData((prev: any) => ({ ...prev, branch: scopedBranchCode }));
        }
    }, [isPrivilegedUser, canMultiBranch, scopedBranchCode]);

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
        proof_of_address_doc: '',
        other_doc: '',
        work_related_docs: '',
        sender_details_aml_screening_doc: '',
        sender_aml_result: '',
        aml_status_change_reason: '',
        rescreening_sender: '',
        veriff_status: '',
        veriff_decision: '',
        veriff_reason: '',
        veriff_checked_at: '',
        veriff_url: '',
        veriff_pep_sanction_match: '',
        registration_source: '',
        verification_state: 'not_started',
        id_expired: false,
        branch_veriff_enabled: false,
        created_by: '',
        created_at: '',
        updated_by: '',
        updated_at: ''
    });
    const [veriffLoading, setVeriffLoading] = useState(false);
    const [showVeriffModal, setShowVeriffModal] = useState(false);
    const [countries, setCountries] = useState<any[]>([]);
    const [occupations, setOccupations] = useState<any[]>([]);

    // Dilisense AML screening states
    const [sanctionReference, setSanctionReference] = useState<string>('');
    const [sanctionCheckedAt, setSanctionCheckedAt] = useState<string>('');
    const [sanctionRawPayload, setSanctionRawPayload] = useState<string>('');
    const [senderDetailsAmlScreeningDoc, setSenderDetailsAmlScreeningDoc] = useState<string>('');
    const [sanctionScore, setSanctionScore] = useState<number>(0);
    const [showRawPayload, setShowRawPayload] = useState<boolean>(false);

    const [deleteLoading, setDeleteLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger' | 'warning' | 'success';
        isAlert: boolean;
        shouldRedirect: boolean;
        actionType?: 'delete_report';
        targetReportId?: string | number | null;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isAlert: true,
        shouldRedirect: false,
        actionType: 'delete_report',
        targetReportId: null
    });

    const [reportsModal, setReportsModal] = useState<{
        isOpen: boolean;
        loading: boolean;
        generating: boolean;
        reports: Array<{
            id: string | number;
            remitter_id: string | number;
            reference: string;
            pdf_path: string;
            created_by: string;
            created_at: string;
        }>;
    }>({
        isOpen: false,
        loading: false,
        generating: false,
        reports: []
    });

    const [showRescreenConfirm, setShowRescreenConfirm] = useState(false);
    const [rescreenParams, setRescreenParams] = useState({
        isOpen: false,
        name: '',
        dob: '',
        fuzzySearch: '',
        defaultFuzzy: '',
        hasFuzzyPermission: false,
        isSubmitting: false,
    });

    const fetchDefaultFuzzySearch = async () => {
        try {
            const res = await fetch(ENDPOINTS.DILISENSE_SOURCES.GET_FUZZY);
            if (res.ok) {
                const data = await res.json();
                return data.dilisense_fuzzy_search !== null && data.dilisense_fuzzy_search !== undefined
                    ? String(data.dilisense_fuzzy_search)
                    : '';
            }
        } catch (error) {
            console.error('Failed to fetch fuzzy setting:', error);
        }
        return '';
    };

    useEffect(() => {
        if (id) fetchRemitter();
    }, [id]);

    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const res = await fetch(ENDPOINTS.COUNTRIES.LIST);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        const filtered = data.filter((c: any) => 
                            String(c.black_list_country || '').toLowerCase() !== 'yes' &&
                            String(c.status || '').toLowerCase() !== 'inactive'
                        );
                        setCountries(filtered);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch countries", e);
            }
        };
        const fetchOccupations = async () => {
            try {
                const res = await fetch(`${ENDPOINTS.OCCUPATIONS.LIST}?active=yes`);
                if (res.ok) {
                    const data = await res.json();
                    setOccupations(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                console.error("Failed to fetch occupations", e);
            }
        };
        fetchCountries();
        fetchOccupations();
    }, []);

    const fetchRemitter = async () => {
        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(id), currentUser));
            if (!res.ok) {
                setNotFound(true);
                return;
            }

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
                proof_of_address_doc: data.proof_of_address_doc || '',
                other_doc: data.other_doc || '',
                work_related_docs: data.work_related_docs || '',
                sender_details_aml_screening_doc: data.sender_details_aml_screening_doc || '',
                sender_aml_result: normalizeAmlResult(data.sender_aml_result),
                aml_status_change_reason: data.aml_status_change_reason || '',
                rescreening_sender: data.rescreening_sender || '',
                veriff_status: data.veriff_status || '',
                veriff_decision: data.veriff_decision || '',
                veriff_reason: data.veriff_reason || '',
                veriff_checked_at: data.veriff_checked_at || '',
                veriff_url: data.veriff_url || '',
                veriff_pep_sanction_match: data.veriff_pep_sanction_match || '',
                registration_source: data.registration_source || '',
                verification_state: data.verification_state || 'not_started',
                id_expired: Boolean(data.id_expired),
                branch_veriff_enabled: Boolean(data.branch_veriff_enabled),
                created_by: data.created_by || '',
                created_at: data.created_at || '',
                updated_by: data.updated_by || '',
                updated_at: data.updated_at || ''
            });
            setInitialAmlStatus(normalizeAmlResult(data.sender_aml_result));
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
        if (formData.sender_aml_result !== initialAmlStatus && !formData.aml_status_change_reason?.trim()) {
            setConfirmModal({ isOpen: true, title: 'Validation Error', message: 'Reason for AML Status Change is required.', type: 'warning', isAlert: true, shouldRedirect: false });
            return;
        }
 
        setSubmitting(true);

        const payload = new FormData();
        const basePayload = {
            ...formData,
            branch: isPrivilegedUser ? formData.branch : (scopedBranchCode || formData.branch),
            name: formData.sender_name,
            sender_name: formData.sender_name,
            active: formData.status === 'active' ? 'Active' : 'Inactive'
        };

        Object.entries(basePayload).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                payload.append(key, String(value));
            }
        });

        const formElement = e.currentTarget as HTMLFormElement;
        const submitFormData = new FormData(formElement);
        const uploadFields = ['passport_copy', 'proof_of_address_doc', 'work_related_docs', 'sender_details_aml_screening_doc', 'other_doc', 'id_copy'];
        uploadFields.forEach((field) => {
            const file = submitFormData.get(field);
            if (file instanceof File && file.size > 0) {
                payload.append(field, file);
            }
        });

        try {
            const res = await fetch(withActingUserParam(`${ENDPOINTS.REMITTERS.DETAIL(id)}/update`, currentUser), {
                method: 'POST',
                body: payload,
            });

            if (res.ok) {
                queueToast('Success', 'Remitter updated successfully', 'success');
                router.push('/admin/remitters');
            } else {
                showToast('Error', 'Failed to update remitter', 'danger');
            }
        } catch (error) {
            console.error(error);
            showToast('Error', 'Error updating remitter', 'danger');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(id), currentUser), { method: 'DELETE' });
            if (res.ok) {
                queueToast('Success', 'Remitter deleted successfully', 'success');
                router.push('/admin/remitters');
            } else {
                showToast('Error', 'Failed to delete remitter', 'danger');
            }
        } catch (error) {
            console.error(error);
            showToast('Error', 'Failed to delete remitter', 'danger');
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/remitters');
        }
    };

    const fetchReports = async () => {
        setReportsModal((prev) => ({ ...prev, loading: true }));
        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORTS_LIST(id), currentUser));
            const data = await res.json().catch(() => []);
            if (res.ok && Array.isArray(data)) {
                setReportsModal((prev) => ({ ...prev, loading: false, reports: data }));
            } else {
                setReportsModal((prev) => ({ ...prev, loading: false }));
                setConfirmModal({
                    isOpen: true,
                    title: 'Fetch Failed',
                    message: data?.message || 'Failed to fetch Dilisense reports.',
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
            reports: [],
        });
        fetchReports();
    };

    const handleStartRescreenFlow = () => {
        setShowRescreenConfirm(true);
    };

    const handleGenerateReport = async () => {
        setReportsModal((prev) => ({ ...prev, generating: true }));
        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORT_GENERATE(id), currentUser), {
                method: 'POST',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                // Refresh reports list
                const listRes = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORTS_LIST(id), currentUser));
                const listData = await listRes.json().catch(() => []);
                setReportsModal((prev) => ({
                    ...prev,
                    generating: false,
                    reports: Array.isArray(listData) ? listData : prev.reports,
                }));
                // Reload main details to sync status
                const remitterRes = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(id), currentUser));
                if (remitterRes.ok) {
                    const rData = await remitterRes.json();
                    setFormData((prev: any) => ({
                        ...prev,
                        status: rData.status ?? 'active',
                        sender_details_aml_screening_doc: rData.sender_details_aml_screening_doc ?? '',
                    }));
                    setSanctionReference(rData.sanction_reference ?? '');
                    setSanctionCheckedAt(rData.sanction_checked_at ?? '');
                    setSanctionRawPayload(rData.sanction_raw_payload ?? '');
                    setSenderDetailsAmlScreeningDoc(rData.sender_details_aml_screening_doc ?? '');
                    setSanctionScore(Number(rData.sanction_score ?? 0));
                }
                setConfirmModal({
                    isOpen: true,
                    title: 'Check Success',
                    message: 'A new Dilisense AML check has been run and PDF report saved successfully.',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: false,
                });
            } else {
                setReportsModal((prev) => ({ ...prev, generating: false }));
                setConfirmModal({
                    isOpen: true,
                    title: 'Check Failed',
                    message: data?.message || 'Failed to run Dilisense check.',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false,
                });
            }
        } catch (error) {
            console.error('Failed to run check:', error);
            setReportsModal((prev) => ({ ...prev, generating: false }));
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while running the check.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
            });
        }
    };

    const confirmDeleteReport = (reportId: string | number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Dilisense Report',
            message: 'Are you sure you want to delete this Dilisense report? This action cannot be undone.',
            type: 'danger',
            isAlert: false,
            shouldRedirect: false,
            actionType: 'delete_report',
            targetReportId: reportId,
        });
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
                    const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORT_DELETE(id, reportId), currentUser), {
                        method: 'DELETE',
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                        // Refresh reports list
                        const listRes = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORTS_LIST(id), currentUser));
                        const listData = await listRes.json().catch(() => []);
                        setReportsModal((prev) => ({
                            ...prev,
                            reports: Array.isArray(listData) ? listData : prev.reports.filter((r) => r.id !== reportId),
                        }));
                        setConfirmModal({
                            isOpen: true,
                            title: 'Deleted',
                            message: 'Dilisense report has been deleted.',
                            type: 'success',
                            isAlert: true,
                            shouldRedirect: false,
                        });
                    } else {
                        setConfirmModal({
                            isOpen: true,
                            title: 'Delete Failed',
                            message: data?.message || 'Failed to delete Dilisense report.',
                            type: 'danger',
                            isAlert: true,
                            shouldRedirect: false,
                        });
                    }
                }
                return;
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

    if (notFound) {
        return (
            <div className="max-w-3xl mx-auto p-12 text-center space-y-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Remitter not found</h1>
                <p className="text-slate-500 dark:text-slate-300">This remitter link is invalid or the record no longer exists.</p>
                <Link
                    href="/admin/remitters"
                    className="inline-flex items-center rounded-xl bg-teal-600 px-5 py-3 text-white font-semibold hover:bg-teal-700 transition-colors"
                >
                    Back to Remitters
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
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

            {reportsModal.isOpen && (
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
                                    Dilisense AML Reports
                                </h2>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Manage, view, run checks, or delete Dilisense AML reports for {formData.sender_name || '-'}.
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
                                Remitter Name: <span className="font-bold text-teal-600 dark:text-teal-400">{formData.sender_name || 'N/A'}</span>
                            </div>
                            {canReScreening && (
                                <button
                                    type="button"
                                    disabled={reportsModal.generating || !formData.sender_name}
                                    onClick={handleStartRescreenFlow}
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-teal-600/10 hover:shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {reportsModal.generating ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Checking Dilisense...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCcw className="h-3.5 w-3.5" />
                                            Run New Dilisense Check
                                        </>
                                    )}
                                </button>
                            )}
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
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Dilisense reports run yet</h4>
                                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                                    Click "Run New Dilisense Check" above to query Dilisense name screening.
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-[350px] overflow-y-auto pr-1">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-400">
                                            <th className="py-3 px-4">Date Checked</th>
                                            <th className="py-3 px-4">Reference</th>
                                            <th className="py-3 px-4">Checked By</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {reportsModal.reports.map((report) => (
                                            <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="py-4 px-4 text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                                    {formatDateTime(report.created_at)}
                                                </td>
                                                <td className="py-4 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                    {report.reference}
                                                </td>
                                                <td className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                    {report.created_by || 'system'}
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                void openPdfReport(
                                                                    withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORT_DOWNLOAD(id, report.id), currentUser),
                                                                    currentUser
                                                                );
                                                            }}
                                                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98]"
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                            Open PDF
                                                        </button>
                                                        {canDeleteComplianceReport && (
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
                </div>
            )}

            {showRescreenConfirm && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-700/50 dark:bg-slate-900/95 backdrop-blur-lg transform scale-100 transition-all duration-300">
                        <div className="mb-4 text-center">
                            <ShieldCheck className="mx-auto h-12 w-12 text-teal-500 mb-3" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Rescreening</h3>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                Are you sure you want to rescreen the remitter?
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowRescreenConfirm(false)}
                                className="w-1/2 rounded-full border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setShowRescreenConfirm(false);
                                    const defaultFuzzy = await fetchDefaultFuzzySearch();
                                    const fuzzyPerm = checkPermission('DILISENSE_SOURCES', 'EDIT_FUZZY_SEARCH');
                                    
                                    setRescreenParams({
                                        isOpen: true,
                                        name: formData.sender_name || '',
                                        dob: formData.dob || '',
                                        fuzzySearch: defaultFuzzy,
                                        defaultFuzzy,
                                        hasFuzzyPermission: fuzzyPerm,
                                        isSubmitting: false,
                                    });
                                }}
                                className="w-1/2 rounded-full bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {rescreenParams.isOpen && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-700/50 dark:bg-slate-900/95 backdrop-blur-lg">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Rescreening Parameters</h3>
                            <button
                                type="button"
                                onClick={() => setRescreenParams(prev => ({ ...prev, isOpen: false }))}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="space-y-4 py-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                                    Remitter Name
                                </label>
                                <input
                                    type="text"
                                    value={rescreenParams.name}
                                    onChange={(e) => setRescreenParams(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200/50 bg-white/95 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/90 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                                    Date of Birth
                                </label>
                                <input
                                    type="text"
                                    value={rescreenParams.dob}
                                    onChange={(e) => setRescreenParams(prev => ({ ...prev, dob: e.target.value }))}
                                    placeholder="YYYY-MM-DD"
                                    className="w-full rounded-xl border border-slate-200/50 bg-white/95 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/90 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                                    Fuzzy Search Distance
                                </label>
                                <select
                                    disabled={!rescreenParams.hasFuzzyPermission}
                                    value={rescreenParams.fuzzySearch}
                                    onChange={(e) => setRescreenParams(prev => ({ ...prev, fuzzySearch: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200/50 bg-white/95 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/90 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <option value="">No fuzziness (Exact match)</option>
                                    <option value="1">1 - distance 1 (small variations)</option>
                                    <option value="2">2 - distance 2 (bigger variations)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                            <button
                                type="button"
                                disabled={rescreenParams.isSubmitting}
                                onClick={() => setRescreenParams(prev => ({ ...prev, isOpen: false }))}
                                className="w-1/2 rounded-full border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={rescreenParams.isSubmitting || !rescreenParams.name.trim()}
                                onClick={async () => {
                                    setRescreenParams(prev => ({ ...prev, isSubmitting: true }));
                                    setReportsModal(prev => ({ ...prev, generating: true }));
                                    
                                    try {
                                        const res = await fetch(
                                            withActingUserParam(
                                                ENDPOINTS.REMITTERS.DILISENSE_REPORT_GENERATE(id),
                                                currentUser
                                            ),
                                            {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    name: rescreenParams.name,
                                                    dob: rescreenParams.dob,
                                                    fuzzy_search: rescreenParams.fuzzySearch,
                                                })
                                            }
                                        );
                                        const data = await res.json().catch(() => ({}));
                                        if (res.ok) {
                                            const listRes = await fetch(
                                                withActingUserParam(
                                                    ENDPOINTS.REMITTERS.DILISENSE_REPORTS_LIST(id),
                                                    currentUser
                                                )
                                            );
                                            const listData = await listRes.json().catch(() => []);
                                            setReportsModal(prev => ({
                                                ...prev,
                                                generating: false,
                                                reports: Array.isArray(listData) ? listData : prev.reports,
                                            }));
                                            
                                            const remitterRes = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(id), currentUser));
                                            if (remitterRes.ok) {
                                                const rData = await remitterRes.json();
                                                setFormData((prev: any) => ({
                                                    ...prev,
                                                    status: rData.status ?? 'active',
                                                    sender_details_aml_screening_doc: rData.sender_details_aml_screening_doc ?? '',
                                                }));
                                                setSanctionReference(rData.sanction_reference ?? '');
                                                setSanctionCheckedAt(rData.sanction_checked_at ?? '');
                                                setSanctionRawPayload(rData.sanction_raw_payload ?? '');
                                                setSenderDetailsAmlScreeningDoc(rData.sender_details_aml_screening_doc ?? '');
                                                setSanctionScore(Number(rData.sanction_score ?? 0));
                                            }
                                            
                                            setRescreenParams(prev => ({ ...prev, isOpen: false }));
                                            
                                            setConfirmModal({
                                                isOpen: true,
                                                title: 'Check Success',
                                                message: 'A new Dilisense AML check has been run and PDF report saved successfully.',
                                                type: 'success',
                                                isAlert: true,
                                                shouldRedirect: false,
                                            });
                                        } else {
                                            setReportsModal(prev => ({ ...prev, generating: false }));
                                            setRescreenParams(prev => ({ ...prev, isSubmitting: false }));
                                            setConfirmModal({
                                                isOpen: true,
                                                title: 'Check Failed',
                                                message: data?.message || 'Failed to run Dilisense check.',
                                                type: 'danger',
                                                isAlert: true,
                                                shouldRedirect: false,
                                            });
                                        }
                                    } catch (err) {
                                        console.error('Failed to run screening:', err);
                                        setReportsModal(prev => ({ ...prev, generating: false }));
                                        setRescreenParams(prev => ({ ...prev, isSubmitting: false }));
                                        setConfirmModal({
                                            isOpen: true,
                                            title: 'Error',
                                            message: 'An error occurred while running the check.',
                                            type: 'danger',
                                            isAlert: true,
                                            shouldRedirect: false,
                                        });
                                    }
                                }}
                                className="w-1/2 rounded-full bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition flex items-center justify-center gap-1.5"
                            >
                                {rescreenParams.isSubmitting ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Running...
                                    </>
                                ) : 'Run Check'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <Link href="/admin/remitters" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Remitters
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Remitter Details</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2">Field view and edit for sender profile</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/admin/transfers/create?senderId=${encodeURIComponent(id)}`}
                        className="px-5 py-3 rounded-full text-sm font-bold transition-colors flex items-center space-x-2 btn-primary"
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span>Start Transfer</span>
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="px-5 py-3 rounded-full text-sm font-bold transition-colors flex items-center space-x-2 glass-effect text-slate-600 dark:text-slate-300 hover:text-red-600"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                    </button>
                </div>
            </div>

            <div className="card-glass p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Remitter Overview</p>
                        <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{displayText(formData.sender_name)}</h2>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${isActive ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300' : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Identity</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Remitter ID: {displayText(formData.sender_id)}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">DOB: {displayText(formData.dob)}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Place: {displayText(formData.place_of_birth)}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Branch & Use</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{displayText(formData.branch)}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Use In: {displayText(formData.use_in)}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Occupation: {displayText(formData.occupation)}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Compliance</p>
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
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Audit</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Created By: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.created_by)}</span></p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">Created At: {formatDateTime(formData.created_at)}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Updated By: <span className="font-semibold text-slate-900 dark:text-white">{displayText(formData.updated_by)}</span></p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">Updated At: {formatDateTime(formData.updated_at)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Address</p>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{displayText(formData.address_1)}</p>
                        {displayText(formData.address_2) !== '-' && <p className="text-sm text-slate-700 dark:text-slate-200">{displayText(formData.address_2)}</p>}
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {[formData.city, formData.county, formData.country]
                                .map((part) => String(part || '').trim())
                                .filter((part) => part && part !== '-')
                                .join(', ')
                            }
                            {formData.postcode && String(formData.postcode).trim() ? ` ${String(formData.postcode).trim()}` : ''}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-300">ID & AML</p>
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
                            <select
                                required
                                disabled={!isPrivilegedUser && !canMultiBranch}
                                className="input-glass w-full pr-10 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                            >
                                <option value="">Select Branch...</option>
                                {branches.map((b: any) => (
                                    <option key={b.id} value={b.code || b.name}>
                                        {b.name} ({b.code})
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Remitter ID</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Tag className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.sender_id} onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Remitter Name</label>
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
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Country</label>
                        <select
                            className="input-glass w-full py-3 px-4 pr-10 appearance-none cursor-pointer text-sm"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        >
                            <option value="">Select Country</option>
                            {countries.map((c: any) => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Occupation</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Briefcase className="w-5 h-5" /></span>
                            <select
                                required
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                                value={formData.occupation}
                                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                            >
                                <option value="">Select Occupation...</option>
                                {occupations.map((o: any) => (
                                    <option key={o.id} value={o.name}>{o.name}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
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
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Remitter AML Result</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Shield className="w-5 h-5" /></span>
                            <select
                                className={`input-glass w-full font-semibold transition-colors duration-200 ${formData.sender_aml_result === 'passed' || formData.sender_aml_result === 'manually passed' || formData.sender_aml_result === 'clear' ? 'text-emerald-600 dark:text-emerald-400' :
                                        formData.sender_aml_result === 'review' ? 'text-amber-600 dark:text-amber-400' :
                                            formData.sender_aml_result === 'hit' ? 'text-rose-600 dark:text-rose-400' :
                                                'text-slate-600 dark:text-slate-400'
                                    }`}
                                value={formData.sender_aml_result}
                                disabled={!canManuallyPassed}
                                onChange={(e) => setFormData({ ...formData, sender_aml_result: e.target.value })}
                            >
                                <option value="pending" className="text-slate-700 dark:text-slate-200">Pending</option>
                                <option value="passed" className="text-emerald-700 dark:text-emerald-400">Manually Passed</option>
                                <option value="review" className="text-amber-700 dark:text-amber-400">Review</option>
                                <option value="hit" className="text-rose-700 dark:text-rose-400">Hit</option>
                            </select>
                        </div>
                    </div>

                    {formData.sender_aml_result !== initialAmlStatus && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                                Reason for AML Status Change <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="input-glass w-full p-3 h-24 resize-none"
                                placeholder="Enter the reason why you are manually changing the AML status"
                                value={formData.aml_status_change_reason}
                                required
                                onChange={(e) => setFormData({ ...formData, aml_status_change_reason: e.target.value })}
                            />
                        </div>
                    )}

                    {formData.sender_aml_result === initialAmlStatus && formData.aml_status_change_reason && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                                Previous AML Status Change Reason
                            </label>
                            <div className="input-glass w-full p-3 bg-slate-50/40 dark:bg-slate-900/30 text-slate-600 dark:text-slate-300 h-24 overflow-y-auto">
                                {formData.aml_status_change_reason}
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Re/screening Remitter</label>
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

                {/* Section 4: Documents */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-teal-500" />
                        Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        <FormFileUpload label="ID Copy" name="passport_copy" compact defaultValue={formData.id_copy} />
                        <FormFileUpload label="Proof of Address" name="proof_of_address_doc" compact defaultValue={formData.proof_of_address_doc} />
                        <FormFileUpload label="Source of Income" name="work_related_docs" compact defaultValue={formData.work_related_docs} />
                        <FormFileUpload label="AML Doc" name="sender_details_aml_screening_doc" compact defaultValue={formData.sender_details_aml_screening_doc} />
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
                        {canPdf && (
                            <button
                                type="button"
                                onClick={() => {
                                    const isMobile = String(formData.registration_source || '').trim().toLowerCase() === 'mobile_app';
                                    if (isMobile) {
                                        setShowVeriffModal(true);
                                    } else {
                                        openReportsModal();
                                    }
                                }}
                                className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-semibold text-xs transition-all border border-teal-500/20 shadow-sm shadow-teal-500/5 hover:shadow-teal-500/10"
                            >
                                <FileText className="w-4 h-4" />
                                <span>{String(formData.registration_source || '').trim().toLowerCase() === 'mobile_app' ? "Veriff Report" : "Dilisense Reports"}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </button>
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
                                {formatDateTime(sanctionCheckedAt)}
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

            {showVeriffModal && (
                <VeriffReportsModal
                    isOpen={showVeriffModal}
                    onClose={() => setShowVeriffModal(false)}
                    remitterId={id}
                    remitterName={String(formData.sender_name || formData.name || '')}
                    veriffSessionId={String(formData.veriff_session_id || '')}
                />
            )}
        </div>
    );
}

function FormFileUpload({ label, name, compact, defaultValue, required }: any) {
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (file) {
            if (file.type.startsWith('image/')) {
                setPreviewUrl(URL.createObjectURL(file));
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const displayExisting = defaultValue && !selectedFile;
    const UPLOADS_BASE_URL = '/api/uploads';
    const fullExistingUrl = defaultValue
        ? (defaultValue.startsWith('http') || defaultValue.startsWith('/')
            ? defaultValue
            : `${UPLOADS_BASE_URL}/${defaultValue.replace(/^uploads\//, '')}`)
        : '';

    const isExistingImage = defaultValue && (
        defaultValue.toLowerCase().endsWith('.jpg') ||
        defaultValue.toLowerCase().endsWith('.jpeg') ||
        defaultValue.toLowerCase().endsWith('.png') ||
        defaultValue.toLowerCase().endsWith('.gif') ||
        defaultValue.toLowerCase().endsWith('.webp')
    );

    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div 
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl ${compact ? 'px-3 py-3' : 'px-4 py-8'} bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer text-center relative max-w-full overflow-hidden group hover:border-teal-400 dark:hover:border-teal-500`}
            >
                <div className="flex flex-col items-center justify-center">
                    {previewUrl ? (
                        <div className="relative w-16 h-16 mb-2 rounded-lg border border-slate-200 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    ) : selectedFile ? (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2">
                            <FileText className="w-5 h-5 text-teal-500 animate-pulse" />
                        </div>
                    ) : isExistingImage && displayExisting ? (
                        <div className="relative w-16 h-16 mb-2 rounded-lg border border-slate-200 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                            <img src={fullExistingUrl} alt="Existing Preview" className="w-full h-full object-cover" />
                        </div>
                    ) : displayExisting ? (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2">
                            <FileText className="w-5 h-5 text-teal-600" />
                        </div>
                    ) : !compact ? (
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-teal-500 transition-colors" />
                        </div>
                    ) : null}

                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate w-full px-2">
                        {selectedFile ? (
                            <span className="text-teal-600 dark:text-teal-400 flex items-center justify-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {selectedFile.name}
                            </span>
                        ) : displayExisting ? (
                            <span className="text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" /> {defaultValue.split('/').pop()}
                            </span>
                        ) : (
                            <span className="group-hover:text-teal-500 transition-colors">{compact ? 'Upload' : 'Click to upload'}</span>
                        )}
                    </span>

                    <div className="flex items-center space-x-2 mt-2 z-10">
                        {selectedFile && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-500 hover:bg-rose-100 hover:text-rose-600 text-[10px] font-bold transition-colors"
                            >
                                Clear
                            </button>
                        )}
                        {displayExisting && (
                            <a
                                href={fullExistingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-[10px] font-bold transition-colors flex items-center gap-0.5"
                            >
                                <Eye className="w-2.5 h-2.5" /> View Existing
                            </a>
                        )}
                    </div>

                    <input 
                        type="file" 
                        ref={inputRef}
                        name={name} 
                        required={required && !defaultValue} 
                        onChange={handleFileChange}
                        className="hidden" 
                    />
                </div>
            </div>
        </div>
    );
}
