'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import { PlusCircle, RefreshCw, Search, Trash2, Edit2, ListChecks, Save } from 'lucide-react';
import ToggleSwitch from '../components/ToggleSwitch';


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

type SortKey = 'name' | 'active';

type SortDir = 'asc' | 'desc';

const EMPTY_FORM: PurposeFormState = {
    name: '',
    active: 'yes',
};

const YES_NO_OPTIONS: YesNo[] = ['yes', 'no'];

const normalizeYesNo = (value?: string | null): YesNo =>
    String(value || '').toLowerCase() === 'yes' ? 'yes' : 'no';


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
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="input-glass w-full text-sm"
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
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center space-x-3">
                    <ListChecks className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Purposes Directory</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Showing {totalRows === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, totalRows)} of {totalRows}</p>
                    </div>
                </div>
                <div className="table-scroll">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1">Name <span>{sortIndicator('name')}</span></button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => toggleSort('active')} className="flex items-center gap-1">Active <span>{sortIndicator('active')}</span></button>
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {loading && (
                                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500 animate-pulse">Loading…</td></tr>
                            )}
                            {!loading && pagedRows.map((row, idx) => (
                                <tr key={row.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium">{startIndex + idx + 1}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{row.name || '—'}</td>
                                    <td className="px-6 py-4">
                                        <Badge type={normalizeYesNo(row.active) === 'yes' ? 'active' : 'danger'}>
                                            {normalizeYesNo(row.active) === 'yes' ? 'Yes' : 'No'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <button
                                                className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all"
                                                onClick={() => openEditModal(row)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all"
                                                onClick={() => setDeleteId(Number(row.id))}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && pagedRows.length === 0 && (
                                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">No purposes found.</td></tr>
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
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2"></label>
                        {/* <select
                            className="input-glass w-full"
                            value={form.active}
                            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value as YesNo }))}
                        >
                            {YES_NO_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option === 'yes' ? 'Yes' : 'No'}</option>
                            ))}
                        </select> */}
                        <ToggleSwitch
                            label="Active"
                            value={form.active}
                            onChange={(value) => setForm((prev) => ({ ...prev, active: value }))}
                        />
                    </div>
                    <div className="dialog-actions">
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
