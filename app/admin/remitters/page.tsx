'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getCurrentAdminUser, withActingUserParam } from '@/app/lib/adminUserScope';
import { openPdfReport } from '@/app/lib/openPdfReport';
import ConfirmModal from '../components/ConfirmModal';
import VeriffReportsModal from '../components/VeriffReportsModal';
import { formatDateTime } from '@/app/lib/dateUtils';
import { routeKeyOf } from '@/app/lib/routeKeys';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Search, UserPlus, Edit2, Trash2, ChevronRight, Users, FileText, ShieldCheck, X, Loader2, RefreshCcw, Download } from 'lucide-react';
import { useAuditColumns, usePagePermissions } from '@/app/lib/permissions';

type SortDir = 'asc' | 'desc';

const csvEscape = (value: unknown): string => {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
};

export default function RemittersPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('REMITTERS');
    const { canAdd, canEdit, canDelete, canPdf, canExport, canReScreening, canDeleteComplianceReport } = usePagePermissions('REMITTERS');
    const currentUser = useMemo(() => getCurrentAdminUser(), []);
    const [selectedRemitter, setSelectedRemitter] = useState<any | null>(null);
    const [remitters, setRemitters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
    const [page, setPage] = useState(1);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger' | 'warning' | 'success';
        isAlert: boolean;
        actionType?: 'delete_remitter' | 'delete_report';
        targetReportId?: string | number | null;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isAlert: false,
        actionType: 'delete_remitter',
        targetReportId: null
    });
    const [remitterToDelete, setRemitterToDelete] = useState<any | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [reportsModal, setReportsModal] = useState<{
        isOpen: boolean;
        loading: boolean;
        generating: boolean;
        selectedId: string | number | null;
        selectedName: string;
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
        selectedId: null,
        selectedName: '',
        reports: []
    });

    useEffect(() => {
        fetchRemitters();
    }, [statusFilter, sourceFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const fetchRemitters = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (sourceFilter !== 'all') params.append('registration_source', sourceFilter);
            if (searchQuery.trim()) params.append('search', searchQuery.trim());

            const query = params.toString();
            const url = withActingUserParam(query ? `${ENDPOINTS.REMITTERS.LIST}?${query}` : ENDPOINTS.REMITTERS.LIST, currentUser);
            const res = await fetch(url);
            if (!res.ok) {
                setRemitters([]);
                return;
            }

            const data = await res.json();
            const normalized = (data || []).map((r: any) => ({
                ...r,
                shared_access: Boolean(r.shared_access),
                company: r.company || r.company_name || 'Link Forex Ltd',
                branch_name: r.branch || '-',
                sender_id: r.sender_id || '-',
                sender_name: r.sender_name || r.name || '-',
                active: (r.status || 'inactive').toLowerCase() === 'active' ? 'Active' : 'Inactive',
                dob: r.dob || '-',
                place_of_birth: r.place_of_birth || '-',
                telephone: r.phone || '-',
                postcode: r.postcode || '-',
                address_1: r.address_1 || '-',
                address_2: r.address_2 || '-',
                city: r.city || '-',
                county: r.county || '-',
                country: r.country || '-',
                occupation: r.occupation || '-',
                id_verified: r.id_verified || 'no',
                proof_of_funds: r.proof_of_funds || 'no',
                id_type: r.id_type || '-',
                id_no: r.id_number || '-',
                id_expire_date: r.id_expiry || '-',
                other_info: r.other_info || '-',
                use_in: r.use_in || 'All',
                sender_aml_doc: r.sender_details_aml_screening_doc || '-',
                sender_aml_result: r.sender_aml_result || '-',
                rescreening_sender: r.rescreening_sender || '-',
                veriff_status: r.veriff_status || '-',
                veriff_decision: r.veriff_decision || '-',
                verification_state: r.verification_state || 'not_started',
                id_expired: Boolean(r.id_expired),
                entered_user: r.created_by || '-',
                entered_date: r.created_at || '-',
                modified_user: r.updated_by || '-',
                modified_date: r.updated_at || '-',
                id_copy: r.id_copy || r.passport_copy || '',
                other_doc: r.other_doc || '',
                work_related_doc: r.work_related_docs || '',
            }));

            setRemitters(normalized);
        } catch (error) {
            console.error('Failed to fetch remitters:', error);
            setRemitters([]);
        } finally {
            setLoading(false);
        }
    };

    const searchedRows = searchQuery.trim()
        ? remitters.filter((r: any) => {
            const haystack = [
                r.branch_name,
                r.sender_id,
                r.sender_name,
                r.active,
                r.dob,
                r.place_of_birth,
                r.telephone,
                r.postcode,
                r.address_1,
                r.address_2,
                r.city,
                r.county,
                r.country,
                r.occupation,
                r.id_type,
                r.id_no,
                r.verification_state,
                r.veriff_decision,
                r.veriff_status,
                r.entered_user,
                r.modified_user,
                r.use_in,
                r.registration_source
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(searchQuery.trim().toLowerCase());
        })
        : remitters;

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

    const getSortValue = (row: any, key: string) => {
        switch (key) {
            case 'entered_date':
                return row.entered_date ? new Date(row.entered_date).getTime() : 0;
            case 'modified_date':
                return row.modified_date ? new Date(row.modified_date).getTime() : 0;
            default:
                return row[key] ?? '';
        }
    };

    const sortedRows = [...searchedRows].sort((a, b) => {
        const aVal = getSortValue(a, sortKey);
        const bVal = getSortValue(b, sortKey);
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const result = collator.compare(String(aVal), String(bVal));
        return sortDir === 'asc' ? result : -result;
    });

    const total = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, total);
    const pagedRows = sortedRows.slice(startIndex, endIndex);

    const handleExportCsv = () => {
        const exportColumns = columns.filter((column) => !['id_copy', 'other_doc', 'work_related_doc', 'sender_aml_doc'].includes(column.key));
        const header = exportColumns.map((column) => csvEscape(column.label)).join(',');
        const body = sortedRows.map((row) => (
            exportColumns
                .map((column) => {
                    const value = row[column.key];
                    if (typeof value === 'number') return csvEscape(value.toString());
                    return csvEscape(value === null || value === undefined ? '' : String(value));
                })
                .join(',')
        ));

        const csv = [header, ...body].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `remitters_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        if (page !== currentPage) {
            setPage(currentPage);
        }
    }, [page, currentPage]);

    const toggleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortIndicator = (key: string) => {
        return <SortIndicator active={sortKey === key} dir={sortDir} className="text-slate-400 dark:text-slate-300" />;
    };

    const yesNo = (value: string) => (value || '').toLowerCase() === 'yes' ? 'Yes' : 'No';

    const renderDocCell = (value: string) => {
        if (!value || value === '-') {
            return <span className="text-slate-400 dark:text-slate-300">No Image</span>;
        }
        return <span className="text-teal-600 dark:text-teal-300 font-semibold">View</span>;
    };

    const fetchReports = async (remitterId: string | number) => {
        setReportsModal((prev) => ({ ...prev, loading: true }));
        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORTS_LIST(remitterId), currentUser));
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
            });
        }
    };

    const openReportsModal = (remitterId: string | number, remitterName: string) => {
        setReportsModal({
            isOpen: true,
            loading: true,
            generating: false,
            selectedId: remitterId,
            selectedName: remitterName,
            reports: [],
        });
        fetchReports(remitterId);
    };

    const handleGenerateReport = async () => {
        const id = reportsModal.selectedId;
        if (!id) return;
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
                setConfirmModal({
                    isOpen: true,
                    title: 'Check Success',
                    message: 'A new Dilisense AML check has been run and PDF report saved successfully.',
                    type: 'success',
                    isAlert: true,
                });
            } else {
                setReportsModal((prev) => ({ ...prev, generating: false }));
                setConfirmModal({
                    isOpen: true,
                    title: 'Check Failed',
                    message: data?.message || 'Failed to run Dilisense check.',
                    type: 'danger',
                    isAlert: true,
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
            actionType: 'delete_report',
            targetReportId: reportId,
        });
    };

    const promptDelete = (remitter: any) => {
        setRemitterToDelete(remitter);
        setConfirmModal({
            isOpen: true,
            title: 'Delete Remitter',
            message: 'Are you sure you want to delete this remitter? This action cannot be undone.',
            type: 'danger',
            isAlert: false,
            actionType: 'delete_remitter',
            targetReportId: null
        });
    };

    const handleConfirm = async () => {
        if (confirmModal.isAlert) {
            setConfirmModal({ ...confirmModal, isOpen: false });
            return;
        }

        if (confirmModal.actionType === 'delete_report') {
            const reportId = confirmModal.targetReportId;
            const remitterId = reportsModal.selectedId;
            if (reportId && remitterId) {
                setDeleteLoading(true);
                try {
                    const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORT_DELETE(remitterId, reportId), currentUser), {
                        method: 'DELETE',
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                        // Refresh reports list
                        const listRes = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORTS_LIST(remitterId), currentUser));
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
                        });
                    } else {
                        setConfirmModal({
                            isOpen: true,
                            title: 'Delete Failed',
                            message: data?.message || 'Failed to delete Dilisense report.',
                            type: 'danger',
                            isAlert: true,
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
                    });
                } finally {
                    setDeleteLoading(false);
                }
            }
            return;
        }

        if (!remitterToDelete) return;

        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(remitterToDelete.id), currentUser), { method: 'DELETE' });
            if (res.ok) {
                setRemitters(remitters.filter((r) => r.id !== remitterToDelete.id));
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Remitter deleted successfully',
                    type: 'info',
                    isAlert: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to delete remitter',
                    type: 'danger',
                    isAlert: true
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Error deleting remitter',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setRemitterToDelete(null);
        }
    };

    const columns = [
        { key: 'branch_name', label: 'Branch' },
        { key: 'sender_id', label: 'Remitter ID' },
        { key: 'sender_name', label: 'Remitter Name' },
        { key: 'active', label: 'Active' },
        { key: 'dob', label: 'Date Of Birth' },
        { key: 'place_of_birth', label: 'Place Of Birth' },
        { key: 'telephone', label: 'Telephone' },
        { key: 'postcode', label: 'Postcode' },
        { key: 'address_1', label: 'Address 1' },
        { key: 'address_2', label: 'Address 2' },
        { key: 'city', label: 'City' },
        { key: 'county', label: 'County' },
        { key: 'country', label: 'Country' },
        { key: 'occupation', label: 'Occupation' },
        { key: 'id_verified', label: 'ID Verified' },
        { key: 'proof_of_funds', label: 'Proof Of Funds' },
        { key: 'id_type', label: 'ID Type' },
        { key: 'id_no', label: 'ID No' },
        { key: 'id_expire_date', label: 'ID Expire Date' },
        { key: 'verification_state', label: 'Verification' },
        { key: 'id_expired', label: 'ID Expired' },
        { key: 'other_info', label: 'Other Info' },
        { key: 'use_in', label: 'Use In' },
        { key: 'id_copy', label: 'View ID Copy' },
        { key: 'other_doc', label: 'View Other Doc' },
        { key: 'work_related_doc', label: 'View Work related Doc' },
        { key: 'sender_aml_doc', label: 'Remitter AML Document' },
        { key: 'sender_aml_result', label: 'Remitter AML Result' },
        { key: 'rescreening_sender', label: 'Re/screening Remitter' },
        ...(showCreatedBy ? [{ key: 'entered_user', label: 'Created By' }] : []),
        ...(showCreatedAt ? [{ key: 'entered_date', label: 'Created At' }] : []),
        ...(showUpdatedBy ? [{ key: 'modified_user', label: 'Updated By' }] : []),
        ...(showUpdatedAt ? [{ key: 'modified_date', label: 'Updated At' }] : []),
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirm}
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
                                    Manage, view, run checks, or delete Dilisense AML reports for {reportsModal.selectedName || '-'}.
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
                                Remitter Name: <span className="font-bold text-teal-600 dark:text-teal-400">{reportsModal.selectedName || 'N/A'}</span>
                            </div>
                            {canReScreening && (
                                <button
                                    type="button"
                                    disabled={reportsModal.generating || !reportsModal.selectedName}
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
                                                                    withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORT_DOWNLOAD(reportsModal.selectedId!, report.id), currentUser),
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

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Remitters</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">Manage remitter profiles for branch and mobile app</p>
                </div>
                <div className="flex items-center gap-3">
                    {canAdd && (
                        <Link href="/admin/remitters/create" className="btn-primary flex items-center space-x-2 rounded-full px-6 py-2.5">
                            <UserPlus className="w-5 h-5" />
                            <span>Add Remitter</span>
                        </Link>
                    )}
                </div>
            </div>

            <div className="card-glass p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Search className="w-4 h-4" /></span>
                            <input
                                type="text"
                                placeholder="Search all columns"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-glass w-full text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Mobile Status</label>
                        <div className="relative input-icon">
                            <select
                                className="input-glass w-full appearance-none pr-10 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-500 dark:text-slate-200 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Source</label>
                        <div className="relative input-icon">
                            <select
                                className="input-glass w-full appearance-none pr-10 text-sm"
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value)}
                            >
                                <option value="all">All</option>
                                <option value="branch">Branch</option>
                                <option value="mobile_app">Mobile App</option>
                                <option value="web">Web</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-500 dark:text-slate-200 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center space-x-3">
                    <Users className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Remitters Directory</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Showing {total === 0 ? 0 : startIndex + 1} to {endIndex} of {total}</p>
                    </div>
                </div>

                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-300">Loading remitters...</div>
                    ) : (
                        <table className="table-shell whitespace-nowrap">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">No.</th>
                                    {canEdit && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Edit"><Edit2 className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                    {canPdf && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="AML PDF"><FileText className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                    {columns.map((col) => (
                                        <th key={col.key} className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                            <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1">
                                                {col.label} <span className="text-slate-400 dark:text-slate-300">{sortIndicator(col.key)}</span>
                                            </button>
                                        </th>
                                    ))}
                                    {canDelete && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Delete"><Trash2 className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedRows.map((row: any, idx: number) => (
                                    <tr key={row.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                        {canEdit && (
                                            <td className="px-2 py-4 text-center">
                                                <Link
                                                    href={`/admin/remitters/${encodeURIComponent(routeKeyOf(row))}`}
                                                    className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </Link>
                                            </td>
                                        )}
                                        {canPdf && (
                                            <td className="px-2 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const isMobile = String(row.registration_source || '').trim().toLowerCase() === 'mobile_app';
                                                        if (isMobile) {
                                                            setSelectedRemitter(row);
                                                        } else {
                                                            openReportsModal(row.id, row.sender_name);
                                                        }
                                                    }}
                                                    className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                    title={String(row.registration_source || '').trim().toLowerCase() === 'mobile_app' ? "Veriff Verification Report" : "Dilisense AML Reports"}
                                                >
                                                    <FileText className="w-5 h-5" />
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <span>{row.branch_name || '-'}</span>
                                                {row.shared_access ? (
                                                    <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                                                        Shared
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.sender_id || '-'}</td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{row.sender_name || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.active || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.dob || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.place_of_birth || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.telephone || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.postcode || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.address_1 || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.address_2 || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.city || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.county || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.country || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.occupation || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{yesNo(row.id_verified)}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{yesNo(row.proof_of_funds)}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.id_type || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.id_no || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.id_expire_date || '-'}</td>
                                        <td className="px-4 py-4 text-sm">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                row.verification_state === 'verified'
                                                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                                                    : row.verification_state === 'pending'
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                        : row.verification_state === 'rejected'
                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                                            : row.verification_state === 'expired'
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300'
                                            }`}>
                                                {String(row.verification_state || 'not_started').replaceAll('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {row.id_expired ? 'Yes' : 'No'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.other_info || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.use_in || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{renderDocCell(row.id_copy)}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{renderDocCell(row.other_doc)}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{renderDocCell(row.work_related_doc)}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{renderDocCell(row.sender_aml_doc)}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.sender_aml_result || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.rescreening_sender || '-'}</td>
                                        {showCreatedBy && (
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {row.created_by && row.created_by !== '-'
                                                    ? (row.created_by === 'mobile_app' ? 'mobile user' : row.created_by)
                                                    : (String(row.registration_source || '').trim().toLowerCase() === 'mobile_app' ? 'mobile user' : 'admin')
                                                }
                                            </td>
                                        )}
                                        {showCreatedAt && <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime(row.entered_date)}</td>}
                                        {showUpdatedBy && (
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {row.updated_by && row.updated_by !== '-'
                                                    ? (row.updated_by === 'mobile_app' ? 'mobile user' : row.updated_by)
                                                    : (String(row.registration_source || '').trim().toLowerCase() === 'mobile_app' ? 'mobile user' : '—')
                                                }
                                            </td>
                                        )}
                                        {showUpdatedAt && <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime(row.modified_date)}</td>}
                                        {canDelete && (
                                            <td className="px-2 py-4 text-center">
                                                <button
                                                    onClick={() => promptDelete(row)}
                                                    disabled={row.shared_access}
                                                    title={row.shared_access ? 'Shared remitters can only be deleted by the owner branch.' : 'Delete'}
                                                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setPage(1); }}
                />
            </div>

            {selectedRemitter && (
                <VeriffReportsModal
                    isOpen={!!selectedRemitter}
                    onClose={() => setSelectedRemitter(null)}
                    remitterId={selectedRemitter.id}
                    remitterName={String(selectedRemitter.sender_name || '')}
                    veriffSessionId={String(selectedRemitter.veriff_session_id || '')}
                />
            )}
        </div>
    );
}
