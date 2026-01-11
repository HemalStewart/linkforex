'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Extended Transfer Type Definition based on WBS
interface Transfer {
    id: string; // Transaction No
    // Transaction Info
    date: string;
    status: 'completed' | 'in_transit' | 'pending' | 'in_review' | 'pending_payment';
    amountAfn: string; // Payout Amount in PKR/AFN (using requirement PKR but existing app has AFN, keeping consistent with app context for now or switching? Requirement says 'Amount in PKR'. I will check requirement closely. Requirement says 'Receiver receiving final payout amount in 'PKR''. But previous data was AFN. I will stick to the requirement list which implies this might be for a specific corridor, but I will simulate multi-currency or stick to the requirement. Let's use 'PKR' as per requirement list to be precise, or maybe 'AFN' if that's the main corridor. The user requirement explicitly says 'Valid value is 'PKR'' for Currency. I will follow the user requirement and change to PKR)
    amountGbp: string; // Collection Amount
    exchangeRate: string;

    // Remitter Info
    remitterName: string;
    remitterCountry: string;
    remitterId: string; // Unique ID
    remitterAddress: string;
    remitterCity: string;
    remitterPostCode: string;
    remitterEmail: string;
    remitterContact: string;
    remitterIdType: string;
    remitterIdNo: string;
    remitterIdExpiry: string;
    remitterDob: string;
    remitterPlaceOfBirth: string;
    sourceOfFunds: string;

    // Receiver Info
    receiverName: string;
    receiverCountryCode: string; // e.g., PK
    receiverCity: string;
    receiverContact: string;
    relationship: string;
    paymentMode: 'D' | 'C' | 'P'; // Direct (ABL), Other Bank, Cash
    receiverBank: string;
    receiverAccountNo?: string;
    receiverBranchCode?: string;
    receiverIban?: string;
    receiverIdType?: string; // P, C, D, O
    receiverIdNo?: string;
    purpose: string;
}

