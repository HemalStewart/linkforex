'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getCurrentAdminUser, withActingUserParam } from '@/app/lib/adminUserScope';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Building2, Edit2, Plus, Search, Trash2, Users, FileText, ShieldCheck, X, Loader2, RefreshCcw, Download, ChevronRight } from 'lucide-react';
import VeriffDetailsModal from '../components/VeriffDetailsModal';
import { formatDateTime } from '@/app/lib/dateUtils';
import { useAuditColumns } from '@/app/lib/permissions';

type SortDir = 'asc' | 'desc';

type Receiver = {
    id: string | number;
    name?: string | null;
    bank_name?: string | null;
    account_number?: string | null;
    iban?: string | null;
    country?: string | null;
    status?: string | null;
    aml_status?: string | null;
    created_at?: string | null;
    registration_source?: string | null;
    veriff_status?: string | null;
    veriff_session_id?: string | null;
    veriff_checked_at?: string | null;
    veriff_pep_sanction_match?: string | null;
    [key: string]: unknown;
};

type ColumnKey = 'remitter' | 'name' | 'bank' | 'account' | 'country' | 'status' | 'amlStatus' | 'source' | 'veriffStatus' | 'createdAt';

const asString = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value);
};

const normalize = (value: unknown): string => asString(value).trim().toLowerCase();

