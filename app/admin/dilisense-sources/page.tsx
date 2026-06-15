'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { PlusCircle, RefreshCw, Search, Trash2, Edit2, ListChecks, Save, Database, Globe, ExternalLink, Info, Check, X } from 'lucide-react';
import ToggleSwitch from '../components/ToggleSwitch';

type DilisenseSourceRow = {
    id: number | string;
    dilisense_source?: string | null;
    dilisense_name?: string | null;
    dilisense_description?: string | null;
    dilisense_link?: string | null;
    dilisense_source_type?: string | null;
    dilisense_region?: string | null;
    dilisense_country_code?: string | null;
    dilisense_country_name?: string | null;
    dilisense_issuer_name?: string | null;
    dilisense_size?: number | string | null;
    dilisense_status?: number | string | null;
    entered_user?: string | null;
    entered_date?: string | null;
    modified_user?: string | null;
    modified_date?: string | null;
};

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
};

type SortKey = 'dilisense_name' | 'dilisense_source' | 'dilisense_source_type' | 'dilisense_country_name' | 'dilisense_region' | 'dilisense_status';
type SortDir = 'asc' | 'desc';

const EMPTY_FORM: DilisenseFormState = {
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

export default function DilisenseSourcesPage() {
    const [rows, setRows] = useState<DilisenseSourceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [regionFilter, setRegionFilter] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');

    // Sorting & Pagination
    const [sortKey, setSortKey] = useState<SortKey>('dilisense_name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [form, setForm] = useState<DilisenseFormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);

    const [viewRow, setViewRow] = useState<DilisenseSourceRow | null>(null);
    const [deleteId, setDeleteId] = useState<number | string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
    });

    useEffect(() => {
        void fetchSources();
    }, []);

    const fetchSources = async () => {
        setLoading(true);
        try {
            const res = await fetch((ENDPOINTS as any).DILISENSE_SOURCES.LIST);
            if (res.ok) {
                const data = await res.json();
                setRows(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch sources', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch((ENDPOINTS as any).DILISENSE_SOURCES.SYNC, {
                method: 'POST',
            });
            const data = await res.json();
            if (res.ok) {
                await fetchSources();
                setConfirmModal({
                    isOpen: true,
                    title: 'Sync Successful',
                    message: data.message || 'Dilisense sources synced successfully.',
                    type: 'info',
                    isAlert: true,
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Sync Failed',
                    message: data.message || 'Failed to sync Dilisense sources.',
                    type: 'danger',
                    isAlert: true,
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Sync Error',
                message: 'An error occurred while syncing sources.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setSyncing(false);
        }
    };

    const toggleActiveStatus = async (row: DilisenseSourceRow) => {
        const nextStatus = Number(row.dilisense_status) === 1 ? 0 : 1;
        try {
            const res = await fetch((ENDPOINTS as any).DILISENSE_SOURCES.DETAIL(row.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dilisense_status: nextStatus }),
            });
            if (res.ok) {
                setRows(prev => prev.map(r => r.id === row.id ? { ...r, dilisense_status: nextStatus } : r));
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to update active status.',
                    type: 'danger',
                    isAlert: true,
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const filteredRows = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return rows.filter((row) => {
            const matchesQuery = !query || 
                String(row.dilisense_name || '').toLowerCase().includes(query) ||
                String(row.dilisense_source || '').toLowerCase().includes(query) ||
                String(row.dilisense_description || '').toLowerCase().includes(query) ||
                String(row.dilisense_country_name || '').toLowerCase().includes(query) ||
                String(row.dilisense_issuer_name || '').toLowerCase().includes(query);
            
            const matchesType = typeFilter === 'all' || String(row.dilisense_source_type) === typeFilter;
            const matchesRegion = regionFilter === 'all' || String(row.dilisense_region) === regionFilter;
            const matchesActive = activeFilter === 'all' || 
                (activeFilter === 'yes' && Number(row.dilisense_status) === 1) || 
                (activeFilter === 'no' && Number(row.dilisense_status) === 0);

            return matchesQuery && matchesType && matchesRegion && matchesActive;
        });
    }, [rows, searchQuery, typeFilter, regionFilter, activeFilter]);

    const sortedRows = useMemo(() => {
        const data = [...filteredRows];
        data.sort((left, right) => {
            const a = getSortValue(left, sortKey);
            const b = getSortValue(right, sortKey);
            if (a === b) return 0;
            if (sortDir === 'asc') return a > b ? 1 : -1;
            return a < b ? 1 : -1;
        });
        return data;
    }, [filteredRows, sortKey, sortDir]);

    const totalRows = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = totalRows === 0 ? 0 : startIndex + rowsPerPage;
    const pagedRows = sortedRows.slice(startIndex, endIndex);

    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [page, totalPages]);

    const openCreateModal = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEditModal = (row: DilisenseSourceRow) => {
        setEditingId(row.id);
        setForm({
            dilisense_source: String(row.dilisense_source || ''),
            dilisense_name: String(row.dilisense_name || ''),
            dilisense_description: String(row.dilisense_description || ''),
            dilisense_link: String(row.dilisense_link || ''),
            dilisense_source_type: String(row.dilisense_source_type || 'sanction'),
            dilisense_region: String(row.dilisense_region || 'international'),
            dilisense_country_code: String(row.dilisense_country_code || ''),
            dilisense_country_name: String(row.dilisense_country_name || ''),
            dilisense_issuer_name: String(row.dilisense_issuer_name || ''),
            dilisense_size: Number(row.dilisense_size || 0),
            dilisense_status: Number(row.dilisense_status ?? 1),
        });
        setModalOpen(true);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.dilisense_source.trim() || !form.dilisense_name.trim()) {
            setConfirmModal({
                isOpen: true,
                title: 'Validation Error',
                message: 'Source code and source name are required.',
                type: 'warning',
                isAlert: true,
            });
            return;
        }

        setSubmitting(true);
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

            const res = await fetch(
                editingId ? (ENDPOINTS as any).DILISENSE_SOURCES.DETAIL(editingId) : (ENDPOINTS as any).DILISENSE_SOURCES.LIST,
                {
                    method: editingId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );

            if (res.ok) {
                setModalOpen(false);
                await fetchSources();
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: editingId ? 'Dilisense source updated.' : 'Dilisense source added.',
                    type: 'info',
                    isAlert: true,
                });
                return;
            }

            const message = await readErrorMessage(res, 'Failed to save Dilisense source.');
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message,
                type: 'danger',
                isAlert: true,
            });
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while saving the source.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (deleteId == null) return;
        setDeleteLoading(true);
        try {
            const res = await fetch((ENDPOINTS as any).DILISENSE_SOURCES.DETAIL(deleteId), { method: 'DELETE' });
            if (res.ok) {
                await fetchSources();
                setConfirmModal({
                    isOpen: true,
                    title: 'Deleted',
                    message: 'Dilisense source deleted successfully.',
                    type: 'info',
                    isAlert: true,
                });
            } else {
                const message = await readErrorMessage(res, 'Failed to delete Dilisense source.');
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message,
                    type: 'danger',
                    isAlert: true,
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while deleting the source.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setDeleteLoading(false);
            setDeleteId(null);
        }
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
            return;
        }
        setSortKey(key);
        setSortDir('asc');
    };

    const sortIndicator = (key: SortKey) => {
        return <SortIndicator active={sortKey === key} dir={sortDir} className="text-slate-400 dark:text-slate-300" />;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dilisense Sources</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Only sources marked as <span className="text-teal-600 font-bold">Active</span> will be used during screening.
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleSync}
                        disabled={syncing || loading}
                        className="px-5 py-3 rounded-2xl border-0 glass-effect text-teal-700 dark:text-teal-300 font-bold hover:shadow-lg transition-all group disabled:opacity-50"
                    >
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${syncing ? 'animate-spin' : ''}`} />
                            <span>{syncing ? 'Syncing...' : 'Sync Dilisense Sources'}</span>
                        </span>
                    </button>
                    <button
                        onClick={openCreateModal}
                        disabled={syncing || loading}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 disabled:opacity-50"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Add New</span>
                    </button>
                </div>
            </div>

            <div className="card-glass p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="input-glass w-full text-sm"
                                placeholder="Search by name, code, description, country, issuer..."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Source Type</label>
                        <select
                            className="input-glass w-full text-sm"
                            value={typeFilter}
                            onChange={(event) => setTypeFilter(event.target.value)}
                        >
                            <option value="all">All Types</option>
                            {SOURCE_TYPES.map((type) => (
                                <option key={type} value={type}>{type.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Region</label>
                        <select
                            className="input-glass w-full text-sm"
                            value={regionFilter}
                            onChange={(event) => setRegionFilter(event.target.value)}
                        >
                            <option value="all">All Regions</option>
                            {REGIONS.map((region) => (
                                <option key={region} value={region}>{region.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Status</label>
                        <select
                            className="input-glass w-full text-sm"
                            value={activeFilter}
                            onChange={(event) => setActiveFilter(event.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="yes">Active Only</option>
                            <option value="no">Inactive Only</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center space-x-3">
                    <ListChecks className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dilisense Sources List</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Showing {totalRows === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, totalRows)} of {totalRows}</p>
                    </div>
                </div>
                <div className="table-scroll">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('dilisense_source_type')} className="flex items-center gap-1">Source Type {sortIndicator('dilisense_source_type')}</button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('dilisense_source')} className="flex items-center gap-1">Source Code {sortIndicator('dilisense_source')}</button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('dilisense_name')} className="flex items-center gap-1">Source Name {sortIndicator('dilisense_name')}</button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Record Count</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('dilisense_status')} className="flex items-center gap-1">Active {sortIndicator('dilisense_status')}</button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('dilisense_country_name')} className="flex items-center gap-1">Country {sortIndicator('dilisense_country_name')}</button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('dilisense_region')} className="flex items-center gap-1">Region {sortIndicator('dilisense_region')}</button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Issuer Name</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {loading && (
                                <tr><td colSpan={10} className="px-6 py-10 text-center text-slate-500 animate-pulse">Loading…</td></tr>
                            )}
                            {!loading && pagedRows.map((row, idx) => (
                                <tr key={row.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                    <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-100 font-semibold">{row.dilisense_source_type || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{row.dilisense_source || '—'}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-100 max-w-xs truncate" title={row.dilisense_name || ''}>{row.dilisense_name || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{row.dilisense_size ?? 0}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <input 
                                                type="checkbox"
                                                checked={Number(row.dilisense_status) === 1}
                                                onChange={() => toggleActiveStatus(row)}
                                                className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 dark:focus:ring-teal-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.dilisense_country_name || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.dilisense_region || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={row.dilisense_issuer_name || ''}>{row.dilisense_issuer_name || '—'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <button
                                                className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all"
                                                title="View details"
                                                onClick={() => setViewRow(row)}
                                            >
                                                <Info className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all"
                                                title="Edit"
                                                onClick={() => openEditModal(row)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all"
                                                title="Delete"
                                                onClick={() => setDeleteId(row.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && pagedRows.length === 0 && (
                                <tr><td colSpan={10} className="px-6 py-10 text-center text-slate-500 font-semibold">No Dilisense sources found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setPage(1); }}
                />
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                title={editingId ? 'Edit Dilisense Source' : 'Add Dilisense Source'}
                onClose={() => setModalOpen(false)}
            >
                <form className="space-y-4 max-h-[80vh] overflow-y-auto pr-2" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Source Code *</label>
                            <input
                                className="input-glass w-full"
                                value={form.dilisense_source}
                                onChange={(event) => setForm((prev) => ({ ...prev, dilisense_source: event.target.value }))}
                                placeholder="e.g. us_ofac"
                                required
                                disabled={editingId !== null}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Source Name *</label>
                            <input
                                className="input-glass w-full"
                                value={form.dilisense_name}
                                onChange={(event) => setForm((prev) => ({ ...prev, dilisense_name: event.target.value }))}
                                placeholder="e.g. OFAC Sanctions"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Description</label>
                        <textarea
                            className="input-glass w-full min-h-[80px]"
                            value={form.dilisense_description}
                            onChange={(event) => setForm((prev) => ({ ...prev, dilisense_description: event.target.value }))}
                            placeholder="Brief details about this watchlist..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Source Link / URL</label>
                        <input
                            type="url"
                            className="input-glass w-full"
                            value={form.dilisense_link}
                            onChange={(event) => setForm((prev) => ({ ...prev, dilisense_link: event.target.value }))}
                            placeholder="https://example.com/sanctions"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Source Type</label>
                            <select
                                className="input-glass w-full"
                                value={form.dilisense_source_type}
                                onChange={(event) => setForm((prev) => ({ ...prev, dilisense_source_type: event.target.value }))}
                            >
                                {SOURCE_TYPES.map(type => (
                                    <option key={type} value={type}>{type.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Region</label>
                            <select
                                className="input-glass w-full"
                                value={form.dilisense_region}
                                onChange={(event) => setForm((prev) => ({ ...prev, dilisense_region: event.target.value }))}
                            >
                                {REGIONS.map(region => (
                                    <option key={region} value={region}>{region.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Country Code (2-chars)</label>
                            <input
                                className="input-glass w-full"
                                value={form.dilisense_country_code}
                                onChange={(event) => setForm((prev) => ({ ...prev, dilisense_country_code: event.target.value }))}
                                placeholder="e.g. us"
                                maxLength={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Country Name</label>
                            <input
                                className="input-glass w-full"
                                value={form.dilisense_country_name}
                                onChange={(event) => setForm((prev) => ({ ...prev, dilisense_country_name: event.target.value }))}
                                placeholder="e.g. United States"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Issuer Name</label>
                        <input
                            className="input-glass w-full"
                            value={form.dilisense_issuer_name}
                            onChange={(event) => setForm((prev) => ({ ...prev, dilisense_issuer_name: event.target.value }))}
                            placeholder="e.g. US Department of the Treasury"
                        />
                    </div>
                    <div>
                        <ToggleSwitch
                            label="Active"
                            value={form.dilisense_status === 1 ? 'yes' : 'no'}
                            onChange={(val) => setForm((prev) => ({ ...prev, dilisense_status: val === 'yes' ? 1 : 0 }))}
                        />
                    </div>
                    <div className="dialog-actions mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" className="btn-secondary text-sm" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn-primary glass-effect hover-lift text-sm disabled:opacity-60" disabled={submitting}>
                            {submitting ? (
                                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Saving…</span>
                            ) : (
                                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save</span>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Details Modal */}
            <Modal
                isOpen={viewRow !== null}
                title="Dilisense Source Details"
                onClose={() => setViewRow(null)}
            >
                {viewRow && (
                    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Source Name</span>
                                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{viewRow.dilisense_name}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Source Code</span>
                                <p className="text-sm font-mono text-slate-700 dark:text-slate-300 mt-0.5">{viewRow.dilisense_source}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Source Type</span>
                                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 capitalize">{viewRow.dilisense_source_type}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Region / Continent</span>
                                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 capitalize">{viewRow.dilisense_region}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Country Name</span>
                                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{viewRow.dilisense_country_name} ({viewRow.dilisense_country_code?.toUpperCase() || '—'})</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Issuer Name</span>
                                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{viewRow.dilisense_issuer_name || '—'}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Record Count</span>
                                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{viewRow.dilisense_size ?? 0}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Screening Status</span>
                                <div className="mt-1">
                                    <Badge type={Number(viewRow.dilisense_status) === 1 ? 'yes' : 'no'}>
                                        {Number(viewRow.dilisense_status) === 1 ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</span>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{viewRow.dilisense_description || 'No description provided.'}</p>
                        </div>

                        {viewRow.dilisense_link && (
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Official Webpage</span>
                                <a 
                                    href={viewRow.dilisense_link} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-teal-600 hover:text-teal-500 font-semibold text-sm flex items-center gap-1 mt-1 transition-all"
                                >
                                    <span>{viewRow.dilisense_link}</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}

                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-2 gap-4 text-xs text-slate-400">
                            <div>
                                <p>Entered User: <span className="font-semibold text-slate-600 dark:text-slate-300">{viewRow.entered_user}</span></p>
                                <p className="mt-0.5">Entered Date: <span className="font-semibold text-slate-600 dark:text-slate-300">{viewRow.entered_date}</span></p>
                            </div>
                            <div>
                                <p>Modified User: <span className="font-semibold text-slate-600 dark:text-slate-300">{viewRow.modified_user}</span></p>
                                <p className="mt-0.5">Modified Date: <span className="font-semibold text-slate-600 dark:text-slate-300">{viewRow.modified_date}</span></p>
                            </div>
                        </div>

                        <div className="dialog-actions pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" className="btn-secondary text-sm" onClick={() => setViewRow(null)}>Close</button>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />

            <ConfirmModal
                isOpen={deleteId !== null}
                title="Delete Dilisense Source"
                message="This will permanently delete the selected Dilisense source database entry. Continue?"
                type="danger"
                confirmText="Delete"
                loading={deleteLoading}
                onClose={() => {
                    if (deleteLoading) return;
                    setDeleteId(null);
                }}
                onConfirm={handleDelete}
            />
        </div>
    );
}

function getSortValue(row: DilisenseSourceRow, key: SortKey) {
    switch (key) {
        case 'dilisense_name':
            return String(row.dilisense_name || '').toLowerCase();
        case 'dilisense_source':
            return String(row.dilisense_source || '').toLowerCase();
        case 'dilisense_source_type':
            return String(row.dilisense_source_type || '').toLowerCase();
        case 'dilisense_country_name':
            return String(row.dilisense_country_name || '').toLowerCase();
        case 'dilisense_region':
            return String(row.dilisense_region || '').toLowerCase();
        case 'dilisense_status':
            return Number(row.dilisense_status ?? 0);
        default:
            return '';
    }
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
        const data = await res.json();
        if (typeof data?.message === 'string' && data.message.trim() !== '') {
            return data.message;
        }
        if (data?.messages && typeof data.messages === 'object') {
            const joined = Object.values(data.messages)
                .flat()
                .filter(Boolean)
                .join(' ');
            if (joined) return joined;
        }
        return fallback;
    } catch {
        return fallback;
    }
}
