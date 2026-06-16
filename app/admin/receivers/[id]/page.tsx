'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { ArrowLeft, User, Building, CreditCard, Save, Loader2, ChevronRight, Search, MapPin, Phone, ShieldCheck, Landmark, ChevronDown, ChevronUp, FileText, ExternalLink, X, RefreshCcw, Trash2, Download } from 'lucide-react';
import { resolveUploadsUrl } from '@/app/lib/uploads';
import ConfirmModal from '../../components/ConfirmModal';
import { formatDateTime } from '@/app/lib/dateUtils';

const normalizeCountryLabel = (value: string) => {
    const normalized = value.trim().toLowerCase();
    switch (normalized) {
        case 'uk':
            return 'united kingdom';
        case 'united arab emirates':
            return 'uae';
        default:
            return normalized;
    }
};

export default function EditReceiverPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [remitters, setRemitters] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [banksLoading, setBanksLoading] = useState(true);
    const [countries, setCountries] = useState<string[]>(['United Kingdom']);

    const paymentModes = [
        'Direct deposit to Allied Bank',
        'Direct deposit to another bank',
        'Cash over the counter or cash pickup'
    ];
    const bankCategories = {
        allied: 'allied',
        other: 'bank',
        cash: 'cash_pickup'
    };
    const idTypes = ['Passport', 'CNIC', 'Driving license', 'Other'];
    const [relationships, setRelationships] = useState<string[]>(['Family']);
    const [initialAmlStatus, setInitialAmlStatus] = useState<string>('pending');
    const [enableAmlOverride, setEnableAmlOverride] = useState<boolean>(false);

    // Dilisense AML screening states
    const [amlReference, setAmlReference] = useState<string>('');
    const [amlCheckedAt, setAmlCheckedAt] = useState<string>('');
    const [amlRawPayload, setAmlRawPayload] = useState<string>('');
    const [amlScreeningDoc, setAmlScreeningDoc] = useState<string>('');
    const [amlHits, setAmlHits] = useState<number>(0);
    const [showRawPayload, setShowRawPayload] = useState<boolean>(false);

    // Veriff PEP/Sanctions screening states
    const [veriffSessionId, setVeriffSessionId] = useState<string>('');
    const [veriffStatus, setVeriffStatus] = useState<string>('');
    const [veriffCheckedAt, setVeriffCheckedAt] = useState<string>('');
    const [veriffPepSanctionMatch, setVeriffPepSanctionMatch] = useState<string>('');
    const [showVeriffRawPayload, setShowVeriffRawPayload] = useState<boolean>(false);
    const [registrationSource, setRegistrationSource] = useState<string>('web');

    const [formData, setFormData] = useState({
        customer_id: '',
        name: '',
        country: countries[0],
        address: '',
        city: '',
        date_of_birth: '',
        place_of_birth: '',
        payment_mode: paymentModes[0],
        bank_name: 'Allied Bank',
        branch_name: '',
        account_number: '',
        iban: '',
        branch_code: '',
        receiver_id_type: '',
        receiver_id_number: '',
        relation: relationships[0] || 'Family',
        mobile_number: '',
        status: 'active',
        aml_status: 'pending',
        aml_status_change_reason: '',
    });

    const isAllied = formData.payment_mode === 'Direct deposit to Allied Bank';
    const isCashPickup = formData.payment_mode.toLowerCase().includes('cash') || formData.payment_mode.toLowerCase().includes('pickup');
    const paymentCategory = isAllied
        ? bankCategories.allied
        : isCashPickup
            ? bankCategories.cash
            : bankCategories.other;
    const availableBanks = banks.filter((bank) => {
        const status = String(bank.status || 'active').toLowerCase();
        if (status !== 'active') return false;
        if (bank.country && normalizeCountryLabel(String(bank.country)) !== normalizeCountryLabel(formData.country)) return false;
        return String(bank.category || '').toLowerCase() === paymentCategory;
    });
    const alliedBank = availableBanks.find((bank) => Number(bank.is_default) === 1) || availableBanks[0];

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
            beneficiary_id: string | number;
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

    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const res = await fetch(`${ENDPOINTS.COUNTRIES.LIST}?status=active&sort=name&dir=asc`);
                if (!res.ok) return;
                const data = await res.json();
                if (!Array.isArray(data)) return;

                const names = Array.from(
                    new Set(
                        data
                            .map((country) => String(country?.name || '').trim())
                            .filter(Boolean)
                    )
                );

                if (names.length === 0) return;
                setCountries(names);
                setFormData((prev) => {
                    const matched = prev.country
                        ? names.find((name) => normalizeCountryLabel(name) === normalizeCountryLabel(prev.country))
                        : null;

                    if (matched) {
                        if (matched === prev.country) return prev;
                        return { ...prev, country: matched };
                    }

                    if (prev.country && names.includes(prev.country)) {
                        return prev;
                    }

                    const fallback = names.includes('United Kingdom') ? 'United Kingdom' : names[0];
                    return { ...prev, country: prev.country || fallback };
                });
            } catch (error) {
                console.error('Failed to fetch countries:', error);
            }
        };

        void fetchCountries();
    }, []);

    useEffect(() => {
        const fetchRelationships = async () => {
            try {
                const res = await fetch(`${ENDPOINTS.RELATIONSHIPS.LIST}?status=active`);
                if (!res.ok) return;
                const data = await res.json();
                if (!Array.isArray(data)) return;
                const names = data
                    .map((row) => String(row?.name || '').trim())
                    .filter(Boolean);
                setRelationships(names.length ? names : ['Family']);
                setFormData((prev) => ({
                    ...prev,
                    relation: names.includes(prev.relation) ? prev.relation : (names[0] || prev.relation),
                }));
            } catch (error) {
                console.error('Failed to fetch relationships:', error);
            }
        };

        fetchRelationships();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch remitters
                const remittersRes = await fetch(ENDPOINTS.REMITTERS.LIST);
                if (remittersRes.ok) {
                    setRemitters(await remittersRes.json());
                }

                const banksRes = await fetch(ENDPOINTS.BANKS.LIST);
                if (banksRes.ok) {
                    setBanks(await banksRes.json());
                }

                // Fetch receiver details
                if (id) {
                    const receiverRes = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(id));
                    if (receiverRes.ok) {
                        const data = await receiverRes.json();
                        setFormData({
                            customer_id: data.customer_id,
                            name: data.name ?? '',
                            country: data.country ?? countries[0],
                            address: data.address ?? '',
                            city: data.city ?? '',
                            date_of_birth: data.date_of_birth ?? '',
                            place_of_birth: data.place_of_birth ?? '',
                            payment_mode: data.payment_mode ?? paymentModes[0],
                            bank_name: data.bank_name ?? 'Allied Bank',
                            branch_name: data.branch_name ?? '',
                            account_number: data.account_number ?? '',
                            iban: data.iban ?? '',
                            branch_code: data.branch_code ?? '',
                            receiver_id_type: data.receiver_id_type ?? '',
                            receiver_id_number: data.receiver_id_number ?? '',
                            relation: data.relation ?? relationships[0] ?? 'Family',
                            mobile_number: data.mobile_number ?? '',
                            status: data.status ?? 'active',
                            aml_status: data.aml_status ?? 'pending',
                            aml_status_change_reason: data.aml_status_change_reason ?? '',
                        });
                        setInitialAmlStatus(data.aml_status ?? 'pending');
                        setAmlReference(data.aml_reference ?? '');
                        setAmlCheckedAt(data.aml_checked_at ?? '');
                        setAmlRawPayload(data.aml_raw_payload ?? '');
                        setAmlScreeningDoc(data.aml_screening_doc ?? '');
                        setAmlHits(Number(data.aml_hits ?? 0));
                        // Veriff fields
                        setVeriffSessionId(data.veriff_session_id ?? '');
                        setVeriffStatus(data.veriff_status ?? '');
                        setVeriffCheckedAt(data.veriff_checked_at ?? '');
                        setVeriffPepSanctionMatch(data.veriff_pep_sanction_match ?? '');
                        setRegistrationSource(data.registration_source ?? 'web');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
                setBanksLoading(false);
            }
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        if (!banks.length) return;

        if (isAllied) {
            const nextName = alliedBank?.name || 'Allied Bank';
            setFormData((prev) => ({
                ...prev,
                bank_name: nextName,
            }));
            return;
        }

        if (!availableBanks.find((bank) => bank.name === formData.bank_name)) {
            setFormData((prev) => ({ ...prev, bank_name: '' }));
        }
    }, [banks, formData.country, formData.payment_mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: string[] = [];
        if (!formData.customer_id) errors.push('Linked remitter is required.');
        if (!formData.name.trim()) errors.push('Receiver name is required.');
        if (!formData.bank_name.trim()) errors.push('Bank name is required.');
        if (!isCashPickup && !formData.account_number.trim()) errors.push('Account number is required.');
        if (isCashPickup) {
            if (!formData.receiver_id_type.trim()) errors.push('Receiver ID type is required for cash pickup.');
            if (!formData.receiver_id_number.trim()) errors.push('Receiver ID number is required for cash pickup.');
        }
        if (formData.aml_status !== initialAmlStatus && !formData.aml_status_change_reason.trim()) {
            errors.push('AML status change reason is required.');
        }
        if (errors.length) {
            setConfirmModal({
                isOpen: true,
                title: 'Missing Information',
                message: errors.join('\n'),
                type: 'warning',
                isAlert: true,
                shouldRedirect: false
            });
            return;
        }
        setSubmitting(true);

        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(id), {
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
                    message: 'Receiver updated successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to update receiver',
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
                message: 'Error updating receiver',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading receiver details...</div>;

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/receivers');
        }
    };

    const fetchReports = async () => {
        setReportsModal((prev) => ({ ...prev, loading: true }));
        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORTS_LIST(id));
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

    const handleGenerateReport = async () => {
        setReportsModal((prev) => ({ ...prev, generating: true }));
        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORT_GENERATE(id), {
                method: 'POST',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                // Refresh reports list
                const listRes = await fetch(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORTS_LIST(id));
                const listData = await listRes.json().catch(() => []);
                setReportsModal((prev) => ({
                    ...prev,
                    generating: false,
                    reports: Array.isArray(listData) ? listData : prev.reports,
                }));
                // Reload main details to sync status
                const beneficiaryRes = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(id));
                if (beneficiaryRes.ok) {
                    const bData = await beneficiaryRes.json();
                    setFormData((prev) => ({
                        ...prev,
                        aml_status: bData.aml_status ?? 'pending',
                        status: bData.status ?? 'active',
                    }));
                    setInitialAmlStatus(bData.aml_status ?? 'pending');
                    setAmlReference(bData.aml_reference ?? '');
                    setAmlCheckedAt(bData.aml_checked_at ?? '');
                    setAmlRawPayload(bData.aml_raw_payload ?? '');
                    setAmlScreeningDoc(bData.aml_screening_doc ?? '');
                    setAmlHits(Number(bData.aml_hits ?? 0));
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
                    const res = await fetch(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORT_DELETE(id, reportId), {
                        method: 'DELETE',
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                        // Refresh reports list
                        const listRes = await fetch(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORTS_LIST(id));
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

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-fade-in-up">
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
                                    Dilisense AML Reports
                                </h2>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Manage, view, run checks, or delete Dilisense AML reports for {formData.name || '-'}.
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
                                Receiver Name: <span className="font-bold text-teal-600 dark:text-teal-400">{formData.name || 'N/A'}</span>
                            </div>
                            <button
                                type="button"
                                disabled={reportsModal.generating || !formData.name}
                                onClick={handleGenerateReport}
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
                                                            onClick={() => window.open(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORT_DOWNLOAD(id, report.id), '_blank', 'noopener,noreferrer')}
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
                    <Link href="/admin/receivers" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Receivers
                    </Link>
                    <div className="flex items-center space-x-4">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Edit Receiver
                        </h1>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold">
                            ID: {id}
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="space-y-8">
                    {/* Search/Select Remitter */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Linked Remitter <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <select
                                required
                                value={formData.customer_id}
                                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                className="input-glass w-full pl-12 appearance-none cursor-pointer"
                            >
                                <option value="">Select a Remitter...</option>
                                {remitters.map((remitter) => (
                                    <option key={remitter.id} value={remitter.id}>
                                        {remitter.name}{remitter.phone ? ` (${remitter.phone})` : ''}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Legal Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="Receiver's full name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Mobile Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.mobile_number}
                                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="Receiver mobile number"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Country</label>
                            <select
                                className="input-glass w-full"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            >
                                {countries.map((country) => (
                                    <option key={country} value={country}>{country}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">City</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="City"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="Street address"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Date Of Birth</label>
                            <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                className="input-glass w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Place Of Birth</label>
                            <input
                                type="text"
                                value={formData.place_of_birth}
                                onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                                className="input-glass w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Relationship</label>
                            <select
                                className="input-glass w-full"
                                value={formData.relation}
                                onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                            >
                                {relationships.map((relation) => (
                                    <option key={relation} value={relation}>{relation}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Status</label>
                            <select
                                className="input-glass w-full"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {initialAmlStatus === 'review' && (
                            <div className="flex items-start space-x-3 bg-emerald-50/50 dark:bg-slate-800/40 border border-emerald-100/50 dark:border-slate-700/60 p-4 rounded-2xl mb-1 col-span-1 md:col-span-2">
                                <input
                                    type="checkbox"
                                    id="enableAmlOverride"
                                    checked={enableAmlOverride}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setEnableAmlOverride(checked);
                                        if (!checked) {
                                            setFormData((prev) => ({ ...prev, aml_status: 'review' }));
                                        }
                                    }}
                                    className="checkbox-glass mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500 rounded border-slate-300 cursor-pointer"
                                />
                                <label htmlFor="enableAmlOverride" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                                    Manually Pass AML
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 leading-normal">
                                        Check this box to enable manually passing this review verification profile.
                                    </span>
                                </label>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">AML Status</label>
                            <select
                                className={`input-glass w-full font-semibold transition-colors duration-200 ${formData.aml_status === 'passed' || formData.aml_status === 'manually passed' || formData.aml_status === 'clear' ? 'text-emerald-600 dark:text-emerald-400' :
                                        formData.aml_status === 'review' ? 'text-amber-600 dark:text-amber-400' :
                                            formData.aml_status === 'hit' ? 'text-rose-600 dark:text-rose-400' :
                                                'text-slate-600 dark:text-slate-400'
                                    }`}
                                value={formData.aml_status}
                                disabled={initialAmlStatus === 'review' && !enableAmlOverride}
                                onChange={(e) => setFormData({ ...formData, aml_status: e.target.value })}
                            >
                                {initialAmlStatus === 'review' ? (
                                    <>
                                        <option value="review" className="text-amber-700 dark:text-amber-400">Review</option>
                                        {enableAmlOverride && (
                                            <option value="manually passed" className="text-emerald-700 dark:text-emerald-400">Manually Passed</option>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <option value="pending" className="text-slate-700 dark:text-slate-200">Pending</option>
                                        <option value="passed" className="text-emerald-700 dark:text-emerald-400">Passed</option>
                                        <option value="manually passed" className="text-emerald-700 dark:text-emerald-400">Manually Passed</option>
                                        <option value="review" className="text-amber-700 dark:text-amber-400">Review</option>
                                        <option value="hit" className="text-rose-700 dark:text-rose-400">Hit</option>
                                    </>
                                )}
                            </select>
                        </div>

                        {formData.aml_status !== initialAmlStatus && (
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

                        {formData.aml_status === initialAmlStatus && formData.aml_status_change_reason && (
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
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Payment Mode</label>
                            <select
                                className="input-glass w-full"
                                value={formData.payment_mode}
                                onChange={(e) => {
                                    const nextMode = e.target.value;
                                    const nextBank = nextMode === 'Direct deposit to Allied Bank'
                                        ? 'Allied Bank'
                                        : (formData.bank_name === 'Allied Bank' ? '' : formData.bank_name);
                                    setFormData({ ...formData, payment_mode: nextMode, bank_name: nextBank });
                                }}
                            >
                                {paymentModes.map((mode) => (
                                    <option key={mode} value={mode}>{mode}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Bank Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                {isAllied ? (
                                    <input
                                        type="text"
                                        value="Allied Bank"
                                        readOnly
                                        className="input-glass w-full pl-12 bg-slate-50 dark:bg-slate-800/40"
                                    />
                                ) : (
                                    <select
                                        required
                                        className="input-glass w-full pl-12"
                                        value={formData.bank_name}
                                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    >
                                        <option value="">{isCashPickup ? 'Select pickup bank' : 'Select bank'}</option>
                                        {banksLoading ? (
                                            <option value="">Loading banks...</option>
                                        ) : (
                                            availableBanks.map((bank) => (
                                                <option key={bank.id || bank.name} value={bank.name}>{bank.name}</option>
                                            ))
                                        )}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Account Number <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    required={!isCashPickup}
                                    value={formData.account_number}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="Account number"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">IBAN</label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.iban}
                                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="IBAN"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch Name</label>
                            <div className="relative">
                                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.branch_name}
                                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="Branch name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch Code</label>
                            <div className="relative">
                                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.branch_code}
                                    onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="Branch code"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver ID Type</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <select
                                    className="input-glass w-full pl-12"
                                    value={formData.receiver_id_type}
                                    onChange={(e) => setFormData({ ...formData, receiver_id_type: e.target.value })}
                                >
                                    <option value="">Select ID type</option>
                                    {idTypes.map((idType) => (
                                        <option key={idType} value={idType}>{idType}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver ID Number</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.receiver_id_number}
                                    onChange={(e) => setFormData({ ...formData, receiver_id_number: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="ID number"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/receivers"
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
                                <span>Updating...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* AML Screening History (Dilisense) */}
            {amlReference && (
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
                        <button
                            type="button"
                            onClick={openReportsModal}
                            className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-semibold text-xs transition-all border border-teal-500/20 shadow-sm shadow-teal-500/5 hover:shadow-teal-500/10"
                        >
                            <FileText className="w-4 h-4" />
                            <span>Dilisense Reports</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                            <span className="text-xs font-semibold text-slate-400 block mb-1">Screening Reference</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{amlReference}</span>
                        </div>
                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                            <span className="text-xs font-semibold text-slate-400 block mb-1">Checked At</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {formatDateTime(amlCheckedAt)}
                            </span>
                        </div>
                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                            <span className="text-xs font-semibold text-slate-400 block mb-1">Total Hits</span>
                            <div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${amlHits > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                    {amlHits} {amlHits > 0 ? 'HITS DETECTED' : 'CLEAR'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {amlRawPayload && (
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
                                                const parsed = typeof amlRawPayload === 'string' ? JSON.parse(amlRawPayload) : amlRawPayload;
                                                return JSON.stringify(parsed, null, 2);
                                            } catch (e) {
                                                return String(amlRawPayload);
                                            }
                                        })()}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Veriff PEP/Sanctions Screening History (Mobile-registered beneficiaries only) */}
            {registrationSource === 'mobile_app' && veriffSessionId && (
                <div className="card-glass p-8 relative overflow-hidden mt-8">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-16 -mt-16 pointer-events-none"></div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Veriff PEP / Sanctions Screening</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Watchlist screening via Veriff (Mobile App)</p>
                            </div>
                        </div>
                        <span className={`inline-flex rounded-full px-3.5 py-1.5 text-xs font-bold border ${veriffStatus === 'clear' || veriffStatus === 'passed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                                veriffStatus === 'review' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                                    veriffStatus === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}>
                            {veriffStatus ? veriffStatus.replace('_', ' ') : 'N/A'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                            <span className="text-xs font-semibold text-slate-400 block mb-1">Session ID</span>
                            <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 break-all">{veriffSessionId || '-'}</span>
                        </div>
                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                            <span className="text-xs font-semibold text-slate-400 block mb-1">Checked At</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {formatDateTime(veriffCheckedAt)}
                            </span>
                        </div>
                        <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                            <span className="text-xs font-semibold text-slate-400 block mb-1">Hits</span>
                            <div>
                                {(() => {
                                    let hits = 0;
                                    try {
                                        const parsed = veriffPepSanctionMatch ? JSON.parse(veriffPepSanctionMatch) : null;
                                        hits = (parsed?.data?.hits || parsed?.hits || []).length;
                                    } catch { /* ignore */ }
                                    return (
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${hits > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                            {hits} {hits > 0 ? 'HITS DETECTED' : 'CLEAR'}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {veriffPepSanctionMatch && (
                        <div className="border border-slate-100 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/10">
                            <button
                                type="button"
                                onClick={() => setShowVeriffRawPayload(!showVeriffRawPayload)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
                            >
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Raw Veriff Screening Response</span>
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
                                                const parsed = typeof veriffPepSanctionMatch === 'string' ? JSON.parse(veriffPepSanctionMatch) : veriffPepSanctionMatch;
                                                return JSON.stringify(parsed, null, 2);
                                            } catch (e) {
                                                return String(veriffPepSanctionMatch);
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