export default function TransfersPage() {
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Mock Data based on Requirements
    const transfers: Transfer[] = [
        {
            id: 'TRX-109283',
            date: '2026-01-11 10:30',
            status: 'completed',
            amountGbp: '£850.00',
            amountAfn: '₨306,000', // PKR approx
            exchangeRate: '360.00',
            remitterName: 'John Smith',
            remitterCountry: 'United Kingdom',
            remitterId: 'R-99821',
            remitterAddress: '12 Baker Street',
            remitterCity: 'London',
            remitterPostCode: 'W1U 8ED',
            remitterEmail: 'john@example.com',
            remitterContact: '+44 7700 900123',
            remitterIdType: 'Passport',
            remitterIdNo: 'GB123456789',
            remitterIdExpiry: '2028-05-20',
            remitterDob: '1985-04-12',
            remitterPlaceOfBirth: 'London',
            sourceOfFunds: 'Salary',
            receiverName: 'Ahmad Khan',
            receiverCountryCode: 'PK',
            receiverCity: 'Lahore',
            receiverContact: '+92 300 1234567',
            relationship: 'Family Support',
            paymentMode: 'D', // Direct ABL
            receiverBank: 'ABL',
            receiverAccountNo: '0010020030040050',
            purpose: 'Family Maintenance'
        },
        {
            id: 'TRX-109284',
            date: '2026-01-11 11:15',
            status: 'in_transit',
            amountGbp: '£1,200.00',
            amountAfn: '₨432,000',
            exchangeRate: '360.00',
            remitterName: 'Sarah Johnson',
            remitterCountry: 'United Kingdom',
            remitterId: 'R-77210',
            remitterAddress: '45 Oxford Road',
            remitterCity: 'Manchester',
            remitterPostCode: 'M1 5AN',
            remitterEmail: 'sarah@example.com',
            remitterContact: '+44 7700 900456',
            remitterIdType: 'Driving Licence',
            remitterIdNo: 'JOHNS854012SJ99',
            remitterIdExpiry: '2030-01-15',
            remitterDob: '1990-08-22',
            remitterPlaceOfBirth: 'Manchester',
            sourceOfFunds: 'Savings',
            receiverName: 'Fatima Noor',
            receiverCountryCode: 'PK',
            receiverCity: 'Karachi',
            receiverContact: '+92 321 7654321',
            relationship: 'Sister',
            paymentMode: 'P', // Cash Pickup
            receiverBank: 'N/A',
            receiverIdType: 'C', // CNIC
            receiverIdNo: '42101-1234567-1',
            purpose: 'Gift'
        },
        {
            id: 'TRX-109285',
            date: '2026-01-10 16:45',
            status: 'pending',
            amountGbp: '£500.00',
            amountAfn: '₨180,000',
            exchangeRate: '360.00',
            remitterName: 'Michael Brown',
            remitterCountry: 'United Kingdom',
            remitterId: 'R-55321',
            remitterAddress: '88 Broad Street',
            remitterCity: 'Birmingham',
            remitterPostCode: 'B1 2HE',
            remitterEmail: 'mike@example.com',
            remitterContact: '+44 7700 900789',
            remitterIdType: 'Passport',
            remitterIdNo: 'GB987654321',
            remitterIdExpiry: '2027-11-30',
            remitterDob: '1978-02-14',
            remitterPlaceOfBirth: 'Leeds',
            sourceOfFunds: 'Business Profit',
            receiverName: 'Bilal Ahmed',
            receiverCountryCode: 'PK',
            receiverCity: 'Islamabad',
            receiverContact: '+92 333 9876543',
            relationship: 'Business Partner',
            paymentMode: 'C', // Other Bank
            receiverBank: 'HBL',
            receiverAccountNo: '1122334455667788',
            receiverIban: 'PK36HABB00112233445566',
            purpose: 'Service Payment'
        }
    ];

    const statusConfig = {
        all: { label: 'All', count: transfers.length },
        pending: { label: 'Pending', count: transfers.filter(t => t.status === 'pending').length },
        pending_payment: { label: 'Pending Payment', count: transfers.filter(t => t.status === 'pending_payment').length },
        in_review: { label: 'In Review', count: transfers.filter(t => t.status === 'in_review').length },
        in_transit: { label: 'In Transit', count: transfers.filter(t => t.status === 'in_transit').length },
        completed: { label: 'Completed', count: transfers.filter(t => t.status === 'completed').length },
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
            in_transit: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
            pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
            in_review: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
            pending_payment: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
        };
        return styles[status as keyof typeof styles] || styles.pending;
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const filteredTransfers = transfers.filter(transfer => {
        const matchesStatus = filterStatus === 'all' || transfer.status === filterStatus;
        const matchesSearch = searchQuery === '' ||
            transfer.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transfer.remitterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transfer.receiverName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const toggleRow = (id: string) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transfers</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and track all money transfers</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <span className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export CSV</span>
                        </span>
                    </button>
                    <Link href="/admin/transfers/create" className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm inline-flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>New Transfer</span>
                    </Link>
                </div>
            </div>

            {/* Status Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center space-x-1 overflow-x-auto p-1">
                    {Object.entries(statusConfig).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setFilterStatus(key)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${filterStatus === key
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="flex items-center space-x-2">
                                <span>{config.label}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${filterStatus === key
                                    ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
                                    }`}>
                                    {config.count}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="search"
                        placeholder="Search by Transaction No, Remitter Name, or Receiver Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                    />
                </div>
            </div>

            {/* Transfers Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Remitter</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Receiver</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amounts</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredTransfers.map((transfer) => (
                                <React.Fragment key={transfer.id}>
                                    <tr
                                        onClick={() => toggleRow(transfer.id)}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">{transfer.id}</div>
                                            <div className="text-xs text-slate-500">{transfer.date}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 dark:text-white">{transfer.remitterName}</div>
                                            <div className="text-xs text-slate-500">{transfer.remitterCountry}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 dark:text-white">{transfer.receiverName}</div>
                                            <div className="text-xs text-slate-500">{transfer.receiverCity}, {transfer.receiverCountryCode}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white">{transfer.amountGbp}</div>
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">→ {transfer.amountAfn} (PKR)</div>
                                            <div className="text-[10px] text-slate-400">Rate: {transfer.exchangeRate}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border ${transfer.paymentMode === 'D' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' :
                                                transfer.paymentMode === 'C' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                {transfer.paymentMode === 'D' && 'Direct (ABL)'}
                                                {transfer.paymentMode === 'C' && 'Other Bank'}
                                                {transfer.paymentMode === 'P' && 'Cash Pickup'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(transfer.status)}`}>
                                                {formatStatus(transfer.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedRow === transfer.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </td>
                                    </tr>
                                    {/* Expanded Details Row */}
                                    {expandedRow === transfer.id && (
                                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                                            <td colSpan={7} className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                                                    {/* Remitter Details */}
                                                    <div className="space-y-3">
                                                        <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">Remitter Details</h4>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <span className="text-slate-500">Full Name:</span>
                                                            <span className="text-slate-900 dark:text-white font-medium">{transfer.remitterName}</span>

                                                            <span className="text-slate-500">ID ({transfer.remitterIdType}):</span>
                                                            <span className="text-slate-900 dark:text-white font-medium">{transfer.remitterIdNo}</span>

                                                            <span className="text-slate-500">Address:</span>
                                                            <span className="text-slate-900 dark:text-white font-medium">{transfer.remitterAddress}, {transfer.remitterCity}, {transfer.remitterPostCode}</span>

                                                            <span className="text-slate-500">Contact:</span>
                                                            <span className="text-slate-900 dark:text-white font-medium">{transfer.remitterContact}</span>

                                                            <span className="text-slate-500">Email:</span>
                                                            <span className="text-slate-900 dark:text-white font-medium">{transfer.remitterEmail}</span>

                                                            <span className="text-slate-500">Source of Funds:</span>
                                                            <span className="text-slate-900 dark:text-white font-medium">{transfer.sourceOfFunds}</span>
                                                        </div>
                                                    </div>

                                                    {/* Receiver Details */}
                                                    <div className="space-y-3">
                                                        <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">Receiver Details</h4>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <span className="text-slate-500">Full Name:</span>
                                                            <span className="text-slate-900 dark:text-white font-medium">{transfer.receiverName}</span>

                                                            <span className="text-slate-500">Bank:</span>
                                                            <span className="text-slate-900 dark:text-white font-medium">{transfer.receiverBank}</span>

                                                            {transfer.receiverAccountNo && (
                                                                <>
                                                                    <span className="text-slate-500">Account No:</span>
                                                                    <span className="text-slate-900 dark:text-white font-medium font-mono">{transfer.receiverAccountNo}</span>
                                                                </>
                                                            )}

                                                            {transfer.receiverIban && (
                                                                <>
                                                                    <span className="text-slate-500">IBAN:</span>
                                                                    <span className="text-slate-900 dark:text-white font-medium font-mono">{transfer.receiverIban}</span>
                                                                </>
                                                            )}

                                                            {(transfer.receiverIdType || transfer.receiverIdNo) && (
                                                                <>
                                                                    <span className="text-slate-500">ID ({transfer.receiverIdType || 'N/A'}):</span>
                                                                    <span className="text-slate-900 dark:text-white font-medium">{transfer.receiverIdNo || 'N/A'}</span>
                                                                </>
                                                            )}

                                                            <span className="text-slate-500">Relationship:</span>
                                                            <span className="text-slate-900 dark:text-white font-medium">{transfer.relationship}</span>

                                                            <span className="text-slate-500">Purpose:</span>
                                                            <span className="text-slate-900 dark:text-white font-medium">{transfer.purpose}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
