'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { formatDateTime } from '@/app/lib/dateUtils';
import { usePagePermissions, formatAuditUser } from '@/app/lib/permissions';
import ConfirmModal from '../../components/ConfirmModal';
import ToggleSwitch from '../../components/ToggleSwitch';
import {
    ArrowLeft,
    Save,
    Database,
    Loader2,
    Globe,
    ExternalLink,
    Tag,
    Building,
    MapPin,
    SlidersHorizontal
} from 'lucide-react';

type DilisenseFormState = {
    dilisense_source: string;
    dilisense_name: string;
    dilisense_description: string;
    dilisense_link: string;
    dilisense_source_type: string;
    dilisense_region: string;
    dilisense_country_code: string;
    dilisense_country_name: string;
    dilisense_issuer_name: string;
    dilisense_size: number;
    dilisense_status: number;
    entered_user?: string | null;
    entered_date?: string | null;
    modified_user?: string | null;
    modified_date?: string | null;
};

const INITIAL_FORM: DilisenseFormState = {
    dilisense_source: '',
    dilisense_name: '',
    dilisense_description: '',
    dilisense_link: '',
    dilisense_source_type: 'sanction',
    dilisense_region: 'international',
    dilisense_country_code: '',
    dilisense_country_name: '',
    dilisense_issuer_name: '',
    dilisense_size: 0,
    dilisense_status: 1,
};

const SOURCE_TYPES = ['sanction', 'pep', 'criminal', 'other'];
const REGIONS = ['americas', 'emea', 'apac', 'international'];

