'use client';

import React, { useState, useEffect } from 'react';
import { ENDPOINTS } from '@/app/lib/api';

// Icons
const Icons = {
    branding: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
    ),
    general: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    security: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    ),
    notifications: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
    ),
    integrations: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
    ),
    backup: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
    ),
};

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('branding');
    const [isGenerating, setIsGenerating] = useState(false);
    const [settings, setSettings] = useState({
        companyName: 'LinkForex',
        tagline: 'Connecting UK to Afghanistan with trust',
        supportEmail: 'support@linkforex.com',
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        maintenanceMode: false,
        autoUpdateRates: true
    });

    useEffect(() => {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = () => {
        localStorage.setItem('appSettings', JSON.stringify(settings));
        alert('Settings saved successfully!');
    };

    const handleGenerateDemoData = async () => {
        setIsGenerating(true);
        let countRemitters = 0;
        let countBeneficiaries = 0;
        let countTransfers = 0;

        try {
            // 1. Create Remitters
            const remitters = [
                { name: 'Alice Johnson', email: 'alice.j@example.com', phone: '+447700123456', country: 'UK', status: 'active', role: 'customer' },
                { name: 'Bob Smith', email: 'bob.s@example.com', phone: '+447700234567', country: 'UK', status: 'active', role: 'customer' },
                { name: 'Charlie Brown', email: 'charlie.b@example.com', phone: '+447700345678', country: 'UK', status: 'active', role: 'customer' },
                { name: 'Diana Prince', email: 'diana.p@example.com', phone: '+447700456789', country: 'UK', status: 'active', role: 'customer' },
                { name: 'Evan Wright', email: 'evan.w@example.com', phone: '+447700567890', country: 'UK', status: 'active', role: 'customer' },
            ];

            const createdRemitters = [];
            for (const r of remitters) {
                const res = await fetch(ENDPOINTS.REMITTERS.LIST, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(r)
                });
                if (res.ok) {
                    const data = await res.json();
                    createdRemitters.push(data);
                    countRemitters++;
                } else {
                    console.warn('Skipped existing or failed remitter', r.name);
                    // Just in case they already exist, try to search for them to link
                    const searchRes = await fetch(`${ENDPOINTS.REMITTERS.LIST}?search=${r.name}`);
                    if (searchRes.ok) {
                        const found = await searchRes.json();
                        if (found && found.length > 0) createdRemitters.push(found[0]);
                    }
                }
            }

            // 2. Create Beneficiaries & Transfers
            for (const remitter of createdRemitters) {
                // Determine Branch (random for demo)
                const branchCode = ['LON001', 'BIR001', 'MAN001'][Math.floor(Math.random() * 3)];

                // Create Beneficiary
                const benData = {
                    customer_id: remitter.id,
                    name: `Beneficiary for ${remitter.name}`,
                    bank_name: ['Kabul Bank', 'Azizi Bank', 'AIB'][Math.floor(Math.random() * 3)],
                    account_number: 'AF' + Math.floor(Math.random() * 1000000000),
                };

                let benId = null;
                const benRes = await fetch(ENDPOINTS.BENEFICIARIES.LIST, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(benData)
                });
                if (benRes.ok) {
                    const ben = await benRes.json();
                    benId = ben.id;
                    countBeneficiaries++;
                } else {
                    // Try to find if exists
                    const listRes = await fetch(`${ENDPOINTS.BENEFICIARIES.LIST}?customer_id=${remitter.id}`);
                    if (listRes.ok) {
                        const list = await listRes.json();
                        if (list.length > 0) benId = list[0].id;
                    }
                }

                // Create Transfer
                if (benId) {
                    const amount = (Math.random() * 500 + 50).toFixed(2);
                    const rate = 98.5;
                    const transferData = {
                        remitter_id: remitter.id,
                        beneficiary_id: benId,
                        source_amount: amount,
                        dest_amount: (parseFloat(amount) * rate).toFixed(2),
                        rate: rate,
                        status: ['pending', 'completed', 'in_transit'][Math.floor(Math.random() * 3)],
                        payment_mode: 'bank_transfer',
                        source_of_funds: 'Salary',
                        purpose: 'Family Support'
                    };

                    const transRes = await fetch(ENDPOINTS.TRANSFERS.LIST, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(transferData)
                    });

                    if (transRes.ok) {
                        countTransfers++;
                    }
                }
            }

            alert(`Success! processed:
- ${countRemitters} New Remitters
- ${countBeneficiaries} New Beneficiaries
- ${countTransfers} New Transfers

Please refresh the Dashboard/Transfers page to see data.`);

        } catch (e) {
            console.error(e);
            alert('Error generating data. See console for details.');
        } finally {
            setIsGenerating(false);
        }
    };

    const tabs = [
        { id: 'branding', name: 'Branding', icon: Icons.branding },
        { id: 'general', name: 'General', icon: Icons.general },
        { id: 'security', name: 'Security', icon: Icons.security },
        { id: 'notifications', name: 'Notifications', icon: Icons.notifications },
        { id: 'integrations', name: 'Integrations', icon: Icons.integrations },
        { id: 'backup', name: 'Backup', icon: Icons.backup },
        {
            id: 'demo_data', name: 'Demo Data', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            )
        },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage system configuration and preferences</p>
                </div>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
                >
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
                                <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{tab.icon}</span>
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
                                        name="primaryColor"
                                        value={settings.primaryColor}
                                        onChange={handleChange}
                                        className="h-10 w-16 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        name="primaryColor"
                                        value={settings.primaryColor}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Secondary Color</label>
                                <div className="flex space-x-3">
                                    <input
                                        type="color"
                                        name="secondaryColor"
                                        value={settings.secondaryColor}
                                        onChange={handleChange}
                                        className="h-10 w-16 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        name="secondaryColor"
                                        value={settings.secondaryColor}
                                        onChange={handleChange}
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
                                    name="companyName"
                                    value={settings.companyName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tagline</label>
                                <input
                                    type="text"
                                    name="tagline"
                                    value={settings.tagline}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Support Email</label>
                                <input
                                    type="email"
                                    name="supportEmail"
                                    value={settings.supportEmail}
                                    onChange={handleChange}
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
                                    <input
                                        type="checkbox"
                                        name="maintenanceMode"
                                        checked={settings.maintenanceMode}
                                        onChange={handleChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-slate-900"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">Auto-Update Exchange Rates</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Automatically fetch latest rates every 30 minutes</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="autoUpdateRates"
                                        checked={settings.autoUpdateRates}
                                        onChange={handleChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-slate-900"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Demo Data Tab */}
            {activeTab === 'demo_data' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Demo Data Generator</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Populate your database with sample data for testing and demonstrations.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                                    Warning: This will add data to your live database. Use only for development or testing purposes.
                                </p>
                            </div>

                            <button
                                onClick={handleGenerateDemoData}
                                disabled={isGenerating}
                                className={`w-full py-3 rounded-lg font-bold text-white transition-all ${isGenerating
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
                                    }`}
                            >
                                {isGenerating ? (
                                    <span className="flex items-center justify-center space-x-2">
                                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Generating Data...</span>
                                    </span>
                                ) : (
                                    <span>Generate Sample Data (Remitters, Beneficiaries, Transfers)</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
