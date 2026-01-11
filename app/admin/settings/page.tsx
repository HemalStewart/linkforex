'use client';

import React, { useState } from 'react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('branding');

    const tabs = [
        { id: 'branding', name: 'Branding', icon: '🎨' },
        { id: 'general', name: 'General', icon: '⚙️' },
        { id: 'security', name: 'Security', icon: '🔒' },
        { id: 'notifications', name: 'Notifications', icon: '🔔' },
        { id: 'integrations', name: 'Integrations', icon: '🔌' },
        { id: 'backup', name: 'Backup', icon: '💾' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage system configuration and preferences</p>
                </div>
                <button className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm">
                    <span className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save All Changes</span>
                    </span>
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-1">
                <div className="flex items-center space-x-1 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                                }`}
                        >
                            <span className="flex items-center space-x-2">
                                <span className="text-lg">{tab.icon}</span>
                                <span>{tab.name}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Branding Tab */}
            {activeTab === 'branding' && (
                <div className="space-y-6">
                    {/* Multi-Tenant Info */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Multi-Tenant Branding</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Customize the look and feel of your LinkForex platform. These settings allow you to white-label the application for different clients or branches.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Logo Upload */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Company Logo</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Click to upload logo</p>
                                    </div>
                                </div>
                                <button className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Upload Logo
                                </button>
                            </div>
                        </div>

                        {/* Favicon */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Favicon</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer">
                                    <div className="text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Click to upload favicon</p>
                                    </div>
                                </div>
                                <button className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Upload Favicon
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Color Scheme */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Color Scheme</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Primary Color</label>
                                <div className="flex space-x-3">
                                    <input
                                        type="color"
                                        defaultValue="#6366f1"
                                        className="h-10 w-16 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        defaultValue="#6366f1"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Secondary Color</label>
                                <div className="flex space-x-3">
                                    <input
                                        type="color"
                                        defaultValue="#8b5cf6"
                                        className="h-10 w-16 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        defaultValue="#8b5cf6"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Company Info */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Company Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Company Name</label>
                                <input
                                    type="text"
                                    defaultValue="LinkForex"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tagline</label>
                                <input
                                    type="text"
                                    defaultValue="Connecting UK to Afghanistan with trust"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Support Email</label>
                                <input
                                    type="email"
                                    defaultValue="support@linkforex.com"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">System Settings</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">Maintenance Mode</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Disable public access for maintenance</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-slate-900"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">Auto-Update Exchange Rates</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Automatically fetch latest rates every 30 minutes</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-slate-900"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
