'use client';

import React, { useState } from 'react';

export default function KYCPage() {
    const [filterStatus, setFilterStatus] = useState('all');

    const kycApplications = [
        { id: 'KYC-001', user: 'Ahmed Hassan', email: 'ahmed.hassan@example.com', phone: '+44 7700 900 123', submittedDate: '2026-01-11 09:00', status: 'pending', documents: ['Passport', 'Proof of Address', 'Source of Funds'], riskLevel: 'low', country: 'UK' },
        { id: 'KYC-002', user: 'Fatima Rahman', email: 'fatima.rahman@example.com', phone: '+44 7700 900 234', submittedDate: '2026-01-11 07:30', status: 'in_review', documents: ['National ID', 'Proof of Address'], riskLevel: 'low', country: 'UK' },
        { id: 'KYC-003', user: 'Mohammed Ali', email: 'ali.m@example.com', phone: '+44 7700 900 345', submittedDate: '2026-01-10 16:20', status: 'approved', documents: ['Passport', 'Proof of Address', 'Bank Statement'], riskLevel: 'low', country: 'UK' },
        { id: 'KYC-004', user: 'Noor Khan', email: 'noor.khan@example.com', phone: '+44 7700 900 456', submittedDate: '2026-01-10 14:15', status: 'needs_info', documents: ['Passport', 'Utility Bill'], riskLevel: 'medium', country: 'UK' },
        { id: 'KYC-005', user: 'Zahra Karimi', email: 'zahra.k@example.com', phone: '+44 7700 900 567', submittedDate: '2026-01-10 11:45', status: 'rejected', documents: ['Expired Passport', 'Proof of Address'], riskLevel: 'high', country: 'UK' },
        { id: 'KYC-006', user: 'Rashid Ahmad', email: 'rashid.ahmad@example.com', phone: '+44 7700 900 678', submittedDate: '2026-01-09 13:30', status: 'pending', documents: ['Passport', 'Bank Statement'], riskLevel: 'low', country: 'UK' },
        { id: 'KYC-007', user: 'Amina Sultana', email: 'amina.s@example.com', phone: '+44 7700 900 789', submittedDate: '2026-01-09 10:00', status: 'in_review', documents: ['National ID', 'Proof of Address', 'Employment Letter'], riskLevel: 'medium', country: 'UK' },
        { id: 'KYC-008', user: 'Hassan Yusuf', email: 'hassan.y@example.com', phone: '+44 7700 900 890', submittedDate: '2026-01-08 15:20', status: 'approved', documents: ['Passport', 'Proof of Address', 'Tax Return'], riskLevel: 'low', country: 'UK' },
    ];

    const statusConfig = {
        all: { label: 'All Applications', count: kycApplications.length },
        pending: { label: 'Pending', count: kycApplications.filter(k => k.status === 'pending').length },
        in_review: { label: 'In Review', count: kycApplications.filter(k => k.status === 'in_review').length },
        needs_info: { label: 'Needs Info', count: kycApplications.filter(k => k.status === 'needs_info').length },
        approved: { label: 'Approved', count: kycApplications.filter(k => k.status === 'approved').length },
        rejected: { label: 'Rejected', count: kycApplications.filter(k => k.status === 'rejected').length },
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
            in_review: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
            needs_info: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
            approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
            rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        };
        return styles[status as keyof typeof styles];
    };

    const getRiskBadge = (risk: string) => {
        const styles = {
            low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
            medium: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
            high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        };
        return styles[risk as keyof typeof styles];
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const filteredApplications = kycApplications.filter(app =>
        filterStatus === 'all' || app.status === filterStatus
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">KYC Reviews</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Review and verify customer documents</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <span className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span>Filters</span>
                        </span>
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm">
                        <span className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export Report</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Pending Review</p>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statusConfig.pending.count}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">In Review</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statusConfig.in_review.count}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Needs Info</p>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statusConfig.needs_info.count}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Approved Today</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{statusConfig.approved.count}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
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

            {/* KYC Applications Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredApplications.map((app, index) => (
                    <div
                        key={app.id}
                        className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-lg">
                                    {app.user.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{app.user}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{app.email}</p>
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(app.status)}`}>
                                {formatStatus(app.status)}
                            </span>
                        </div>

                        {/* Details */}
                        <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Application ID:</span>
                                <span className="font-mono font-medium text-slate-900 dark:text-white">{app.id}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                                <span className="font-medium text-slate-900 dark:text-white">{app.phone}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Submitted:</span>
                                <span className="font-medium text-slate-900 dark:text-white">{app.submittedDate}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Risk Level:</span>
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase border ${getRiskBadge(app.riskLevel)}`}>
                                    {app.riskLevel}
                                </span>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Documents</p>
                            <div className="flex flex-wrap gap-2">
                                {app.documents.map((doc, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700"
                                    >
                                        <span className="flex items-center space-x-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span>{doc}</span>
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button className="flex-1 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm">
                                Review Application
                            </button>
                            <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
