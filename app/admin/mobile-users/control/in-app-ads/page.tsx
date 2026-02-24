'use client';

import React, { useEffect, useState } from 'react';
import { Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../../components/ConfirmModal';
import type { MobileAd } from '../_shared';

export default function MobileInAppAdsPage() {
    const [loading, setLoading] = useState(true);
    const [creatingAd, setCreatingAd] = useState(false);
    const [ads, setAds] = useState<MobileAd[]>([]);
    const [adForm, setAdForm] = useState({
        title: '',
        description: '',
        image_url: '',
        click_url: '',
        priority: 0,
        status: 'active' as 'active' | 'inactive',
    });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'danger' | 'success',
    });

    const showModal = (title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info') => {
        setConfirmModal({ isOpen: true, title, message, type });
    };

    const loadAds = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.ADS);
            if (!res.ok) return;
            const data = await res.json();
            setAds(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAds();
    }, []);

    const createAd = async () => {
        if (!adForm.title.trim()) {
            showModal('Missing Details', 'Ad title is required.', 'warning');
            return;
        }
        setCreatingAd(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.ADS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adForm),
            });
            if (!res.ok) {
                showModal('Create Failed', 'Could not create ad.', 'danger');
                return;
            }
            setAdForm({
                title: '',
                description: '',
                image_url: '',
                click_url: '',
                priority: 0,
                status: 'active',
            });
            await loadAds();
            showModal('Created', 'Ad created successfully.', 'success');
        } catch {
            showModal('Create Failed', 'Could not create ad.', 'danger');
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
                showModal('Update Failed', 'Could not update ad.', 'danger');
                return;
            }
            await loadAds();
        } catch {
            showModal('Update Failed', 'Could not update ad.', 'danger');
        }
    };

    const deleteAd = async (ad: MobileAd) => {
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.AD_DETAIL(ad.id), { method: 'DELETE' });
            if (!res.ok) {
                showModal('Delete Failed', 'Could not delete ad.', 'danger');
                return;
            }
            await loadAds();
        } catch {
            showModal('Delete Failed', 'Could not delete ad.', 'danger');
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
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">In-App Ads</h1>
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                        Manage ad content, priority, and activation status for the mobile app.
                    </p>
                </div>
                <button onClick={loadAds} className="btn-primary flex items-center gap-2 rounded-full px-5">
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="card-glass p-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                        placeholder="Ad title"
                        value={adForm.title}
                        onChange={(e) => setAdForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="input-glass py-2.5 text-sm md:col-span-2"
                    />
                    <textarea
                        placeholder="Description"
                        value={adForm.description}
                        onChange={(e) => setAdForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="input-glass min-h-20 py-2.5 text-sm md:col-span-2"
                    />
                    <input
                        placeholder="Image URL"
                        value={adForm.image_url}
                        onChange={(e) => setAdForm((prev) => ({ ...prev, image_url: e.target.value }))}
                        className="input-glass py-2.5 text-sm md:col-span-2"
                    />
                    <input
                        placeholder="Click URL"
                        value={adForm.click_url}
                        onChange={(e) => setAdForm((prev) => ({ ...prev, click_url: e.target.value }))}
                        className="input-glass py-2.5 text-sm md:col-span-2"
                    />
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
                        Add Ad
                    </button>
                </div>

                <div className="table-scroll mt-5 max-h-[420px] rounded-2xl border border-slate-200/70 dark:border-slate-700">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {ads.slice(0, 100).map((ad) => (
                                <tr key={ad.id}>
                                    <td className="text-sm font-semibold text-slate-800 dark:text-slate-200">{ad.title}</td>
                                    <td className="text-xs uppercase text-slate-600">{ad.status}</td>
                                    <td className="text-xs text-slate-600">{ad.priority}</td>
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
                            {ads.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                                        {loading ? 'Loading...' : 'No ads yet'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
