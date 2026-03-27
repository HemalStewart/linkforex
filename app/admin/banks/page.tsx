'use client';

import React, { useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Building2, PlusCircle, Edit2, Trash2, Save, X, BadgeCheck } from 'lucide-react';

const CATEGORY_OPTIONS = [
    { value: 'allied', label: 'Allied Bank' },
    { value: 'bank', label: 'Other Bank' },
    { value: 'cash_pickup', label: 'Cash Pickup' },
];

const STATUS_OPTIONS = ['active', 'inactive'];

const toLabel = (value: string) =>
    CATEGORY_OPTIONS.find((option) => option.value === value)?.label || value || '—';

export default function BanksPage() {
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        country: '',
        category: 'bank',
        bank_code: '',
        swift_code: '',
        status: 'active',
        is_default: 0,
    });

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newBank, setNewBank] = useState({
        name: '',
        country: '',
        category: 'bank',
        bank_code: '',
        swift_code: '',
        status: 'active',
        is_default: 0,
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
    });

    React.useEffect(() => {
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        try {
            const res = await fetch(ENDPOINTS.BANKS.LIST);
            if (res.ok) {
                const data = await res.json();
                setBanks(data);
            }
        } catch (error) {
            console.error('Failed to fetch banks', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (bank: any) => {
        setEditingId(bank.id);
        setEditForm({
            name: bank.name || '',
            country: bank.country || '',
            category: bank.category || 'bank',
            bank_code: bank.bank_code || '',
            swift_code: bank.swift_code || '',
            status: bank.status || 'active',
            is_default: Number(bank.is_default || 0),
        });
    };

    const handleSave = async (id: number) => {
        try {
            const res = await fetch(ENDPOINTS.BANKS.DETAIL(id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });

            if (res.ok) {
                setEditingId(null);
                fetchBanks();
            }
        } catch (error) {
            console.error('Failed to update bank', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this bank?')) return;
        try {
            const res = await fetch(ENDPOINTS.BANKS.DETAIL(id), { method: 'DELETE' });
            if (res.ok) fetchBanks();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(ENDPOINTS.BANKS.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBank),
            });

            if (res.ok) {
                setAddModalOpen(false);
                setNewBank({
                    name: '',
                    country: '',
                    category: 'bank',
                    bank_code: '',
                    swift_code: '',
                    status: 'active',
                    is_default: 0,
                });
                fetchBanks();
                setConfirmModal({ isOpen: true, title: 'Success', message: 'Bank added successfully', type: 'info', isAlert: true });
            } else {
                setConfirmModal({ isOpen: true, title: 'Error', message: 'Failed to add bank', type: 'danger', isAlert: true });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({ isOpen: true, title: 'Error', message: 'An error occurred', type: 'danger', isAlert: true });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Banks</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage beneficiary banks and pickup networks</p>
                </div>
                <button
                    onClick={() => setAddModalOpen(true)}
                    className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0"
                >
                    <PlusCircle className="w-5 h-5" />
                    <span>Add Bank</span>
                </button>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700/50 flex items-center space-x-3">
                    <Building2 className="w-6 h-6 text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bank Directory</h2>
                </div>
                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading banks...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bank</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Country</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Code</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Default</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {banks.map((bank) => (
                                    <tr key={bank.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-8 py-5 font-bold text-slate-900 dark:text-white">
                                            {editingId === bank.id ? (
                                                <input className="input-glass py-1 px-3 w-full" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} autoFocus />
                                            ) : (
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold ring-2 ring-white dark:ring-slate-800">
                                                        {bank.name?.substring(0, 2)?.toUpperCase()}
                                                    </div>
                                                    <span>{bank.name}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500">
                                            {editingId === bank.id ? (
                                                <input className="input-glass py-1 px-3 w-32" value={editForm.country} onChange={e => setEditForm({ ...editForm, country: e.target.value })} />
                                            ) : (bank.country || '—')}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500">
                                            {editingId === bank.id ? (
                                                <select className="input-glass py-1 px-3 w-40" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                                                    {CATEGORY_OPTIONS.map(option => (
                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                    ))}
                                                </select>
                                            ) : toLabel(bank.category)}
                                        </td>
                                        <td className="px-8 py-5 text-sm font-mono text-slate-500">
                                            {editingId === bank.id ? (
                                                <input className="input-glass py-1 px-3 w-32" value={editForm.bank_code} onChange={e => setEditForm({ ...editForm, bank_code: e.target.value })} />
                                            ) : (bank.bank_code || '—')}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500">
                                            {editingId === bank.id ? (
                                                <select className="input-glass py-1 px-3 w-28" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                                    {STATUS_OPTIONS.map(option => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className={`badge-glass ${bank.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    {bank.status || 'inactive'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {editingId === bank.id ? (
                                                <label className="inline-flex items-center gap-2 text-sm text-slate-500">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(editForm.is_default)}
                                                        onChange={(e) => setEditForm({ ...editForm, is_default: e.target.checked ? 1 : 0 })}
                                                    />
                                                    Default
                                                </label>
                                            ) : (
                                                bank.is_default ? <BadgeCheck className="w-5 h-5 text-emerald-500 inline" /> : <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {editingId === bank.id ? (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button onClick={() => handleSave(bank.id)} className="p-2 rounded-xl bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button onClick={() => handleEdit(bank)} className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all">
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(bank.id)} className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Bank">
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Bank name</label>
                        <input className="input-glass w-full" value={newBank.name} onChange={(e) => setNewBank({ ...newBank, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Country</label>
                            <input className="input-glass w-full" value={newBank.country} onChange={(e) => setNewBank({ ...newBank, country: e.target.value })} placeholder="Pakistan" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Category</label>
                            <select className="input-glass w-full" value={newBank.category} onChange={(e) => setNewBank({ ...newBank, category: e.target.value })}>
                                {CATEGORY_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Bank code</label>
                            <input className="input-glass w-full" value={newBank.bank_code} onChange={(e) => setNewBank({ ...newBank, bank_code: e.target.value })} placeholder="Branch code" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Swift code</label>
                            <input className="input-glass w-full" value={newBank.swift_code} onChange={(e) => setNewBank({ ...newBank, swift_code: e.target.value })} placeholder="SWIFT" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">Status</label>
                            <select className="input-glass w-full" value={newBank.status} onChange={(e) => setNewBank({ ...newBank, status: e.target.value })}>
                                {STATUS_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-7">
                            <input
                                type="checkbox"
                                checked={Boolean(newBank.is_default)}
                                onChange={(e) => setNewBank({ ...newBank, is_default: e.target.checked ? 1 : 0 })}
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-300">Set as default</span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setAddModalOpen(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Bank'}
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
        </div>
    );
}
