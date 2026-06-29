'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { resolveUploadsUrl } from '@/app/lib/uploads';
import { ArrowLeft, Download, History, Search, RotateCcw, Save, X, Edit3, Loader2 } from 'lucide-react';
import { formatDateTime as globalFormatDateTime } from '@/app/lib/dateUtils';
import { usePagePermissions } from '@/app/lib/permissions';
import { showToast } from '@/app/lib/toast';

type Transfer = {
    id: string | number;
    code?: string | null;
    type?: string | null;
    remitter_id?: string | number | null;
    beneficiary_id?: string | number | null;
    branch_id?: string | null;
    source_amount?: string | number | null;
    dest_amount?: string | number | null;
    rate?: string | number | null;
    payment_mode?: string | null;
    source_of_funds?: string | null;
    purpose?: string | null;
    status?: string | null;
    collection_method?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    meta_json?: string | null;
    transfer_meta?: Record<string, unknown>;
};

type Remitter = {
    id: string | number;
    sender_id?: string | null;
    name?: string | null;
    kyc_status?: string | null;
    dob?: string | null;
    place_of_birth?: string | null;
    phone?: string | null;
    postcode?: string | null;
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    country?: string | null;
    sender_details_aml_screening_doc?: string | null;
};

type Beneficiary = {
    id: string | number;
    name?: string | null;
    status?: string | null;
    mobile_number?: string | null;
    bank_name?: string | null;
    branch_name?: string | null;
    branch_code?: string | null;
    account_number?: string | null;
    iban?: string | null;
    payment_mode?: string | null;
    receiver_id_type?: string | null;
    receiver_id_number?: string | null;
    country?: string | null;
    city?: string | null;
    address?: string | null;
    date_of_birth?: string | null;
    place_of_birth?: string | null;
};

type AuditLog = {
    id: string | number;
    action?: string | null;
    created_at?: string | null;
    performed_by_username?: string | null;
    performed_by_branch?: string | null;
    changed_fields?: string | null;
    changed_fields_list?: string[];
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
};

type AuditLogsResponse = {
    data?: AuditLog[];
    pagination?: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    };
};

type FieldRow = {
    field: string;
    value: React.ReactNode;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const asString = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value);
};

const asNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatStatus = (value: string): string => {
    if (!value) return '-';
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const normalizeStatusKey = (value: unknown): string => (
    asString(value).trim().toLowerCase().replace(/\s+/g, '_')
);

const isMobileWalletTransfer = (transfer: Transfer | null, meta: Record<string, unknown>): boolean => {
    if (!transfer) return false;
    return normalizeStatusKey(transfer.type) === 'mobile_app'
        || normalizeStatusKey(meta.channel) === 'mobile_app'
        || normalizeStatusKey(transfer.payment_mode) === 'trust_wallet';
};

const statusBadgeClass = (value: unknown): string => {
    switch (normalizeStatusKey(value)) {
        case 'awaiting_funds':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        case 'funds_received':
            return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
        case 'processing':
            return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
        case 'approved':
        case 'completed':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'cancelled':
        case 'rejected':
            return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
        default:
            return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
};

const normalizeAction = (value: unknown): string => {
    const raw = asString(value).trim();
    if (!raw) return '-';
    return raw
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateTime = (value: unknown): string => globalFormatDateTime(value as any);



const yesNo = (value: unknown): string => {
    const v = asString(value).trim().toLowerCase();
    if (!v) return 'No';
    if (['yes', 'y', 'true', '1', 'active', 'verified', 'pass', 'passed'].includes(v)) return 'Yes';
    if (['no', 'n', 'false', '0', 'inactive', 'unverified', 'fail', 'failed'].includes(v)) return 'No';
    return asString(value);
};

const paymentModeLabel = (value: unknown): string => {
    const raw = asString(value).trim().toUpperCase();
    if (!raw) return 'NONE';
    if (raw === 'P') return 'P - CASH PICKUP';
    if (raw === 'D') return 'D - DIRECT BANK';
    return raw;
};

const auditActionOptions = [
    'all',
    'create',
    'update',
    'approve',
    'cancel',
    'delete',
];

const parseTransferMeta = (transfer: Transfer | null): Record<string, unknown> => {
    if (!transfer) return {};
    if (isRecord(transfer.transfer_meta)) return transfer.transfer_meta;
    if (transfer.meta_json) {
        try {
            const parsed = JSON.parse(transfer.meta_json);
            if (isRecord(parsed)) return parsed;
        } catch {
            return {};
        }
    }
    return {};
};

const fieldValue = (...values: unknown[]): string => {
    for (const value of values) {
        const text = asString(value).trim();
        if (text) return text;
    }
    return '-';
};

const encodePath = (rawPath: string): string => (
    rawPath
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/')
);

const docUrl = (value: unknown): string | null => {
    const raw = asString(value).trim();
    if (!raw || raw === '-' || raw.toLowerCase() === 'none') return null;
    if (raw.startsWith('data:')) return raw;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return resolveUploadsUrl(raw);

    const normalized = raw.replace(/^\/+/, '');
    const withoutUploadsPrefix = normalized.startsWith('uploads/')
        ? normalized.slice('uploads/'.length)
        : normalized;
    const encoded = encodePath(withoutUploadsPrefix);

    return resolveUploadsUrl(`uploads/${encoded}`);
};

function DocumentCell({ value }: { value: unknown }) {
    const label = asString(value).trim();
    const url = docUrl(value);

    if (!label || !url) {
        return <span className="text-slate-500 dark:text-slate-300">No Image</span>;
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600"
        >
            file
            <Download className="w-3.5 h-3.5" />
            Download
        </a>
    );
}

function DetailCard({ title, rows }: { title: string; rows: FieldRow[] }) {
    return (
        <div className="card-glass p-6 md:p-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rows.map((row) => (
                    <div key={row.field} className="rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-100/70 dark:border-slate-700/60 px-4 py-3">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-300">{row.field}</p>
                        <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200 break-words">{row.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function TransferDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = params.id as string;

    const { canView: canViewAuditLogs } = usePagePermissions('AUDIT_LOGS');
    const { canEdit } = usePagePermissions('TRANSFERS');

    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
    const [isSaving, setIsSaving] = useState(false);
    const [transfer, setTransfer] = useState<Transfer | null>(null);
    const [remitter, setRemitter] = useState<Remitter | null>(null);
    const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditAction, setAuditAction] = useState('all');
    const [auditUser, setAuditUser] = useState('');
    const [auditDateFrom, setAuditDateFrom] = useState('');
    const [auditDateTo, setAuditDateTo] = useState('');
    const [auditPage, setAuditPage] = useState(1);
    const [auditPageSize, setAuditPageSize] = useState(10);
    const [auditTotal, setAuditTotal] = useState(0);
    const [auditTotalPages, setAuditTotalPages] = useState(1);

    const [editForm, setEditForm] = useState({
        source_amount: '',
        dest_amount: '',
        rate: '',
        payment_mode: '',
        source_of_funds: '',
        purpose: '',
        collection_method: '',
        status: '',
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const transferRes = await fetch(ENDPOINTS.TRANSFERS.DETAIL(id));
            if (!transferRes.ok) {
                setTransfer(null);
                return;
            }
            const transferData = await transferRes.json() as Transfer;
            setTransfer(transferData);

            const remitterId = transferData.remitter_id;
            const beneficiaryId = transferData.beneficiary_id;

            const [remitterRes, beneficiaryRes] = await Promise.all([
                remitterId ? fetch(ENDPOINTS.REMITTERS.DETAIL(remitterId)) : Promise.resolve(null),
                beneficiaryId ? fetch(ENDPOINTS.BENEFICIARIES.DETAIL(beneficiaryId)) : Promise.resolve(null)
            ]);

            if (remitterRes && remitterRes.ok) {
                setRemitter(await remitterRes.json() as Remitter);
            }
            if (beneficiaryRes && beneficiaryRes.ok) {
                setBeneficiary(await beneficiaryRes.json() as Beneficiary);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        if (transfer) {
            setEditForm({
                source_amount: String(transfer.source_amount || ''),
                dest_amount: String(transfer.dest_amount || ''),
                rate: String(transfer.rate || ''),
                payment_mode: transfer.payment_mode || '',
                source_of_funds: transfer.source_of_funds || '',
                purpose: transfer.purpose || '',
                collection_method: transfer.collection_method || '',
                status: transfer.status || '',
            });
        }
    }, [transfer]);

    useEffect(() => {
        if (!transfer) return;

        let cancelled = false;

        const fetchAuditLogs = async () => {
            if (!canViewAuditLogs) return;
            setAuditLoading(true);
            try {
                const transferId = asString(transfer.id || id);
                const params = new URLSearchParams({
                    entity_type: 'transfer',
                    entity_id: transferId,
                    paginated: '1',
                    page: String(auditPage),
                    per_page: String(auditPageSize),
                    order_by: 'created_at',
                    order_dir: 'desc',
                });

                if (auditAction !== 'all') params.set('action', auditAction);
                if (auditUser.trim()) params.set('performed_by', auditUser.trim());
                if (auditDateFrom) params.set('date_from', auditDateFrom);
                if (auditDateTo) params.set('date_to', auditDateTo);

                const res = await fetch(`${ENDPOINTS.AUDIT_LOGS.LIST}?${params.toString()}`);
                if (!res.ok) throw new Error('Failed to load audit logs');

                const payload = await res.json() as AuditLogsResponse | AuditLog[];
                if (cancelled) return;

                if (Array.isArray(payload)) {
                    setAuditLogs(payload);
                    setAuditTotal(payload.length);
                    setAuditTotalPages(1);
                    return;
                }

                const rows = Array.isArray(payload.data) ? payload.data : [];
                const pagination = payload.pagination;

                setAuditLogs(rows);
                setAuditTotal(pagination?.total ?? rows.length);
                setAuditTotalPages(pagination?.total_pages ?? 1);
            } catch (error) {
                if (cancelled) return;
                console.error('Failed to load audit logs:', error);
                setAuditLogs([]);
                setAuditTotal(0);
                setAuditTotalPages(1);
            } finally {
                if (!cancelled) setAuditLoading(false);
            }
        };

        fetchAuditLogs();

        return () => {
            cancelled = true;
        };
    }, [transfer, id, auditAction, auditUser, auditDateFrom, auditDateTo, auditPage, auditPageSize, canViewAuditLogs]);

    const meta = useMemo(() => parseTransferMeta(transfer), [transfer]);
    const mobileWalletTransfer = useMemo(() => isMobileWalletTransfer(transfer, meta), [transfer, meta]);

    if (loading) {
        return <div className="max-w-7xl mx-auto p-10 text-center text-slate-500 animate-pulse">Loading transfer details...</div>;
    }

    if (!transfer) {
        return (
            <div className="max-w-7xl mx-auto p-10 text-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Transfer not found</h3>
                <Link href="/admin/transfers" className="inline-block mt-4 text-teal-600 hover:text-teal-500 font-semibold">
                    Back to Transfers
                </Link>
            </div>
        );
    }

    const pendingDate = fieldValue(meta.pending_date, meta.status_pending_at, transfer.created_at);
    const completeDate = transfer.status === 'completed'
        ? fieldValue(meta.complete_date, meta.status_completed_at, transfer.updated_at)
        : fieldValue(meta.complete_date, meta.status_completed_at, '');
    const cancelDate = ['cancelled', 'rejected'].includes(asString(transfer.status).toLowerCase())
        ? fieldValue(meta.cancel_date, meta.status_cancelled_at, transfer.updated_at)
        : fieldValue(meta.cancel_date, meta.status_cancelled_at, '');
    const walletStatusHistory = Array.isArray(meta.wallet_status_history) ? meta.wallet_status_history : [];
    const latestWalletEvent = walletStatusHistory.length > 0
        ? walletStatusHistory[walletStatusHistory.length - 1] as Record<string, unknown>
        : null;

    const overviewRows: FieldRow[] = [
        { field: 'To Branch', value: fieldValue(meta.branch_name, transfer.branch_id) },
        { field: 'Invoice No', value: fieldValue(transfer.code, meta.invoice_no) },
        { field: 'Invoicing Date', value: formatDateTime(meta.invoicing_date || transfer.created_at) },
        { field: 'Invoice Status', value: formatStatus(fieldValue(transfer.status, 'Pending')) },
        {
            field: 'Status Dates',
            value: `Pending Date - ${pendingDate} Complete Date - ${completeDate === '-' ? '' : completeDate} Cancel Date - ${cancelDate === '-' ? '' : cancelDate}`
        },
        { field: 'Payout Currency', value: fieldValue(meta.payout_currency) },
        { field: 'Customer Rate', value: asNumber(meta.customer_rate_for_gbp || transfer.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { field: 'Receive Amount (£)', value: asNumber(transfer.source_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { field: 'FC Transfer Amount', value: asNumber(transfer.dest_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        ...(mobileWalletTransfer ? [{
            field: 'Funding Channel',
            value: 'Mobile Wallet',
        }] : []),
    ];

    const senderRows: FieldRow[] = [
        { field: 'Transaction Id', value: fieldValue(meta.transaction_id) },
        { field: 'Other Transaction Id', value: fieldValue(meta.other_transaction_id) },
        { field: 'Sender Verified', value: yesNo(meta.sender_verified ?? remitter?.kyc_status) },
        { field: 'Sender Id', value: fieldValue(meta.sender_id, remitter?.sender_id) },
        { field: 'Sender Name', value: fieldValue(meta.sender_name, remitter?.name) },
        { field: 'Sender Date Of Birth', value: fieldValue(meta.sender_dob, remitter?.dob) },
        { field: 'Sender Place of Birth', value: fieldValue(meta.sender_place_of_birth, remitter?.place_of_birth) },
        { field: 'Sender Contacts', value: fieldValue(meta.sender_contacts, remitter?.phone) },
        { field: 'Sender Postcode', value: fieldValue(meta.sender_postcode, remitter?.postcode) },
        { field: 'Deposit Bank', value: fieldValue(meta.deposit_bank) },
        { field: 'Deposit Branch', value: fieldValue(meta.deposit_branch) },
        { field: 'Source Of Income', value: fieldValue(transfer.source_of_funds) },
        { field: 'Relationship', value: fieldValue(meta.relationship) },
        { field: 'Purpose Of Transaction', value: fieldValue(transfer.purpose) },
        { field: 'Other Purpose', value: fieldValue(meta.other_purpose) },
        { field: 'Entry Type', value: fieldValue(meta.entry_type, transfer.collection_method) },
        { field: 'Payment Mode', value: fieldValue(meta.payment_mode, paymentModeLabel(transfer.payment_mode)) }
    ];

    const walletRows: FieldRow[] = mobileWalletTransfer ? [
        { field: 'Funding Channel', value: formatStatus(fieldValue(meta.channel, 'mobile_app')) },
        { field: 'Funding Model', value: 'Shared Trust Wallet' },
        { field: 'Wallet Status', value: formatStatus(fieldValue(transfer.status, 'awaiting_funds')) },
        { field: 'Payment Reference', value: fieldValue(meta.payment_reference, meta.transaction_id, transfer.code) },
        { field: 'Wallet Transaction Hash', value: fieldValue(meta.wallet_tx_hash) },
        { field: 'Payment Mode', value: fieldValue(meta.payment_mode, paymentModeLabel(transfer.payment_mode), 'Trust Wallet') },
        { field: 'Collection Method', value: fieldValue(transfer.collection_method, 'manual_settlement') },
        { field: 'Wallet Funds Received At', value: formatDateTime(meta.wallet_received_at) },
        { field: 'Processing Started At', value: formatDateTime(meta.processing_started_at) },
        { field: 'Completed At', value: formatDateTime(meta.completed_at) },
        { field: 'Rejected At', value: formatDateTime(meta.rejected_at) },
        { field: 'Latest Wallet Note', value: fieldValue(meta.wallet_status_note, latestWalletEvent?.note) },
    ] : [];

    const receiverRows: FieldRow[] = [
        { field: 'Receiver Verified', value: yesNo(meta.receiver_verified ?? beneficiary?.status) },
        { field: 'Receiver Name', value: fieldValue(meta.receiver_name, beneficiary?.name) },
        { field: 'Receiver Contacts', value: fieldValue(meta.receiver_contacts, beneficiary?.mobile_number) },
        { field: 'Receiver Address', value: fieldValue(meta.receiver_address, beneficiary?.address) },
        { field: 'Receiver City', value: fieldValue(meta.receiver_city, beneficiary?.city) },
        { field: 'Receiver Country', value: fieldValue(meta.receiver_country, beneficiary?.country) },
        { field: 'Receiver Date Of Birth', value: fieldValue(meta.receiver_dob, beneficiary?.date_of_birth) },
        { field: 'Receiver Place of Birth', value: fieldValue(meta.receiver_place_of_birth, beneficiary?.place_of_birth) },
        { field: 'CNIC No', value: fieldValue(meta.cnic_no) },
        { field: 'Receiver Payment Mode', value: fieldValue(meta.receiver_payment_mode, beneficiary?.payment_mode) },
        { field: 'Bank', value: fieldValue(meta.receiver_bank, beneficiary?.bank_name) },
        { field: 'Branch Name', value: fieldValue(meta.receiver_branch_name, beneficiary?.branch_name) },
        { field: 'Branch Code', value: fieldValue(meta.receiver_branch_code, beneficiary?.branch_code) },
        { field: 'Account No', value: fieldValue(meta.receiver_account_no, beneficiary?.account_number) },
        { field: 'IBAN', value: fieldValue(meta.receiver_iban, beneficiary?.iban) },
        { field: 'Receiver ID Type', value: fieldValue(meta.receiver_id_type, beneficiary?.receiver_id_type) },
        { field: 'Receiver ID Number', value: fieldValue(meta.receiver_id_number, beneficiary?.receiver_id_number) },
        { field: 'Account Other Details', value: fieldValue(meta.receiver_account_other_details) },
        { field: 'Beneficiary Branch Name', value: fieldValue(meta.beneficiary_branch_name) },
        { field: 'Beneficiary Branch Address', value: fieldValue(meta.beneficiary_branch_address) },
        { field: 'Error', value: fieldValue(meta.error, 'None') },
        { field: 'Error/Corrected Message', value: fieldValue(meta.error_corrected_message) },
        { field: 'Remarks', value: fieldValue(meta.remarks) },
        { field: 'Other Reference', value: fieldValue(meta.other_reference) }
    ];

    const documentRows: FieldRow[] = [
        { field: 'Transaction Receipt Copy', value: <DocumentCell value={meta.transaction_receipt_copy} /> },
        { field: 'Receiver ID Copy', value: <DocumentCell value={meta.receiver_id_copy} /> },
        { field: 'Receiver Proof of Address', value: <DocumentCell value={meta.receiver_proof_of_address} /> },
        { field: 'Sender AML Document', value: <DocumentCell value={meta.sender_aml_document ?? remitter?.sender_details_aml_screening_doc} /> },
        { field: 'Receiver AML Document', value: <DocumentCell value={meta.receiver_aml_document} /> }
    ];

    const quickSummary: FieldRow[] = [
        { field: 'Invoice No', value: fieldValue(transfer.code, meta.invoice_no) },
        { field: 'To Branch', value: fieldValue(meta.branch_name, transfer.branch_id) },
        { field: 'Payout Currency', value: fieldValue(meta.payout_currency) },
        {
            field: 'Receive Amount (£)',
            value: asNumber(transfer.source_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        },
        {
            field: 'FC Amount',
            value: asNumber(transfer.dest_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        },
        {
            field: 'Customer Rate',
            value: asNumber(meta.customer_rate_for_gbp || transfer.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        },
        ...(mobileWalletTransfer ? [{
            field: 'Funding',
            value: 'Mobile Wallet',
        }] : [])
    ];

    const normalizedAuditLogs = auditLogs.map((log) => {
        const changedFieldsFromList = Array.isArray(log.changed_fields_list) ? log.changed_fields_list : [];
        const changedFieldsFromString = asString(log.changed_fields)
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        const changedFields = changedFieldsFromList.length > 0 ? changedFieldsFromList : changedFieldsFromString;

        return {
            ...log,
            changed_fields_list: changedFields
        };
    });

    const auditStartRow = auditTotal === 0 ? 0 : ((auditPage - 1) * auditPageSize) + 1;
    const auditEndRow = auditTotal === 0 ? 0 : Math.min(auditPage * auditPageSize, auditTotal);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch(ENDPOINTS.TRANSFERS.DETAIL(id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_amount: parseFloat(editForm.source_amount) || 0,
                    dest_amount: parseFloat(editForm.dest_amount) || 0,
                    rate: parseFloat(editForm.rate) || 0,
                    payment_mode: editForm.payment_mode,
                    source_of_funds: editForm.source_of_funds,
                    purpose: editForm.purpose,
                    collection_method: editForm.collection_method,
                    status: editForm.status,
                })
            });

            if (res.ok) {
                showToast('Transfer updated successfully!', 'success');
                setIsEditing(false);
                await fetchData();
            } else {
                showToast('Failed to update transfer.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('An error occurred while saving the transfer.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const clearAuditFilters = () => {
        setAuditAction('all');
        setAuditUser('');
        setAuditDateFrom('');
        setAuditDateTo('');
        setAuditPage(1);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <div>
                <Link href="/admin/transfers" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Transfers
                </Link>
                <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {isEditing ? 'Edit Transfer' : 'Transfer Details'}
                        </h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass(transfer.status)}`}>
                            {formatStatus(fieldValue(transfer.status, 'Pending'))}
                        </span>
                        {mobileWalletTransfer && (
                            <>
                                <span className="px-3 py-1 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 text-xs font-bold">
                                    Mobile Wallet
                                </span>
                                <Link
                                    href="/admin/mobile-users/control/wallet-transfers"
                                    className="px-3 py-1 rounded-full bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs font-bold text-slate-600 dark:text-slate-200 hover:text-teal-600"
                                >
                                    Wallet Queue
                                </Link>
                            </>
                        )}
                    </div>
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border-0 bg-teal-500 hover:bg-teal-600 shadow-md text-white disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Save className="w-3.5 h-3.5" />
                                        )}
                                        Save Changes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 text-xs font-semibold rounded-full glass-effect border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-50"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border-0 bg-teal-500 hover:bg-teal-600 shadow-md text-white"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Edit Transfer
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
                    {isEditing ? 'Modify the transfer details below and save your changes.' : `Overview, sender, receiver and document details for transfer #${transfer.id}`}
                </p>
            </div>

            <div className="card-glass p-4 md:p-5">
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    {quickSummary.map((item) => (
                        <div key={item.field} className="rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-100/70 dark:border-slate-700/60 px-3 py-3">
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300">{item.field}</p>
                            <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {isEditing ? (
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="card-glass p-6 md:p-8 space-y-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/60 pb-3">Edit Transfer Fields</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Receive Amount (£)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.source_amount}
                                    onChange={e => setEditForm(prev => ({ ...prev, source_amount: e.target.value }))}
                                    className="input-glass h-10 w-full text-sm px-3"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">FC Transfer Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.dest_amount}
                                    onChange={e => setEditForm(prev => ({ ...prev, dest_amount: e.target.value }))}
                                    className="input-glass h-10 w-full text-sm px-3"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Customer Rate</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={editForm.rate}
                                    onChange={e => setEditForm(prev => ({ ...prev, rate: e.target.value }))}
                                    className="input-glass h-10 w-full text-sm px-3"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Payment Mode</label>
                                <select
                                    value={editForm.payment_mode}
                                    onChange={e => setEditForm(prev => ({ ...prev, payment_mode: e.target.value }))}
                                    className="input-glass h-10 w-full text-sm px-3"
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="mobile_wallet">Mobile Wallet</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Source Of Income</label>
                                <input
                                    type="text"
                                    value={editForm.source_of_funds}
                                    onChange={e => setEditForm(prev => ({ ...prev, source_of_funds: e.target.value }))}
                                    className="input-glass h-10 w-full text-sm px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Purpose Of Transaction</label>
                                <input
                                    type="text"
                                    value={editForm.purpose}
                                    onChange={e => setEditForm(prev => ({ ...prev, purpose: e.target.value }))}
                                    className="input-glass h-10 w-full text-sm px-3"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Entry Type (Collection Method)</label>
                                <select
                                    value={editForm.collection_method}
                                    onChange={e => setEditForm(prev => ({ ...prev, collection_method: e.target.value }))}
                                    className="input-glass h-10 w-full text-sm px-3"
                                >
                                    <option value="telex_transfer">Telex Transfer</option>
                                    <option value="money_changer">Money Changer</option>
                                    <option value="account_transactions">Account Transactions</option>
                                    <option value="transfers">Transfers</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Invoice Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="input-glass h-10 w-full text-sm px-3"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="in_review">In Review</option>
                                    <option value="in_transit">In Transit</option>
                                    <option value="verify_pof_documents">Verify POF Documents</option>
                                    <option value="pending_documentation">Pending Documentation</option>
                                    <option value="awaiting_funds">Awaiting Funds</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            ) : (
                <>
                    <DetailCard title="Transfer Overview" rows={overviewRows} />
                    {mobileWalletTransfer && <DetailCard title="Wallet Funding" rows={walletRows} />}
                    <DetailCard title="Sender Details" rows={senderRows} />
                    <DetailCard title="Receiver Details" rows={receiverRows} />
                    <DetailCard title="Documents" rows={documentRows} />
                </>
            )}

            {mobileWalletTransfer && (
                <div className="card-glass p-6 md:p-8">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Wallet Status History</h2>
                    {walletStatusHistory.length === 0 ? (
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-300">No wallet status updates recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {walletStatusHistory.map((event, index) => {
                                const item = isRecord(event) ? event : {};
                                const status = fieldValue(item.status, 'awaiting_funds');
                                return (
                                    <div
                                        key={`${status}-${index}-${fieldValue(item.updated_at, index)}`}
                                        className="rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-100/70 dark:border-slate-700/60 px-4 py-3"
                                    >
                                        <div className="flex flex-wrap items-center gap-2 justify-between">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass(status)}`}>
                                                    {formatStatus(status)}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                    {fieldValue(item.updated_by, 'System')}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {formatDateTime(item.updated_at)}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                            {fieldValue(item.note, 'No note added.')}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {canViewAuditLogs && (
                <div className="card-glass p-6 md:p-8">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                        <History className="w-5 h-5 text-teal-500" />
                        History Log
                    </h2>

                    <div className="rounded-2xl bg-white/50 dark:bg-slate-800/30 border border-slate-100/70 dark:border-slate-700/60 p-4 md:p-5 mb-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 mb-1">Action</p>
                                <select
                                    value={auditAction}
                                    onChange={(e) => {
                                        setAuditAction(e.target.value);
                                        setAuditPage(1);
                                    }}
                                    className="input-glass h-10 w-full text-sm px-3"
                                >
                                    {auditActionOptions.map((action) => (
                                        <option key={action} value={action}>
                                            {action === 'all' ? 'All Actions' : normalizeAction(action)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 mb-1">User</p>
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={auditUser}
                                        onChange={(e) => {
                                            setAuditUser(e.target.value);
                                            setAuditPage(1);
                                        }}
                                        placeholder="Filter user"
                                        className="input-glass h-10 w-full text-sm pl-10 pr-3"
                                    />
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 mb-1">From Date</p>
                                <input
                                    type="date"
                                    value={auditDateFrom}
                                    onChange={(e) => {
                                        setAuditDateFrom(e.target.value);
                                        setAuditPage(1);
                                    }}
                                    className="input-glass h-10 w-full text-sm px-3"
                                />
                            </div>

                            <div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 mb-1">To Date</p>
                                <input
                                    type="date"
                                    value={auditDateTo}
                                    onChange={(e) => {
                                        setAuditDateTo(e.target.value);
                                        setAuditPage(1);
                                    }}
                                    className="input-glass h-10 w-full text-sm px-3"
                                />
                            </div>

                            <div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 mb-1">Rows</p>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={auditPageSize}
                                        onChange={(e) => {
                                            setAuditPageSize(Number(e.target.value));
                                            setAuditPage(1);
                                        }}
                                        className="input-glass h-10 flex-1 text-sm px-3"
                                    >
                                        {[10, 25, 50, 100].map((size) => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={clearAuditFilters}
                                        className="h-10 px-3 rounded-full text-xs font-bold glass-effect border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 inline-flex items-center gap-1"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-300">
                            Results: {auditStartRow} - {auditEndRow} of {auditTotal}
                        </div>
                    </div>

                    {auditLoading ? (
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Loading history...</p>
                    ) : normalizedAuditLogs.length === 0 ? (
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-300">No history found for this transfer yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {normalizedAuditLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-100/70 dark:border-slate-700/60 px-4 py-3"
                                >
                                    <div className="flex flex-wrap items-center gap-2 justify-between">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                                                {normalizeAction(log.action)}
                                            </span>
                                            <span className="text-xs text-slate-400">•</span>
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                {fieldValue(log.performed_by_username, 'System')}
                                            </span>
                                            <span className="text-xs text-slate-400">•</span>
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                {formatDateTime(log.created_at)}
                                            </span>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                            Branch: {fieldValue(log.performed_by_branch, '-')}
                                        </span>
                                    </div>
                                    {Array.isArray(log.changed_fields_list) && log.changed_fields_list.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {log.changed_fields_list.map((field) => (
                                                <span
                                                    key={`${log.id}-${field}`}
                                                    className="px-2 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[11px] font-semibold"
                                                >
                                                    {field}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-5 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
                            disabled={auditPage <= 1 || auditLoading}
                            className="px-4 py-2 rounded-full text-xs font-bold glass-effect border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Prev
                        </button>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                            Page {auditPage} of {auditTotalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setAuditPage((prev) => Math.min(auditTotalPages, prev + 1))}
                            disabled={auditPage >= auditTotalPages || auditLoading}
                            className="px-4 py-2 rounded-full text-xs font-bold glass-effect border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
