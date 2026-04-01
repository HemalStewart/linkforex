'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { PlusCircle, RefreshCw, Search, Trash2, Edit2 } from 'lucide-react';

type YesNo = 'yes' | 'no';

type PurposeRow = {
    id: number | string;
    name?: string | null;
    active?: YesNo | null;
    created_at?: string | null;
    updated_at?: string | null;
};

type PurposeFormState = {
    name: string;
    active: YesNo;
};

type SortKey = 'name' | 'active' | 'updated_at';

type SortDir = 'asc' | 'desc';

const EMPTY_FORM: PurposeFormState = {
    name: '',
    active: 'yes',
};

const YES_NO_OPTIONS: YesNo[] = ['yes', 'no'];

const normalizeYesNo = (value?: string | null): YesNo =>
    String(value || '').toLowerCase() === 'yes' ? 'yes' : 'no';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');

export default function PurposesPage() {
    const [rows, setRows] = useState<PurposeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | YesNo>('all');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [form, setForm] = useState<PurposeFormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
    });

    useEffect(() => {
        void fetchPurposes();
    }, []);

    const fetchPurposes = async () => {
        try {
            const res = await fetch(ENDPOINTS.PURPOSES.LIST);
            if (res.ok) {
                const data = await res.json();
                setRows(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch purposes', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRows = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return rows.filter((row) => {
            const matchesQuery = !query || String(row.name || '').toLowerCase().includes(query);
            const matchesActive = activeFilter === 'all' || normalizeYesNo(row.active) === activeFilter;
            return matchesQuery && matchesActive;
        });
    }, [rows, searchQuery, activeFilter]);

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

    const openEditModal = (row: PurposeRow) => {
        setEditingId(row.id);
        setForm({
            name: String(row.name || ''),
            active: normalizeYesNo(row.active),
        });
        setModalOpen(true);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.name.trim()) {
            setConfirmModal({
                isOpen: true,
                title: 'Missing name',
                message: 'Please enter a purpose name.',
                type: 'warning',
                isAlert: true,
            });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                active: form.active,
            };

            const res = await fetch(
                editingId ? ENDPOINTS.PURPOSES.DETAIL(editingId) : ENDPOINTS.PURPOSES.LIST,
                {
                    method: editingId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );

            if (res.ok) {
                setModalOpen(false);
                await fetchPurposes();
                setConfirmModal({
                    isOpen: true,
                    title: 'Saved',
                    message: editingId ? 'Purpose updated.' : 'Purpose added.',
                    type: 'info',
                    isAlert: true,
                });
                return;
            }

            const message = await readErrorMessage(res, 'Failed to save purpose.');
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
                message: 'An error occurred while saving the purpose.',
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
            const res = await fetch(ENDPOINTS.PURPOSES.DETAIL(deleteId), { method: 'DELETE' });
            if (res.ok) {
                await fetchPurposes();
                setConfirmModal({
                    isOpen: true,
                    title: 'Deleted',
                    message: 'Purpose deleted successfully.',
                    type: 'info',
                    isAlert: true,
                });
            } else {
                const message = await readErrorMessage(res, 'Failed to delete purpose.');
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
                message: 'An error occurred while deleting the purpose.',
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
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Purposes</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Maintain purpose labels used in transfer flows.
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchPurposes}
                        className="px-5 py-3 rounded-2xl border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all group"
                    >
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </span>
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Add Purpose</span>
                    </button>
                </div>
            </div>

            <div className="card-glass p-5">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-6">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Search</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="input-glass w-full pl-12"
                                placeholder="Search purposes"
                            />
                        </div>
                    </div>
                    <div className="xl:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Active</label>
                        <select
                            className="input-glass w-full"
                            value={activeFilter}
                            onChange={(event) => setActiveFilter(event.target.value as 'all' | YesNo)}
                        >
                            <option value="all">All</option>
                            {YES_NO_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option === 'yes' ? 'Yes' : 'No'}</option>
                            ))}
                        </select>
                    </div>
                    <div className="xl:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2 uppercase tracking-wider">Rows</label>
                        <select
                            className="input-glass w-full"
                            value={rowsPerPage}
                            onChange={(event) => setRowsPerPage(Number(event.target.value))}
                        >
                            {[10, 25, 50].map((size) => (
                                <option key={size} value={size}>{size} rows</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden">
                <div className="table-responsive">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-white/70 dark:bg-slate-900/60 text-left">
                                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-widest text-slate-500">#</th>
                                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-widest text-slate-500 cursor-pointer" onClick={() => toggleSort('name')}>
                                    Name {sortIndicator('name')}
                                </th>
                                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-widest text-slate-500 cursor-pointer" onClick={() => toggleSort('active')}>
                                    Active {sortIndicator('active')}
                                </th>
                                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-widest text-slate-500 cursor-pointer" onClick={() => toggleSort('updated_at')}>
                                    Updated {sortIndicator('updated_at')}
                                </th>
                                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>
                            )}
                            {!loading && pagedRows.map((row, idx) => (
                                <tr key={row.id} className="border-t border-slate-200/60 dark:border-slate-700/60 hover:bg-white/40 dark:hover:bg-slate-900/40 transition">
                                    <td className="px-5 py-4 text-slate-500">{startIndex + idx + 1}</td>
                                    <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-100">{row.name || '—'}</td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${normalizeYesNo(row.active) === 'yes'
                                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800'
                                            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800'}
                                        `}>
                                            {normalizeYesNo(row.active) === 'yes' ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-500">{formatDate(row.updated_at)}</td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <button
                                                className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 hover:shadow transition"
                                                onClick={() => openEditModal(row)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:shadow transition"
                                                onClick={() => setDeleteId(Number(row.id))}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && pagedRows.length === 0 && (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No purposes found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between px-5 py-4 border-t border-slate-200/60 dark:border-slate-700/60 text-sm text-slate-500">
                    <div>
                        Showing {totalRows === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, totalRows)} of {totalRows}
                    </div>
                    <div className="flex items-center gap-2 mt-3 md:mt-0">
                        <button
                            className="btn-secondary"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={currentPage === 1}
                        >
                            Prev
                        </button>
                        <span>{currentPage} / {totalPages}</span>
                        <button
                            className="btn-secondary"
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={modalOpen}
                title={editingId ? 'Edit Purpose' : 'Add Purpose'}
                onClose={() => setModalOpen(false)}
            >
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Name *</label>
                        <input
                            className="input-glass w-full"
                            value={form.name}
                            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                            placeholder="Family, Friend, Business, etc"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Active</label>
                        <select
                            className="input-glass w-full"
                            value={form.active}
                            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value as YesNo }))}
                        >
                            {YES_NO_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option === 'yes' ? 'Yes' : 'No'}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>
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
                title="Delete purpose"
                message="This will permanently remove the purpose. Continue?"
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

function getSortValue(row: PurposeRow, key: SortKey) {
    switch (key) {
        case 'name':
            return String(row.name || '').toLowerCase();
        case 'active':
            return normalizeYesNo(row.active);
        case 'updated_at':
            return row.updated_at || '';
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
