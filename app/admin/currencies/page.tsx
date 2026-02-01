'use client';

import React, { useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

export default function CurrenciesPage() {
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
            const res = await fetch(ENDPOINTS.COUNTRIES.LIST);
            if (res.ok) {
                const data = await res.json();
                setCountries(data);
            }
        } catch (error) {
            console.error('Failed to fetch countries', error);
        }
    };

    const fetchRates = async () => {
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
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Currencies</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage supported currencies and exchange rates</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setAddModalOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                    >
                        Add New Currency
                    </button>
                    <button onClick={fetchRates} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <span className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Refresh Rates</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Rates Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Currencies</h2>
                </div>
                <div className="overflow-x-auto">
                    {loading ? <div className="p-8 text-center">Loading...</div> : (
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Currency</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate (Base: GBP)</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {currencies.map((currency) => (
                                    <tr key={currency.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{currency.name}</td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-500">{currency.code} ({currency.symbol})</td>
                                        <td className="px-6 py-4">
                                            {editingId === currency.id ? (
                                                <input
                                                    type="number"
                                                    value={editForm.rate}
                                                    onChange={(e) => setEditForm({ rate: e.target.value })}
                                                    className="w-24 p-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{parseFloat(currency.rate).toFixed(2)}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(currency.updated_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingId === currency.id ? (
                                                <div className="flex space-x-2">
                                                    <button onClick={() => handleSave(currency.id)} className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">Save</button>
                                                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-600 font-medium text-sm">Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEdit(currency)} className="text-blue-600 hover:text-blue-700 font-medium text-sm">Edit</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Alert Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1">Auto-Update Enabled</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Exchange rates are automatically updated every 30 minutes from our trusted financial data providers. Last sync: 11:30 AM
                        </p>
                    </div>
                </div>
            </div>

            {/* Add Currency Modal */}
            <Modal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add New Currency"
            >
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Country</label>
                        <select
                            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white mb-3"
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

                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Euro"
                            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            value={newCurrency.name}
                            onChange={e => setNewCurrency({ ...newCurrency, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. EUR"
                                className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white uppercase"
                                value={newCurrency.code}
                                onChange={e => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Symbol</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. €"
                                className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                value={newCurrency.symbol}
                                onChange={e => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Exchange Rate (Base: GBP)</label>
                        <input
                            type="number"
                            step="0.0001"
                            required
                            placeholder="e.g. 1.15"
                            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            value={newCurrency.rate}
                            onChange={e => setNewCurrency({ ...newCurrency, rate: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={() => setAddModalOpen(false)}
                            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Currency'}
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
