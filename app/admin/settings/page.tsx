'use client';

import React, { useState, useEffect } from 'react';
import { Settings, User, Lock, Bell, Database, Save, Loader2, Check, Shield, Mail, Phone } from 'lucide-react';
import { applyUiSettings, getStoredUiSettings, type TableFontSizePreset, type ThemeColorPreset } from '@/app/lib/uiPreferences';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [generalSettings, setGeneralSettings] = useState({
        siteName: 'LinkForex Admin',
        supportEmail: 'support@linkforex.com',
        maintenanceMode: false,
        footerText: '© 2026 LinkForex. Protected by 256-bit encryption.',
    });

    const [profileSettings, setProfileSettings] = useState({
        username: 'Admin',
        email: 'admin@linkforex.com',
        phone: '+44 7700 900000',
        language: 'en'
    });

    const [securitySettings, setSecuritySettings] = useState({
        twoFactor: true,
        sessionTimeout: '30',
        passwordExpiry: '90'
    });
    const [uiSettings, setUiSettings] = useState<{
        themeColorPreset: ThemeColorPreset;
        tableFontSize: TableFontSizePreset;
    }>({
        themeColorPreset: 'teal',
        tableFontSize: 'medium',
    });

    useEffect(() => {
        // Load settings from local storage or API
        const savedGeneral = localStorage.getItem('generalSettings');
        if (savedGeneral) setGeneralSettings(JSON.parse(savedGeneral));

        const savedProfile = localStorage.getItem('profileSettings');
        if (savedProfile) setProfileSettings(JSON.parse(savedProfile));

        const savedSecurity = localStorage.getItem('securitySettings');
        if (savedSecurity) setSecuritySettings(JSON.parse(savedSecurity));

        const loadedUiSettings = getStoredUiSettings();
        setUiSettings(loadedUiSettings);
        applyUiSettings(loadedUiSettings);
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setMessage('');

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Save to local storage for demo purposes
        localStorage.setItem('generalSettings', JSON.stringify(generalSettings));
        localStorage.setItem('profileSettings', JSON.stringify(profileSettings));
        localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
        localStorage.setItem('uiSettings', JSON.stringify(uiSettings));
        applyUiSettings(uiSettings);

        setLoading(false);
        setMessage('Settings saved successfully!');

        setTimeout(() => setMessage(''), 3000);
    };

    const handleUiChange = (next: typeof uiSettings) => {
        setUiSettings(next);
        applyUiSettings(next);
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'api', label: 'API Keys', icon: Database },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage your workspace preferences</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
            </div>

            {message && (
                <div className="p-4 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center shadow-lg shadow-teal-500/10 animate-fade-in-down">
                    <Check className="w-5 h-5 mr-2" />
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1">
                    <div className="card-glass p-4 sticky top-8">
                        <nav className="space-y-2">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center space-x-3 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm ${isActive
                                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'general' && (
                        <div className="card-glass p-8 animate-scale-in">
                            <div className="flex items-center space-x-4 mb-8">
                                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                                    <Settings className="w-6 h-6 text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">General Settings</h2>
                                    <p className="text-sm text-slate-500 font-medium">Configure basic site information</p>
                                </div>
                            </div>
                            <div className="space-y-6 max-w-2xl">
                                <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Maintenance Mode</h3>
                                        <p className="text-sm text-slate-500 mt-1">Temporarily disable access to the site</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={generalSettings.maintenanceMode}
                                            onChange={e => setGeneralSettings({ ...generalSettings, maintenanceMode: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Site Name</label>
                                    <input
                                        type="text"
                                        value={generalSettings.siteName}
                                        onChange={e => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                                        className="input-glass w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Support Email</label>
                                    <div className="relative input-icon">
                                        <span className="input-icon-left">
                                            <Mail className="w-5 h-5" />
                                        </span>
                                        <input
                                            type="email"
                                            value={generalSettings.supportEmail}
                                            onChange={e => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                                            className="input-glass w-full"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Login Footer Text</label>
                                    <input
                                        type="text"
                                        value={generalSettings.footerText}
                                        onChange={e => setGeneralSettings({ ...generalSettings, footerText: e.target.value })}
                                        className="input-glass w-full"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Theme Color</label>
                                        <select
                                            value={uiSettings.themeColorPreset}
                                            onChange={e => handleUiChange({ ...uiSettings, themeColorPreset: e.target.value as ThemeColorPreset })}
                                            className="input-glass w-full"
                                        >
                                            <option value="teal">Teal (Default)</option>
                                            <option value="blue">Blue</option>
                                            <option value="emerald">Emerald</option>
                                            <option value="slate">Slate</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Table Font Size</label>
                                        <select
                                            value={uiSettings.tableFontSize}
                                            onChange={e => handleUiChange({ ...uiSettings, tableFontSize: e.target.value as TableFontSizePreset })}
                                            className="input-glass w-full"
                                        >
                                            <option value="small">Small</option>
                                            <option value="medium">Medium</option>
                                            <option value="large">Large</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="card-glass p-8 animate-scale-in">
                            <div className="flex items-center space-x-4 mb-8">
                                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                                    <User className="w-6 h-6 text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Profile</h2>
                                    <p className="text-sm text-slate-500 font-medium">Manage your personal information</p>
                                </div>
                            </div>
                            <div className="space-y-6 max-w-2xl">
                                <div className="flex items-center space-x-6 mb-8">
                                    <div className="avatar-circle avatar-circle-lg">
                                        {profileSettings.username.charAt(0)}
                                    </div>
                                    <button className="px-6 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                        Change Avatar
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Username</label>
                                        <div className="relative input-icon">
                                            <span className="input-icon-left">
                                                <User className="w-5 h-5" />
                                            </span>
                                            <input
                                                type="text"
                                                value={profileSettings.username}
                                                onChange={e => setProfileSettings({ ...profileSettings, username: e.target.value })}
                                                className="input-glass w-full"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phone</label>
                                        <div className="relative input-icon">
                                            <span className="input-icon-left">
                                                <Phone className="w-5 h-5" />
                                            </span>
                                            <input
                                                type="text"
                                                value={profileSettings.phone}
                                                onChange={e => setProfileSettings({ ...profileSettings, phone: e.target.value })}
                                                className="input-glass w-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                                    <div className="relative input-icon">
                                        <span className="input-icon-left">
                                            <Mail className="w-5 h-5" />
                                        </span>
                                        <input
                                            type="email"
                                            value={profileSettings.email}
                                            onChange={e => setProfileSettings({ ...profileSettings, email: e.target.value })}
                                            className="input-glass w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="card-glass p-8 animate-scale-in">
                            <div className="flex items-center space-x-4 mb-8">
                                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security Settings</h2>
                                    <p className="text-sm text-slate-500 font-medium">Protect your account and data</p>
                                </div>
                            </div>
                            <div className="space-y-6 max-w-2xl">
                                <div className="p-6 rounded-3xl bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                                <Lock className="w-5 h-5 text-teal-600" />
                                            </div>
                                            <h3 className="font-bold text-teal-900 dark:text-teal-100">Two-Factor Authentication</h3>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={securitySettings.twoFactor}
                                                onChange={e => setSecuritySettings({ ...securitySettings, twoFactor: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                                        </label>
                                    </div>
                                    <p className="text-sm text-teal-800/70 dark:text-teal-200/70 leading-relaxed">
                                        Add an extra layer of security to your account by requiring a code from your mobile device to log in.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Session Timeout (minutes)</label>
                                        <input
                                            type="number"
                                            value={securitySettings.sessionTimeout}
                                            onChange={e => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                                            className="input-glass w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Password Expiry (days)</label>
                                        <input
                                            type="number"
                                            value={securitySettings.passwordExpiry}
                                            onChange={e => setSecuritySettings({ ...securitySettings, passwordExpiry: e.target.value })}
                                            className="input-glass w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
