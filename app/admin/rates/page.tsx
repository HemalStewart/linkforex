'use client';

import React, { useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { RefreshCw, PlusCircle, Edit2, Save, X, Info, Globe, Coins, DollarSign } from 'lucide-react';

export default function ExchangeRatesPage() {
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
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Countries</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage countries with their currency and exchange-rate data</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setAddModalOpen(true)}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Add New Currency</span>
                    </button>
                    <button onClick={fetchRates} className="px-5 py-3 rounded-2xl border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all group">
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh Rates</span>
                        </span>
                    </button>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700/50 flex items-center space-x-3">
                    <Coins className="w-6 h-6 text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Countries & Currencies</h2>
                </div>
                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading rates...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Currency</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Code</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rate (Base: GBP)</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Updated</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {currencies.map((currency) => (
                                    <tr key={currency.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-8 py-5 font-bold text-slate-900 dark:text-white">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                                    <Globe className="w-4 h-4" />
                                                </div>
                                                <span>{currency.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 font-mono text-sm font-semibold text-slate-500">{currency.code} ({currency.symbol})</td>
                                        <td className="px-8 py-5">
                                            {editingId === currency.id ? (
                                                <input
                                                    type="number"
                                                    value={editForm.rate}
                                                    onChange={(e) => setEditForm({ rate: e.target.value })}
                                                    className="input-glass py-1 px-3 w-32 font-mono font-bold text-teal-600"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="badge-glass bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800 font-mono font-bold text-lg">
                                                    {parseFloat(currency.rate).toFixed(2)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-sm font-medium text-slate-400">
                                            {new Date(currency.updated_at).toLocaleString()}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {editingId === currency.id ? (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button onClick={() => handleSave(currency.id)} className="p-2 rounded-xl bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEdit(currency)} className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all">
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <Modal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add New Currency"
            >
                <form onSubmit={handleAddSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Country</label>
                        <select
                            className="input-glass w-full"
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

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Currency Name</label>
                        <div className="relative">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                required
                                placeholder="Currency name"
                                className="input-glass w-full pl-10"
                                value={newCurrency.name}
                                onChange={e => setNewCurrency({ ...newCurrency, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Code</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Currency code"
                                    className="input-glass w-full pl-10 uppercase font-mono"
                                    value={newCurrency.code}
                                    onChange={e => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Symbol</label>
                            <input
                                type="text"
                                required
                                placeholder="Symbol"
                                className="input-glass w-full text-center font-mono text-lg"
                                value={newCurrency.symbol}
                                onChange={e => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Exchange Rate (Base: GBP)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="number"
                                step="0.0001"
                                required
                                placeholder="Rate"
                                className="input-glass w-full pl-10 font-mono"
                                value={newCurrency.rate}
                                onChange={e => setNewCurrency({ ...newCurrency, rate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-6 space-x-3">
                        <button
                            type="button"
                            onClick={() => setAddModalOpen(false)}
                            className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex items-center space-x-2"
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
                title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} isAlert={confirmModal.isAlert} confirmText="OK"
            />
        </div>
    );
}
