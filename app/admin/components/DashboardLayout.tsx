'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const pathname = usePathname();

    const navigation = [
        {
            name: 'Dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
            href: '/admin/dashboard'
        },
        {
            name: 'Transfers',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
            ),
            href: '/admin/transfers',
            badge: '24'
        },
        {
            name: 'KYC Reviews',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            href: '/admin/kyc',
            badge: '8'
        },
        {
            name: 'Users',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            href: '/admin/users'
        },
        {
            name: 'Branches',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            href: '/admin/branches'
        },
        {
            name: 'Exchange Rates',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            href: '/admin/rates'
        },
        {
            name: 'Reports',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            href: '/admin/reports'
        },
        {
            name: 'Settings',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            href: '/admin/settings'
        }
    ];

    return (
        <div
            className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-all duration-300"
            style={{ paddingLeft: sidebarOpen ? '256px' : '80px' }}
        >
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="h-full glass-strong border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    {/* Logo */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700">
                        {sidebarOpen && (
                            <div className="flex items-center space-x-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                                    LinkForex
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} px-3 py-3 rounded-xl font-medium transition-all duration-200 group ${pathname === item.href
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-400'
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    {item.icon}
                                    {sidebarOpen && <span>{item.name}</span>}
                                </div>
                                {sidebarOpen && item.badge && (
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${pathname === item.href
                                        ? 'bg-white/20 text-white'
                                        : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
                                        }`}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className={`w-full flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'} p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200`}
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold shadow-lg">
                                AD
                            </div>
                            {sidebarOpen && (
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Admin User</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Super Admin</p>
                                </div>
                            )}
                            {sidebarOpen && (
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="transition-all duration-300">{/* Parent div now handles spacing with pl-64/pl-20 */}
                {/* Top Bar */}
                <header className="h-16 glass-strong border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
                    <div className="h-full px-6 flex items-center justify-between">
                        {/* Search */}
                        <div className="flex-1 max-w-2xl">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                    <svg className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="search"
                                    placeholder="Search transfers, users, or documents..."
                                    className="w-full pl-12 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-4 ml-6">
                            {/* Notifications */}
                            <button className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 shadow-md hover:shadow-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
                            </button>

                            {/* Quick Actions */}
                            <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/50">
                                <span className="flex items-center space-x-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span>New Transfer</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-8 min-h-screen">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
