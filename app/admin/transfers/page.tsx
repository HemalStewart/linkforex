'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import Modal from '../components/Modal';
import { CheckCircle2, Eye, ImageUp, PenLine, PlusCircle, Printer, RotateCcw, Save, Search, XCircle } from 'lucide-react';

type SortDir = 'asc' | 'desc';

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

type Transfer = {
    id: string | number;
    code?: string | null;
    remitter_id?: string | number | null;
    beneficiary_id?: string | number | null;
    branch_id?: string | null;
    created_by?: string | number | null;
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
    [key: string]: unknown;
};

type Remitter = {
    id: string | number;
    sender_id?: string | null;
    name?: string | null;
    branch?: string | null;
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
    sender_aml_result?: string | null;
    rescreening_sender?: string | null;
    [key: string]: unknown;
};

type Beneficiary = {
    id: string | number;
    name?: string | null;
    mobile_number?: string | null;
    status?: string | null;
    bank_name?: string | null;
    [key: string]: unknown;
};

type Branch = {
    id: string | number;
    name?: string | null;
    code?: string | null;
    transaction_prefix?: string | null;
    [key: string]: unknown;
};

type User = {
    id: string | number;
    username?: string | null;
    name?: string | null;
    [key: string]: unknown;
};

type TransferRow = {
    id: string;
    rowNo: number;
    rowRef: string;
    print: string;
    sign: string;
    signatureSigned: boolean;
    signatureImage: string;
    signatureSignedBy: string;
    signatureSignedAt: string;
    fromBranch: string;
    toBranch: string;
    invoiceDate: string;
    invoiceNo: string;
    status: string;
    payoutCurrency: string;
    receivedAmount: number;
    customerRate: number;
    fcAmount: number;
    transactionId: string;
    otherTransactionId: string;
    branchRate: number;
    branchPayAmount: number;
    senderVerified: string;
    senderId: string;
    senderName: string;
    senderDob: string;
    senderPob: string;
    senderContacts: string;
    senderAddress: string;
    depositBank: string;
    depositBranch: string;
    sourceOfIncome: string;
    purposeOfTransaction: string;
    otherPurpose: string;
    entryType: string;
    paymentMode: string;
    alliedBank: string;
    receiverVerified: string;
    receiverName: string;
    receiverContacts: string;
    cnicNo: string;
    receiverAlliedBank: string;
    senderAmlDocument: string;
    senderAmlResult: string;
    receiverAmlDocument: string;
    receiverAmlResult: string;
    rescreeningMtReceiver: string;
    enteredUser: string;
    enteredDate: string;
    modifiedUser: string;
    modifiedDate: string;
    historyLog: string;
};

type ColumnDef = {
    key: keyof TransferRow;
    label: string;
    sortable?: boolean;
    className?: string;
    render?: (row: TransferRow) => React.ReactNode;
};

const formatDateTime = (value: string): string => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
};

const formatStatus = (value: string): string => {
    if (!value) return '-';
    return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
};

const yesNo = (value: unknown): string => {
    const v = asString(value).trim().toLowerCase();
    if (!v) return '-';
    if (['1', 'yes', 'y', 'true', 'active', 'verified', 'pass', 'passed'].includes(v)) return 'Yes';
    if (['0', 'no', 'n', 'false', 'inactive', 'unverified', 'fail', 'failed'].includes(v)) return 'No';
    return asString(value);
};

