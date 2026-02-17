'use client';

import React, { useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Globe, PlusCircle, Edit2, Trash2, Save, X, Phone, DollarSign } from 'lucide-react';

export default function CountriesPage() {
    const [countries, setCountries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        iso_code: '',
        phone_code: '',
        currency_code: '',
        currency_name: '',
        currency_symbol: ''
    });

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newCountry, setNewCountry] = useState({
        name: '',
        iso_code: '',
        phone_code: '',
        currency_code: '',
        currency_name: '',
        currency_symbol: '',
        status: 'active'
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true
    });

    React.useEffect(() => {
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
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (country: any) => {
        setEditingId(country.id);
        setEditForm({
            name: country.name,
            iso_code: country.iso_code,
            phone_code: country.phone_code,
            currency_code: country.currency_code,
            currency_name: country.currency_name,
            currency_symbol: country.currency_symbol
        });
    };

    const handleSave = async (id: number) => {
        try {
            const res = await fetch(ENDPOINTS.COUNTRIES.DETAIL(id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                setEditingId(null);
                fetchCountries();
            }
        } catch (error) {
            console.error('Failed to update country', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this country?')) return;
        try {
            const res = await fetch(ENDPOINTS.COUNTRIES.DETAIL(id), { method: 'DELETE' });
            if (res.ok) fetchCountries();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(ENDPOINTS.COUNTRIES.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCountry)
            });

            if (res.ok) {
                setAddModalOpen(false);
                setNewCountry({ name: '', iso_code: '', phone_code: '', currency_code: '', currency_name: '', currency_symbol: '', status: 'active' });
                fetchCountries();
                setConfirmModal({ isOpen: true, title: 'Success', message: 'Country added successfully', type: 'info', isAlert: true });
            } else {
                setConfirmModal({ isOpen: true, title: 'Error', message: 'Failed to add country', type: 'danger', isAlert: true });
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
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Countries</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage supported countries for remitters and beneficiaries</p>
                </div>
                <button
                    onClick={() => setAddModalOpen(true)}
                    className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0"
                >
                    <PlusCircle className="w-5 h-5" />
                    <span>Add New Country</span>
                </button>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700/50 flex items-center space-x-3">
                    <Globe className="w-6 h-6 text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Supported Countries</h2>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading countries...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Country Name</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ISO Code</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Code</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Currency</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {countries.map((country) => (
                                    <tr key={country.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-8 py-5 font-bold text-slate-900 dark:text-white">
                                            {editingId === country.id ? (
                                                <input className="input-glass py-1 px-3 w-full" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} autoFocus />
                                            ) : (
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold ring-2 ring-white dark:ring-slate-800">
                                                        {country.iso_code.substring(0, 2)}
                                                    </div>
                                                    <span>{country.name}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-sm font-mono font-semibold text-slate-500">
                                            {editingId === country.id ? (
                                                <input className="input-glass py-1 px-3 w-20 uppercase" value={editForm.iso_code} onChange={e => setEditForm({ ...editForm, iso_code: e.target.value })} />
                                            ) : country.iso_code}
                                        </td>
                                        <td className="px-8 py-5 text-sm font-mono text-slate-500">
                                            {editingId === country.id ? (
                                                <input className="input-glass py-1 px-3 w-20" value={editForm.phone_code} onChange={e => setEditForm({ ...editForm, phone_code: e.target.value })} />
                                            ) : country.phone_code}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500">
                                            {editingId === country.id ? (
                                                <div className="flex space-x-2">
                                                    <input placeholder="Code" className="input-glass py-1 px-3 w-20 uppercase" value={editForm.currency_code} onChange={e => setEditForm({ ...editForm, currency_code: e.target.value })} />
                                                    <input placeholder="Sym" className="input-glass py-1 px-3 w-16 text-center" value={editForm.currency_symbol} onChange={e => setEditForm({ ...editForm, currency_symbol: e.target.value })} />
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <span className="badge-glass bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-mono">
                                                        {country.currency_code}
                                                    </span>
                                                    <span className="text-slate-400">({country.currency_symbol})</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {editingId === country.id ? (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button onClick={() => handleSave(country.id)} className="p-2 rounded-xl bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button onClick={() => handleEdit(country)} className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all">
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(country.id)} className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {!loading && countries.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                            No countries found. Add one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Country">
                <form onSubmit={handleAddSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Country Name *</label>
                            <input required className="input-glass w-full" value={newCountry.name} onChange={e => setNewCountry({ ...newCountry, name: e.target.value })} placeholder="Country name" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ISO Code *</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input required className="input-glass w-full pl-10 uppercase" value={newCountry.iso_code} onChange={e => setNewCountry({ ...newCountry, iso_code: e.target.value })} placeholder="ISO code" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phone Code</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input className="input-glass w-full pl-10" value={newCountry.phone_code} onChange={e => setNewCountry({ ...newCountry, phone_code: e.target.value })} placeholder="Calling code" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Currency Code</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input className="input-glass w-full pl-10 uppercase" value={newCountry.currency_code} onChange={e => setNewCountry({ ...newCountry, currency_code: e.target.value })} placeholder="Currency code" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Currency Symbol</label>
                            <input className="input-glass w-full text-center font-mono text-lg" value={newCountry.currency_symbol} onChange={e => setNewCountry({ ...newCountry, currency_symbol: e.target.value })} placeholder="Currency symbol" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Currency Name</label>
                            <input className="input-glass w-full" value={newCountry.currency_name} onChange={e => setNewCountry({ ...newCountry, currency_name: e.target.value })} placeholder="Currency name" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-6 space-x-3">
                        <button type="button" onClick={() => setAddModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary">Add Country</button>
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
