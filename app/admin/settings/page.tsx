'use client';

import React, { useEffect, useState } from 'react';
import { applyUiSettings, getStoredUiSettings, type UiSettings } from '@/app/lib/uiPreferences';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../components/ConfirmModal';
import {
    Check,
    Loader2,
    Save,
    Settings,
} from 'lucide-react';

const defaultFooterText = '© 2026 LinkForex. Protected by 256-bit encryption.';

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'danger' | 'success';
        isAlert: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isAlert: true
    });
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

        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.SETTINGS, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_name: generalSettings.companyName.trim()
                }),
            });
            if (!res.ok) {
                setToast({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to save general settings to backend.',
                    type: 'danger',
                    isAlert: true
                });
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Failed to save settings:', err);
            setToast({
                isOpen: true,
                title: 'Error',
                message: 'Network error saving settings.',
                type: 'danger',
                isAlert: true
            });
            setLoading(false);
            return;
        }

        localStorage.setItem('generalSettings', JSON.stringify({ footerText: generalSettings.footerText }));
        localStorage.setItem('uiSettings', JSON.stringify(uiSettings));
        applyUiSettings(uiSettings);

        setLoading(false);
        setToast({
            isOpen: true,
            title: 'Success',
            message: 'Settings saved successfully.',
            type: 'success',
            isAlert: true
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage system configuration and preferences.</p>
            </div>

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

            <ConfirmModal
                isOpen={toast.isOpen}
                onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setToast(prev => ({ ...prev, isOpen: false }))}
                title={toast.title}
                message={toast.message}
                type={toast.type}
                isAlert={toast.isAlert}
            />
        </div>
    );
}