const parseTransferMeta = (transfer: Transfer): Record<string, unknown> => {
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

const makeAddress = (...parts: Array<unknown>): string => {
    const built = parts
        .map((part) => asString(part).trim())
        .filter(Boolean)
        .join(' ');
    return built || '-';
};

const paymentModeLabel = (value: unknown): string => {
    const raw = asString(value).trim().toUpperCase();
    if (!raw) return '-';
    if (raw === 'P') return 'P - CASH PICKUP';
    if (raw === 'D') return 'D - DIRECT BANK';
    return raw;
};

export default function TransfersPage() {
    const [loading, setLoading] = useState(true);
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [remitters, setRemitters] = useState<Remitter[]>([]);
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<keyof TransferRow>('invoiceDate');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [page, setPage] = useState(1);
    const [signModalOpen, setSignModalOpen] = useState(false);
    const [signingTransferId, setSigningTransferId] = useState<string | null>(null);
    const [signingBusy, setSigningBusy] = useState(false);
    const [signError, setSignError] = useState('');
    const [hasInk, setHasInk] = useState(false);
    const [statusActionBusyId, setStatusActionBusyId] = useState<string | null>(null);
    const [statusActionType, setStatusActionType] = useState<'approve' | 'cancel' | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const uploadInputRef = useRef<HTMLInputElement | null>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const ts = Date.now();
            const [tRes, rRes, bRes, brRes, uRes] = await Promise.all([
                fetch(`${ENDPOINTS.TRANSFERS.LIST}?_t=${ts}`),
                fetch(`${ENDPOINTS.REMITTERS.LIST}?_t=${ts}`),
                fetch(`${ENDPOINTS.BENEFICIARIES.LIST}?_t=${ts}`),
                fetch(`${ENDPOINTS.BRANCHES.LIST}?_t=${ts}`),
                fetch(`${ENDPOINTS.USERS.LIST}?_t=${ts}`)
            ]);

            setTransfers(tRes.ok ? ((await tRes.json()) as Transfer[]) : []);
            setRemitters(rRes.ok ? ((await rRes.json()) as Remitter[]) : []);
            setBeneficiaries(bRes.ok ? ((await bRes.json()) as Beneficiary[]) : []);
            setBranches(brRes.ok ? ((await brRes.json()) as Branch[]) : []);
            setUsers(uRes.ok ? ((await uRes.json()) as User[]) : []);
        } catch (error) {
            console.error('Failed to load transfer table data:', error);
            setTransfers([]);
            setRemitters([]);
            setBeneficiaries([]);
            setBranches([]);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const remitterById = useMemo(() => {
        const map = new Map<string, Remitter>();
        remitters.forEach((item) => map.set(String(item.id), item));
        return map;
    }, [remitters]);

    const beneficiaryById = useMemo(() => {
        const map = new Map<string, Beneficiary>();
        beneficiaries.forEach((item) => map.set(String(item.id), item));
        return map;
    }, [beneficiaries]);

    const branchByKey = useMemo(() => {
        const map = new Map<string, string>();
        branches.forEach((branch) => {
            const name = asString(branch.name);
            const code = asString(branch.code);
            const prefix = asString(branch.transaction_prefix);
            const id = asString(branch.id);
            if (code) map.set(code, name);
            if (prefix) map.set(prefix, name);
            if (id) map.set(id, name);
            if (name) map.set(name, name);
        });
        return map;
    }, [branches]);

    const userById = useMemo(() => {
        const map = new Map<string, string>();
        users.forEach((user) => {
            const id = asString(user.id);
            const name = asString(user.username) || asString(user.name);
            if (id && name) map.set(id, name);
        });
        return map;
    }, [users]);

    const transferById = useMemo(() => {
        const map = new Map<string, Transfer>();
        transfers.forEach((transfer) => {
            map.set(asString(transfer.id), transfer);
        });
        return map;
    }, [transfers]);

    const rows = useMemo(() => {
        return transfers.map((transfer, index): TransferRow => {
            const meta = parseTransferMeta(transfer);
            const remitter = remitterById.get(asString(transfer.remitter_id));
            const beneficiary = beneficiaryById.get(asString(transfer.beneficiary_id));

            const toBranchCode = asString(transfer.branch_id);
            const toBranch = branchByKey.get(toBranchCode) || asString(meta.branch_name) || toBranchCode || '-';
            const fromBranch = asString(remitter?.branch) || asString(meta.from_branch) || '-';

            const receivedAmount = asNumber(transfer.source_amount);
            const fcAmount = asNumber(transfer.dest_amount);
            const customerRate = asNumber(meta.customer_rate_for_gbp || transfer.rate);
            const branchRate = asNumber(meta.branch_rate_for_gbp || meta.customer_rate_for_gbp || transfer.rate);
            const branchPayAmount = branchRate > 0 ? fcAmount / branchRate : receivedAmount;

            const senderName = asString(meta.sender_name) || asString(remitter?.name) || '-';
            const senderAddress = asString(meta.sender_address) || makeAddress(
                meta.sender_postcode || remitter?.postcode,
                meta.sender_address_1 || remitter?.address_1,
                meta.sender_address_2 || remitter?.address_2,
                meta.sender_city || remitter?.city,
                meta.sender_country || remitter?.country
            );

            const enteredByRaw = asString(transfer.created_by);
            const enteredUser = userById.get(enteredByRaw) || enteredByRaw || '-';

            const modifiedByRaw = asString((transfer as Record<string, unknown>).updated_by);
            const modifiedUser = userById.get(modifiedByRaw) || modifiedByRaw || '-';
            const signatureImage = asString(meta.signature_image);
            const signatureSigned = yesNo(meta.signature_signed) === 'Yes' || signatureImage.length > 0;
            const signatureSignedBy = asString(meta.signature_signed_by) || '-';
            const signatureSignedAt = asString(meta.signature_signed_at);

            return {
                id: asString(transfer.id),
                rowNo: index + 1,
                rowRef: asString(transfer.id),
                print: 'None',
                sign: signatureSigned ? 'Signed' : 'Not Signed',
                signatureSigned,
                signatureImage,
                signatureSignedBy,
                signatureSignedAt,
                fromBranch,
                toBranch,
                invoiceDate: asString(meta.invoicing_date) || asString(transfer.created_at),
                invoiceNo: asString(transfer.code) || '-',
                status: formatStatus(asString(transfer.status) || 'pending'),
                payoutCurrency: asString(meta.payout_currency) || '-',
                receivedAmount,
                customerRate,
                fcAmount,
                transactionId: asString(meta.transaction_id) || asString(meta.transfer_id) || '-',
                otherTransactionId: asString(meta.other_transaction_id) || '-',
                branchRate,
                branchPayAmount,
                senderVerified: yesNo(meta.sender_verified || remitter?.kyc_status),
                senderId: asString(meta.sender_id) || asString(remitter?.sender_id) || '-',
                senderName,
                senderDob: asString(meta.sender_dob) || asString(remitter?.dob) || '-',
                senderPob: asString(meta.sender_place_of_birth) || asString(remitter?.place_of_birth) || '-',
                senderContacts: asString(meta.sender_contacts) || asString(remitter?.phone) || '-',
                senderAddress,
                depositBank: asString(meta.deposit_bank) || '-',
                depositBranch: asString(meta.deposit_branch) || '-',
                sourceOfIncome: asString(transfer.source_of_funds) || '-',
                purposeOfTransaction: asString(transfer.purpose) || '-',
                otherPurpose: asString(meta.other_purpose) || '-',
                entryType: asString(meta.entry_type) || asString(transfer.collection_method) || '-',
                paymentMode: asString(meta.payment_mode) || paymentModeLabel(transfer.payment_mode),
                alliedBank: asString(meta.allied_bank) || '-',
                receiverVerified: yesNo(meta.receiver_verified || beneficiary?.status),
                receiverName: asString(meta.receiver_name) || asString(beneficiary?.name) || '-',
                receiverContacts: asString(meta.receiver_contacts) || asString(beneficiary?.mobile_number) || '-',
                cnicNo: asString(meta.cnic_no) || '-',
                receiverAlliedBank: asString(meta.receiver_bank) || asString(beneficiary?.bank_name) || '-',
                senderAmlDocument: asString(meta.sender_aml_document) || asString(remitter?.sender_details_aml_screening_doc) || '-',
                senderAmlResult: asString(meta.sender_aml_result) || asString(remitter?.sender_aml_result) || '-',
                receiverAmlDocument: asString(meta.receiver_aml_document) || '-',
                receiverAmlResult: asString(meta.receiver_aml_result) || '-',
                rescreeningMtReceiver: asString(meta.rescreening_mt_receiver) || asString(remitter?.rescreening_sender) || '-',
                enteredUser,
                enteredDate: asString(transfer.created_at) || '-',
                modifiedUser,
                modifiedDate: asString(transfer.updated_at) || '-',
                historyLog: 'Record Log'
            };
        });
    }, [transfers, remitterById, beneficiaryById, branchByKey, userById]);

    const statusConfig = useMemo(() => {
        const pending = rows.filter((row) => row.status.toLowerCase() === 'pending').length;
        const approved = rows.filter((row) => row.status.toLowerCase() === 'approved').length;
        const cancelled = rows.filter((row) => row.status.toLowerCase() === 'cancelled').length;
        const completed = rows.filter((row) => row.status.toLowerCase() === 'completed').length;
        const inReview = rows.filter((row) => row.status.toLowerCase() === 'in review').length;
        const inTransit = rows.filter((row) => row.status.toLowerCase() === 'in transit').length;

        return {
            all: { label: 'All', count: rows.length },
            pending: { label: 'Pending', count: pending },
            approved: { label: 'Approved', count: approved },
            cancelled: { label: 'Cancelled', count: cancelled },
            in_review: { label: 'In Review', count: inReview },
            in_transit: { label: 'In Transit', count: inTransit },
            completed: { label: 'Completed', count: completed }
        };
    }, [rows]);

    const filteredRows = useMemo(() => {
        const statusFiltered = rows.filter((row) => {
            if (filterStatus === 'all') return true;
            const rowStatus = row.status.toLowerCase().replace(/\s+/g, '_');
            return rowStatus === filterStatus;
        });

        if (!searchQuery.trim()) return statusFiltered;
        const term = searchQuery.toLowerCase().trim();

        return statusFiltered.filter((row) => {
            const text = Object.values(row)
                .map((value) => (typeof value === 'number' ? value.toString() : value))
                .join(' ')
                .toLowerCase();
            return text.includes(term);
        });
    }, [rows, filterStatus, searchQuery]);

    const sortedRows = useMemo(() => {
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        return [...filteredRows].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];

            if (typeof aVal === 'number' || typeof bVal === 'number') {
                const diff = asNumber(aVal) - asNumber(bVal);
                return sortDir === 'asc' ? diff : -diff;
            }

            if (sortKey === 'invoiceDate' || sortKey === 'enteredDate' || sortKey === 'modifiedDate') {
                const aTime = new Date(asString(aVal)).getTime() || 0;
                const bTime = new Date(asString(bVal)).getTime() || 0;
                return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
            }

            const result = collator.compare(asString(aVal), asString(bVal));
            return sortDir === 'asc' ? result : -result;
        });
    }, [filteredRows, sortKey, sortDir]);

    const totalRows = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const pagedRows = sortedRows.slice(startIndex, endIndex);

    useEffect(() => {
        setPage(1);
    }, [filterStatus, searchQuery, rowsPerPage]);

    useEffect(() => {
        if (currentPage !== page) {
            setPage(currentPage);
        }
    }, [currentPage, page]);

    const receivedTotal = useMemo(
        () => sortedRows.reduce((sum, row) => sum + row.receivedAmount, 0),
        [sortedRows]
    );

    const toggleSort = (key: keyof TransferRow) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortKey(key);
        setSortDir('asc');
    };

    const sortIndicator = (key: keyof TransferRow): string => {
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    const getCurrentUserName = (): string => {
        const user = getStoredUser<{ username?: string; name?: string; email?: string }>();
        return user?.username || user?.name || user?.email || 'Admin';
    };

    const refreshSingleTransfer = (updated: Transfer) => {
        const updatedId = asString(updated.id);
        setTransfers((prev) => prev.map((item) => (asString(item.id) === updatedId ? updated : item)));
    };

    const handleStatusAction = async (row: TransferRow, action: 'approve' | 'cancel') => {
        const endpoint = action === 'approve'
            ? ENDPOINTS.TRANSFERS.APPROVE(row.id)
            : ENDPOINTS.TRANSFERS.CANCEL(row.id);
        const isApprove = action === 'approve';
        const confirmText = isApprove
            ? `Approve transfer ${row.invoiceNo || row.id}?`
            : `Cancel transfer ${row.invoiceNo || row.id}?`;

        if (!window.confirm(confirmText)) return;

        setStatusActionBusyId(row.id);
        setStatusActionType(action);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                let message = `Failed to ${action} transfer.`;
                try {
                    const errorData = await response.json();
                    message = errorData?.messages?.error || errorData?.message || message;
                } catch {
                    // keep fallback
                }
                window.alert(message);
                return;
            }

            const updated = (await response.json()) as Transfer;
            refreshSingleTransfer(updated);
        } catch (error) {
            console.error(`Failed to ${action} transfer`, error);
            window.alert(`Failed to ${action} transfer.`);
        } finally {
            setStatusActionBusyId(null);
            setStatusActionType(null);
        }
    };

    const handlePrintInvoice = (row: TransferRow) => {
        const invoiceWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=780');
        if (!invoiceWindow) return;

        const signedSection = row.signatureSigned
            ? `<p><strong>Signature:</strong> Signed by ${row.signatureSignedBy} on ${formatDateTime(row.signatureSignedAt)}</p>${row.signatureImage ? `<img src="${row.signatureImage}" alt="Signature" style="max-width:260px;border:1px solid #d1d5db;border-radius:8px;padding:4px;" />` : ''}`
            : '<p><strong>Signature:</strong> Not signed</p>';

        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${row.invoiceNo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    h2 { margin: 22px 0 10px; font-size: 14px; text-transform: uppercase; letter-spacing: .05em; color: #475569; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 14px; }
    td, th { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; vertical-align: top; }
    th { background: #f8fafc; text-align: left; width: 260px; }
    .top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 18px; }
    .muted { color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <h1>Transfer Invoice</h1>
      <div class="muted">Invoice No: ${row.invoiceNo}</div>
    </div>
    <div class="muted">Printed: ${new Date().toLocaleString()}</div>
  </div>

  <h2>Transfer</h2>
  <table>
    <tr><th>Invoice Date</th><td>${formatDateTime(row.invoiceDate)}</td></tr>
    <tr><th>Status</th><td>${row.status}</td></tr>
    <tr><th>From Branch</th><td>${row.fromBranch}</td></tr>
    <tr><th>To Branch</th><td>${row.toBranch}</td></tr>
    <tr><th>Payout Currency</th><td>${row.payoutCurrency}</td></tr>
    <tr><th>Received Amount (£)</th><td>${row.receivedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
    <tr><th>Customer Rate</th><td>${row.customerRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td></tr>
    <tr><th>FC Amount</th><td>${row.fcAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
    <tr><th>Branch Rate</th><td>${row.branchRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td></tr>
    <tr><th>Branch Pay Amount</th><td>${row.branchPayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
    <tr><th>Transaction Id</th><td>${row.transactionId}</td></tr>
    <tr><th>Other Transaction Id</th><td>${row.otherTransactionId}</td></tr>
  </table>

  <h2>Sender</h2>
  <table>
    <tr><th>Sender Id</th><td>${row.senderId}</td></tr>
    <tr><th>Sender Name</th><td>${row.senderName}</td></tr>
    <tr><th>Sender Contacts</th><td>${row.senderContacts}</td></tr>
    <tr><th>Sender Address</th><td>${row.senderAddress}</td></tr>
    <tr><th>Date Of Birth</th><td>${row.senderDob}</td></tr>
  </table>

  <h2>Receiver</h2>
  <table>
    <tr><th>Receiver Name</th><td>${row.receiverName}</td></tr>
    <tr><th>Receiver Contacts</th><td>${row.receiverContacts}</td></tr>
    <tr><th>CNIC No</th><td>${row.cnicNo}</td></tr>
  </table>

  <h2>Signature</h2>
  ${signedSection}
</body>
</html>`;

        invoiceWindow.document.open();
        invoiceWindow.document.write(html);
        invoiceWindow.document.close();
        invoiceWindow.focus();
        invoiceWindow.print();
    };

    const openSignatureModal = (row: TransferRow) => {
        setSigningTransferId(row.id);
        setSignError('');
        setSignModalOpen(true);
    };

    const closeSignatureModal = () => {
        setSignModalOpen(false);
        setSigningTransferId(null);
        setSignError('');
        setHasInk(false);
        drawingRef.current = false;
        lastPointRef.current = null;
    };

    useEffect(() => {
        if (!signModalOpen || !signingTransferId) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const setupCanvas = () => {
            const parentWidth = canvas.parentElement?.clientWidth || 760;
            const logicalWidth = Math.max(360, Math.min(760, parentWidth - 2));
            const logicalHeight = 220;
            const ratio = window.devicePixelRatio || 1;

            canvas.width = logicalWidth * ratio;
            canvas.height = logicalHeight * ratio;
            canvas.style.width = `${logicalWidth}px`;
            canvas.style.height = `${logicalHeight}px`;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.clearRect(0, 0, logicalWidth, logicalHeight);
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#0f766e';

            const transfer = transferById.get(signingTransferId);
            const meta = transfer ? parseTransferMeta(transfer) : {};
            const existingImage = asString(meta.signature_image);
            if (!existingImage) {
                setHasInk(false);
                return;
            }

            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
                setHasInk(true);
            };
            img.src = existingImage;
        };

        const raf = window.requestAnimationFrame(setupCanvas);
        return () => window.cancelAnimationFrame(raf);
    }, [signModalOpen, signingTransferId, transferById]);

    const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const x = ((event.clientX - rect.left) / rect.width) * (canvas.width / (window.devicePixelRatio || 1));
        const y = ((event.clientY - rect.top) / rect.height) * (canvas.height / (window.devicePixelRatio || 1));
        return { x, y };
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const point = getCanvasPoint(event);
        if (!point) return;
        drawingRef.current = true;
        lastPointRef.current = point;
        canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const point = getCanvasPoint(event);
        const last = lastPointRef.current;
        if (!point || !last) return;

        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        ctx.closePath();

        lastPointRef.current = point;
        setHasInk(true);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        drawingRef.current = false;
        lastPointRef.current = null;
        if (canvas && canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, width, height);
        setHasInk(false);
        setSignError('');
    };

    const drawImageOnCanvas = (image: HTMLImageElement) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, width, height);

        const scale = Math.min(width / image.width, height / image.height);
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;

        ctx.drawImage(image, x, y, drawWidth, drawHeight);
        setHasInk(true);
        setSignError('');
    };

    const handleSignatureUploadClick = () => {
        uploadInputRef.current?.click();
    };

    const handleSignatureFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setSignError('Please upload an image file.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const image = new Image();
            image.onload = () => drawImageOnCanvas(image);
            image.src = asString(reader.result);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const saveSignature = async () => {
        if (!signingTransferId) return;
        const canvas = canvasRef.current;
        if (!canvas || !hasInk) {
            setSignError('Please draw a signature first.');
            return;
        }

        const transfer = transferById.get(signingTransferId);
        if (!transfer) {
            setSignError('Transfer not found.');
            return;
        }

        const baseMeta = parseTransferMeta(transfer);
        const nowIso = new Date().toISOString();
        const signatureImage = canvas.toDataURL('image/jpeg', 0.82);
        const nextMeta: Record<string, unknown> = {
            ...baseMeta,
            signature_signed: 'yes',
            signature_image: signatureImage,
            signature_signed_by: getCurrentUserName(),
            signature_signed_at: nowIso
        };

        setSigningBusy(true);
        setSignError('');
        try {
            const response = await fetch(ENDPOINTS.TRANSFERS.DETAIL(signingTransferId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transfer_meta: nextMeta })
            });
            if (!response.ok) {
                let message = 'Failed to save signature.';
                try {
                    const err = await response.json();
                    message = err?.messages?.error || err?.message || message;
                } catch {
                    // ignore json parse error
                }
                throw new Error(message);
            }

            const updatedTransfer = (await response.json()) as Transfer;
            setTransfers((prev) => prev.map((item) => (
                asString(item.id) === signingTransferId
                    ? updatedTransfer
                    : item
            )));
            closeSignatureModal();
        } catch (error) {
            setSignError(error instanceof Error ? error.message : 'Failed to save signature.');
        } finally {
            setSigningBusy(false);
        }
    };

    const columns: ColumnDef[] = [
        { key: 'rowNo', label: 'No.', sortable: true },
        { key: 'rowRef', label: 'Row', sortable: true },
        {
            key: 'print',
            label: 'Print',
            render: (row) => (
                <button
                    type="button"
                    onClick={() => handlePrintInvoice(row)}
                    className="p-2 rounded-full glass-effect text-slate-600 dark:text-slate-200 hover:text-teal-600"
                    title="Print invoice"
                >
                    <Printer className="w-4 h-4" />
                </button>
            )
        },
        {
            key: 'sign',
            label: 'Sign',
            className: 'min-w-[170px]',
            render: (row) => (
                <div className="flex flex-col items-start gap-1">
                    <button
                        type="button"
                        onClick={() => openSignatureModal(row)}
                        className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 inline-flex items-center gap-1"
                        title={row.signatureSigned ? 'Update signature' : 'Sign transfer'}
                    >
                        {row.signatureSigned ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />}
                        {row.signatureSigned ? 'Signed' : 'Sign'}
                    </button>
                    <span className="text-[11px] text-slate-500 dark:text-slate-300">
                        {row.signatureSigned ? formatDateTime(row.signatureSignedAt) : 'Not signed'}
                    </span>
                </div>
            )
        },
        { key: 'fromBranch', label: 'From Branch', sortable: true, className: 'min-w-[170px]' },
        { key: 'toBranch', label: 'To Branch', sortable: true, className: 'min-w-[170px]' },
        { key: 'invoiceDate', label: 'Invoice Date', sortable: true, className: 'min-w-[180px]', render: (row) => formatDateTime(row.invoiceDate) },
        { key: 'invoiceNo', label: 'Invoice No', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'payoutCurrency', label: 'Payout Currency', sortable: true },
        { key: 'receivedAmount', label: 'Received Amount (£)', sortable: true, render: (row) => row.receivedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { key: 'customerRate', label: 'Customer Rate', sortable: true, render: (row) => row.customerRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) },
        { key: 'fcAmount', label: 'FC Amount', sortable: true, render: (row) => row.fcAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { key: 'transactionId', label: 'Transaction Id', sortable: true },
        { key: 'otherTransactionId', label: 'Other Transaction Id', sortable: true },
        { key: 'branchRate', label: 'Branch Rate', sortable: true, render: (row) => row.branchRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) },
        { key: 'branchPayAmount', label: 'Branch Pay Amount', sortable: true, render: (row) => row.branchPayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { key: 'senderVerified', label: 'Sender Verified', sortable: true },
        { key: 'senderId', label: 'Sender Id', sortable: true },
        { key: 'senderName', label: 'Sender Name', sortable: true, className: 'min-w-[180px]' },
        { key: 'senderDob', label: 'Sender Date Of Birth', sortable: true },
        { key: 'senderPob', label: 'Sender Place Of Birth', sortable: true },
        { key: 'senderContacts', label: 'Sender Contacts', sortable: true },
        { key: 'senderAddress', label: 'Sender Address', sortable: true, className: 'min-w-[260px] max-w-[260px]' },
        { key: 'depositBank', label: 'Deposit Bank', sortable: true },
        { key: 'depositBranch', label: 'Deposit Branch', sortable: true },
        { key: 'sourceOfIncome', label: 'Source Of Income', sortable: true },
        { key: 'purposeOfTransaction', label: 'Purpose Of Transaction', sortable: true, className: 'min-w-[200px]' },
        { key: 'otherPurpose', label: 'Other Purpose', sortable: true },
        { key: 'entryType', label: 'Entry Type', sortable: true },
        { key: 'paymentMode', label: 'Payment Mode', sortable: true },
        { key: 'alliedBank', label: 'Allied Bank', sortable: true },
        { key: 'receiverVerified', label: 'Receiver Verified', sortable: true },
        { key: 'receiverName', label: 'Receiver Name', sortable: true, className: 'min-w-[180px]' },
        { key: 'receiverContacts', label: 'Receiver Contacts', sortable: true },
        { key: 'cnicNo', label: 'CNIC No', sortable: true },
        { key: 'receiverAlliedBank', label: 'Allied Bank', sortable: true },
        { key: 'senderAmlDocument', label: 'Sender Details Page AML Document', sortable: true },
        { key: 'senderAmlResult', label: 'Sender Details Page AML Result', sortable: true },
        { key: 'receiverAmlDocument', label: 'Receiver AML Document', sortable: true },
        { key: 'receiverAmlResult', label: 'Receiver AML Result', sortable: true },
        { key: 'rescreeningMtReceiver', label: 'Re/screening MT Receiver', sortable: true },
        { key: 'enteredUser', label: 'Entered User', sortable: true },
        { key: 'enteredDate', label: 'Entered Date', sortable: true, render: (row) => formatDateTime(row.enteredDate) },
        { key: 'modifiedUser', label: 'Modified User', sortable: true },
        { key: 'modifiedDate', label: 'Modified Date', sortable: true, render: (row) => formatDateTime(row.modifiedDate) },
        { key: 'historyLog', label: 'History Log', sortable: true }
    ];

    if (loading) {
        return <div className="max-w-7xl mx-auto p-8 text-center text-slate-500 animate-pulse">Loading transfers...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <Modal
                isOpen={signModalOpen}
                onClose={closeSignatureModal}
                title="Transfer Signature"
                size="lg"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                        Draw signature using mouse, stylus, or touch.
                    </p>
                    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/40 p-2 overflow-x-auto">
                        <canvas
                            ref={canvasRef}
                            className="touch-none rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                        />
                    </div>
                    <input
                        ref={uploadInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleSignatureFileChange}
                    />
                    {signError && (
                        <p className="text-sm font-semibold text-red-600 dark:text-red-300">{signError}</p>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleSignatureUploadClick}
                            className="px-4 py-2 rounded-full glass-effect text-sm font-semibold text-slate-600 dark:text-slate-200 inline-flex items-center gap-2"
                        >
                            <ImageUp className="w-4 h-4" />
                            Upload
                        </button>
                        <button
                            type="button"
                            onClick={clearSignature}
                            className="px-4 py-2 rounded-full glass-effect text-sm font-semibold text-slate-600 dark:text-slate-200 inline-flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={saveSignature}
                            disabled={signingBusy}
                            className="btn-primary px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                        >
                            <Save className="w-4 h-4" />
                            {signingBusy ? 'Saving...' : 'Save Signature'}
                        </button>
                    </div>
                </div>
            </Modal>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Transfers</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Transfer register with sender/receiver and branch rate details</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={fetchData}
                        className="px-5 py-3 rounded-full glass-effect text-sm font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-300"
                    >
                        Refresh
                    </button>
                    <Link href="/admin/transfers/create" className="btn-primary flex items-center gap-2 rounded-full px-6">
                        <PlusCircle className="w-5 h-5" />
                        New Transfer
                    </Link>
                </div>
            </div>

            <div className="card-glass p-1.5 rounded-full inline-flex flex-wrap w-full md:w-auto overflow-hidden">
                <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar w-full">
                    {Object.entries(statusConfig).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setFilterStatus(key)}
                            className={`px-5 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-300 ${filterStatus === key
                                ? 'bg-white shadow-md text-teal-600 dark:bg-slate-700 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-teal-600'
                                }`}
                        >
                            <span className="flex items-center space-x-2">
                                <span>{config.label}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${filterStatus === key ? 'bg-teal-100 text-teal-700 dark:bg-slate-600 dark:text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                    {config.count}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="card-glass p-5 space-y-4">
                <div className="relative input-icon max-w-xl">
                    <span className="input-icon-left"><Search className="w-5 h-5" /></span>
                    <input
                        type="search"
                        placeholder="Search all transfer columns"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="input-glass w-full"
                    />
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                    Results: {totalRows === 0 ? 0 : startIndex + 1} - {endIndex} of {totalRows}
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="table-shell whitespace-nowrap">
                        <thead className="table-head">
                            <tr>
                                {columns.map((column) => (
                                    <th
                                        key={column.key}
                                        className={`px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 ${column.className || ''}`}
                                    >
                                        {column.sortable ? (
                                            <button
                                                type="button"
                                                onClick={() => toggleSort(column.key)}
                                                className="inline-flex items-center gap-1"
                                            >
                                                {column.label}
                                                <span className="text-slate-400 dark:text-slate-300">{sortIndicator(column.key)}</span>
                                            </button>
                                        ) : column.label}
                                    </th>
                                ))}
                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Approve</th>
                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Cancel</th>
                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">View</th>
                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {pagedRows.map((row) => (
                                <tr key={row.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                    {columns.map((column) => (
                                        <td key={`${row.id}-${column.key}`} className={`px-4 py-3 text-sm text-slate-600 dark:text-slate-300 ${column.className || ''}`}>
                                            <span className="block truncate">
                                                {column.render ? column.render(row) : asString(row[column.key]) || '-'}
                                            </span>
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-sm">
                                        {row.status.toLowerCase() === 'pending' ? (
                                            <button
                                                type="button"
                                                onClick={() => void handleStatusAction(row, 'approve')}
                                                disabled={statusActionBusyId === row.id}
                                                className="px-3 py-1.5 rounded-full bg-teal-500/85 text-white text-xs font-semibold hover:bg-teal-500 disabled:opacity-60 inline-flex items-center gap-1"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                {statusActionBusyId === row.id && statusActionType === 'approve' ? 'Approving...' : 'Approve'}
                                            </button>
                                        ) : (
                                            <span className="text-slate-400 dark:text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {['pending', 'in review', 'in transit'].includes(row.status.toLowerCase()) ? (
                                            <button
                                                type="button"
                                                onClick={() => void handleStatusAction(row, 'cancel')}
                                                disabled={statusActionBusyId === row.id}
                                                className="px-3 py-1.5 rounded-full bg-red-500/85 text-white text-xs font-semibold hover:bg-red-500 disabled:opacity-60 inline-flex items-center gap-1"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                {statusActionBusyId === row.id && statusActionType === 'cancel' ? 'Cancelling...' : 'Cancel'}
                                            </button>
                                        ) : (
                                            <span className="text-slate-400 dark:text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <Link
                                            href={`/admin/transfers/${row.id}`}
                                            className="px-3 py-1.5 rounded-full glass-effect text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-teal-600 inline-flex items-center gap-1"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500">-</td>
                                </tr>
                            ))}
                            {pagedRows.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length + 4} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-300">
                                        No transfers found.
                                    </td>
                                </tr>
                            )}
                            {pagedRows.length > 0 && (
                                <tr className="bg-teal-50/40 dark:bg-slate-800/50">
                                    <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">Total:</td>
                                    <td colSpan={9} className="px-4 py-3" />
                                    <td className="px-4 py-3 text-sm font-bold text-teal-700 dark:text-teal-300">
                                        {receivedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td colSpan={columns.length - 11 + 4} className="px-4 py-3" />
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-100/70 dark:border-slate-700/60">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-slate-400 dark:text-slate-300">Rows per page</span>
                        <select
                            className="input-glass px-3 py-1.5 text-sm"
                            value={rowsPerPage}
                            onChange={(event) => setRowsPerPage(Number(event.target.value))}
                        >
                            <option value={15}>15</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <button
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-full glass-effect text-slate-600 dark:text-slate-200 disabled:opacity-40"
                        >
                            Prev
                        </button>
                        <span className="text-slate-400 dark:text-slate-300">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-full glass-effect text-slate-600 dark:text-slate-200 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
