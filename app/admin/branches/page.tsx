'use client';

import React from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function BranchesPage() {
    const branches = [
        { id: 1, name: 'London Central', address: '123 Oxford Street, London, W1D 2HG', manager: 'Sarah Manager', phone: '+44 20 1234 5678', email: 'london.central@linkforex.com', status: 'active', staff: 12, transfers: 1247, revenue: '£487,392' },
        { id: 2, name: 'Manchester', address: '45 Market Street, Manchester, M1 1WR', manager: 'John Smith', phone: '+44 161 234 5678', email: 'manchester@linkforex.com', status: 'active', staff: 8, transfers: 843, revenue: '£324,156' },
        { id: 3, name: 'Birmingham', address: '78 Bull Street, Birmingham, B4 6AF', manager: 'James Branch', phone: '+44 121 234 5678', email: 'birmingham@linkforex.com', status: 'active', staff: 10, transfers: 965, revenue: '£398,245' },
        { id: 4, name: 'London East', address: '234 Commercial Road, London, E1 2BN', manager: 'Emma Agent', phone: '+44 20 2345 6789', email: 'london.east@linkforex.com', status: 'active', staff: 7, transfers: 678, revenue: '£267,891' },
        { id: 5, name: 'Leeds', address: '56 Briggate, Leeds, LS1 6BR', manager: 'Michael Brown', phone: '+44 113 234 5678', email: 'leeds@linkforex.com', status: 'active', staff: 6, transfers: 534, revenue: '£198,432' },
        { id: 6, name: 'Glasgow', address: '89 Buchanan Street, Glasgow, G1 3HL', manager: 'Olivia Taylor', phone: '+44 141 234 5678', email: 'glasgow@linkforex.com', status: 'active', staff: 9, transfers: 723, revenue: '£289,567' },
        { id: 7, name: 'Liverpool', address: '12 Lord Street, Liverpool, L2 1TP', manager: 'Sophie Martin', phone: '+44 151 234 5678', email: 'liverpool@linkforex.com', status: 'active', staff: 5, transfers: 456, revenue: '£167,234' },
        { id: 8, name: 'Bristol', address: '34 Broadmead, Bristol, BS1 3DS', manager: 'David Lee', phone: '+44 117 234 5678', email: 'bristol@linkforex.com', status: 'inactive', staff: 4, transfers: 289, revenue: '£112,345' },
    ];

    const getStatusBadge = (status: string) => {
        return status === 'active'
            ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
            : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400';
    };

    const totalStats = {
        totalBranches: branches.length,
        activeBranches: branches.filter(b => b.status === 'active').length,
        totalStaff: branches.reduce((sum, b) => sum + b.staff, 0),
        totalRevenue: branches.reduce((sum, b) => sum + parseFloat(b.revenue.replace(/[£,]/g, '')), 0),
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Branches</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage branch locations and staff</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all duration-200">
                            <span className="flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                <span>View Map</span>
                            </span>
                        </button>
                        <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/50">
                            <span className="flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Add Branch</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Branches</p>
                                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{totalStats.totalBranches}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Active Branches</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalStats.activeBranches}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white shadow-lg">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Staff</p>
                                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalStats.totalStaff}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Revenue</p>
                                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                    £{(totalStats.totalRevenue / 1000).toFixed(0)}K
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Branches Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {branches.map((branch, index) => (
                        <div
                            key={branch.id}
                            className="card-glass p-6 hover:shadow-2xl transition-all duration-300 animate-slide-in"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{branch.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{branch.address}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${getStatusBadge(branch.status)}`}>
                                    {branch.status}
                                </span>
                            </div>

                            {/* Manager */}
                            <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                                        {branch.manager.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Branch Manager</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-100">{branch.manager}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center space-x-2 text-sm">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-slate-700 dark:text-slate-300">{branch.phone}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-slate-700 dark:text-slate-300">{branch.email}</span>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900">
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{branch.staff}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Staff</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900">
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{branch.transfers}</p>
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Transfers</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-100 dark:border-purple-900">
                                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{branch.revenue}</p>
                                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Revenue</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <button className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200">
                                    View Details
                                </button>
                                <button className="px-4 py-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all duration-200">
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