export default function EditDilisenseSourcePage() {
    const router = useRouter();
    const params = useParams();
    const sourceId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const { canEdit } = usePagePermissions('DILISENSE_SOURCES');
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<DilisenseFormState>(INITIAL_FORM);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'danger',
        isAlert: true,
        onConfirm: () => { },
    });

    useEffect(() => {
        if (!sourceId) return;
        const fetchSource = async () => {
            setLoading(true);
            try {
                const res = await fetch((ENDPOINTS as any).DILISENSE_SOURCES.DETAIL(sourceId));
                if (res.ok) {
                    const data = await res.json();
                    const record = data?.data || data;
                    if (record && typeof record === 'object') {
                        setForm({
                            dilisense_source: String(record.dilisense_source || ''),
                            dilisense_name: String(record.dilisense_name || ''),
                            dilisense_description: String(record.dilisense_description || ''),
                            dilisense_link: String(record.dilisense_link || ''),
                            dilisense_source_type: String(record.dilisense_source_type || 'sanction'),
                            dilisense_region: String(record.dilisense_region || 'international'),
                            dilisense_country_code: String(record.dilisense_country_code || ''),
                            dilisense_country_name: String(record.dilisense_country_name || ''),
                            dilisense_issuer_name: String(record.dilisense_issuer_name || ''),
                            dilisense_size: Number(record.dilisense_size || 0),
                            dilisense_status: Number(record.dilisense_status ?? 1),
                            entered_user: record.entered_user,
                            entered_date: record.entered_date,
                            modified_user: record.modified_user,
                            modified_date: record.modified_date,
                        });
                    } else {
                        setNotFound(true);
                    }
                } else {
                    setNotFound(true);
                }
            } catch (e) {
                console.error(e);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchSource();
    }, [sourceId]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canEdit) return;

        if (!form.dilisense_source.trim() || !form.dilisense_name.trim()) {
            setConfirmModal({
                isOpen: true,
                title: 'Validation Error',
                message: 'Source code and source name are required.',
                type: 'warning',
                isAlert: true,
                onConfirm: () => { },
            });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                dilisense_source: form.dilisense_source.trim(),
                dilisense_name: form.dilisense_name.trim(),
                dilisense_description: form.dilisense_description.trim(),
                dilisense_link: form.dilisense_link.trim(),
                dilisense_country_code: form.dilisense_country_code.trim().toLowerCase(),
                dilisense_country_name: form.dilisense_country_name.trim(),
                dilisense_issuer_name: form.dilisense_issuer_name.trim(),
            };

            const res = await fetch((ENDPOINTS as any).DILISENSE_SOURCES.DETAIL(sourceId), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Dilisense source updated successfully.',
                    type: 'info',
                    isAlert: false,
                    onConfirm: () => {
                        router.push('/admin/dilisense-sources');
                    },
                });
                return;
            }

            const errorData = await res.json().catch(() => null);
            const message = errorData?.message || errorData?.error || 'Failed to update Dilisense source.';
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message,
                type: 'danger',
                isAlert: true,
                onConfirm: () => { },
            });
        } catch (e) {
            console.error(e);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An unexpected network error occurred.',
                type: 'danger',
                isAlert: true,
                onConfirm: () => { },
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading source details...</p>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
                <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    <Database className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Source Not Found</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">The Dilisense source you are trying to edit does not exist or has been deleted.</p>
                <Link href="/admin/dilisense-sources" className="btn-secondary flex items-center space-x-2 text-sm mt-2">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Sources</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    if (!confirmModal.isAlert) {
                        router.push('/admin/dilisense-sources');
                    }
                }}
                onConfirm={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    confirmModal.onConfirm();
                }}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Link href="/admin/dilisense-sources" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-teal-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-3xl">Edit Dilisense Source</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 ml-9 text-sm">
                        Update configuration parameters and statuses for AML screening watchlist sources.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Core Settings */}
                <div className="card-glass p-6 md:p-8 space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100/60 dark:border-slate-800/40 pb-4">
                        <Database className="w-5 h-5 text-teal-500" />
                        <span>Source Metadata</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Source Code *</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left"><Tag className="w-4 h-4 text-slate-400" /></span>
                                <input
                                    className="input-glass w-full disabled:opacity-60 disabled:cursor-not-allowed"
                                    value={form.dilisense_source}
                                    disabled
                                    placeholder="e.g. us_ofac"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Source Name *</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left"><Building className="w-4 h-4 text-slate-400" /></span>
                                <input
                                    className="input-glass w-full"
                                    value={form.dilisense_name}
                                    onChange={(e) => setForm(prev => ({ ...prev, dilisense_name: e.target.value }))}
                                    placeholder="e.g. OFAC Sanctions"
                                    required
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                        <textarea
                            className="input-glass w-full min-h-[100px]"
                            value={form.dilisense_description}
                            onChange={(e) => setForm(prev => ({ ...prev, dilisense_description: e.target.value }))}
                            placeholder="Provide brief details about this sanctions list or PEP database..."
                            disabled={!canEdit}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Source Link / URL</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Globe className="w-4 h-4 text-slate-400" /></span>
                            <input
                                type="url"
                                className="input-glass w-full"
                                value={form.dilisense_link}
                                onChange={(e) => setForm(prev => ({ ...prev, dilisense_link: e.target.value }))}
                                placeholder="https://example.com/watchlist"
                                disabled={!canEdit}
                            />
                            {form.dilisense_link && (
                                <a href={form.dilisense_link} target="_blank" rel="noopener noreferrer" className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-600 hover:text-teal-700">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Classification and Region */}
                <div className="card-glass p-6 md:p-8 space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100/60 dark:border-slate-800/40 pb-4">
                        <SlidersHorizontal className="w-5 h-5 text-teal-500" />
                        <span>Classification & Region</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Source Type</label>
                            <select
                                className="input-glass w-full cursor-pointer"
                                value={form.dilisense_source_type}
                                onChange={(e) => setForm(prev => ({ ...prev, dilisense_source_type: e.target.value }))}
                                disabled={!canEdit}
                            >
                                {SOURCE_TYPES.map(type => (
                                    <option key={type} value={type}>{type.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Region</label>
                            <select
                                className="input-glass w-full cursor-pointer"
                                value={form.dilisense_region}
                                onChange={(e) => setForm(prev => ({ ...prev, dilisense_region: e.target.value }))}
                                disabled={!canEdit}
                            >
                                {REGIONS.map(region => (
                                    <option key={region} value={region}>{region.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Country Code (2-chars)</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left"><MapPin className="w-4 h-4 text-slate-400" /></span>
                                <input
                                    className="input-glass w-full uppercase"
                                    value={form.dilisense_country_code}
                                    onChange={(e) => setForm(prev => ({ ...prev, dilisense_country_code: e.target.value }))}
                                    placeholder="e.g. US"
                                    maxLength={2}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Country Name</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left"><MapPin className="w-4 h-4 text-slate-400" /></span>
                                <input
                                    className="input-glass w-full"
                                    value={form.dilisense_country_name}
                                    onChange={(e) => setForm(prev => ({ ...prev, dilisense_country_name: e.target.value }))}
                                    placeholder="e.g. United States"
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Issuer Name</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left"><Building className="w-4 h-4 text-slate-400" /></span>
                                <input
                                    className="input-glass w-full"
                                    value={form.dilisense_issuer_name}
                                    onChange={(e) => setForm(prev => ({ ...prev, dilisense_issuer_name: e.target.value }))}
                                    placeholder="e.g. US Treasury"
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col justify-end pb-1">
                            <ToggleSwitch
                                label="Active Status"
                                value={form.dilisense_status === 1 ? 'yes' : 'no'}
                                onChange={(val) => setForm(prev => ({ ...prev, dilisense_status: val === 'yes' ? 1 : 0 }))}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </div>

                {/* Audit details card if present */}
                {(form.entered_user || form.modified_user) && (
                    <div className="p-5 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100/70 dark:border-slate-700/60 rounded-[28px] text-xs text-slate-500 dark:text-slate-400 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {form.entered_user && (
                            <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">Created By:</span> {formatAuditUser(form.entered_user)}
                                {form.entered_date && <span className="ml-1 text-slate-400">({formatDateTime(form.entered_date)})</span>}
                            </div>
                        )}
                        {form.modified_user && (
                            <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">Last Modified By:</span> {formatAuditUser(form.modified_user)}
                                {form.modified_date && <span className="ml-1 text-slate-400">({formatDateTime(form.modified_date)})</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Link href="/admin/dilisense-sources" className="btn-secondary text-sm px-6 py-3">
                        Cancel
                    </Link>
                    {canEdit && (
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-teal-600 border-0 text-sm px-6 py-3"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Save</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
