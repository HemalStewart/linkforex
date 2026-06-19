'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import { useAuditColumns } from '@/app/lib/permissions';
import { formatDateTime } from '@/app/lib/dateUtils';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SortIndicator from '../components/SortIndicator';
import { Building2, Edit2, PlusCircle, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import ToggleSwitch from '../components/ToggleSwitch';

type YesNo = 'yes' | 'no';
type SortDir = 'asc' | 'desc';

type BankRow = {
    id: number | string;
    name?: string | null;
    country_bank_code?: string | null;
    bank_code?: string | null;
    status?: string | null;
    is_default?: number | string | boolean | null;
    sender_bank?: number | string | boolean | YesNo | null;
    receiver_bank?: number | string | boolean | YesNo | null;
    pickup_bank?: number | string | boolean | YesNo | null;
    category?: string | null;
};

type BankFormState = {
    name: string;
    bank_code: string;
    sender_bank: number;
    receiver_bank: number;
    pickup_bank: number;
};

type SortKey =
    | 'name'
    | 'bank_code'
    | 'sender_bank'
    | 'receiver_bank'
    | 'pickup_bank';

const EMPTY_FORM: BankFormState = {
    name: '',
    bank_code: '',
    sender_bank: 0,
    receiver_bank: 0,
    pickup_bank: 0,
};

const normalizeCode = (value: string | null | undefined) => String(value || '').trim().toUpperCase();

const normalizeFlag = (value: unknown): number => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return 0;
    return ['1', 'true', 'yes', 'y', 'on'].includes(normalized) ? 1 : 0;
};

const hasExplicitFlag = (bank: BankRow, key: 'sender_bank' | 'receiver_bank' | 'pickup_bank'): boolean => {
    const value = bank[key];
    return value !== undefined && value !== null && String(value).trim() !== '';
};

const mapLegacyCategoryFlags = (bank: BankRow) => {
    const category = String(bank.category || '').trim().toLowerCase();
    switch (category) {
        case 'cash':
        case 'cash_pickup':
            return { sender: 0, receiver: 1, pickup: 1 };
        case 'allied':
            return { sender: 1, receiver: 1, pickup: 0 };
        default:
            return { sender: 1, receiver: 1, pickup: 0 };
    }
};

const senderFlag = (bank: BankRow): number => {
    if (hasExplicitFlag(bank, 'sender_bank')) {
        return normalizeFlag(bank.sender_bank);
    }
    return mapLegacyCategoryFlags(bank).sender;
};

const receiverFlag = (bank: BankRow): number => {
    if (hasExplicitFlag(bank, 'receiver_bank')) {
        return normalizeFlag(bank.receiver_bank);
    }
    return mapLegacyCategoryFlags(bank).receiver;
};

const pickupFlag = (bank: BankRow): number => {
    if (hasExplicitFlag(bank, 'pickup_bank')) {
        return normalizeFlag(bank.pickup_bank);
    }
    return mapLegacyCategoryFlags(bank).pickup;
};

const normalizeForm = (form: BankFormState): BankFormState => ({
    ...form,
    name: form.name.trim(),
    bank_code: normalizeCode(form.bank_code),
});

const getSortValue = (bank: BankRow, key: SortKey): string | number => {
    switch (key) {
        case 'bank_code':
            return normalizeCode(bank.bank_code);
        case 'sender_bank':
            return senderFlag(bank);
        case 'receiver_bank':
            return receiverFlag(bank);
        case 'pickup_bank':
            return pickupFlag(bank);
        default:
            return String(bank[key] || '').toLowerCase();
    }
};

