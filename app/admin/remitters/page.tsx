'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getCurrentAdminUser, withActingUserParam } from '@/app/lib/adminUserScope';
import { openPdfReport } from '@/app/lib/openPdfReport';
import ConfirmModal from '../components/ConfirmModal';
import VeriffReportsModal from '../components/VeriffReportsModal';
import RemitterDocumentsModal from '../components/RemitterDocumentsModal';
import { formatDateTime } from '@/app/lib/dateUtils';
import { routeKeyOf } from '@/app/lib/routeKeys';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Search, UserPlus, Edit2, Info, Trash2, ChevronRight, Users, FileText, ShieldCheck, X, Loader2, RefreshCcw, Download, FolderOpen } from 'lucide-react';
import { useAuditColumns, usePagePermissions, checkPermission } from '@/app/lib/permissions';

type SortDir = 'asc' | 'desc';

const csvEscape = (value: unknown): string => {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
};

const resolveAmlStatus = (r: any): string => {
    if (!r) return 'pending';

    // 1. Sanction status from backend engine first
    const sancStatus = String(r.sanction_status || '').trim().toLowerCase();
    if (sancStatus && sancStatus !== '-' && sancStatus !== 'pending' && sancStatus !== 'not_started' && sancStatus !== 'null' && sancStatus !== 'undefined') {
        if (sancStatus === 'review' || sancStatus === 'refer' || sancStatus === 'hits') return 'refer';
        if (sancStatus === 'hit' || sancStatus === 'fail') return 'hit';
        if (sancStatus === 'clear' || sancStatus === 'passed' || sancStatus === 'pass') return 'pass';
        return sancStatus;
    }

    // 2. Explicit sender_aml_result / dilisense_result
    const amlRes = String(r.sender_aml_result || r.aml_result || r.aml_status || r.dilisense_result || r.sanction_result || r.verdict || '').trim().toLowerCase();
    if (amlRes && amlRes !== '-' && amlRes !== 'pending' && amlRes !== 'not_started' && amlRes !== 'null' && amlRes !== 'undefined') {
        if (amlRes === 'review' || amlRes === 'refer' || amlRes === 'referred' || amlRes === 'under_review') return 'refer';
        if (amlRes === 'hit' || amlRes === 'fail' || amlRes === 'failed') return 'hit';
        if (amlRes === 'passed' || amlRes === 'pass' || amlRes === 'clear' || amlRes === 'manually passed') return 'pass';
        return amlRes;
    }

    // 3. Sanction score rules (hits > 0)
    if (r.sanction_score !== undefined && r.sanction_score !== null && r.sanction_score !== '') {
        const score = Number(r.sanction_score);
        if (!isNaN(score) && score > 0) {
            return score >= 80 ? 'hit' : 'refer';
        }
    }

    return 'pending';
};

const resolveIdStatus = (r: any): 'Verified' | 'Pending' | 'Expired' => {
    if (!r) return 'Pending';
    const isExpired = Boolean(r.id_expired) || 
                      String(r.id_expired || '').toLowerCase() === 'yes' || 
                      String(r.id_status || '').toLowerCase() === 'expired';

    if (isExpired) return 'Expired';

    const isVerified = String(r.id_verified || '').toLowerCase() === 'yes' ||
                       String(r.id_verified || '').toLowerCase() === 'verified' ||
                       r.id_verified === true ||
                       String(r.id_status || '').toLowerCase() === 'verified';

    if (isVerified) return 'Verified';

    return 'Pending';
};

