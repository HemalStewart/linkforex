'use client';

import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';

export default function ExchangeRatesPage() {
    const [editingRate, setEditingRate] = useState<string | null>(null);

    const exchangeRates = [
        { id: 1, fromCurrency: 'GBP', toCurrency: 'AFN', flag: '🇬🇧→🇦🇫', rate: 116.00, buy: 115.50, sell: 116.50, lastUpdated: '2026-01-11 11:30', change: '+0.5%', trend: 'up' },
        { id: 2, fromCurrency: 'USD', toCurrency: 'AFN', flag: '🇺🇸→🇦🇫', rate: 92.50, buy: 92.00, sell: 93.00, lastUpdated: '2026-01-11 11:30', change: '+0.3%', trend: 'up' },
        { id: 3, fromCurrency: 'EUR', toCurrency: 'AFN', flag: '🇪🇺→🇦🇫', rate: 100.25, buy: 99.75, sell: 100.75, lastUpdated: '2026-01-11 11:30', change: '-0.2%', trend: 'down' },
        { id: 4, fromCurrency: 'GBP', toCurrency: 'USD', flag: '🇬🇧→🇺🇸', rate: 1.25, buy: 1.24, sell: 1.26, lastUpdated: '2026-01-11 11:30', change: '+0.1%', trend: 'up' },
        { id: 5, fromCurrency: 'GBP', toCurrency: 'EUR', flag: '🇬🇧→🇪🇺', rate: 1.16, buy: 1.15, sell: 1.17, lastUpdated: '2026-01-11 11:30', change: '0.0%', trend: 'neutral' },
    ];

    const getTrendIcon = (trend: string) => {
        if (trend === 'up') {
            return (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            );
        } else if (trend === 'down') {
            return (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
            );
        }
        return (
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
        );
    };

    const getChangeBadge = (change: string) => {
        if (change.startsWith('+')) {
            return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
        } else if (change.startsWith('-')) {
            return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
        }
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800';
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Exchange Rates</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage currency exchange rates</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all duration-200">
                            <span className="flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Refresh Rates</span>
                            </span>
                        </button>
                        <button className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all duration-200">
                            <span className="flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Rate History</span>
                            </span>
                        </button>
                        <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/50">
                            <span className="flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Add Rate</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">GBP → AFN</p>
                                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">116.00</p>
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">+0.5%</p>
                            </div>
                            <div className="text-4xl">🇬🇧→🇦🇫</div>
                        </div>
                    </div>

                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">USD → AFN</p>
                                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">92.50</p>
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">+0.3%</p>
                            </div>
                            <div className="text-4xl">🇺🇸→🇦🇫</div>
                        </div>
                    </div>

                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">EUR → AFN</p>
                                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">100.25</p>
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-1">-0.2%</p>
                            </div>
                            <div className="text-4xl">🇪🇺→🇦🇫</div>
                        </div>
                    </div>

                    <div className="card-glass p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Last Updated</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">11:30 AM</p>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Today</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exchange Rate Calculator */}
                <div className="card-glass p-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Quick Calculator</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Amount</label>
                            <input
                                type="number"
                                placeholder="1000"
                                className="input-field"
                                defaultValue="1000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">From</label>
                            <select className="input-field">
                                <option>GBP - British Pound</option>
                                <option>USD - US Dollar</option>
                                <option>EUR - Euro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">To</label>
                            <select className="input-field">
                                <option>AFN - Afghan Afghani</option>
                                <option>USD - US Dollar</option>
                                <option>EUR - Euro</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 p-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                        <p className="text-sm font-medium mb-1">You will receive</p>
                        <p className="text-4xl font-bold">৳116,000 AFN</p>
                        <p className="text-sm mt-2 opacity-90">Exchange rate: 1 GBP = 116.00 AFN</p>
                    </div>
                </div>

                {/* Rates Table */}
                <div className="card-glass overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Current Exchange Rates</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Currency Pair</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Mid Rate</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Buy Rate</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Sell Rate</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Change (24h)</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Last Updated</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {exchangeRates.map((rate, index) => (
                                    <tr
                                        key={rate.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-3xl">{rate.flag}</span>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-slate-100">
                                                        {rate.fromCurrency} → {rate.toCurrency}
                                                    </p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        {rate.fromCurrency}/{rate.toCurrency}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{rate.rate.toFixed(2)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-green-600 dark:text-green-400">{rate.buy.toFixed(2)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-red-600 dark:text-red-400">{rate.sell.toFixed(2)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                {getTrendIcon(rate.trend)}
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getChangeBadge(rate.change)}`}>
                                                    {rate.change}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                            {rate.lastUpdated}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Edit">
                                                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="History">
                                                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Alert Banner */}
                <div className="card-glass p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1">Auto-Update Enabled</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Exchange rates are automatically updated every 30 minutes from our trusted financial data providers. Last sync: 11:30 AM
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
