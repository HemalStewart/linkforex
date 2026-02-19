'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ENDPOINTS, UPLOADS_BASE_URL } from '@/app/lib/api';
import { ArrowLeft, Download, History, Search, RotateCcw } from 'lucide-react';

type Transfer = {
    id: string | number;
    code?: string | null;
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
    account_number?: string | null;
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

const normalizeAction = (value: unknown): string => {
    const raw = asString(value).trim();
    if (!raw) return '-';
    return raw
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateTime = (value: unknown): string => {
    const raw = asString(value);
    if (!raw) return '-';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleString();
};

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
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) return raw;

    const normalized = raw.replace(/^\/+/, '');
    const withoutUploadsPrefix = normalized.startsWith('uploads/')
        ? normalized.slice('uploads/'.length)
        : normalized;
    const encoded = encodePath(withoutUploadsPrefix);

    return `${UPLOADS_BASE_URL}/${encoded}`;
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
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">{row.field}</p>
                        <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200 break-words">{row.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function TransferDetailsPage() {
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const transferRes = await fetch(ENDPOINTS.TRANSFERS.DETAIL(id));
                if (!transferRes.ok) {
                    setTransfer(null);
                    return;
                }

                const transferData = (await transferRes.json()) as Transfer;
                setTransfer(transferData);

                const remitterId = asString(transferData.remitter_id);
                const beneficiaryId = asString(transferData.beneficiary_id);

                const [remitterRes, beneficiaryRes] = await Promise.all([
                    remitterId ? fetch(ENDPOINTS.REMITTERS.DETAIL(remitterId)) : Promise.resolve(null),
                    beneficiaryId ? fetch(ENDPOINTS.BENEFICIARIES.DETAIL(beneficiaryId)) : Promise.resolve(null)
                ]);

                if (remitterRes && remitterRes.ok) {
                    setRemitter((await remitterRes.json()) as Remitter);
                } else {
                    setRemitter(null);
                }

                if (beneficiaryRes && beneficiaryRes.ok) {
                    setBeneficiary((await beneficiaryRes.json()) as Beneficiary);
                } else {
                    setBeneficiary(null);
                }
            } catch (error) {
                console.error('Failed to load transfer details:', error);
                setTransfer(null);
                setRemitter(null);
                setBeneficiary(null);
                setAuditLogs([]);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    useEffect(() => {
        if (!transfer) return;

        let cancelled = false;

        const fetchAuditLogs = async () => {
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
    }, [transfer, id, auditAction, auditUser, auditDateFrom, auditDateTo, auditPage, auditPageSize]);

    const meta = useMemo(() => parseTransferMeta(transfer), [transfer]);

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
        { field: 'Customer Rate', value: asNumber(meta.customer_rate_for_gbp || transfer.rate).toLocaleString(undefined, { maximumFractionDigits: 4 }) },
        { field: 'Receive Amount (£)', value: asNumber(transfer.source_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { field: 'FC Transfer Amount', value: asNumber(transfer.dest_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
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

    const receiverRows: FieldRow[] = [
        { field: 'Receiver Verified', value: yesNo(meta.receiver_verified ?? beneficiary?.status) },
        { field: 'Receiver Name', value: fieldValue(meta.receiver_name, beneficiary?.name) },
        { field: 'Receiver Contacts', value: fieldValue(meta.receiver_contacts, beneficiary?.mobile_number) },
        { field: 'Receiver Address', value: fieldValue(meta.receiver_address) },
        { field: 'Receiver City', value: fieldValue(meta.receiver_city) },
        { field: 'Receiver Country', value: fieldValue(meta.receiver_country) },
        { field: 'Receiver Date Of Birth', value: fieldValue(meta.receiver_dob) },
        { field: 'Receiver Place of Birth', value: fieldValue(meta.receiver_place_of_birth) },
        { field: 'CNIC No', value: fieldValue(meta.cnic_no) },
        { field: 'Bank', value: fieldValue(meta.receiver_bank, beneficiary?.bank_name) },
        { field: 'Branch (Branch Code)', value: fieldValue(meta.receiver_branch_code, beneficiary?.branch_name) },
        { field: 'Account No', value: fieldValue(meta.receiver_account_no, beneficiary?.account_number) },
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
            value: asNumber(meta.customer_rate_for_gbp || transfer.rate).toLocaleString(undefined, { maximumFractionDigits: 4 })
        }
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
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Transfer Details</h1>
                    <span className="px-3 py-1 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider">
                        {formatStatus(fieldValue(transfer.status, 'Pending'))}
                    </span>
                </div>
                <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
                    Overview, sender, receiver and document details for transfer #{transfer.id}
                </p>
            </div>

            <div className="card-glass p-4 md:p-5">
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    {quickSummary.map((item) => (
                        <div key={item.field} className="rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-100/70 dark:border-slate-700/60 px-3 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">{item.field}</p>
                            <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            <DetailCard title="Transfer Overview" rows={overviewRows} />
            <DetailCard title="Sender Details" rows={senderRows} />
            <DetailCard title="Receiver Details" rows={receiverRows} />
            <DetailCard title="Documents" rows={documentRows} />

            <div className="card-glass p-6 md:p-8">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                    <History className="w-5 h-5 text-teal-500" />
                    History Log
                </h2>

                <div className="rounded-2xl bg-white/50 dark:bg-slate-800/30 border border-slate-100/70 dark:border-slate-700/60 p-4 md:p-5 mb-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1">Action</p>
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
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1">User</p>
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
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1">From Date</p>
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
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1">To Date</p>
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
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1">Rows</p>
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
                                        <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
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
        </div>
    );
}
