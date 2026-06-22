'use client';

import React, { useEffect, useState } from 'react';
import { applyUiSettings, getStoredUiSettings, type UiSettings } from '@/app/lib/uiPreferences';
import { ENDPOINTS } from '@/app/lib/api';
import {
    Check,
    Loader2,
    Save,
    Settings,
} from 'lucide-react';

type MessageState = {
    text: string;
    tone: 'success' | 'error';
};

const defaultFooterText = '© 2026 LinkForex. Protected by 256-bit encryption.';

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<MessageState | null>(null);
    const [generalSettings, setGeneralSettings] = useState({
        footerText: defaultFooterText,
        companyName: 'Link Forex Ltd',
    });
    const [uiSettings, setUiSettings] = useState<UiSettings>({
        tableFontSizePx: 14,
        toastMessageTimerMs: 3000,
        rowsPerPage: 10,
    });

    useEffect(() => {
        let initialFooter = defaultFooterText;
        const savedGeneral = localStorage.getItem('generalSettings');
        if (savedGeneral) {
            try {
                const parsed = JSON.parse(savedGeneral);
                if (typeof parsed?.footerText === 'string' && parsed.footerText.trim()) {
                    initialFooter = parsed.footerText.trim();
                }
            } catch {
                // keep default
            }
        }

        const fetchBackendSettings = async () => {
            try {
                const res = await fetch(ENDPOINTS.MOBILE_ADMIN.SETTINGS);
                if (res.ok) {
                    const data = await res.json();
                    if (data && typeof data.company_name === 'string') {
                        setGeneralSettings({
                            footerText: initialFooter,
                            companyName: data.company_name.trim() || 'Link Forex Ltd',
                        });
                        return;
                    }
                }
            } catch (err) {
                console.error('Failed to load company name:', err);
            }
            setGeneralSettings({
                footerText: initialFooter,
                companyName: 'Link Forex Ltd',
            });
        };
        fetchBackendSettings();

        const loadedUiSettings = getStoredUiSettings();
        setUiSettings(loadedUiSettings);
        applyUiSettings(loadedUiSettings);
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.SETTINGS, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_name: generalSettings.companyName.trim()
                }),
            });
            if (!res.ok) {
                setMessage({ text: 'Failed to save general settings to backend.', tone: 'error' });
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Failed to save settings:', err);
            setMessage({ text: 'Network error saving settings.', tone: 'error' });
            setLoading(false);
            return;
        }

        localStorage.setItem('generalSettings', JSON.stringify({ footerText: generalSettings.footerText }));
        localStorage.setItem('uiSettings', JSON.stringify(uiSettings));
        applyUiSettings(uiSettings);

        setLoading(false);
        setMessage({ text: 'Settings saved successfully.', tone: 'success' });
        window.setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage system configuration and preferences.</p>
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

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="card-glass p-8 relative overflow-hidden space-y-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="max-w-2xl space-y-6">
                    <div className="flex items-center space-x-4 mb-8">
                        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                            <Settings className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">General Settings</h2>
                            <p className="text-sm text-slate-500 font-medium">System configuration and report metadata settings.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Company Name</label>
                        <input
                            type="text"
                            value={generalSettings.companyName}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, companyName: e.target.value }))}
                            className="input-glass w-full"
                            placeholder="Link Forex Ltd"
                        />
                        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">This name is used in the footer section of generated PDF reports.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Login Footer Text</label>
                        <input
                            type="text"
                            value={generalSettings.footerText}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, footerText: e.target.value }))}
                            className="input-glass w-full"
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{loading ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
