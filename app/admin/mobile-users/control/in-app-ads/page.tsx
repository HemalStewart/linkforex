'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Plus, RefreshCcw, Rows3, Search, Trash2, Upload } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';
import { resolveUploadsUrl } from '@/app/lib/uploads';
import ConfirmModal from '../../../components/ConfirmModal';
import type { MobileAd } from '../_shared';
import { useAuditColumns } from '@/app/lib/permissions';
import { formatDateTime } from '@/app/lib/dateUtils';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Keep below typical proxy/serverless limits.

const placementOptions = [
    { value: 'all', label: 'All Placements' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'home_carousel', label: 'Home Carousel' },
] as const;

const placementLabels: Record<'onboarding' | 'home_carousel', string> = {
    onboarding: 'Onboarding',
    home_carousel: 'Home Carousel',
};

const formatBytes = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let idx = 0;
    let value = bytes;
    while (value >= 1024 && idx < units.length - 1) {
        value /= 1024;
        idx += 1;
    }
    return `${value.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
};

const readImageElement = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Unable to read image'));
        };
        img.src = url;
    });
};

const compressImage = async (file: File): Promise<File> => {
    // If already small enough, keep original.
    if (file.size <= MAX_UPLOAD_BYTES) {
        return file;
    }

    const img = await readImageElement(file);
    const maxEdge = 1920;
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
    const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return file;
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);

    let quality = 0.86;
    let blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;

    while (blob.size > MAX_UPLOAD_BYTES && quality >= 0.5) {
        quality -= 0.08;
        blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob) break;
    }

    if (!blob || blob.size > file.size) {
        return file;
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
};

export default function MobileInAppAdsPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('MOBILE_ADS');
    const [loading, setLoading] = useState(true);
    const [creatingAd, setCreatingAd] = useState(false);
    const [ads, setAds] = useState<MobileAd[]>([]);
    const [search, setSearch] = useState('');
    const [placementFilter, setPlacementFilter] = useState<'all' | 'onboarding' | 'home_carousel'>('all');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageMeta, setImageMeta] = useState<{ originalBytes: number; finalBytes: number } | null>(null);
    const [adForm, setAdForm] = useState({
        placement: 'onboarding' as 'onboarding' | 'home_carousel',
        title: '',
        description: '',
        priority: 0,
        status: 'active' as 'active' | 'inactive',
    });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'danger' | 'success',
    });

    const showModal = (
        title: string,
        message: string,
        type: 'info' | 'warning' | 'danger' | 'success' = 'info'
    ) => {
        setConfirmModal({ isOpen: true, title, message, type });
    };

    const loadAds = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.ADS);
            if (!res.ok) return;
            const data = await res.json();
            setAds(
                Array.isArray(data)
                    ? data.map((row) => ({
                          ...row,
                          placement: row.placement === 'home_carousel' ? 'home_carousel' : 'onboarding',
                      }))
                    : []
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadAds();
    }, []);

    const filteredAds = useMemo(() => {
        const query = search.trim().toLowerCase();
        return [...ads]
            .sort((a, b) => b.priority - a.priority || b.id - a.id)
            .filter((ad) => {
                if (placementFilter !== 'all' && ad.placement !== placementFilter) {
                    return false;
                }

                if (!query) {
                    return true;
                }

                return [
                    ad.title,
                    ad.description,
                    ad.status,
                    placementLabels[ad.placement] ?? ad.placement,
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(query));
            });
    }, [ads, placementFilter, search]);

    const createAd = async () => {
        if (!adForm.title.trim()) {
            showModal('Missing Details', 'Title is required.', 'warning');
            return;
        }
        if (!imageFile) {
            showModal('Missing Details', 'Image upload is required.', 'warning');
            return;
        }
        setCreatingAd(true);
        try {
            const formData = new FormData();
            formData.append('placement', adForm.placement);
            formData.append('title', adForm.title);
            formData.append('description', adForm.description);
            formData.append('priority', String(adForm.priority));
            formData.append('status', adForm.status);
            formData.append('image', imageFile);

            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.ADS, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                let message = 'Could not create content item.';
                try {
                    const payload = await res.json();
                    if (payload?.message) message = String(payload.message);
                    if (payload?.messages && typeof payload.messages === 'object') {
                        const entries = Object.values(payload.messages).map((v) => String(v));
                        if (entries.length > 0) message = entries.join('\n');
                    }
                } catch {
                    // ignore
                }
                showModal('Create Failed', message, 'danger');
                return;
            }
            setAdForm({
                placement: 'onboarding',
                title: '',
                description: '',
                priority: 0,
                status: 'active',
            });
            setImageFile(null);
            setImageMeta(null);
            await loadAds();
            showModal('Created', 'Content item created successfully.', 'success');
        } catch {
            showModal('Create Failed', 'Could not create content item.', 'danger');
        } finally {
            setCreatingAd(false);
        }
    };

    const toggleAdStatus = async (ad: MobileAd) => {
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.AD_DETAIL(ad.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: ad.status === 'active' ? 'inactive' : 'active',
                }),
            });
            if (!res.ok) {
                showModal('Update Failed', 'Could not update content item.', 'danger');
                return;
            }
            await loadAds();
        } catch {
            showModal('Update Failed', 'Could not update content item.', 'danger');
        }
    };

    const deleteAd = async (ad: MobileAd) => {
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.AD_DETAIL(ad.id), { method: 'DELETE' });
            if (!res.ok) {
                showModal('Delete Failed', 'Could not delete content item.', 'danger');
                return;
            }
            await loadAds();
        } catch {
            showModal('Delete Failed', 'Could not delete content item.', 'danger');
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert
                confirmText="OK"
            />

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Onboarding &amp; Carousel</h1>
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                        Manage onboarding slides and homepage carousel content for the mobile app.
                    </p>
                </div>
                <button onClick={loadAds} className="btn-primary flex items-center gap-2 rounded-full px-5">
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                <div className="card-glass p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Add Content Item</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Create an onboarding slide or a home carousel banner.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="md:col-span-2">
                            <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-500">
                                <Rows3 className="h-3.5 w-3.5" />
                                Placement
                            </span>
                            <select
                                value={adForm.placement}
                                onChange={(e) => setAdForm((prev) => ({ ...prev, placement: e.target.value as 'onboarding' | 'home_carousel' }))}
                                className="input-glass py-2.5 text-sm"
                            >
                                <option value="onboarding">Onboarding</option>
                                <option value="home_carousel">Home Carousel</option>
                            </select>
                        </label>
                        <input
                            placeholder="Title"
                            value={adForm.title}
                            onChange={(e) => setAdForm((prev) => ({ ...prev, title: e.target.value }))}
                            className="input-glass py-2.5 text-sm md:col-span-2"
                        />
                        <textarea
                            placeholder="Description"
                            value={adForm.description}
                            onChange={(e) => setAdForm((prev) => ({ ...prev, description: e.target.value }))}
                            className="input-glass min-h-24 py-2.5 text-sm md:col-span-2"
                        />
                        <label className="md:col-span-2">
                            <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-500">
                                <Upload className="h-3.5 w-3.5" />
                                Upload Image
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    if (!file) {
                                        setImageFile(null);
                                        setImageMeta(null);
                                        return;
                                    }
                                    try {
                                        const compressed = await compressImage(file);
                                        setImageFile(compressed);
                                        setImageMeta({ originalBytes: file.size, finalBytes: compressed.size });
                                    } catch {
                                        setImageFile(file);
                                        setImageMeta({ originalBytes: file.size, finalBytes: file.size });
                                    }
                                }}
                                className="input-glass py-2.5 text-sm"
                            />
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                {imageFile
                                    ? `${imageFile.name} · ${formatBytes(imageMeta?.originalBytes ?? imageFile.size)} → ${formatBytes(imageMeta?.finalBytes ?? imageFile.size)}`
                                    : 'Upload an image (auto-compressed if needed)'}
                            </span>
                        </label>
                        <input
                            type="number"
                            placeholder="Priority"
                            value={adForm.priority}
                            onChange={(e) => setAdForm((prev) => ({ ...prev, priority: Number(e.target.value || 0) }))}
                            className="input-glass py-2.5 text-sm"
                        />
                        <select
                            value={adForm.status}
                            onChange={(e) => setAdForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                            className="input-glass py-2.5 text-sm"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <button
                            onClick={createAd}
                            disabled={creatingAd}
                            className="btn-primary flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm md:col-span-2"
                        >
                            <Plus className="h-4 w-4" />
                            Save Item
                        </button>
                    </div>
                </div>

                <div className="card-glass p-6">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Content Inventory</h2>
                        </div>
                        <div className="grid w-full gap-3 lg:max-w-xl lg:grid-cols-[minmax(0,1fr)_180px]">
                            <label className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search title or description"
                                    className="input-glass py-2.5 pl-10 text-sm"
                                />
                            </label>
                            <label className="relative">
                                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={placementFilter}
                                    onChange={(e) => setPlacementFilter(e.target.value as 'all' | 'onboarding' | 'home_carousel')}
                                    className="input-glass py-2.5 pl-10 text-sm"
                                >
                                    {placementOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className="table-scroll max-h-[520px] rounded-2xl border border-slate-200/70 dark:border-slate-700">
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th>Image</th>
                                    <th>Title</th>
                                    <th>Placement</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    {showCreatedBy && <th>Created By</th>}
                                    {showCreatedAt && <th>Created At</th>}
                                    {showUpdatedBy && <th>Updated By</th>}
                                    {showUpdatedAt && <th>Updated At</th>}
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {filteredAds.map((ad) => (
                                    <tr key={ad.id}>
                                        <td className="w-[84px]">
                                            <div className="h-11 w-[72px] overflow-hidden rounded-xl border border-white/20 bg-white/30 dark:bg-white/5">
                                                {ad.image_url ? (
                                                    // Bust cache for recently updated assets.
                                                    <img
                                                        src={`${resolveUploadsUrl(ad.image_url)}${String(ad.image_url).includes('?') ? '&' : '?'}v=${ad.id}`}
                                                        alt={ad.title}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">
                                                        No image
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="space-y-1">
                                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{ad.title}</div>
                                                <div className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                                                    {ad.description || 'No description'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                            {placementLabels[ad.placement] ?? ad.placement}
                                        </td>
                                        <td className="text-xs text-slate-600 dark:text-slate-300">{ad.status}</td>
                                        <td className="text-xs text-slate-600 dark:text-slate-300">{ad.priority}</td>
                                        {showCreatedBy && <td className="text-sm text-slate-600 font-medium">{ad.created_by || ad.entered_user || '—'}</td>}
                                        {showCreatedAt && <td className="text-sm text-slate-600 whitespace-nowrap">{ad.created_at ? formatDateTime(ad.created_at) : '—'}</td>}
                                        {showUpdatedBy && <td className="text-sm text-slate-600 font-medium">{ad.updated_by || ad.modified_user || '—'}</td>}
                                        {showUpdatedAt && <td className="text-sm text-slate-600 whitespace-nowrap">{ad.updated_at ? formatDateTime(ad.updated_at) : '—'}</td>}
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => toggleAdStatus(ad)}
                                                    className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                                >
                                                    {ad.status === 'active' ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    onClick={() => deleteAd(ad)}
                                                    className="rounded-full border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAds.length === 0 && (
                                    <tr>
                                        <td colSpan={6 + (showCreatedBy ? 1 : 0) + (showCreatedAt ? 1 : 0) + (showUpdatedBy ? 1 : 0) + (showUpdatedAt ? 1 : 0)} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                            {loading ? 'Loading...' : 'No content items found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
