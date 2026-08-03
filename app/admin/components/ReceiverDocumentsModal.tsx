'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { FolderOpen, FileText, X, Loader2, Upload, Eye, CreditCard, Home, ShieldCheck, Plus, Trash2, Tag, Calendar, User, ExternalLink, Download } from 'lucide-react';
import { getCurrentAdminUser } from '@/app/lib/adminUserScope';
import { ENDPOINTS } from '@/app/lib/api';
import { resolveUploadsUrl } from '@/app/lib/uploads';
import { formatDateTime } from '@/app/lib/dateUtils';
import { showToast } from '@/app/lib/toast';
import { usePagePermissions } from '@/app/lib/permissions';

interface ReceiverDocumentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    receiverId: string | number;
    receiverName: string;
    onUpdated?: () => void;
}

export interface DocumentRecord {
    id: string;
    docType: string;
    docTypeLabel: string;
    fileName: string;
    fileUrl: string;
    previewUrl?: string;
    uploadedAt: string;
    uploadedBy?: string;
}

const DOC_TYPES = [
    { key: 'id_copy', label: 'ID / Passport / CNIC', icon: CreditCard, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', subfolder: 'id_copy' },
    { key: 'proof_of_address_doc', label: 'Proof of Address', icon: Home, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', subfolder: 'proof_of_address' },
    { key: 'beneficiary_details_aml_screening_doc', label: 'AML Document', icon: ShieldCheck, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', subfolder: 'aml_documents' },
    { key: 'other_doc', label: 'Other Document', icon: FileText, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/20', subfolder: 'other_documents' },
];

const CATEGORY_SUBFOLDERS: Record<string, string> = {
    id_copy: 'id_copy',
    passport_copy: 'id_copy',
    proof_of_address_doc: 'proof_of_address',
    beneficiary_details_aml_screening_doc: 'aml_documents',
    aml_screening_doc: 'aml_documents',
    other_doc: 'other_documents',
};

const extractCanonicalId = (id?: string | number | null): string => {
    const s = String(id || '').trim();
    if (!s) return '0';
    return s.split('.')[0];
};

const buildReceiverSubfolderPath = (
    docType: string,
    fileName: string,
    receiverName: string,
    receiverId: string | number
): string => {
    const categoryFolder = CATEGORY_SUBFOLDERS[docType] || 'other_documents';
    const safeName = String(receiverName || 'receiver')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_');
    const safeId = extractCanonicalId(receiverId);
    const receiverFolder = `${safeName}_${safeId}`;
    const cleanFileName = fileName.split('/').pop() || fileName;

    return resolveUploadsUrl(`receivers/${receiverFolder}/${categoryFolder}/${cleanFileName}`);
};

const parseDateMs = (d?: string | number | null, fileName?: string): number => {
    let str = String(d || '').trim();

    const fn = String(fileName || str).trim();
    const match = fn.match(/DILISENSE-(?:BENE-)?(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/i);
    if (match) {
        const [, year, month, day, hour, min, sec] = match;
        const fnMs = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).getTime();
        if (!isNaN(fnMs) && fnMs > 0) return fnMs;
    }

    if (!str) return 0;
    if (str.includes(' ') && !str.includes('T')) {
        str = str.replace(' ', 'T');
    }
    const ms = new Date(str).getTime();
    return isNaN(ms) ? 0 : ms;
};

const isPdfFile = (fileName?: string, fileUrl?: string, previewUrl?: string): boolean => {
    const fn = (fileName || '').toLowerCase();
    const url = (fileUrl || '').toLowerCase();
    const prev = (previewUrl || '').toLowerCase();
    return (
        fn.endsWith('.pdf') ||
        url.endsWith('.pdf') ||
        url.includes('.pdf?') ||
        prev.endsWith('.pdf') ||
        prev.includes('.pdf?') ||
        prev.includes('application/pdf')
    );
};

export default function ReceiverDocumentsModal({
    isOpen,
    onClose,
    receiverId,
    receiverName,
    onUpdated,
}: ReceiverDocumentsModalProps) {
    const currentUser = useMemo(() => getCurrentAdminUser(), []);
    const { canUploadReports, canDeleteReports, canDeleteComplianceReport, canDelete, canAdd } = usePagePermissions('RECEIVERS');
    const allowUpload = canUploadReports ?? canAdd ?? true;
    const allowDelete = canDeleteReports ?? canDeleteComplianceReport ?? canDelete ?? true;

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [receiverData, setReceiverData] = useState<any>(null);
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>('all');

    // Inline Preview Viewer Modal State
    const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

    // Add Document Form State
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState('id_copy');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const getStorageKey = (id: string | number) => `receiver_vault_${extractCanonicalId(id)}`;
    const getDeletedKey = (id: string | number) => `receiver_vault_deleted_${extractCanonicalId(id)}`;

    const loadLocalVault = (id: string | number): DocumentRecord[] => {
        try {
            const canonical = extractCanonicalId(id);
            const rawKey = `receiver_vault_${id}`;
            const canonicalKey = getStorageKey(canonical);

            let docs: DocumentRecord[] = [];

            const canonicalVal = localStorage.getItem(canonicalKey);
            if (canonicalVal) {
                try {
                    const parsed = JSON.parse(canonicalVal);
                    if (Array.isArray(parsed)) docs = parsed;
                } catch (e) { }
            }

            if (rawKey !== canonicalKey) {
                const rawVal = localStorage.getItem(rawKey);
                if (rawVal) {
                    try {
                        const rawDocs = JSON.parse(rawVal);
                        if (Array.isArray(rawDocs)) {
                            rawDocs.forEach((rd) => {
                                if (!docs.some((d) => d.id === rd.id || d.fileName === rd.fileName)) {
                                    docs.push(rd);
                                }
                            });
                        }
                    } catch (e) { }
                }
            }

            return docs;
        } catch (e) {
            console.error('Failed to load local receiver vault:', e);
        }
        return [];
    };

    const saveLocalVault = (id: string | number, docs: DocumentRecord[]) => {
        try {
            const canonical = extractCanonicalId(id);
            localStorage.setItem(getStorageKey(canonical), JSON.stringify(docs));
            localStorage.setItem(`receiver_vault_${id}`, JSON.stringify(docs));
        } catch (e) {
            console.error('Failed to save to local receiver vault:', e);
        }
    };

    const loadDeletedVault = (id: string | number): string[] => {
        try {
            const val = localStorage.getItem(getDeletedKey(id));
            if (!val) return [];
            const list = JSON.parse(val);
            if (Array.isArray(list)) return list.map((s) => String(s).trim());
        } catch (e) {
            console.error('Failed to parse deleted receiver vault:', e);
        }
        return [];
    };

    const saveDeletedVault = (id: string | number, list: string[]) => {
        try {
            localStorage.setItem(getDeletedKey(id), JSON.stringify(list));
        } catch (e) {
            console.error('Failed to save to deleted receiver vault:', e);
        }
    };

    const seedVaultFromData = (
        data: any,
        dilisenseReports: any[],
        existingVault: DocumentRecord[],
        rName: string,
        rId: string | number
    ): DocumentRecord[] => {
        const newVault = [...existingVault];
        const now = data?.created_at || new Date().toISOString();
        const userName = data?.created_by || 'Admin';
        const deletedList = loadDeletedVault(rId);

        const checkAndAdd = (
            rawVal: any,
            typeKey: string,
            label: string,
            customUploadedAt?: string,
            customUploadedBy?: string
        ) => {
            if (!rawVal) return;

            let urlsToProcess: string[] = [];
            if (typeof rawVal === 'string') {
                const trimmed = rawVal.trim();
                if (trimmed.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (Array.isArray(parsed)) {
                            urlsToProcess = parsed.map((s) => String(s).trim());
                        }
                    } catch (e) { }
                }
                if (urlsToProcess.length === 0 && trimmed.includes(',')) {
                    urlsToProcess = trimmed.split(',').map((s) => s.trim());
                }
                if (urlsToProcess.length === 0 && trimmed !== '' && trimmed !== '-') {
                    urlsToProcess = [trimmed];
                }
            } else if (Array.isArray(rawVal)) {
                urlsToProcess = rawVal.map((s) => String(s).trim());
            }

            urlsToProcess.forEach((url) => {
                if (url && url !== '-') {
                    const fileName = url.split('/').pop() || label;

                    const isDeleted = deletedList.some((item) =>
                        item === url || item === fileName || url.endsWith(item) || item.endsWith(fileName)
                    );

                    if (!isDeleted) {
                        const existingIndex = newVault.findIndex(
                            (d) => d.fileUrl === url || d.fileUrl.endsWith(fileName) || d.fileName === fileName
                        );

                        const subfolderPath = buildReceiverSubfolderPath(typeKey, fileName, rName, rId);
                        const isDirectPath =
                            url.startsWith('http') ||
                            url.startsWith('uploads/') ||
                            url.startsWith('receivers/') ||
                            url.startsWith('aml-reports/') ||
                            url.includes('aml-reports');
                        const targetFileUrl = isDirectPath ? url : subfolderPath;

                        if (existingIndex >= 0) {
                            const existing = newVault[existingIndex];
                            if (customUploadedAt) {
                                const newTime = parseDateMs(customUploadedAt, fileName);
                                const oldTime = parseDateMs(existing.uploadedAt, existing.fileName);
                                if (newTime > 0 && (oldTime === 0 || newTime >= oldTime)) {
                                    newVault[existingIndex] = {
                                        ...existing,
                                        uploadedAt: customUploadedAt,
                                        uploadedBy: customUploadedBy || existing.uploadedBy || userName,
                                        docTypeLabel: label || existing.docTypeLabel,
                                        fileUrl: targetFileUrl,
                                    };
                                }
                            }
                        } else {
                            newVault.push({
                                id: `init_${typeKey}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                docType: typeKey,
                                docTypeLabel: label,
                                fileName: fileName,
                                fileUrl: targetFileUrl,
                                uploadedAt: customUploadedAt || now,
                                uploadedBy: customUploadedBy || userName,
                            });
                        }
                    }
                }
            });
        };

        checkAndAdd(data?.id_copy, 'id_copy', 'ID / Passport / CNIC');
        checkAndAdd(data?.proof_of_address_doc, 'proof_of_address_doc', 'Proof of Address');
        checkAndAdd(data?.aml_screening_doc, 'beneficiary_details_aml_screening_doc', 'AML Document', data?.aml_checked_at);
        checkAndAdd(data?.other_doc, 'other_doc', 'Other Document');

        if (Array.isArray(dilisenseReports)) {
            dilisenseReports.forEach((rep) => {
                if (rep.pdf_path) {
                    checkAndAdd(
                        rep.pdf_path,
                        'beneficiary_details_aml_screening_doc',
                        'AML Document',
                        rep.created_at || rep.generated_at,
                        rep.created_by || 'Admin'
                    );
                }
            });
        }

        newVault.sort((a, b) => {
            const timeA = parseDateMs(a.uploadedAt, a.fileName);
            const timeB = parseDateMs(b.uploadedAt, b.fileName);
            return timeB - timeA;
        });

        return newVault;
    };

    useEffect(() => {
        if (!isOpen || !receiverId) return;

        let isMounted = true;
        setLoading(true);
        setShowUploadForm(false);
        setPreviewDoc(null);

        const fetchData = async () => {
            try {
                let data: any = null;
                let dilisenseReports: any[] = [];

                const res = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(receiverId));
                if (res.ok) {
                    data = await res.json();
                }

                if (ENDPOINTS.BENEFICIARIES.DILISENSE_REPORTS_LIST) {
                    try {
                        const repRes = await fetch(ENDPOINTS.BENEFICIARIES.DILISENSE_REPORTS_LIST(receiverId));
                        if (repRes.ok) {
                            const repData = await repRes.json();
                            if (Array.isArray(repData)) dilisenseReports = repData;
                        }
                    } catch (e) { }
                }

                if (!isMounted) return;

                setReceiverData(data);
                const localVault = loadLocalVault(receiverId);
                const rName = data?.name || receiverName || 'Receiver';
                const finalDocs = seedVaultFromData(data, dilisenseReports, localVault, rName, receiverId);

                setDocuments(finalDocs);
                saveLocalVault(receiverId, finalDocs);
            } catch (e) {
                console.error('Failed to load receiver document details:', e);
                const localVault = loadLocalVault(receiverId);
                setDocuments(localVault);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [isOpen, receiverId, receiverName]);

    const filteredDocs = useMemo(() => {
        let docs = documents;
        if (activeFilter !== 'all') {
            docs = docs.filter((d) => d.docType === activeFilter);
        }
        return [...docs].sort((a, b) => {
            const timeA = parseDateMs(a.uploadedAt, a.fileName);
            const timeB = parseDateMs(b.uploadedAt, b.fileName);
            return timeB - timeA;
        });
    }, [documents, activeFilter]);

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            showToast('Error', 'Please select a file to upload', 'danger');
            return;
        }

        setUploading(true);
        const fileName = selectedFile.name;
        const config = DOC_TYPES.find((t) => t.key === selectedDocType) || DOC_TYPES[0];
        const rName = receiverData?.name || receiverName || 'Receiver';

        try {
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);
            reader.onload = () => {
                const dataUrl = reader.result as string;

                const newRecord: DocumentRecord = {
                    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    docType: selectedDocType,
                    docTypeLabel: config.label,
                    fileName: fileName,
                    fileUrl: buildReceiverSubfolderPath(selectedDocType, fileName, rName, receiverId),
                    previewUrl: dataUrl,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: (currentUser as any)?.username || (currentUser as any)?.email || currentUser?.role || 'Admin',
                };

                const updated = [newRecord, ...documents];
                setDocuments(updated);
                saveLocalVault(receiverId, updated);

                showToast('Success', `Uploaded ${config.label} successfully!`, 'success');
                setShowUploadForm(false);
                setSelectedFile(null);
                setUploading(false);
                if (onUpdated) onUpdated();
            };
        } catch (e) {
            console.error('Failed to upload receiver document:', e);
            showToast('Error', 'Failed to process document', 'danger');
            setUploading(false);
        }
    };

    const handleDeleteDoc = (docId: string) => {
        const docToDelete = documents.find((d) => d.id === docId);
        if (!docToDelete) return;

        if (!confirm(`Are you sure you want to remove "${docToDelete.fileName}"?`)) {
            return;
        }

        const updated = documents.filter((d) => d.id !== docId);
        setDocuments(updated);
        saveLocalVault(receiverId, updated);

        const deletedList = loadDeletedVault(receiverId);
        if (docToDelete.fileUrl && !deletedList.includes(docToDelete.fileUrl)) {
            deletedList.push(docToDelete.fileUrl);
        }
        if (docToDelete.fileName && !deletedList.includes(docToDelete.fileName)) {
            deletedList.push(docToDelete.fileName);
        }
        saveDeletedVault(receiverId, deletedList);

        showToast('Success', 'Document removed from folder', 'success');
        if (onUpdated) onUpdated();
    };

    const getResolvedDocSrc = (doc: DocumentRecord): string => {
        if (doc.previewUrl) return doc.previewUrl;
        return resolveUploadsUrl(doc.fileUrl);
    };

    if (!isOpen) return null;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                <FolderOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                    Receiver Documents — {receiverName || 'Receiver'}
                                </h3>
                                <p className="text-xs font-medium text-slate-400">
                                    View and manage document files attached to this receiver.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {allowUpload && (
                                <button
                                    type="button"
                                    onClick={() => setShowUploadForm(!showUploadForm)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-sm transition-all"
                                >
                                    {showUploadForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    <span>{showUploadForm ? 'Cancel' : 'Add Document'}</span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Upload Form Drawer */}
                    {showUploadForm && (
                        <form onSubmit={handleUploadSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Upload className="w-4 h-4 text-teal-500" /> Upload New Receiver Document
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Document Type</label>
                                    <select
                                        value={selectedDocType}
                                        onChange={(e) => setSelectedDocType(e.target.value)}
                                        className="input-glass w-full text-xs font-semibold"
                                    >
                                        {DOC_TYPES.map((t) => (
                                            <option key={t.key} value={t.key}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Select File (PDF / Image)</label>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        required
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-950/40 dark:file:text-teal-300 hover:file:bg-teal-100 transition-all cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadForm(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition-all"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <button
                            type="button"
                            onClick={() => setActiveFilter('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeFilter === 'all'
                                    ? 'bg-teal-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                        >
                            All Documents ({documents.length})
                        </button>
                        {DOC_TYPES.map((type) => {
                            const count = documents.filter((d) => d.docType === type.key).length;
                            return (
                                <button
                                    key={type.key}
                                    type="button"
                                    onClick={() => setActiveFilter(type.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeFilter === type.key
                                            ? 'bg-teal-500 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                        }`}
                                >
                                    {type.label} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Document History Cards */}
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                            <p className="text-xs font-medium">Loading document vault history...</p>
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="py-12 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                            <div>
                                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No documents found in this folder</p>
                                <p className="text-xs text-slate-400 mt-0.5">Click "+ Add Document" to upload a document for this receiver.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                            {filteredDocs.map((doc) => {
                                const config = DOC_TYPES.find((t) => t.key === doc.docType) || DOC_TYPES[3];
                                const Icon = config.icon;
                                const isLatest = filteredDocs.findIndex((d) => d.docType === doc.docType) === filteredDocs.indexOf(doc);

                                return (
                                    <div
                                        key={doc.id}
                                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-3.5 overflow-hidden min-w-0">
                                            <div className={`p-3 rounded-2xl shrink-0 ${config.bg} ${config.color}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={doc.fileName}>
                                                        {doc.fileName}
                                                    </h4>
                                                    <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md ${config.bg} ${config.color}`}>
                                                        <Tag className="w-3 h-3" /> {doc.docTypeLabel}
                                                    </span>
                                                    {isLatest && (
                                                        <span className="inline-flex items-center text-[10px] font-extrabold bg-teal-500 text-white px-2 py-0.5 rounded-md shadow-xs">
                                                            LATEST
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mt-1 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {formatDateTime(doc.uploadedAt)}
                                                    </span>
                                                    {doc.uploadedBy && (
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3.5 h-3.5" />
                                                            {doc.uploadedBy}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDoc(doc)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-sm transition-all"
                                            >
                                                <Eye className="w-4 h-4" /> View Document
                                            </button>

                                            {allowDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteDoc(doc.id)}
                                                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                                    title="Remove from folder"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Inline Document Preview Modal */}
            {previewDoc && (
                <Modal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)} size="lg">
                    <div className="p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                                    <Eye className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate max-w-md">
                                        {previewDoc.fileName}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono">
                                        {previewDoc.docTypeLabel} • {formatDateTime(previewDoc.uploadedAt)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreviewDoc(null)}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Document Content Display */}
                        <div className="min-h-[350px] max-h-[65vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-2xl p-4 border border-slate-800">
                            {!isPdfFile(previewDoc.fileName, previewDoc.fileUrl, previewDoc.previewUrl) &&
                                (previewDoc.fileName.match(/\.(png|jpe?g|gif|webp|svg)$/i) || previewDoc.previewUrl?.startsWith('data:image') || (previewDoc.previewUrl?.startsWith('blob:') && !isPdfFile(previewDoc.fileName, previewDoc.fileUrl, previewDoc.previewUrl))) ? (
                                <img
                                    src={getResolvedDocSrc(previewDoc)}
                                    alt={previewDoc.fileName}
                                    className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl"
                                />
                            ) : (
                                <iframe
                                    src={getResolvedDocSrc(previewDoc)}
                                    className="w-full h-[60vh] rounded-lg border-0 bg-white"
                                    title={previewDoc.fileName}
                                />
                            )}
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <a
                                    href={getResolvedDocSrc(previewDoc)}
                                    download={previewDoc.fileName}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 transition-all"
                                >
                                    <Download className="w-4 h-4" /> Download
                                </a>
                                <a
                                    href={getResolvedDocSrc(previewDoc)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all"
                                >
                                    <ExternalLink className="w-4 h-4" /> Open in Full Window
                                </a>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
