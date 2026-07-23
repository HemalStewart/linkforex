'use client';

import React, { useEffect, useState } from 'react';
import { applyUiSettings, getStoredUiSettings, type UiSettings } from '@/app/lib/uiPreferences';
import { ENDPOINTS } from '@/app/lib/api';
import { showToast } from '@/app/lib/toast';
import {
    Check,
    Loader2,
    Save,
    Settings,
    ChevronDown,
} from 'lucide-react';
import { usePagePermissions } from '@/app/lib/permissions';

const defaultFooterText = '© 2026 LinkForex. Protected by 256-bit encryption.';

export default function SettingsPage() {
    const { canEdit } = usePagePermissions('SETTINGS');
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<{ id: number; name: string; code: string }[]>([]);
    const [generalSettings, setGeneralSettings] = useState({
        footerText: defaultFooterText,
        companyName: 'Link Forex Ltd',
        defaultBranch: '',
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

        const fetchBranches = async () => {
            try {
                const res = await fetch(ENDPOINTS.BRANCHES.LIST);
                if (res.ok) {
                    const data = await res.json();
                    setBranches(data || []);
                }
            } catch (err) {
                console.error('Failed to load branches:', err);
            }
        };

        const fetchBackendSettings = async () => {
            try {
                const res = await fetch(ENDPOINTS.MOBILE_ADMIN.SETTINGS);
                if (res.ok) {
                    const data = await res.json();
                    setGeneralSettings({
                        footerText: initialFooter,
                        companyName: (data && typeof data.company_name === 'string') ? data.company_name.trim() : 'Link Forex Ltd',
                        defaultBranch: (data && typeof data.default_branch === 'string') ? data.default_branch.trim() : '',
                    });
                    return;
                }
            } catch (err) {
                console.error('Failed to load settings from backend:', err);
            }
            setGeneralSettings({
                footerText: initialFooter,
                companyName: 'Link Forex Ltd',
                defaultBranch: '',
            });
        };

        fetchBranches();
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
                    company_name: generalSettings.companyName.trim(),
                    default_branch: generalSettings.defaultBranch.trim()
                }),
            });
            if (!res.ok) {
                showToast('Error', 'Failed to save general settings to backend.', 'danger');
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Failed to save settings:', err);
            showToast('Error', 'Network error saving settings.', 'danger');
            setLoading(false);
            return;
        }

        localStorage.setItem('generalSettings', JSON.stringify({ footerText: generalSettings.footerText }));
        localStorage.setItem('uiSettings', JSON.stringify(uiSettings));
        applyUiSettings(uiSettings);

        setLoading(false);
        showToast('Success', 'Settings saved successfully.', 'success');
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
                            disabled={!canEdit}
                        />
                        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">This name is used in the footer section of generated PDF reports.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Default Branch for Mobile Users</label>
                        <div className="relative">
                            <select
                                value={generalSettings.defaultBranch}
                                onChange={(e) => setGeneralSettings(prev => ({ ...prev, defaultBranch: e.target.value }))}
                                className="input-glass w-full pr-10 appearance-none cursor-pointer text-sm py-2.5 text-slate-900 dark:text-white"
                                disabled={!canEdit}
                            >
                                <option value="" className="dark:bg-slate-800 dark:text-white bg-white text-slate-900">Select a Branch</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.code} className="dark:bg-slate-800 dark:text-white bg-white text-slate-900">
                                        {b.name} ({b.code})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none" />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Newly registered mobile app users will be assigned to this branch by default.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Login Footer Text</label>
                        <input
                            type="text"
                            value={generalSettings.footerText}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, footerText: e.target.value }))}
                            className="input-glass w-full"
                            disabled={!canEdit}
                        />
                    </div>
                </div>

                {canEdit && (
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
                )}
            </form>
        </div>
    );
}
