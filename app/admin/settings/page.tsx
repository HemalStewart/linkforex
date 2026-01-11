'use client';

import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';

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
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage system configuration and preferences</p>
                    </div>
                    <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/50">
                        <span className="flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Save All Changes</span>
                        </span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="card-glass">
                    <div className="flex items-center space-x-2 overflow-x-auto p-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 rounded-xl font-medium whitespace-nowrap transition-all duration-200 ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span className="flex items-center space-x-2">
                                    <span className="text-xl">{tab.icon}</span>
                                    <span>{tab.name}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Branding Tab */}
                {activeTab === 'branding' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Multi-Tenant Info */}
                        <div className="card-glass p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-2 border-indigo-200 dark:border-indigo-800">
                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-white flex-shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-indigo-900 dark:text-indigo-100 mb-1">Multi-Tenant Branding</h3>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                        Customize the look and feel of your LinkForex platform. These settings allow you to white-label the application for different clients or branches.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Logo Upload */}
                            <div className="card-glass p-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Company Logo</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer">
                                        <div className="text-center">
                                            <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Click to upload logo</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">SVG, PNG, JPG (max. 2MB)</p>
                                        </div>
                                    </div>
                                    <button className="btn btn-outline w-full">
                                        <span className="flex items-center justify-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <span>Upload Logo</span>
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Favicon */}
                            <div className="card-glass p-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Favicon</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer">
                                        <div className="text-center">
                                            <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Click to upload favicon</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ICO, PNG (32x32 or 64x64)</p>
                                        </div>
                                    </div>
                                    <button className="btn btn-outline w-full">
                                        <span className="flex items-center justify-center space-x-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <span>Upload Favicon</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Color Scheme */}
                        <div className="card-glass p-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Color Scheme</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Primary Color</label>
                                    <div className="flex space-x-3">
                                        <input
                                            type="color"
                                            defaultValue="#6366f1"
                                            className="h-12 w-20 rounded-lg border-2 border-slate-200 dark:border-slate-700 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            defaultValue="#6366f1"
                                            className="input-field flex-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Secondary Color</label>
                                    <div className="flex space-x-3">
                                        <input
                                            type="color"
                                            defaultValue="#8b5cf6"
                                            className="h-12 w-20 rounded-lg border-2 border-slate-200 dark:border-slate-700 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            defaultValue="#8b5cf6"
                                            className="input-field flex-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Accent Color</label>
                                    <div className="flex space-x-3">
                                        <input
                                            type="color"
                                            defaultValue="#ec4899"
                                            className="h-12 w-20 rounded-lg border-2 border-slate-200 dark:border-slate-700 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            defaultValue="#ec4899"
                                            className="input-field flex-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Success Color</label>
                                    <div className="flex space-x-3">
                                        <input
                                            type="color"
                                            defaultValue="#10b981"
                                            className="h-12 w-20 rounded-lg border-2 border-slate-200 dark:border-slate-700 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            defaultValue="#10b981"
                                            className="input-field flex-1"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    <strong>Preview:</strong> Changes will be applied across the entire platform including buttons, links, and UI elements.
                                </p>
                            </div>
                        </div>

                        {/* Company Info */}
                        <div className="card-glass p-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Company Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Company Name</label>
                                    <input
                                        type="text"
                                        defaultValue="LinkForex"
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tagline</label>
                                    <input
                                        type="text"
                                        defaultValue="Connecting UK to Afghanistan with trust"
                                        className="input-field"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Support Email</label>
                                    <input
                                        type="email"
                                        defaultValue="support@linkforex.com"
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        defaultValue="+44 20 1234 5678"
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Website</label>
                                    <input
                                        type="url"
                                        defaultValue="https://linkforex.com"
                                        className="input-field"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Theme Mode */}
                        <div className="card-glass p-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Theme Mode</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-left transition-all duration-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                                            <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-100">Light</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">Default light theme</p>
                                        </div>
                                        <svg className="w-6 h-6 text-indigo-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </button>

                                <button className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-left hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-100">Dark</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">Dark theme</p>
                                        </div>
                                    </div>
                                </button>

                                <button className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-left hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white to-slate-900 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-100">System</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">Auto detect</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* General Tab */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="card-glass p-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">System Settings</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">Maintenance Mode</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Disable public access for maintenance</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" />
                                        <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-900 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">Auto-Update Exchange Rates</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Automatically fetch latest rates every 30 minutes</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-900 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">Email Notifications</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Send email alerts for important events</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-900 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Other tabs placeholder */}
                {activeTab !== 'branding' && activeTab !== 'general' && (
                    <div className="card-glass p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{tabs.find(t => t.id === activeTab)?.name} Settings</h3>
                        <p className="text-slate-600 dark:text-slate-400">Settings for this section are coming soon...</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