const formatStatus = (value: unknown): string => {
    const key = normalize(value);
    if (!key) return '-';
    return key
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const statusBadgeClass = (value: unknown): string => {
    const key = normalize(value);
    if (key === 'active' || key === 'yes' || key === 'verified') {
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    }
    if (key === 'inactive' || key === 'no') {
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export default function ReceiversPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('RECEIVERS');
    const currentUser = useMemo(() => getCurrentAdminUser(), []);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger' | 'warning' | 'success';
        isAlert: boolean;
        actionType?: 'delete_receiver' | 'delete_report';
        targetReceiverId?: number | null;
        targetReportId?: string | number | null;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isAlert: false,
        actionType: 'delete_receiver',
        targetReceiverId: null,
        targetReportId: null
    });
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [reportsModal, setReportsModal] = useState<{
        isOpen: boolean;
        loading: boolean;
        generating: boolean;
        selectedId: string | number | null;
        selectedName: string;
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
        selectedId: null,
        selectedName: '',
        reports: []
    });

    const [receivers, setReceivers] = useState<Receiver[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<ColumnKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
    const [selectedReceiver, setSelectedReceiver] = useState<Receiver | null>(null);

    const handleAmlStatusChange = async (id: string | number, newStatus: string) => {
        setUpdatingId(id);
        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    aml_status: newStatus,
                }),
            });

            if (res.ok) {
                const updatedReceiver = (await res.json()) as Receiver;
                setReceivers((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, aml_status: updatedReceiver.aml_status } : r))
                );
            } else {
                alert('Failed to update AML status');
            }
        } catch (error) {
            console.error('Error updating AML status:', error);
            alert('An error occurred while updating AML status');
        } finally {
            setUpdatingId(null);
        }
    };

    const getAmlBadgeClass = (status: string) => {
        switch (normalize(status)) {
            case 'clear':
            case 'passed':
            case 'manually passed':
                return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'review':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'hit':
                return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800';
            case 'pending':
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    const getVeriffBadgeClass = (status: string) => {
        switch (normalize(status)) {
            case 'clear':
            case 'passed':
                return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'review':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'pending':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'not_applicable':
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    const getSourceBadgeClass = (source: string) => {
        return normalize(source) === 'mobile_app'
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    };

    useEffect(() => {
        void fetchReceivers();
    }, []);

    const fetchReceivers = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.LIST);
            if (res.ok) {
                const data = (await res.json()) as Receiver[];
                setReceivers(Array.isArray(data) ? data : []);
            } else {
                setReceivers([]);
            }
        } catch (error) {
            console.error('Failed to fetch receivers:', error);
            setReceivers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchReports = async (receiverId: string | number) => {
        setReportsModal((prev) => ({ ...prev, loading: true }));
        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORTS_LIST(receiverId), currentUser));
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

    const openReportsModal = (receiverId: string | number, receiverName: string) => {
        setReportsModal({
            isOpen: true,
            loading: true,
            generating: false,
            selectedId: receiverId,
            selectedName: receiverName,
            reports: [],
        });
        fetchReports(receiverId);
    };

    const handleGenerateReport = async () => {
        const id = reportsModal.selectedId;
        if (!id) return;
        setReportsModal((prev) => ({ ...prev, generating: true }));
        try {
            const res = await fetch(withActingUserParam(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORT_GENERATE(id), currentUser), {
                method: 'POST',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                // Refresh reports list
                const listRes = await fetch(withActingUserParam(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORTS_LIST(id), currentUser));
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

    const promptDeleteReceiver = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Receiver',
            message: 'Are you sure you want to delete this receiver? This action cannot be undone.',
            type: 'danger',
            isAlert: false,
            actionType: 'delete_receiver',
            targetReceiverId: id,
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
            const receiverId = reportsModal.selectedId;
            if (reportId && receiverId) {
                setDeleteLoading(true);
                try {
                    const res = await fetch(withActingUserParam(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORT_DELETE(receiverId, reportId), currentUser), {
                        method: 'DELETE',
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                        // Refresh reports list
                        const listRes = await fetch(withActingUserParam(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORTS_LIST(receiverId), currentUser));
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

        if (confirmModal.actionType === 'delete_receiver') {
            const id = confirmModal.targetReceiverId;
            if (!id) return;
            setDeleteLoading(true);
            try {
                const res = await fetch(withActingUserParam(ENDPOINTS.BENEFICIARIES.DETAIL(id), currentUser), {
                    method: 'DELETE',
                });

                if (res.ok) {
                    setReceivers((prev) => prev.filter((r) => Number(r.id) !== id));
                    setConfirmModal({
                        isOpen: true,
                        title: 'Success',
                        message: 'Receiver deleted successfully',
                        type: 'info',
                        isAlert: true
                    });
                } else {
                    setConfirmModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Failed to delete receiver',
                        type: 'danger',
                        isAlert: true
                    });
                }
            } catch (error) {
                console.error('Error deleting receiver:', error);
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Error deleting receiver',
                    type: 'danger',
                    isAlert: true
                });
            } finally {
                setDeleteLoading(false);
            }
        }
    };

    const filteredReceivers = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();
        if (!term) return receivers;
        return receivers.filter((receiver) => {
            const text = [
                receiver.remitter_name,
                receiver.name,
                receiver.bank_name,
                receiver.account_number,
                receiver.iban,
                receiver.country,
                receiver.status,
                receiver.registration_source,
                receiver.veriff_status,
            ]
                .map((v) => asString(v).toLowerCase())
                .join(' ');
            return text.includes(term);
        });
    }, [receivers, searchQuery]);

    const sortedReceivers = useMemo(() => {
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        const valueFor = (receiver: Receiver): string => {
            switch (sortKey) {
                case 'remitter':
                    return asString(receiver.remitter_name);
                case 'name':
                    return asString(receiver.name);
                case 'bank':
                    return asString(receiver.bank_name);
                case 'account':
                    return asString(receiver.account_number || receiver.iban);
                case 'country':
                    return asString(receiver.country);
                case 'status':
                    return asString(receiver.status);
                case 'amlStatus':
                    return asString(receiver.aml_status);
                case 'source':
                    return asString(receiver.registration_source);
                case 'veriffStatus':
                    return asString(receiver.veriff_status);
                case 'createdAt':
                default:
                    return asString(receiver.created_at);
            }
        };

        return [...filteredReceivers].sort((a, b) => {
            if (sortKey === 'createdAt') {
                const aTime = Date.parse(asString(a.created_at)) || 0;
                const bTime = Date.parse(asString(b.created_at)) || 0;
                return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
            }
            const result = collator.compare(valueFor(a), valueFor(b));
            return sortDir === 'asc' ? result : -result;
        });
    }, [filteredReceivers, sortKey, sortDir]);

    const total = sortedReceivers.length;
    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, total);
    const pagedReceivers = sortedReceivers.slice(startIndex, endIndex);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, rowsPerPage, sortKey, sortDir]);

    const toggleSort = (key: ColumnKey) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortKey(key);
        setSortDir('asc');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <Users className="w-6 h-6 text-slate-400 flex-shrink-0" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Receivers Directory</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Showing {total === 0 ? 0 : startIndex + 1} to {endIndex} of {total}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:flex-grow lg:justify-end">
                        <div className="relative input-icon flex-grow max-w-md">
                            <span className="input-icon-left"><Search className="w-4 h-4" /></span>
                            <input
                                type="text"
                                placeholder="Search by name, bank, account, IBAN, country..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-glass w-full text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => void fetchReceivers()}
                                className="px-4 py-2 rounded-full glass-effect text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300 whitespace-nowrap"
                            >
                                Refresh
                            </button>
                            <Link href="/admin/receivers/create" className="btn-primary flex items-center space-x-2 rounded-full px-6 text-sm whitespace-nowrap">
                                <Plus className="w-5 h-5" />
                                <span>Add Receiver</span>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-300">Loading receivers...</div>
                    ) : (
                        <table className="table-shell whitespace-nowrap">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Edit"><Edit2 className="w-4 h-4 mx-auto text-slate-400" /></th>
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="AML PDF"><FileText className="w-4 h-4 mx-auto text-slate-400" /></th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('remitter')} className="flex items-center gap-2">
                                            Remitter <SortIndicator active={sortKey === 'remitter'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('name')} className="flex items-center gap-2">
                                            Name <SortIndicator active={sortKey === 'name'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('bank')} className="flex items-center gap-2">
                                            Bank <SortIndicator active={sortKey === 'bank'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('account')} className="flex items-center gap-2">
                                            Account / IBAN <SortIndicator active={sortKey === 'account'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('country')} className="flex items-center gap-2">
                                            Country <SortIndicator active={sortKey === 'country'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('status')} className="flex items-center gap-2">
                                            Status <SortIndicator active={sortKey === 'status'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('amlStatus')} className="flex items-center gap-2">
                                            AML Status <SortIndicator active={sortKey === 'amlStatus'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('source')} className="flex items-center gap-2">
                                            Source <SortIndicator active={sortKey === 'source'} dir={sortDir} />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                        <button onClick={() => toggleSort('veriffStatus')} className="flex items-center gap-2">
                                            Veriff <SortIndicator active={sortKey === 'veriffStatus'} dir={sortDir} />
                                        </button>
                                    </th>
                                    {showCreatedBy && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Created By</th>}
                                    {showCreatedAt && (
                                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">
                                            <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-2">
                                                Created At <SortIndicator active={sortKey === 'createdAt'} dir={sortDir} />
                                            </button>
                                        </th>
                                    )}
                                    {showUpdatedBy && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Updated By</th>}
                                    {showUpdatedAt && <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">Updated At</th>}
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Delete"><Trash2 className="w-4 h-4 mx-auto text-slate-400" /></th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedReceivers.length > 0 ? (
                                    pagedReceivers.map((receiver) => (
                                        <tr key={String(receiver.id)} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                            <td className="px-2 py-4 text-center">
                                                <Link
                                                    href={`/admin/receivers/${receiver.id}`}
                                                    className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </Link>
                                            </td>
                                            <td className="px-2 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => openReportsModal(receiver.id, receiver.name || '')}
                                                    className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                    title="Dilisense AML Reports"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                                                {asString(receiver.remitter_name) || '-'}
                                            </td>
                                            <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                                                {asString(receiver.name) || '-'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                <div className="inline-flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                    <span>{asString(receiver.bank_name) || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 font-mono">
                                                {asString(receiver.account_number || receiver.iban) || '-'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {asString(receiver.country) || '-'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass(receiver.status)}`}>
                                                    {formatStatus(receiver.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold border ${getAmlBadgeClass(String(receiver.aml_status || 'pending'))}`}>
                                                    {formatStatus(receiver.aml_status || 'pending')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold border ${getSourceBadgeClass(String(receiver.registration_source || 'web'))}`}>
                                                    {normalize(receiver.registration_source) === 'mobile_app' ? 'Mobile App' : 'Web'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold border ${getVeriffBadgeClass(String(receiver.veriff_status || 'not_applicable'))}`}>
                                                    {formatStatus(receiver.veriff_status || 'N/A')}
                                                </span>
                                            </td>
                                            {showCreatedBy && (
                                                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                    {(receiver as any).created_by
                                                        ? ((receiver as any).created_by === 'mobile_app' ? 'mobile user' : (receiver as any).created_by)
                                                        : (normalize(receiver.registration_source) === 'mobile_app' ? 'mobile user' : 'admin')
                                                    }
                                                </td>
                                            )}
                                            {showCreatedAt && (
                                                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                    {formatDateTime(receiver.created_at)}
                                                </td>
                                            )}
                                            {showUpdatedBy && (
                                                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                    {(receiver as any).updated_by
                                                        ? ((receiver as any).updated_by === 'mobile_app' ? 'mobile user' : (receiver as any).updated_by)
                                                        : (normalize(receiver.registration_source) === 'mobile_app' ? 'mobile user' : '—')
                                                    }
                                                </td>
                                            )}
                                            {showUpdatedAt && <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime((receiver as any).updated_at)}</td>}
                                            <td className="px-2 py-4 text-center">
                                                <button
                                                    onClick={() => promptDeleteReceiver(Number(receiver.id))}
                                                    className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={11 + (showCreatedBy ? 1 : 0) + (showCreatedAt ? 1 : 0) + (showUpdatedBy ? 1 : 0) + (showUpdatedAt ? 1 : 0)} className="py-20 text-center">
                                            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Users className="w-10 h-10 text-slate-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No receivers found</h3>
                                            <p className="text-slate-500 dark:text-slate-300">Try adjusting your search or add a new one.</p>
                                        </td>
                                    </tr>
                                )}
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
                                Receiver Name: <span className="font-bold text-teal-600 dark:text-teal-400">{reportsModal.selectedName || 'N/A'}</span>
                            </div>
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
                                                            onClick={() => window.open(withActingUserParam(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORT_DOWNLOAD(reportsModal.selectedId!, report.id), currentUser), '_blank', 'noopener,noreferrer')}
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
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.isAlert ? 'OK' : 'Delete'}
                cancelText="Cancel"
                loading={deleteLoading}
            />

            {selectedReceiver && (
                <VeriffDetailsModal
                    isOpen={!!selectedReceiver}
                    onClose={() => setSelectedReceiver(null)}
                    beneficiaryName={asString(selectedReceiver.name)}
                    veriffStatus={asString(selectedReceiver.veriff_status)}
                    veriffSessionId={asString(selectedReceiver.veriff_session_id)}
                    veriffCheckedAt={asString(selectedReceiver.veriff_checked_at)}
                    veriffPepSanctionMatch={asString(selectedReceiver.veriff_pep_sanction_match)}
                />
            )}
        </div>
    );
}

