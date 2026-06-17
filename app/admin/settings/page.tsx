'use client';

import React, { useEffect, useState } from 'react';
import { applyUiSettings, getStoredUiSettings, type UiSettings } from '@/app/lib/uiPreferences';
import {
    Check,
    Loader2,
    Lock,
    Save,
    Settings,
    Shield,
} from 'lucide-react';

type MessageState = {
    text: string;
    tone: 'success' | 'error';
};

const defaultFooterText = '© 2026 LinkForex. Protected by 256-bit encryption.';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<MessageState | null>(null);
    const [generalSettings, setGeneralSettings] = useState({
        footerText: defaultFooterText,
    });
    const [securitySettings, setSecuritySettings] = useState({
        twoFactor: false,
    });
    const [uiSettings, setUiSettings] = useState<UiSettings>({
        tableFontSizePx: 14,
        toastMessageTimerMs: 3000,
        rowsPerPage: 10,
    });

    useEffect(() => {
        const savedGeneral = localStorage.getItem('generalSettings');
        if (savedGeneral) {
            try {
                const parsed = JSON.parse(savedGeneral);
                setGeneralSettings({
                    footerText: typeof parsed?.footerText === 'string' && parsed.footerText.trim()
                        ? parsed.footerText.trim()
                        : defaultFooterText,
                });
            } catch {
                setGeneralSettings({ footerText: defaultFooterText });
            }
        }

        const savedSecurity = localStorage.getItem('securitySettings');
        if (savedSecurity) {
            try {
                const parsed = JSON.parse(savedSecurity);
                setSecuritySettings({
                    twoFactor: false,
                });
            } catch {
                setSecuritySettings({ twoFactor: false });
            }
        }

        const loadedUiSettings = getStoredUiSettings();
        setUiSettings(loadedUiSettings);
        applyUiSettings(loadedUiSettings);
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);

        await new Promise((resolve) => setTimeout(resolve, 400));

        localStorage.setItem('generalSettings', JSON.stringify(generalSettings));
        localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
        localStorage.setItem('uiSettings', JSON.stringify(uiSettings));
        applyUiSettings(uiSettings);

        setLoading(false);
        setMessage({ text: 'Settings saved successfully.', tone: 'success' });
        window.setTimeout(() => setMessage(null), 3000);
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage system configuration and security preferences.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border flex items-center shadow-sm ${message.tone === 'success'
                    ? 'bg-teal-50 text-teal-700 border-teal-100'
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                    <Check className="w-5 h-5 mr-2 shrink-0" />
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                    <div className="card-glass p-4 sticky top-8">
                        <nav className="space-y-2">
                            {tabs.map((tab) => {
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

                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'general' && (
                        <div className="card-glass p-8 animate-scale-in">
                            <div className="flex items-center space-x-4 mb-8">
                                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                                    <Settings className="w-6 h-6 text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">General Settings</h2>
                                    <p className="text-sm text-slate-500 font-medium">Core site name and support email are managed elsewhere.</p>
                                </div>
                            </div>
                            <div className="space-y-6 max-w-2xl">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Login Footer Text</label>
                                    <input
                                        type="text"
                                        value={generalSettings.footerText}
                                        onChange={(e) => setGeneralSettings({ footerText: e.target.value })}
                                        className="input-glass w-full"
                                    />
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
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security Preferences</h2>
                                    <p className="text-sm text-slate-500 font-medium">Control account protection preferences.</p>
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
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSecuritySettings((prev) => ({
                                                    ...prev,
                                                    twoFactor: !prev.twoFactor,
                                                }))
                                            }
                                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ${securitySettings.twoFactor
                                                    ? 'bg-teal-600 shadow-md shadow-teal-500/30'
                                                    : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${securitySettings.twoFactor ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                    <p className="text-sm text-teal-800/70 dark:text-teal-200/70 leading-relaxed">
                                        Keep extra verification enabled for admin accounts.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card-glass p-6">
                        <div className="dialog-actions">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={loading}
                                className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
