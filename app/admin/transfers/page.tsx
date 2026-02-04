'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { PlusCircle, Search, Eye, Filter } from 'lucide-react';

export default function TransfersPage() {
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [transfers, setTransfers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [userRole, setUserRole] = useState('admin'); // 'admin' or 'branch_user'
    const [userBranch, setUserBranch] = useState('LON001'); // Default branch for simulation

    useEffect(() => {
        fetchTransfers();
    }, [userRole, userBranch]);

    const fetchTransfers = async () => {
        setLoading(true);
        try {
            let url = ENDPOINTS.TRANSFERS.LIST;
            if (userRole === 'branch_user') {
                url += `?branch_id=${userBranch}&_t=${new Date().getTime()}`;
            } else {
                url += `?_t=${new Date().getTime()}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setTransfers(data);
            }
        } catch (error) {
            console.error('Failed to fetch transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    const statusConfig = {
        all: { label: 'All', count: transfers.length },
        pending: { label: 'Pending', count: transfers.filter(t => t.status === 'pending').length },
        in_review: { label: 'In Review', count: transfers.filter(t => t.status === 'in_review').length },
        in_transit: { label: 'In Transit', count: transfers.filter(t => t.status === 'in_transit').length },
        completed: { label: 'Completed', count: transfers.filter(t => t.status === 'completed').length },
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
            in_transit: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
            in_review: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
        };
        return styles[status] || styles.pending;
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const filteredTransfers = transfers.filter(transfer => {
        const matchesStatus = filterStatus === 'all' || transfer.status === filterStatus;
        const matchesSearch = searchQuery === '' ||
            transfer.id.toString().includes(searchQuery) ||
            (transfer.remitter_id && transfer.remitter_id.toString().includes(searchQuery));
        return matchesStatus && matchesSearch;
    });

    if (loading) {
        return <div className="max-w-7xl mx-auto p-8 text-center text-slate-500 animate-pulse">Loading transfers...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Transfers</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage and track all money transfers</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Role Simulation for Demo */}
                    <div className="relative">
                        <select
                            value={userRole}
                            onChange={(e) => setUserRole(e.target.value)}
                            className="glass-effect appearance-none pl-6 pr-10 py-3 border-0 rounded-full text-sm outline-none font-semibold text-slate-600 focus:ring-2 focus:ring-teal-500/50 cursor-pointer hover:bg-white/40 transition-colors"
                        >
                            <option value="admin">View as: Super Admin (All)</option>
                            <option value="branch_user">View as: Branch Manager (London)</option>
                        </select>
                        {/* Custom arrow could be added here if needed, but browser default is hidden with appearance-none usually requiring custom one. For now keeping simple but rounded-full. */}
                    </div>

                    <Link href="/admin/transfers/create" className="btn-primary w-full sm:w-auto flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 rounded-full px-6">
                        <PlusCircle className="w-5 h-5" />
                        <span>New Transfer</span>
                    </Link>
                </div>
            </div>

            {/* Status Filters */}
            <div className="card-glass p-1.5 rounded-full inline-flex flex-wrap w-full md:w-auto overflow-hidden">
                <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar w-full">
                    {Object.entries(statusConfig).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setFilterStatus(key)}
                            className={`px-5 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-300 ${filterStatus === key
                                ? 'bg-white shadow-md text-teal-600 dark:bg-slate-700 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-teal-600'
                                }`}
                        >
                            <span className="flex items-center space-x-2">
                                <span>{config.label}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${filterStatus === key ? 'bg-teal-100 text-teal-700 dark:bg-slate-600 dark:text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                    {config.count}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="relative group input-icon">
                <span className="input-icon-left group-focus-within:text-teal-500 transition-colors">
                    <Search className="w-5 h-5" />
                </span>
                <input
                    type="search"
                    placeholder="Search transfers by ID or Remitter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-glass w-full py-3 text-base shadow-sm hover:shadow-md transition-shadow"
                />
            </div>

            {/* Table */}
            <div className="card-glass overflow-hidden shadow-xl">
                <table className="table-shell">
                    <thead className="table-head">
                        <tr>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount (GBP)</th>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payout (PKR)</th>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rate</th>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="table-body">
                        {filteredTransfers.map((transfer) => (
                            <tr key={transfer.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{transfer.id}</span>
                                        <div className="flex items-center space-x-2 mt-1.5">
                                            {/* Channel Icon */}
                                            <span title={`Channel: ${transfer.type}`} className="badge-glass text-[10px] px-2 py-0.5 text-slate-500">
                                                {transfer.type === 'mobile' ? 'APP' : transfer.type === 'online' ? 'WEB' : 'BRANCH'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 font-bold text-slate-900 dark:text-white">£{parseFloat(transfer.source_amount).toFixed(2)}</td>
                                <td className="px-8 py-5 text-teal-600 dark:text-teal-400 font-bold">PKR {parseFloat(transfer.dest_amount).toFixed(2)}</td>
                                <td className="px-8 py-5 text-slate-600 dark:text-slate-400 font-medium">{transfer.rate}</td>
                                <td className="px-8 py-5">
                                    <span className={`badge-glass px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-extrabold ${getStatusBadge(transfer.status)}`}>
                                        {formatStatus(transfer.status)}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                                    {new Date(transfer.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-8 py-5">
                                    <Link
                                        href={`/admin/transfers/${transfer.id}`}
                                        className="p-2 rounded-full hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all inline-flex"
                                        title="View & Process"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTransfers.length === 0 && (
                    <div className="p-16 text-center text-slate-500 font-medium">
                        No transfers found matching your filters.
                    </div>
                )}
            </div>
        </div>
    );
}
