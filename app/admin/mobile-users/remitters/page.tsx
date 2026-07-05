'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import VeriffReportsModal from '../../components/VeriffReportsModal';
import { Search, UserPlus, Edit2, Download, Trash2, FileText } from 'lucide-react';
import { useAuditColumns, usePagePermissions } from '@/app/lib/permissions';
import { getStoredUser } from '@/app/lib/authStorage';
import { formatDateTime } from '@/app/lib/dateUtils';
import { routeKeyOf } from '@/app/lib/routeKeys';

type MobileRemitter = {
    id: string | number;
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    kyc_status?: string;
    created_at?: string;
    last_login?: string;
    joinedDate?: string;
    transfersCount?: number;
    lastLogin?: string;
    kycStatus?: string;
    created_by?: string | null;
    entered_user?: string | null;
    updated_by?: string | null;
    modified_user?: string | null;
    updated_at?: string | null;
    veriff_session_id?: string;
    registration_source?: string;
};

export default function RemittersPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('MOBILE_PROFILES');
    const { canAdd, canEdit, canDelete, canPdf, canExport } = usePagePermissions('MOBILE_PROFILES');
    const [selectedRemitter, setSelectedRemitter] = useState<MobileRemitter | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [remitters, setRemitters] = useState<MobileRemitter[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [remitterToDelete, setRemitterToDelete] = useState<MobileRemitter | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: false,
    });

    useEffect(() => {
        const fetchRemitters = async () => {
            setLoading(true);
            try {
                const actingUser = getStoredUser<{ id?: number }>();
                const params = new URLSearchParams();
                params.append('registration_source', 'mobile_app');

                if (statusFilter !== 'all') params.append('status', statusFilter);
                if (searchQuery) params.append('search', searchQuery);

                const res = await fetch(`${ENDPOINTS.REMITTERS.LIST}?${params.toString()}`, {
                    headers: {
                        'X-Acting-User-Id': String(actingUser?.id || ''),
                    }
                });
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json() as unknown;
                const rows = Array.isArray(data) ? (data as MobileRemitter[]) : [];

                // Map DB fields to UI fields if necessary
                const mappedData = rows.map((c) => ({
                    ...c,
                    joinedDate: c.created_at ? new Date(c.created_at).toLocaleDateString() : '-',
                    transfersCount: 0, // Placeholder
                    lastLogin: c.last_login || 'Never',
                    kycStatus: c.kyc_status || 'pending'
                }));
                setRemitters(mappedData);
            } catch (error) {
                console.error('Failed to fetch remitters:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(fetchRemitters, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, statusFilter]);

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
            inactive: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
            suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        };
        return styles[status.toLowerCase() as keyof typeof styles] || styles.inactive;
    };

    const getKycBadge = (status: string) => {
        const styles = {
            verified: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
            rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        };
        return styles[status.toLowerCase() as keyof typeof styles] || styles.pending;
    };

    // No client-side filtering needed as API handles it
    const filteredRemitters = remitters;

    const promptDelete = (remitter: MobileRemitter) => {
        setRemitterToDelete(remitter);
        setConfirmModal({
            isOpen: true,
            title: 'Delete Mobile User',
            message: 'Delete this mobile user and linked profile data? This action cannot be undone.',
            type: 'danger',
            isAlert: false,
        });
    };

    const handleConfirm = async () => {
        if (confirmModal.isAlert) {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            return;
        }

        if (!remitterToDelete) return;

        setDeleteLoading(true);
        try {
            const actingUser = getStoredUser<{ id?: number }>();
            const res = await fetch(ENDPOINTS.REMITTERS.DETAIL(remitterToDelete.id), {
                method: 'DELETE',
                headers: {
                    'X-Acting-User-Id': String(actingUser?.id || ''),
                }
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                setRemitters((prev) => prev.filter((row) => row.id !== remitterToDelete.id));
                setConfirmModal({
                    isOpen: true,
                    title: 'Deleted',
                    message: 'Mobile user deleted successfully.',
                    type: 'success',
                    isAlert: true,
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Delete Failed',
                    message: data?.messages?.error || data?.message || 'Failed to delete mobile user.',
                    type: 'danger',
                    isAlert: true,
                });
            }
        } catch (error) {
            console.error('Failed to delete mobile user:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Delete Failed',
                message: 'An error occurred while deleting the mobile user.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setDeleteLoading(false);
            setRemitterToDelete(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => {
                    if (deleteLoading) return;
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                }}
                onConfirm={handleConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.isAlert ? 'OK' : 'Delete'}
                cancelText="Cancel"
                loading={deleteLoading}
            />

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mobile Profiles</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Detailed remitter/KYC profiles from the mobile app</p>
                </div>
                <div className="flex items-center space-x-4">
                    {canExport && (
                        <button className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 rounded-full px-6">
                            <Download className="w-5 h-5" />
                            <span>Export CSV</span>
                        </button>
                    )}
                    {canAdd && (
                        <Link href="/admin/mobile-profiles/create" className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 rounded-full px-6">
                            <UserPlus className="w-5 h-5" />
                            <span>Add Profile</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Filters and Search */}
            <div className="card-glass p-5">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-end">
                    <div className="xl:col-span-6">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="search"
                                placeholder="Profile name, email, or phone"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-glass w-full text-sm"
                            />
                        </div>
                    </div>

                    <div className="xl:col-span-6 flex xl:justify-end">
                        <div className="flex items-center rounded-full border border-slate-200/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/50 p-1.5 space-x-1">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${statusFilter === 'all'
                                ? 'bg-white shadow text-slate-900 dark:bg-slate-700 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${statusFilter === 'active'
                                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/20'
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${statusFilter === 'inactive'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20'
                                }`}
                        >
                            Inactive
                        </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profiles Table */}
            <div className="card-glass overflow-hidden shadow-xl">
                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading remitters...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    {canEdit && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Edit"><Edit2 className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                    {canPdf && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Reports"><FileText className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Profile</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Contact</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Status</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">KYC</th>
                                    {showCreatedBy && <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Created By</th>}
                                    {showCreatedAt && <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Created At</th>}
                                    {showUpdatedBy && <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Updated By</th>}
                                    {showUpdatedAt && <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Updated At</th>}
                                    {canDelete && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Delete"><Trash2 className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {filteredRemitters.map((remitter) => (
                                    <tr
                                        key={remitter.id}
                                        className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200"
                                    >
                                        {canEdit && (
                                            <td className="px-2 py-4 text-center">
                                                <Link
                                                    href={`/admin/mobile-profiles/${encodeURIComponent(routeKeyOf(remitter))}`}
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
                                                    onClick={() => setSelectedRemitter(remitter)}
                                                    className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                                    title="Veriff Verification Report"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-8 py-5">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-[15px]">{remitter.name}</p>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">Joined: {remitter.joinedDate}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-sm">
                                                <p className="text-slate-700 dark:text-slate-300 font-medium">{remitter.email}</p>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{remitter.phone}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`badge-glass px-3 py-1 rounded-full text-[10px] font-extrabold ${getStatusBadge(remitter.status || 'inactive')}`}>
                                                {remitter.status ? (remitter.status.charAt(0).toUpperCase() + remitter.status.slice(1).toLowerCase()) : 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`badge-glass px-3 py-1 rounded-full text-[10px] font-extrabold ${getKycBadge(remitter.kycStatus || 'pending')}`}>
                                                {remitter.kycStatus ? (remitter.kycStatus.charAt(0).toUpperCase() + remitter.kycStatus.slice(1).toLowerCase()) : 'Pending'}
                                            </span>
                                        </td>
                                        {showCreatedBy && (
                                            <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 font-medium">
                                                {remitter.created_by && remitter.created_by !== '-'
                                                    ? (remitter.created_by === 'mobile_app' ? 'mobile user' : remitter.created_by)
                                                    : (remitter.entered_user && remitter.entered_user !== '-'
                                                        ? (remitter.entered_user === 'mobile_app' ? 'mobile user' : remitter.entered_user)
                                                        : (String(remitter.registration_source || '').trim().toLowerCase() === 'mobile_app' ? 'mobile user' : 'admin')
                                                    )
                                                }
                                            </td>
                                        )}
                                        {showCreatedAt && <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{remitter.created_at ? formatDateTime(remitter.created_at) : '—'}</td>}
                                        {showUpdatedBy && (
                                            <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 font-medium">
                                                {remitter.updated_by && remitter.updated_by !== '-'
                                                    ? (remitter.updated_by === 'mobile_app' ? 'mobile user' : remitter.updated_by)
                                                    : (remitter.modified_user && remitter.modified_user !== '-'
                                                        ? (remitter.modified_user === 'mobile_app' ? 'mobile user' : remitter.modified_user)
                                                        : (String(remitter.registration_source || '').trim().toLowerCase() === 'mobile_app' ? 'mobile user' : '—')
                                                    )
                                                }
                                            </td>
                                        )}
                                        {showUpdatedAt && <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{remitter.updated_at ? formatDateTime(remitter.updated_at) : '—'}</td>}
                                        {canDelete && (
                                            <td className="px-2 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => promptDelete(remitter)}
                                                    className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all inline-flex"
                                                    title="Delete"
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
                {!loading && filteredRemitters.length === 0 && (
                    <div className="p-16 text-center text-slate-500 font-medium">
                        No remitters found.
                    </div>
                )}
            </div>

            {selectedRemitter && (
                <VeriffReportsModal
                    isOpen={!!selectedRemitter}
                    onClose={() => setSelectedRemitter(null)}
                    remitterId={selectedRemitter.id}
                    remitterName={String(selectedRemitter.name || '')}
                    veriffSessionId={String(selectedRemitter.veriff_session_id || '')}
                />
            )}
        </div>
    );
}
