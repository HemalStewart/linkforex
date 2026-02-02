'use client';
import React, { useState, useEffect } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { Users, RefreshCw, Search, Building2, Calendar } from 'lucide-react';

export default function BeneficiariesPage() {
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchBeneficiaries();
    }, []);

    const fetchBeneficiaries = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.LIST);
            if (res.ok) {
                const data = await res.json();
                setBeneficiaries(data);
            }
        } catch (error) {
            console.error('Failed to fetch beneficiaries', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBeneficiaries = beneficiaries.filter(b =>
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.account_number?.includes(searchQuery)
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Beneficiaries</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage global beneficiary accounts</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={fetchBeneficiaries} className="px-5 py-3 rounded-2xl border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all group">
                        <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </span>
                    </button>
                    {/* Placeholder for Add Beneficiary - usually done via Remitter context */}
                </div>
            </div>

            {/* Search */}
            <div className="max-w-md">
                <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <Search className="w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                    </div>
                    <input
                        type="search"
                        placeholder="Search beneficiaries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-glass w-full pl-11 py-3 text-base shadow-sm hover:shadow-md transition-shadow"
                    />
                </div>
            </div>

            {/* List */}
            <div className="card-glass overflow-hidden rounded-[2rem] shadow-xl">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700/50 flex items-center space-x-3">
                    <Users className="w-6 h-6 text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">All Beneficiaries</h2>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading beneficiaries...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bank Details</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer ID</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Added</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                {filteredBeneficiaries.map((b) => (
                                    <tr key={b.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold">
                                                    {(b.name || '?').charAt(0)}
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-white">{b.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center space-x-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                    <span>{b.bank_name}</span>
                                                </div>
                                                <div className="pl-6 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                    {b.account_number}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400 font-mono">
                                            {b.customer_id}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <span>{new Date(b.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {!loading && filteredBeneficiaries.length === 0 && (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                        No beneficiaries found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
}
