'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { Users, Search, Plus, Trash2, Edit2, Building2, CreditCard, Calendar, User } from 'lucide-react';

export default function ReceiversPage() {
    const [receivers, setReceivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchReceivers();
    }, []);

    const fetchReceivers = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.LIST);
            if (res.ok) {
                const data = await res.json();
                setReceivers(data);
            }
        } catch (error) {
            console.error('Failed to fetch receivers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this receiver?')) return;

        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(id), {
                method: 'DELETE'
            });

            if (res.ok) {
                setReceivers(receivers.filter(r => r.id !== id));
                // In a real app we might show a toast here
            }
        } catch (error) {
            console.error('Error deleting receiver:', error);
        }
    };

    const filteredReceivers = receivers.filter(receiver => {
        const query = searchQuery.toLowerCase();
        return (
            receiver.name.toLowerCase().includes(query) ||
            receiver.bank_name?.toLowerCase().includes(query) ||
            receiver.account_number?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Receivers</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage all transfer beneficiaries</p>
                </div>
                <Link
                    href="/admin/receivers/create"
                    className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 rounded-full px-6"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add New Receiver</span>
                </Link>
            </div>

            <div className="relative group max-w-lg input-icon">
                <div className="input-icon-left">
                    <Search className="w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                </div>
                <input
                    type="search"
                    placeholder="Search receivers by name, bank, or account number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-glass w-full py-3"
                />
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading receivers...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bank Details</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Added</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {filteredReceivers.length > 0 ? (
                                    filteredReceivers.map((receiver) => (
                                        <tr key={receiver.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center space-x-4">
                                                    <div className="avatar-circle">
                                                        {receiver.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white text-lg">{receiver.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-200">
                                                        <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                                                        {receiver.bank_name}
                                                    </div>
                                                    <div className="flex items-center text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg w-fit border border-slate-200 dark:border-slate-700">
                                                        <CreditCard className="w-3 h-3 mr-1.5" />
                                                        {receiver.account_number}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400">
                                                    <Calendar className="w-4 h-4 mr-2 opacity-70" />
                                                    {new Date(receiver.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Link
                                                        href={`/admin/receivers/${receiver.id}`}
                                                        className="p-2 rounded-full hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(receiver.id)}
                                                        className="p-2 rounded-full hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Users className="w-10 h-10 text-slate-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">No receivers found</h3>
                                            <p className="text-slate-500">Try adjusting your search or add a new one.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
