'use client';

import React, { useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

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
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Countries</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage supported countries for remitters and beneficiaries</p>
                </div>
                <button
                    onClick={() => setAddModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                    Add New Country
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? <div className="p-8 text-center">Loading...</div> : (
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Country Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ISO Code</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Code</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Currency</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {countries.map((country) => (
                                    <tr key={country.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {editingId === country.id ? (
                                                <input className="border rounded px-2 py-1 w-full dark:bg-slate-700" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                            ) : country.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {editingId === country.id ? (
                                                <input className="border rounded px-2 py-1 w-20 dark:bg-slate-700" value={editForm.iso_code} onChange={e => setEditForm({ ...editForm, iso_code: e.target.value })} />
                                            ) : country.iso_code}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {editingId === country.id ? (
                                                <input className="border rounded px-2 py-1 w-20 dark:bg-slate-700" value={editForm.phone_code} onChange={e => setEditForm({ ...editForm, phone_code: e.target.value })} />
                                            ) : country.phone_code}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {editingId === country.id ? (
                                                <div className="flex space-x-2">
                                                    <input placeholder="Code" className="border rounded px-2 py-1 w-16 dark:bg-slate-700" value={editForm.currency_code} onChange={e => setEditForm({ ...editForm, currency_code: e.target.value })} />
                                                    <input placeholder="Sym" className="border rounded px-2 py-1 w-10 dark:bg-slate-700" value={editForm.currency_symbol} onChange={e => setEditForm({ ...editForm, currency_symbol: e.target.value })} />
                                                </div>
                                            ) : (
                                                <span title={country.currency_name}>{country.currency_code} ({country.currency_symbol})</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingId === country.id ? (
                                                <div className="flex space-x-2">
                                                    <button onClick={() => handleSave(country.id)} className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">Save</button>
                                                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-600 font-medium text-sm">Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="flex space-x-3">
                                                    <button onClick={() => handleEdit(country)} className="text-blue-600 hover:text-blue-700 font-medium text-sm">Edit</button>
                                                    <button onClick={() => handleDelete(country.id)} className="text-red-600 hover:text-red-700 font-medium text-sm">Delete</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {countries.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
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
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Country Name *</label>
                            <input required className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700" value={newCountry.name} onChange={e => setNewCountry({ ...newCountry, name: e.target.value })} placeholder="e.g. United Kingdom" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ISO Code *</label>
                            <input required className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700" value={newCountry.iso_code} onChange={e => setNewCountry({ ...newCountry, iso_code: e.target.value })} placeholder="e.g. GBR" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone Code</label>
                            <input className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700" value={newCountry.phone_code} onChange={e => setNewCountry({ ...newCountry, phone_code: e.target.value })} placeholder="e.g. +44" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Currency Code</label>
                            <input className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700" value={newCountry.currency_code} onChange={e => setNewCountry({ ...newCountry, currency_code: e.target.value })} placeholder="e.g. GBP" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Currency Symbol</label>
                            <input className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700" value={newCountry.currency_symbol} onChange={e => setNewCountry({ ...newCountry, currency_symbol: e.target.value })} placeholder="e.g. £" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Currency Name</label>
                            <input className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700" value={newCountry.currency_name} onChange={e => setNewCountry({ ...newCountry, currency_name: e.target.value })} placeholder="e.g. British Pound" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 space-x-3">
                        <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Country</button>
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