export default function BanksPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('BANKS');
    const [banks, setBanks] = useState<BankRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteBankId, setDeleteBankId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState<BankFormState>(EMPTY_FORM);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);

    useEffect(() => {
        void fetchBanks();
    }, []);

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${ENDPOINTS.BANKS.LIST}?include_blacklisted=yes&_t=${Date.now()}`, {
                cache: 'no-store',
            });
            if (res.ok) {
                const data = await res.json();
                setBanks(Array.isArray(data) ? data : []);
                return;
            }
            setBanks([]);
        } catch (error) {
            console.error('Failed to fetch banks', error);
            setBanks([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredBanks = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return banks;

        return banks.filter((bank) =>
            [
                bank.name,
                bank.bank_code,
                senderFlag(bank) ? 'sender yes' : 'sender no',
                receiverFlag(bank) ? 'receiver yes' : 'receiver no',
                pickupFlag(bank) ? 'pickup yes' : 'pickup no',
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [banks, searchQuery]);

    const sortedBanks = useMemo(() => {
        const rows = [...filteredBanks];
        rows.sort((left, right) => {
            const a = getSortValue(left, sortKey);
            const b = getSortValue(right, sortKey);
            if (a === b) return 0;
            if (sortDir === 'asc') return a > b ? 1 : -1;
            return a < b ? 1 : -1;
        });
        return rows;
    }, [filteredBanks, sortKey, sortDir]);

    const totalRows = sortedBanks.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const pagedBanks = sortedBanks.slice(startIndex, endIndex);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, rowsPerPage, sortKey, sortDir]);

    useEffect(() => {
        if (page !== currentPage) {
            setPage(currentPage);
        }
    }, [page, currentPage]);

    const openAddModal = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEditModal = (bank: BankRow) => {
        setEditingId(bank.id);
        setForm({
            name: String(bank.name || ''),
            bank_code: normalizeCode(bank.bank_code),
            sender_bank: senderFlag(bank),
            receiver_bank: receiverFlag(bank),
            pickup_bank: pickupFlag(bank),
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.bank_code.trim()) {
            setConfirmModal({
                isOpen: true,
                title: 'Missing data',
                message: 'Bank name and unique bank code are required.',
                type: 'warning',
                isAlert: true,
            });
            return;
        }
        if (form.pickup_bank && !form.receiver_bank) {
            setConfirmModal({
                isOpen: true,
                title: 'Receiver bank required',
                message: 'Cash Pickup Bank must also be marked as Receiver Bank.',
                type: 'warning',
                isAlert: true,
            });
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = normalizeForm(form);
            const endpoint = editingId == null ? ENDPOINTS.BANKS.LIST : ENDPOINTS.BANKS.DETAIL(editingId);
            const method = editingId == null ? 'POST' : 'PUT';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setModalOpen(false);
                setForm(EMPTY_FORM);
                setEditingId(null);
                await fetchBanks();
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: editingId == null ? 'Bank added successfully.' : 'Bank updated successfully.',
                    type: 'info',
                    isAlert: true,
                });
                return;
            }

            const message = await readErrorMessage(res, editingId == null ? 'Failed to add bank.' : 'Failed to update bank.');
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message,
                type: 'danger',
                isAlert: true,
            });
        } catch (error) {
            console.error('Failed to save bank', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while saving the bank.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (deleteBankId == null) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(ENDPOINTS.BANKS.DETAIL(deleteBankId), { method: 'DELETE' });
            if (res.ok) {
                await fetchBanks();
                setConfirmModal({
                    isOpen: true,
                    title: 'Deleted',
                    message: 'Bank deleted successfully.',
                    type: 'info',
                    isAlert: true,
                });
            } else {
                const message = await readErrorMessage(res, 'Failed to delete bank.');
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
                message: 'An error occurred while deleting the bank.',
                type: 'danger',
                isAlert: true,
            });
        } finally {
            setDeleteLoading(false);
            setDeleteBankId(null);
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
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Banks</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Manage sender, receiver, and cash pickup banks used by mobile + admin flows.
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchBanks}
                        className="px-5 py-3 rounded-2xl border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all group"
                    >
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </span>
                    </button>
                    <button
                        onClick={openAddModal}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Add Bank</span>
                    </button>
                </div>
            </div>

            <div className="card-glass p-5">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-12">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                className="input-glass w-full text-sm"
                                placeholder="Bank name, bank code, flags"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-100/70 dark:border-slate-700/60 flex items-center space-x-3">
                    <Building2 className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bank Directory</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Showing {totalRows === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRows}
                        </p>
                    </div>
                </div>
                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading banks...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">#</th>
                                    <th className="px-2 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Edit"><Edit2 className="w-4 h-4 mx-auto text-slate-400" /></th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">
                                        <button onClick={() => toggleSort('bank_code')} className="flex items-center gap-1">
                                            <span>Bank Code</span>
                                            <span>{sortIndicator('bank_code')}</span>
                                        </button>
                                    </th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">
                                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1">
                                            <span>Bank Name</span>
                                            <span>{sortIndicator('name')}</span>
                                        </button>
                                    </th>
                                    <th className="px-6 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                                        <button onClick={() => toggleSort('sender_bank')} className="mx-auto flex items-center gap-1">
                                            <span>Sender Bank</span>
                                            <span>{sortIndicator('sender_bank')}</span>
                                        </button>
                                    </th>
                                    <th className="px-6 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                                        <button onClick={() => toggleSort('receiver_bank')} className="mx-auto flex items-center gap-1">
                                            <span>Receiver Bank</span>
                                            <span>{sortIndicator('receiver_bank')}</span>
                                        </button>
                                    </th>
                                    <th className="px-6 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                                        <button onClick={() => toggleSort('pickup_bank')} className="mx-auto flex items-center gap-1">
                                            <span>Cash Pickup Bank</span>
                                            <span>{sortIndicator('pickup_bank')}</span>
                                        </button>
                                    </th>
                                    {showCreatedBy && <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Created By</th>}
                                    {showCreatedAt && <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Created At</th>}
                                    {showUpdatedBy && <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Updated By</th>}
                                    {showUpdatedAt && <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Updated At</th>}
                                    <th className="px-2 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Delete"><Trash2 className="w-4 h-4 mx-auto text-slate-400" /></th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedBanks.map((bank, idx) => (
                                    <tr key={bank.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-300 font-medium">
                                            {startIndex + idx + 1}
                                        </td>
                                        <td className="px-2 py-5 text-center">
                                            <button onClick={() => openEditModal(bank)} className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all" title="Edit">
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                        <td className="px-6 py-5 text-sm font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                            {normalizeCode(bank.bank_code) || '—'}
                                        </td>
                                        <td className="px-6 py-5 font-bold text-slate-900 dark:text-white min-w-[240px]">
                                            {bank.name || '—'}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <Badge type={senderFlag(bank) ? 'yes' : 'no'}>
                                                {senderFlag(bank) ? 'Yes' : 'No'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <Badge type={receiverFlag(bank) ? 'yes' : 'no'}>
                                                {receiverFlag(bank) ? 'Yes' : 'No'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <Badge type={pickupFlag(bank) ? 'yes' : 'no'}>
                                                {pickupFlag(bank) ? 'Yes' : 'No'}
                                            </Badge>
                                        </td>
                                        {showCreatedBy && <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-300">{(bank as any).created_by || '—'}</td>}
                                        {showCreatedAt && <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime((bank as any).created_at)}</td>}
                                        {showUpdatedBy && <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-300">{(bank as any).updated_by || '—'}</td>}
                                        {showUpdatedAt && <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">{formatDateTime((bank as any).updated_at)}</td>}
                                        <td className="px-2 py-5 text-center">
                                            <button onClick={() => setDeleteBankId(Number(bank.id))} className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all" title="Delete">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && pagedBanks.length === 0 && (
                                    <tr>
                                        <td colSpan={8 + (showCreatedBy ? 1 : 0) + (showCreatedAt ? 1 : 0) + (showUpdatedBy ? 1 : 0) + (showUpdatedAt ? 1 : 0)} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                            No banks found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setPage(1); }}
                />
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId == null ? 'Add Bank' : 'Edit Bank'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Bank Name</label>
                            <input
                                className="input-glass w-full"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Bank Code (Unique)</label>
                            <input
                                className="input-glass w-full"
                                value={form.bank_code}
                                onChange={(e) => setForm({ ...form, bank_code: e.target.value.toUpperCase() })}
                                maxLength={50}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300"></label>
                            <ToggleSwitch
                                label="Sender Bank"
                                value={form.sender_bank ? 'yes' : 'no'}
                                onChange={(value) =>
                                    setForm({
                                        ...form,
                                        sender_bank: value === 'yes' ? 1 : 0,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300"></label>
                            <ToggleSwitch
                                label="Receiver Bank"
                                value={form.receiver_bank ? 'yes' : 'no'}
                                onChange={(value) =>
                                    setForm({
                                        ...form,
                                        receiver_bank: value === 'yes' ? 1 : 0,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300"></label>
                            <ToggleSwitch
                                label="Cash Pickup Bank"
                                value={form.pickup_bank ? 'yes' : 'no'}
                                onChange={(value) =>
                                    setForm({
                                        ...form,
                                        pickup_bank: value === 'yes' ? 1 : 0,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            `Receiver Bank` is used for beneficiary bank list in app. `Cash Pickup Bank` is used for pickup bank list.
                        </span>
                    </div>
                    <div className="dialog-actions pt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                        <button type="submit" className="btn-primary glass-effect hover-lift text-sm disabled:opacity-60" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Saving...</span>
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
                isOpen={deleteBankId !== null}
                title="Delete bank"
                message="This will permanently remove the bank from the directory. Continue?"
                type="danger"
                confirmText="Delete"
                loading={deleteLoading}
                onClose={() => {
                    if (deleteLoading) return;
                    setDeleteBankId(null);
                }}
                onConfirm={handleDelete}
            />
        </div>
    );
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
    } catch {
        // Ignore parse errors.
    }
    return fallback;
}
