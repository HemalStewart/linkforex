'use client';

import React, { useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { RefreshCw, PlusCircle, Edit2, Save, X, Info, Globe, Coins } from 'lucide-react';
import { formatDateTime } from '@/app/lib/dateUtils';
import { useAuditColumns, usePagePermissions } from '@/app/lib/permissions';

export default function CurrenciesPage() {
    const { showCreatedBy, showCreatedAt, showUpdatedBy, showUpdatedAt } = useAuditColumns('CURRENCIES');
    const { canAdd, canEdit } = usePagePermissions('CURRENCIES');
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editForm, setEditForm] = useState({ rate: '' });

    // Add New Currency State
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newCurrency, setNewCurrency] = useState({
        name: '',
        code: '',
        symbol: '',
        rate: ''
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true
    });

    React.useEffect(() => {
        fetchRates();
        fetchCountries();
    }, []);

    const fetchCountries = async () => {
        try {
            const res = await fetch(`${ENDPOINTS.COUNTRIES.LIST}?status=active&sort=name&dir=asc`);
            if (res.ok) {
                const data = await res.json();
                setCountries(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to fetch countries', error);
        }
    };

    const fetchRates = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.CURRENCIES.LIST);
            if (res.ok) {
                const data = await res.json();
                setCurrencies(data);
            }
        } catch (error) {
            console.error('Failed to fetch rates', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (currency: any) => {
        setEditingId(currency.id);
        setEditForm({ rate: currency.rate });
    };

    const handleSave = async (id: number) => {
        try {
            await fetch(ENDPOINTS.CURRENCIES.DETAIL(id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rate: editForm.rate })
            });
            setEditingId(null);
            fetchRates();
        } catch (error) {
            console.error('Failed to update rate', error);
        }
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(ENDPOINTS.CURRENCIES.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCurrency)
            });

            if (res.ok) {
                setAddModalOpen(false);
                setNewCurrency({ name: '', code: '', symbol: '', rate: '' });
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Currency added successfully',
                    type: 'info',
                    isAlert: true
                });
                fetchRates();
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to add currency',
                    type: 'danger',
                    isAlert: true
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Currencies</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage supported currency metadata. Mobile app display rates now come from Mobile Control &gt; Exchange Rates.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={fetchRates} className="px-5 py-3 rounded-full border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all group">
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </span>
                    </button>
                    {canAdd && (
                        <button
                            onClick={() => setAddModalOpen(true)}
                            className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 rounded-full px-6"
                        >
                            <PlusCircle className="w-5 h-5" />
                            <span>Add Currency</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Rates Table */}
            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700/50 flex items-center space-x-3">
                    <Coins className="w-6 h-6 text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Currencies</h2>
                </div>
                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading rates...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Currency</th>
                                    {canEdit && <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Edit"><Edit2 className="w-4 h-4 mx-auto text-slate-400" /></th>}
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Code</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Rate (Base: GBP)</th>
                                    {showCreatedBy && <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Created By</th>}
                                    {showCreatedAt && <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Created At</th>}
                                    {showUpdatedBy && <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Updated By</th>}
                                    {showUpdatedAt && <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Updated At</th>}
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {currencies.map((currency) => (
                                    <tr key={currency.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-8 py-5 font-bold text-slate-900 dark:text-white flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold">
                                                {currency.symbol || '$'}
                                            </div>
                                            <span>{currency.name}</span>
                                        </td>
                                        {canEdit && (
                                            <td className="px-2 py-4 text-center">
                                                {editingId === currency.id ? (
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <button onClick={() => handleSave(currency.id)} className="p-2 rounded-full bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors" title="Save">
                                                            <Save className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors" title="Cancel">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleEdit(currency)} className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all" title="Edit">
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-8 py-5 font-mono text-sm font-semibold text-slate-500">{currency.code}</td>
                                        <td className="px-8 py-5">
                                            {editingId === currency.id ? (
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="number"
                                                        value={editForm.rate}
                                                        onChange={(e) => setEditForm({ rate: e.target.value })}
                                                        className="input-glass py-1 px-3 w-32 text-sm"
                                                        autoFocus
                                                    />
                                                </div>
                                            ) : (
                                                <span className="badge-glass bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 font-bold border-0">
                                                    {parseFloat(currency.rate).toFixed(2)}
                                                </span>
                                            )}
                                        </td>
                                        {showCreatedBy && <td className="px-8 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">{currency.entered_user || currency.created_by || '—'}</td>}
                                        {showCreatedAt && <td className="px-8 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">{currency.created_at ? formatDateTime(currency.created_at) : '—'}</td>}
                                        {showUpdatedBy && <td className="px-8 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">{currency.modified_user || currency.updated_by || '—'}</td>}
                                        {showUpdatedAt && (
                                            <td className="px-8 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">
                                                {currency.updated_at ? formatDateTime(currency.updated_at) : '—'}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Currency Modal */}
            <Modal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add New Currency"
            >
                <form onSubmit={handleAddSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Select Country</label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-200 pointer-events-none" />
                            <select
                                className="input-glass w-full appearance-none pl-12"
                                onChange={(e) => {
                                    const country = countries.find(c => c.id === parseInt(e.target.value));
                                    if (country) {
                                        setNewCurrency({
                                            ...newCurrency,
                                            name: country.currency_name || (country.name + ' Currency'),
                                            code: country.currency_code || '',
                                            symbol: country.currency_symbol || ''
                                        });
                                    }
                                }}
                            >
                                <option value="">-- Manual Entry --</option>
                                {countries.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.iso_code})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Currency Name</label>
                        <div className="relative">
                            <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                required
                                placeholder="Currency name"
                                className="input-glass w-full pl-12"
                                value={newCurrency.name}
                                onChange={e => setNewCurrency({ ...newCurrency, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Code</label>
                            <input
                                type="text"
                                required
                                placeholder="Currency code"
                                className="input-glass w-full font-mono text-center"
                                value={newCurrency.code}
                                onChange={e => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Symbol</label>
                            <input
                                type="text"
                                required
                                placeholder="Symbol"
                                className="input-glass w-full text-center"
                                value={newCurrency.symbol}
                                onChange={e => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Exchange Rate (Base: GBP)</label>
                        <input
                            type="number"
                            step="0.0001"
                            required
                            placeholder="Rate"
                            className="input-glass w-full font-mono text-center"
                            value={newCurrency.rate}
                            onChange={e => setNewCurrency({ ...newCurrency, rate: e.target.value })}
                        />
                    </div>
                    <div className="dialog-actions pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                            type="button"
                            onClick={() => setAddModalOpen(false)}
                            className="btn-secondary text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary text-sm disabled:opacity-60"
                        >
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
            />
        </div>
    );
}
