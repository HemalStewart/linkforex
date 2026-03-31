'use client';

import React, { useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { RefreshCw, PlusCircle, Globe, Coins, DollarSign } from 'lucide-react';

export default function ExchangeRatesPage() {
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            const res = await fetch(`${ENDPOINTS.COUNTRIES.LIST}?status=active&payout_currency=yes&sort=name&dir=asc`);
            if (res.ok) {
                const data = await res.json();
                setCountries(Array.isArray(data) ? data : []);
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

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...newCurrency,
                code: String(newCurrency.code || '').trim().toUpperCase(),
                status: 'active',
            };

            const res = await fetch(ENDPOINTS.CURRENCIES.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const created = await res.json();
                const createdId = created?.id;

                const allRatesRes = await fetch(ENDPOINTS.CURRENCIES.LIST);
                if (allRatesRes.ok) {
                    const allRates = await allRatesRes.json();
                    const sameCodeActiveRows = Array.isArray(allRates)
                        ? allRates.filter((row: any) => {
                            const sameCode = String(row?.code || '').trim().toUpperCase() === payload.code;
                            const isActive = String(row?.status || 'active').trim().toLowerCase() === 'active';
                            const isNew = String(row?.id) === String(createdId);
                            return sameCode && isActive && !isNew;
                        })
                        : [];

                    for (const oldRow of sameCodeActiveRows) {
                        await fetch(ENDPOINTS.CURRENCIES.DETAIL(oldRow.id), {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'inactive' })
                        });
                    }
                }

                setAddModalOpen(false);
                setNewCurrency({ name: '', code: '', symbol: '', rate: '' });
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Customer digital rate added. Previous active rate for this currency was set to Inactive.',
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
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Customer Digital Rate</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Add-only digital rates. New active rates automatically inactivate old active rows for the same currency.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setAddModalOpen(true)}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Add Rate</span>
                    </button>
                    <button onClick={fetchRates} className="px-5 py-3 rounded-2xl border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all group">
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </span>
                    </button>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700/50 flex items-center space-x-3">
                    <Coins className="w-6 h-6 text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Digital Rates (GBP Base)</h2>
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
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Updated</th>
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
                                            <span className="badge-glass bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800 font-mono font-bold text-lg">
                                                {parseFloat(currency.rate).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-semibold">
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${String(currency.status || 'active').toLowerCase() === 'active'
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                                }`}>
                                                {String(currency.status || 'active').toLowerCase() === 'active' ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-medium text-slate-400">
                                            {new Date(currency.updated_at).toLocaleString()}
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
                title="Add Customer Digital Rate"
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
                            <option value="">-- Select Country --</option>
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
                            {isSubmitting ? 'Adding...' : 'Add Rate'}
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
