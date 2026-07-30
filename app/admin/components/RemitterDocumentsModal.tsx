'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { FolderOpen, FileText, X, Loader2, Upload, Eye, CreditCard, Home, Briefcase, ShieldCheck, Plus, Trash2, Tag, Calendar, User, Folder, ExternalLink, Download } from 'lucide-react';
import { getCurrentAdminUser, withActingUserParam } from '@/app/lib/adminUserScope';
import { ENDPOINTS } from '@/app/lib/api';
import { resolveUploadsUrl } from '@/app/lib/uploads';
import { formatDateTime } from '@/app/lib/dateUtils';
import { showToast } from '@/app/lib/toast';

interface RemitterDocumentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    remitterId: string | number;
    remitterName: string;
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
    { key: 'id_copy', label: 'ID Copy', icon: CreditCard, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', subfolder: 'id_copy' },
    { key: 'proof_of_address_doc', label: 'Proof of Address', icon: Home, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', subfolder: 'proof_of_address' },
    { key: 'work_related_docs', label: 'Source of Income', icon: Briefcase, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', subfolder: 'source_of_income' },
    { key: 'sender_details_aml_screening_doc', label: 'AML Document', icon: ShieldCheck, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', subfolder: 'aml_documents' },
    { key: 'other_doc', label: 'Other Document', icon: FileText, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/20', subfolder: 'other_documents' },
];

const CATEGORY_SUBFOLDERS: Record<string, string> = {
    id_copy: 'id_copy',
    passport_copy: 'id_copy',
    proof_of_address_doc: 'proof_of_address',
    work_related_docs: 'source_of_income',
    sender_details_aml_screening_doc: 'aml_documents',
    other_doc: 'other_documents',
};

const extractCanonicalId = (id?: string | number | null): string => {
    const s = String(id || '').trim();
    if (!s) return '0';
    return s.split('.')[0];
};

const buildRemitterSubfolderPath = (
    docType: string,
    fileName: string,
    remitterName: string,
    remitterId: string | number
): string => {
    const safeName = String(remitterName || 'remitter')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_');
    const safeId = extractCanonicalId(remitterId);
    const remitterFolder = `${safeName}_${safeId}`;
    const categoryFolder = CATEGORY_SUBFOLDERS[docType] || 'other_documents';
    const cleanFileName = fileName.replace(/^\/+/, '').split('/').pop() || fileName;

    return `remitters/${remitterFolder}/${categoryFolder}/${cleanFileName}`;
};

const formatDocUrl = (
    rawPath: string,
    docType?: string,
    remitterName?: string,
    remitterId?: string | number
): string => {
    if (!rawPath) return '';
    let p = String(rawPath).trim();
    if (!p) return '';

    if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/api/uploads/')) {
        return resolveUploadsUrl(p);
    }

    p = p.replace(/^\/+/, '').replace(/^uploads\//, '');

    if (p.startsWith('remitters/')) {
        p = p.replace(/(remitters\/[a-z0-9_-]+_\d+)\.[a-zA-Z0-9_-]+(\/.*)/, '$1$2');
        return resolveUploadsUrl(p);
    }

    if (p.startsWith('aml-reports/')) {
        return resolveUploadsUrl(`uploads/${p}`);
    }

    const categoryFolder = (docType && CATEGORY_SUBFOLDERS[docType]) || 'id_copy';
    const safeName = String(remitterName || 'remitter')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_');
    const safeId = extractCanonicalId(remitterId);
    const remitterFolder = `${safeName}_${safeId}`;
    const cleanFileName = p.split('/').pop() || p;

    return resolveUploadsUrl(`remitters/${remitterFolder}/${categoryFolder}/${cleanFileName}`);
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

export default function RemitterDocumentsModal({
    isOpen,
    onClose,
    remitterId,
    remitterName,
    onUpdated,
}: RemitterDocumentsModalProps) {
    const currentUser = useMemo(() => getCurrentAdminUser(), []);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [remitterData, setRemitterData] = useState<any>(null);
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>('all');

    // Inline Preview Viewer Modal State
    const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

    // Add Document Form State
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState('id_copy');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const getStorageKey = (id: string | number) => `remitter_vault_${extractCanonicalId(id)}`;
    const getDeletedKey = (id: string | number) => `remitter_vault_deleted_${extractCanonicalId(id)}`;

    const loadLocalVault = (id: string | number): DocumentRecord[] => {
        try {
            const canonical = extractCanonicalId(id);
            const rawKey = `remitter_vault_${id}`;
            const canonicalKey = getStorageKey(canonical);

            let docs: DocumentRecord[] = [];

            const canonicalVal = localStorage.getItem(canonicalKey);
            if (canonicalVal) {
                try {
                    const parsed = JSON.parse(canonicalVal);
                    if (Array.isArray(parsed)) docs = parsed;
                } catch (e) {}
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
                    } catch (e) {}
                }
            }

            docs = docs.map((d) => {
                if (d.fileUrl && d.fileUrl.includes('.')) {
                    const fixedUrl = d.fileUrl.replace(/(remitters\/[a-z0-9_-]+_\d+)\.[a-zA-Z0-9_-]+(\/.*)/, '$1$2');
                    return { ...d, fileUrl: fixedUrl };
                }
                return d;
            });

            return docs;
        } catch (e) {
            console.error('Failed to parse local vault:', e);
        }
        return [];
    };

    const saveLocalVault = (id: string | number, docs: DocumentRecord[]) => {
        try {
            localStorage.setItem(getStorageKey(id), JSON.stringify(docs));
        } catch (e) {
            console.error('Failed to save to local vault:', e);
        }
    };

    const loadDeletedVault = (id: string | number): string[] => {
        try {
            const canonical = extractCanonicalId(id);
            const rawKey = `remitter_vault_deleted_${id}`;
            const canonicalKey = getDeletedKey(canonical);

            let list: string[] = [];
            const cVal = localStorage.getItem(canonicalKey);
            if (cVal) {
                try {
                    const parsed = JSON.parse(cVal);
                    if (Array.isArray(parsed)) list = parsed;
                } catch (e) {}
            }
            if (rawKey !== canonicalKey) {
                const rVal = localStorage.getItem(rawKey);
                if (rVal) {
                    try {
                        const rList = JSON.parse(rVal);
                        if (Array.isArray(rList)) list = Array.from(new Set([...list, ...rList]));
                    } catch (e) {}
                }
            }
            return list;
        } catch (e) {
            console.error('Failed to parse deleted vault:', e);
        }
        return [];
    };

    const saveDeletedVault = (id: string | number, list: string[]) => {
        try {
            localStorage.setItem(getDeletedKey(id), JSON.stringify(list));
        } catch (e) {
            console.error('Failed to save to deleted vault:', e);
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
        const userName = data?.created_by || 'System Admin';
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
                    } catch (e) {}
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

                        const subfolderPath = buildRemitterSubfolderPath(typeKey, fileName, rName, rId);
                        const isDirectPath =
                            url.startsWith('http') ||
                            url.startsWith('uploads/') ||
                            url.startsWith('remitters/') ||
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

        if (Array.isArray(dilisenseReports)) {
            dilisenseReports.forEach((rep) => {
                if (rep && rep.pdf_path) {
                    const refLabel = rep.reference ? `AML Report (${rep.reference})` : 'AML Screening Report';
                    checkAndAdd(
                        rep.pdf_path,
                        'sender_details_aml_screening_doc',
                        refLabel,
                        rep.created_at,
                        rep.created_by
                    );
                }
            });
        }

        checkAndAdd(data?.id_copy, 'id_copy', 'ID Copy');
        checkAndAdd(data?.passport_copy, 'id_copy', 'ID Copy (Passport)');
        checkAndAdd(data?.proof_of_address_doc, 'proof_of_address_doc', 'Proof of Address');
        checkAndAdd(data?.work_related_docs, 'work_related_docs', 'Source of Income');
        checkAndAdd(data?.sender_details_aml_screening_doc, 'sender_details_aml_screening_doc', 'AML Document');
        checkAndAdd(data?.other_doc, 'other_doc', 'Other Document');

        return newVault;
    };

    const fetchRemitterDetails = async () => {
        if (!remitterId) return;
        setLoading(true);
        try {
            const [remitterRes, reportsRes] = await Promise.all([
                fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(remitterId), currentUser)).catch(() => null),
                fetch(withActingUserParam(ENDPOINTS.REMITTERS.DILISENSE_REPORTS_LIST(remitterId), currentUser)).catch(() => null),
            ]);

            let data = null;
            if (remitterRes && remitterRes.ok) {
                data = await remitterRes.json().catch(() => null);
                setRemitterData(data);
            }

            let dilisenseReports: any[] = [];
            if (reportsRes && reportsRes.ok) {
                const repData = await reportsRes.json().catch(() => []);
                if (Array.isArray(repData)) dilisenseReports = repData;
            }

            const rName = data?.sender_name || remitterName || 'remitter';
            const activeId = data?.id ? String(data.id) : extractCanonicalId(remitterId);
            const storedDocs = loadLocalVault(activeId);
            const mergedDocs = seedVaultFromData(data, dilisenseReports, storedDocs, rName, activeId);
            saveLocalVault(activeId, mergedDocs);
            setDocuments(mergedDocs);
        } catch (e) {
            console.error('Error fetching remitter documents:', e);
            showToast('Error', 'Network error fetching document vault', 'danger');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && remitterId) {
            setSelectedFile(null);
            setShowUploadForm(false);
            setPreviewDoc(null);
            setActiveFilter('all');
            void fetchRemitterDetails();
        }
    }, [isOpen, remitterId]);

    useEffect(() => {
        if (previewDoc && isPdfFile(previewDoc.fileName, previewDoc.fileUrl, previewDoc.previewUrl)) {
            const targetUrl = previewDoc.previewUrl || formatDocUrl(previewDoc.fileUrl, previewDoc.docType, remitterName, remitterId);
            if (targetUrl) {
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
            }
            setPreviewDoc(null);
        }
    }, [previewDoc, remitterName, remitterId]);

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            showToast('Warning', 'Please select a file to upload', 'warning');
            return;
        }

        setUploading(true);
        try {
            const rName = remitterData?.sender_name || remitterName || 'remitter';
            const activeId = remitterData?.id ? String(remitterData.id) : extractCanonicalId(remitterId);

            const formData = new FormData();
            formData.append(selectedDocType, selectedFile);
            formData.append('doc_type', CATEGORY_SUBFOLDERS[selectedDocType] || 'id_copy');
            formData.append('remitter_name', rName);
            formData.append('remitter_id', activeId);

            const updateUrl = withActingUserParam(`${ENDPOINTS.REMITTERS.DETAIL(remitterId)}/update`, currentUser);
            const res = await fetch(updateUrl, {
                method: 'POST',
                body: formData,
            });

            let uploadedPath = '';
            if (res.ok) {
                const resData = await res.json().catch(() => null);
                if (resData && (resData[selectedDocType] || resData.file_path || resData.path)) {
                    uploadedPath = resData[selectedDocType] || resData.file_path || resData.path;
                }
            }

            const subfolderPath = buildRemitterSubfolderPath(selectedDocType, selectedFile.name, rName, activeId);

            const docConfig = DOC_TYPES.find((d) => d.key === selectedDocType);
            const docLabel = docConfig ? docConfig.label : 'Document';

            // Create a Blob URL for instant supported viewing in browser and preview overlay
            let blobPreviewUrl = '';
            try {
                blobPreviewUrl = URL.createObjectURL(selectedFile);
            } catch (err) {
                console.error('Failed to create Blob URL:', err);
            }

            const newDoc: DocumentRecord = {
                id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                docType: selectedDocType,
                docTypeLabel: docLabel,
                fileName: selectedFile.name,
                fileUrl: subfolderPath,
                previewUrl: blobPreviewUrl || undefined,
                uploadedAt: new Date().toISOString(),
                uploadedBy: (currentUser as any)?.username || (currentUser as any)?.email || (currentUser as any)?.name || 'Admin',
            };

            const updatedDocs = [newDoc, ...documents];
            saveLocalVault(activeId, updatedDocs);
            setDocuments(updatedDocs);

            showToast('Success', `${docLabel} saved to ${subfolderPath}`, 'success');
            setSelectedFile(null);
            setShowUploadForm(false);
            if (onUpdated) onUpdated();
        } catch (err) {
            console.error(err);
            showToast('Error', 'Error uploading document', 'danger');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (docId: string) => {
        const activeId = remitterData?.id ? String(remitterData.id) : extractCanonicalId(remitterId);
        const targetDoc = documents.find((d) => d.id === docId);
        const filtered = documents.filter((d) => d.id !== docId);

        saveLocalVault(activeId, filtered);
        setDocuments(filtered);

        if (targetDoc) {
            const currentDeleted = loadDeletedVault(activeId);
            const toAdd = [targetDoc.fileUrl, targetDoc.fileName, targetDoc.id];
            if (targetDoc.previewUrl) toAdd.push(targetDoc.previewUrl);
            const updatedDeleted = Array.from(new Set([...currentDeleted, ...toAdd]));
            saveDeletedVault(activeId, updatedDeleted);

            if (remitterId) {
                try {
                    const updatePayload: Record<string, string> = {
                        delete_doc_url: targetDoc.fileUrl,
                        doc_type: targetDoc.docType,
                    };

                    const updateUrl = withActingUserParam(`${ENDPOINTS.REMITTERS.DETAIL(remitterId)}/update`, currentUser);
                    await fetch(updateUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatePayload),
                    });

                    if (onUpdated) onUpdated();
                } catch (e) {
                    console.error('Failed to sync document deletion with database:', e);
                }
            }
        }

        showToast('Success', 'Document permanently deleted', 'success');
    };

    const filteredDocs = useMemo(() => {
        const list = activeFilter === 'all'
            ? documents
            : documents.filter((d) => d.docType === activeFilter);

        return [...list].sort((a, b) => {
            const timeDiff = parseDateMs(b.uploadedAt, b.fileName) - parseDateMs(a.uploadedAt, a.fileName);
            if (timeDiff !== 0) return timeDiff;
            return b.fileName.localeCompare(a.fileName);
        });
    }, [documents, activeFilter]);

    const remitterFolderName = useMemo(() => {
        const rName = remitterData?.sender_name || remitterName || 'remitter';
        const safeName = String(rName).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_');
        const activeId = remitterData?.id ? String(remitterData.id) : extractCanonicalId(remitterId);
        return `remitters/${safeName}_${activeId}/`;
    }, [remitterData, remitterName, remitterId]);

    const getResolvedDocSrc = (doc: DocumentRecord) => {
        const activeId = remitterData?.id ? String(remitterData.id) : extractCanonicalId(remitterId);
        return doc.previewUrl || formatDocUrl(doc.fileUrl, doc.docType, remitterName, activeId);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                <FolderOpen className="w-7 h-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                        Remitter Document Vault
                                    </h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                                        {documents.length} Files
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-0.5 flex items-center gap-1 font-mono">
                                    <Folder className="w-3.5 h-3.5" />
                                    {remitterFolderName}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowUploadForm(!showUploadForm)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-500 hover:bg-teal-600 text-white shadow-md shadow-teal-500/20 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                {showUploadForm ? 'Cancel Upload' : 'Add Document'}
                            </button>

                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Upload Form Box */}
                    {showUploadForm && (
                        <form onSubmit={handleUploadSubmit} className="p-5 rounded-2xl bg-teal-50/70 dark:bg-slate-800/70 border border-teal-200/80 dark:border-slate-700 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-teal-600" /> Upload & Save Document to Category Folder
                                </h3>
                                <span className="text-xs font-mono font-medium text-teal-700 dark:text-teal-300">
                                    {remitterFolderName}{CATEGORY_SUBFOLDERS[selectedDocType]}/
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Document Category & Subfolder
                                    </label>
                                    <select
                                        value={selectedDocType}
                                        onChange={(e) => setSelectedDocType(e.target.value)}
                                        className="input-glass w-full text-sm font-semibold"
                                    >
                                        {DOC_TYPES.map((doc) => (
                                            <option key={doc.key} value={doc.key}>
                                                {doc.label} ({doc.subfolder}/)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Select File
                                    </label>
                                    <input
                                        type="file"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-teal-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadForm(false)}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || !selectedFile}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 transition-all shadow-sm"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Uploading & Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" /> Save to Folder
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setActiveFilter('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                activeFilter === 'all'
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
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                        activeFilter === type.key
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
                                <p className="text-xs text-slate-400 mt-0.5">Click "+ Add Document" to upload a document to this subfolder.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredDocs.map((doc) => {
                                const config = DOC_TYPES.find((t) => t.key === doc.docType) || DOC_TYPES[4];
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

                                                <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={doc.fileUrl}>
                                                    📁 {doc.fileUrl}
                                                </p>

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
                                            {isPdfFile(doc.fileName, doc.fileUrl, doc.previewUrl) ? (
                                                <a
                                                    href={getResolvedDocSrc(doc)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-sm transition-all"
                                                >
                                                    <ExternalLink className="w-4 h-4" /> View Document
                                                </a>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewDoc(doc)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-sm transition-all"
                                                >
                                                    <Eye className="w-4 h-4" /> View Document
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDoc(doc.id)}
                                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                                title="Remove from history"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-400 font-mono truncate max-w-xs" title={previewDoc.fileUrl}>
                                📁 {previewDoc.fileUrl}
                            </span>
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