export default function RemittersPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('REMITTERS');
    const { canAdd, canEdit, canDelete, canPdf, canExport, canReScreening, canDilisenseScreening, canDeleteComplianceReport, canBatchScreening } = usePagePermissions('REMITTERS');
    const currentUser = useMemo(() => getCurrentAdminUser(), []);
    const [selectedRemitter, setSelectedRemitter] = useState<any | null>(null);
    const [viewOverviewRemitter, setViewOverviewRemitter] = useState<any | null>(null);
    const [remitters, setRemitters] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dilisenseEnabled, setDilisenseEnabled] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchDilisenseSetting = async () => {
            try {
                const res = await fetch(ENDPOINTS.MOBILE_ADMIN.SETTINGS);
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        const raw = data.enable_sanction_screening ?? data.enable_dilisense_screening;
                        if (raw !== undefined && raw !== null) {
                            const str = String(raw).toLowerCase().trim();
                            setDilisenseEnabled(str !== 'no' && str !== 'false' && str !== '0');
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to fetch dilisense setting:', e);
            }
        };
        fetchDilisenseSetting();
    }, []);

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
    const [docModal, setDocModal] = useState<{
        isOpen: boolean;
        remitterId: string | number;
        remitterName: string;
    }>({
        isOpen: false,
        remitterId: '',
        remitterName: '',
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
        reports: [],
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

    const [overviewReceivers, setOverviewReceivers] = useState<any[]>([]);
    const [loadingOverviewReceivers, setLoadingOverviewReceivers] = useState<boolean>(false);

    useEffect(() => {
        if (!viewOverviewRemitter) {
            setOverviewReceivers([]);
            return;
        }

        let isMounted = true;
        setLoadingOverviewReceivers(true);

        const fetchReceiversForOverview = async () => {
            try {
                const res = await fetch(withActingUserParam(ENDPOINTS.BENEFICIARIES.LIST, currentUser));
                if (res.ok) {
                    const all = await res.json();
                    if (Array.isArray(all) && isMounted) {
                        const rId = String(viewOverviewRemitter.id || '');
                        const sId = String(viewOverviewRemitter.sender_id || '');
                        const rName = String(viewOverviewRemitter.sender_name || viewOverviewRemitter.name || '').trim().toLowerCase();

                        const matched = all.filter((b: any) => {
                            const bCustId = String(b.customer_id || b.remitter_id || '');
                            const bRemitterName = String(b.remitter_name || b.customer_name || '').trim().toLowerCase();
                            return (
                                (rId && bCustId === rId) ||
                                (sId && bCustId === sId) ||
                                (rName && bRemitterName && bRemitterName === rName)
                            );
                        });

                        setOverviewReceivers(matched);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch receivers for remitter overview:', err);
            } finally {
                if (isMounted) setLoadingOverviewReceivers(false);
            }
        };

        fetchReceiversForOverview();

        return () => {
            isMounted = false;
        };
    }, [viewOverviewRemitter, currentUser]);

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
    const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
    const [batchRunning, setBatchRunning] = useState(false);
    const [showBatchConfirm, setShowBatchConfirm] = useState(false);

    const handleToggleSelect = (id: string | number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const ids = pagedRows.map((row: any) => row.id);
            setSelectedIds(new Set(ids));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleRunBatchScreening = async () => {
        if (selectedIds.size === 0) return;
        setBatchRunning(true);
        setShowBatchConfirm(false);
        try {
            const res = await fetch(
                withActingUserParam(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy'}/remitters/batch-dilisense-reports`,
                    currentUser
                ),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(selectedIds) }),
                }
            );
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setSelectedIds(new Set());
                fetchRemitters();
                setConfirmModal({
                    isOpen: true,
                    title: 'Batch Screening Completed',
                    message: `Successfully processed batch Dilisense checks for the selected remitters.`,
                    type: 'success',
                    isAlert: true,
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Batch Screening Failed',
                    message: data?.message || 'Failed to process batch screening.',
                    type: 'danger',
                    isAlert: true,
                });
            }
        } catch (error) {
            console.error('Failed to run batch screening:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while running batch screening.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setBatchRunning(false);
        }
    };


    useEffect(() => {
        fetchRemitters();
    }, [statusFilter, sourceFilter, branchFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const fetchRemitters = async () => {
        setLoading(true);
        try {
            let currentBranches = branches;
            if (currentBranches.length === 0) {
                try {
                    const bRes = await fetch(ENDPOINTS.BRANCHES.LIST);
                    if (bRes.ok) {
                        const bData = await bRes.json();
                        currentBranches = bData || [];
                        setBranches(currentBranches);
                    }
                } catch (bErr) {
                    console.error('Failed to load branches:', bErr);
                }
            }

            const branchesMap = new Map(currentBranches.map((b: any) => [b.code, b.name]));

            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (sourceFilter !== 'all') params.append('registration_source', sourceFilter);
            if (branchFilter !== 'all') params.append('branch', branchFilter);
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
                branch_name: branchesMap.get(r.branch) || r.branch || '-',
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
                id_status: resolveIdStatus(r),
                proof_of_funds: r.proof_of_funds || 'no',
                id_type: r.id_type || '-',
                id_no: r.id_number || '-',
                id_expire_date: r.id_expiry || '-',
                other_info: r.other_info || '-',
                use_in: r.use_in || 'All',
                sender_aml_doc: r.sender_details_aml_screening_doc || '-',
                sender_aml_result: resolveAmlStatus(r),
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

    const handleStartRescreenFlow = () => {
        setShowRescreenConfirm(true);
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
        { key: 'sender_id', label: 'Remitter Reference ID' },
        { key: 'sender_name', label: 'Remitter Name' },
        { key: 'active', label: 'Active' },
        { key: 'dob', label: 'Date Of Birth' },
        { key: 'place_of_birth', label: 'Country of Birth' },
        { key: 'telephone', label: 'Mobile number' },
        { key: 'postcode', label: 'Postcode' },
        { key: 'address_1', label: 'Address 1' },
        { key: 'address_2', label: 'Address 2' },
        { key: 'city', label: 'City' },
        { key: 'country', label: 'Country' },
        { key: 'occupation', label: 'Occupation' },
        { key: 'id_status', label: 'ID Status' },
        { key: 'id_type', label: 'ID Type' },
        { key: 'id_no', label: 'ID No' },
        { key: 'id_expire_date', label: 'ID Expire Date' },
        { key: 'verification_state', label: 'AML Verifications' },
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

            <RemitterDocumentsModal
                isOpen={docModal.isOpen}
                onClose={() => setDocModal({ isOpen: false, remitterId: '', remitterName: '' })}
                remitterId={docModal.remitterId}
                remitterName={docModal.remitterName}
            />

            {reportsModal.isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 transition-all duration-300">
                    <div className="w-full max-w-4xl rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-700/50 dark:bg-slate-900/95 backdrop-blur-lg transform transition-all duration-300 scale-100">
                        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                                    </span>
                                    <ShieldCheck className="h-6 w-6 text-teal-500" />
                                    AML Reports
                                </h2>
                                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Manage, view, run checks, or delete AML Reports for {reportsModal.selectedName || '-'}.
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
                            {dilisenseEnabled && (canReScreening || canDilisenseScreening) && (
                                <button
                                    type="button"
                                    disabled={reportsModal.generating || !reportsModal.selectedName}
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
                                            New Check
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
                                        {reportsModal.reports.map((report) => (
                                            <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="py-4 px-4 text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                                    {formatDateTime(report.created_at)}
                                                </td>
                                                <td className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                    {(report as any).provider || (report.reference?.startsWith('VERIFF') ? 'Veriff' : 'Dilisense')}
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

            {showRescreenConfirm && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 transition-all duration-300">
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
                                    const remitter = remitters.find(r => r.id === reportsModal.selectedId);
                                    const defaultFuzzy = await fetchDefaultFuzzySearch();
                                    const fuzzyPerm = checkPermission('DILISENSE_SOURCES', 'EDIT_FUZZY_SEARCH');

                                    setRescreenParams({
                                        isOpen: true,
                                        name: remitter?.sender_name || reportsModal.selectedName,
                                        dob: remitter?.dob || '',
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
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 transition-all duration-300">
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
                                    value={rescreenParams.fuzzySearch}
                                    onChange={(e) => setRescreenParams(prev => ({ ...prev, fuzzySearch: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200/50 bg-white/95 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/90 dark:text-white"
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
                                    const pdfWindow = window.open('', '_blank');
                                    if (pdfWindow) {
                                        pdfWindow.document.write('<title>Generating AML Report...</title><div style="font-family: system-ui, sans-serif; padding: 24px; color: #334155;"><h3>Generating AML Report...</h3><p>Running Dilisense name screening and building PDF report, please wait...</p></div>');
                                        pdfWindow.document.close();
                                    }

                                    setRescreenParams(prev => ({ ...prev, isSubmitting: true }));
                                    setReportsModal(prev => ({ ...prev, generating: true }));

                                    try {
                                        const res = await fetch(
                                            withActingUserParam(
                                                ENDPOINTS.REMITTERS.DILISENSE_REPORT_GENERATE(reportsModal.selectedId!),
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
                                                    ENDPOINTS.REMITTERS.DILISENSE_REPORTS_LIST(reportsModal.selectedId!),
                                                    currentUser
                                                )
                                            );
                                            const listData = await listRes.json().catch(() => []);
                                            setReportsModal(prev => ({
                                                ...prev,
                                                generating: false,
                                                reports: Array.isArray(listData) ? listData : prev.reports,
                                            }));

                                            setRescreenParams(prev => ({ ...prev, isOpen: false }));

                                            const newReportId = data?.id || (Array.isArray(listData) && listData[0]?.id);
                                            if (newReportId) {
                                                void openPdfReport(
                                                    withActingUserParam(
                                                        ENDPOINTS.REMITTERS.DILISENSE_REPORT_DOWNLOAD(reportsModal.selectedId!, newReportId),
                                                        currentUser
                                                    ),
                                                    currentUser,
                                                    pdfWindow
                                                );
                                            } else if (pdfWindow) {
                                                pdfWindow.close();
                                            }

                                            // Synchronously update remitters list and overview modal with latest Dilisense check result
                                            const newStatus = data?.sender_aml_result || data?.aml_result || data?.status || data?.verdict || (data?.hits_count > 0 ? 'hit' : 'passed');
                                            const newAmlResult = (['pass', 'passed', 'clear', 'approved', 'verified', 'manually passed'].includes(String(newStatus).toLowerCase()) || String(newStatus).toLowerCase().includes('pass')) ? 'passed' : newStatus;

                                            setRemitters((prev) => prev.map((rItem) => {
                                                if (rItem.id === reportsModal.selectedId) {
                                                    return {
                                                        ...rItem,
                                                        sender_aml_result: newAmlResult,
                                                        verification_state: 'verified',
                                                    };
                                                }
                                                return rItem;
                                            }));

                                            if (viewOverviewRemitter?.id === reportsModal.selectedId) {
                                                setViewOverviewRemitter((prev: any) => ({
                                                    ...prev,
                                                    sender_aml_result: newAmlResult,
                                                    verification_state: 'verified',
                                                }));
                                            }

                                            void fetchRemitters();

                                            setConfirmModal({
                                                isOpen: true,
                                                title: 'Check Success',
                                                message: 'A new Dilisense AML check has been run and PDF report saved successfully.',
                                                type: 'success',
                                                isAlert: true,
                                            });
                                        } else {
                                            if (pdfWindow) pdfWindow.close();
                                            setReportsModal(prev => ({ ...prev, generating: false }));
                                            setRescreenParams(prev => ({ ...prev, isSubmitting: false }));
                                            setConfirmModal({
                                                isOpen: true,
                                                title: 'Check Failed',
                                                message: data?.message || 'Failed to run Dilisense check.',
                                                type: 'danger',
                                                isAlert: true,
                                            });
                                        }
                                    } catch (err) {
                                        if (pdfWindow) pdfWindow.close();
                                        console.error('Failed to run screening:', err);
                                        setReportsModal(prev => ({ ...prev, generating: false }));
                                        setRescreenParams(prev => ({ ...prev, isSubmitting: false }));
                                        setConfirmModal({
                                            isOpen: true,
                                            title: 'Error',
                                            message: 'An error occurred while running the check.',
                                            type: 'danger',
                                            isAlert: true,
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
                                <option value="branch">Web</option>
                                <option value="mobile_app">Mobile App</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-500 dark:text-slate-200 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Branch</label>
                        <div className="relative input-icon">
                            <select
                                className="input-glass w-full appearance-none pr-10 text-sm"
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                            >
                                <option value="all">All</option>
                                {branches.map((b: any) => (
                                    <option key={b.id || b.code} value={b.code || b.name}>
                                        {b.name && b.code && b.name !== b.code ? `${b.name} (${b.code})` : (b.name || b.code)}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-slate-500 dark:text-slate-200 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {dilisenseEnabled && canBatchScreening && selectedIds.size > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-2xl bg-teal-50/50 p-4 dark:bg-slate-800/80 border border-teal-100/30 dark:border-slate-700 animate-fade-in shadow-md">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {selectedIds.size} {selectedIds.size === 1 ? 'remitter' : 'remitters'} selected
                    </span>
                    <button
                        type="button"
                        disabled={batchRunning}
                        onClick={() => setShowBatchConfirm(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {batchRunning ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Processing Batch...
                            </>
                        ) : (
                            <>
                                <RefreshCcw className="h-3.5 w-3.5" />
                                Run Batch Dilisense Check
                            </>
                        )}
                    </button>
                </div>
            )}

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
                                    {canBatchScreening && (
                                        <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-300 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === pagedRows.length && pagedRows.length > 0}
                                                onChange={handleSelectAll}
                                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                                            />
                                        </th>
                                    )}
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300">No.</th>
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="View Overview"><Info className="w-4 h-4 mx-auto text-slate-400" /></th>
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Documents"><FolderOpen className="w-4 h-4 mx-auto text-slate-400" /></th>
                                    {canEdit && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Edit"><Edit2 className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                    {canPdf && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="AML PDF"><FileText className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Add Receiver"><UserPlus className="w-4 h-4 mx-auto text-slate-400" /></th>
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
                                        {canBatchScreening && (
                                            <td className="px-2 py-4 text-center w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(row.id)}
                                                    onChange={() => handleToggleSelect(row.id)}
                                                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                        <td className="px-2 py-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setViewOverviewRemitter(row)}
                                                className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                title="View Overview"
                                            >
                                                <Info className="w-5 h-5" />
                                            </button>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setDocModal({ isOpen: true, remitterId: row.id, remitterName: row.sender_name })}
                                                className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                title="Remitter Documents"
                                            >
                                                <FolderOpen className="w-5 h-5" />
                                            </button>
                                        </td>
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
                                                    title={String(row.registration_source || '').trim().toLowerCase() === 'mobile_app' ? "Veriff Verification Report" : "AML Reports"}
                                                >
                                                    <FileText className="w-5 h-5" />
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-2 py-4 text-center">
                                            <Link
                                                href={`/admin/receivers/create?customer_id=${encodeURIComponent(row.id)}&sender_id=${encodeURIComponent(row.sender_id || '')}`}
                                                className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                title="Add Receiver"
                                            >
                                                <UserPlus className="w-5 h-5" />
                                            </Link>
                                        </td>
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
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.country || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.occupation || '-'}</td>
                                        <td className="px-4 py-4 text-sm">
                                            {(() => {
                                                const st = resolveIdStatus(row);
                                                if (st === 'Expired') {
                                                    return (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                                                            Expired
                                                        </span>
                                                    );
                                                }
                                                if (st === 'Verified') {
                                                    return (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                            Verified
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                        Pending
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.id_type || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.id_no || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{row.id_expire_date || '-'}</td>
                                        <td className="px-4 py-4 text-sm">
                                            {(() => {
                                                const rawVal = resolveAmlStatus(row);
                                                const s = String(rawVal || '').trim().toLowerCase();

                                                const isPass = ['pass', 'passed', 'clear', 'approved', 'verified', 'manually passed', 'clean', 'no_match', 'no match', 'ok'].includes(s) || s.includes('pass') || s.includes('clear');
                                                const isRefer = ['refer', 'referred', 'review', 'under_review'].includes(s) || s.includes('refer') || s.includes('review');
                                                const isHit = ['hit', 'fail', 'failed', 'match', 'matches', 'rejected', 'expired'].includes(s) || s.includes('hit') || s.includes('fail');

                                                let badgeText = 'PENDING';
                                                let badgeClass = 'bg-amber-500 text-white font-extrabold px-3 py-1 text-xs rounded-lg shadow-sm';

                                                if (isPass) {
                                                    badgeText = '✓ PASS';
                                                    badgeClass = 'bg-emerald-500 text-white font-extrabold px-3 py-1 text-xs rounded-lg shadow-sm';
                                                } else if (isRefer) {
                                                    badgeText = s.includes('refer') ? 'REFER' : 'REVIEW';
                                                    badgeClass = 'bg-amber-500 text-white font-extrabold px-3 py-1 text-xs rounded-lg shadow-sm';
                                                } else if (isHit) {
                                                    badgeText = '⚠ HIT';
                                                    badgeClass = 'bg-rose-600 text-white font-extrabold px-3 py-1 text-xs rounded-lg shadow-sm';
                                                }

                                                return (
                                                    <span className={`inline-flex items-center justify-center ${badgeClass}`}>
                                                        {badgeText}
                                                    </span>
                                                );
                                            })()}
                                        </td>
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
            {showBatchConfirm && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 transition-all duration-300">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-700/50 dark:bg-slate-900/95 backdrop-blur-lg transform scale-100 transition-all duration-300">
                        <div className="mb-4 text-center">
                            <ShieldCheck className="mx-auto h-12 w-12 text-teal-500 mb-3" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Batch Screening</h3>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                Are you sure you want to run new Dilisense checks for the {selectedIds.size} selected remitters?
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowBatchConfirm(false)}
                                className="w-1/2 rounded-full border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRunBatchScreening}
                                className="w-1/2 rounded-full bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {viewOverviewRemitter && (
                <div
                    onClick={() => setViewOverviewRemitter(null)}
                    className="fixed inset-0 z-[1050] flex items-center justify-center p-4 transition-all duration-300 pointer-events-auto"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-700/50 dark:bg-slate-900/95 backdrop-blur-lg"
                    >
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Remitter Overview</p>
                                <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
                                    {viewOverviewRemitter.sender_name || '-'}
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDocModal({ isOpen: true, remitterId: viewOverviewRemitter.id, remitterName: viewOverviewRemitter.sender_name })}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-sm transition-all"
                                >
                                    <FolderOpen className="w-4 h-4" /> Documents
                                </button>
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${String(viewOverviewRemitter.active || '').toLowerCase() === 'active'
                                        ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300'
                                        : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
                                    }`}>
                                    {viewOverviewRemitter.active || 'Inactive'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setViewOverviewRemitter(null)}
                                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Identity & Contact */}
                            <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4 space-y-2">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Identity & Contact</p>
                                <div>
                                    <p className="text-xs text-slate-400">Remitter Reference ID</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{viewOverviewRemitter.sender_id || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Date of Birth</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{viewOverviewRemitter.dob || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Country of Birth</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{viewOverviewRemitter.place_of_birth || '-'}</p>
                                </div>
                                {viewOverviewRemitter.telephone && (
                                    <div>
                                        <p className="text-xs text-slate-400">Mobile Number</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{viewOverviewRemitter.telephone}</p>
                                    </div>
                                )}
                            </div>

                            {/* Branch & Address */}
                            <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4 space-y-2">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Branch & Address</p>
                                <div>
                                    <p className="text-xs text-slate-400">Branch</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{viewOverviewRemitter.branch_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Occupation</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{viewOverviewRemitter.occupation || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Address</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{viewOverviewRemitter.address_1 || '-'}</p>
                                    {viewOverviewRemitter.address_2 && viewOverviewRemitter.address_2 !== '-' && (
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{viewOverviewRemitter.address_2}</p>
                                    )}
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {[viewOverviewRemitter.city, viewOverviewRemitter.county, viewOverviewRemitter.country]
                                            .map((part) => String(part || '').trim())
                                            .filter((part) => part && part !== '-')
                                            .join(', ')
                                        }
                                        {viewOverviewRemitter.postcode && String(viewOverviewRemitter.postcode).trim() ? ` ${String(viewOverviewRemitter.postcode).trim()}` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* ID & Compliance */}
                            <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4 space-y-2">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">ID & Compliance</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-slate-400">ID Type</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{viewOverviewRemitter.id_type || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">ID Number</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{viewOverviewRemitter.id_no || '-'}</p>
                                    </div>
                                </div>
                                {viewOverviewRemitter.id_expire_date && (
                                    <div>
                                        <p className="text-xs text-slate-400">ID Expiry Date</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{viewOverviewRemitter.id_expire_date}</p>
                                    </div>
                                )}
                                <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200/50 dark:border-slate-800">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ID Status</span>
                                    {(() => {
                                        const st = resolveIdStatus(viewOverviewRemitter);
                                        if (st === 'Expired') {
                                            return <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">Expired</span>;
                                        }
                                        if (st === 'Verified') {
                                            return <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Verified</span>;
                                        }
                                        return <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Pending</span>;
                                    })()}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">AML Verification Result</span>
                                    {(() => {
                                        const rawVal = resolveAmlStatus(viewOverviewRemitter);
                                        const s = String(rawVal || '').trim().toLowerCase();

                                        const isPass = ['pass', 'passed', 'clear', 'approved', 'verified', 'manually passed', 'clean', 'no_match', 'no match', 'ok'].includes(s) || s.includes('pass') || s.includes('clear');
                                        const isRefer = ['refer', 'referred', 'review', 'under_review'].includes(s) || s.includes('refer') || s.includes('review');
                                        const isHit = ['hit', 'fail', 'failed', 'match', 'matches', 'rejected', 'expired'].includes(s) || s.includes('hit') || s.includes('fail');

                                        let badgeText = 'PENDING';
                                        let badgeClass = 'bg-amber-500 text-white font-extrabold px-2.5 py-0.5 text-xs rounded-lg shadow-sm';

                                        if (isPass) {
                                            badgeText = '✓ PASS';
                                            badgeClass = 'bg-emerald-500 text-white font-extrabold px-2.5 py-0.5 text-xs rounded-lg shadow-sm';
                                        } else if (isRefer) {
                                            badgeText = s.includes('refer') ? 'REFER' : 'REVIEW';
                                            badgeClass = 'bg-amber-500 text-white font-extrabold px-2.5 py-0.5 text-xs rounded-lg shadow-sm';
                                        } else if (isHit) {
                                            badgeText = '⚠ HIT';
                                            badgeClass = 'bg-rose-600 text-white font-extrabold px-2.5 py-0.5 text-xs rounded-lg shadow-sm';
                                        }

                                        return (
                                            <span className={`inline-flex items-center justify-center ${badgeClass}`}>
                                                {badgeText}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {overviewReceivers.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                            Receivers
                                        </h3>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-500/15 text-teal-700 dark:text-teal-300">
                                        {overviewReceivers.length} {overviewReceivers.length === 1 ? 'Receiver' : 'Receivers'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {overviewReceivers.map((receiver: any, idx: number) => (
                                        <div key={receiver.id || idx} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-xs flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={receiver.name || `${receiver.first_name || ''} ${receiver.last_name || ''}`}>
                                                        {receiver.name || [receiver.first_name, receiver.last_name].filter(Boolean).join(' ') || 'Receiver'}
                                                    </p>
                                                    {(receiver.relationship || receiver.relationship_to_sender) && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                                            {receiver.relationship || receiver.relationship_to_sender}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    {[receiver.country, receiver.city].filter(Boolean).join(', ') || '-'}
                                                </p>
                                            </div>
                                            {(receiver.bank_name || receiver.account_number || receiver.mobile_number) && (
                                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                                                    <span className="font-medium truncate">{receiver.bank_name || 'Account'}</span>
                                                    <span className="font-mono text-slate-400 shrink-0">{receiver.account_number || receiver.mobile_number}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setViewOverviewRemitter(null)}
                                className="rounded-full bg-slate-100 px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
