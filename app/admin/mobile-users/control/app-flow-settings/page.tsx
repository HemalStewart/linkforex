'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Bell, Mail, Megaphone, Newspaper, RefreshCcw, Save, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import { API_BASE_URL, ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../../components/ConfirmModal';
import { defaultSettings, type SettingsData, yesNoKeys } from '../_shared';

export default function MobileAppFlowSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settings, setSettings] = useState<SettingsData>(defaultSettings);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'danger' | 'success',
    });

    const showModal = (title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info') => {
        setConfirmModal({ isOpen: true, title, message, type });
    };

    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.SETTINGS);
            if (!res.ok) return;
            const data = await res.json();
            const next: SettingsData = { ...defaultSettings };
            yesNoKeys.forEach((key) => {
                const value = String(data?.[key] || next[key]).toLowerCase();
                next[key] = value === 'yes' ? 'yes' : 'no';
            });
            const provider = String(data?.liveness_provider || next.liveness_provider).toLowerCase();
            next.liveness_provider = provider === 'none' ? 'none' : 'veriff';
            next.veriff_base_url = String(data?.veriff_base_url || next.veriff_base_url || '').trim();
            next.veriff_aml_base_url = String(data?.veriff_aml_base_url || next.veriff_aml_base_url || next.veriff_base_url || '').trim();
            next.veriff_callback_url = String(data?.veriff_callback_url || next.veriff_callback_url || '').trim();
            next.blacklisted_countries = Array.isArray(data?.blacklisted_countries)
                ? data.blacklisted_countries.join('\n')
                : String(data?.blacklisted_countries || '').trim();
            next.password_rotation_days = Number(data?.password_rotation_days || next.password_rotation_days || 180);
            next.support_email = String(data?.support_email || '').trim();
            next.trust_wallet_label = String(data?.trust_wallet_label || next.trust_wallet_label || '').trim();
            next.trust_wallet_network = String(data?.trust_wallet_network || next.trust_wallet_network || '').trim();
            next.trust_wallet_address = String(data?.trust_wallet_address || next.trust_wallet_address || '').trim();
            next.trust_wallet_instructions = String(data?.trust_wallet_instructions || next.trust_wallet_instructions || '').trim();
            next.exchange_rate_push_title = String(data?.exchange_rate_push_title || next.exchange_rate_push_title || '').trim();
            next.exchange_rate_push_body = String(data?.exchange_rate_push_body || next.exchange_rate_push_body || '').trim();
            next.veriff_api_key = '';
            next.veriff_hmac_secret = '';
            next.veriff_aml_api_key = '';
            next.veriff_aml_hmac_secret = '';
            next.veriff_configured = Boolean(data?.veriff_configured);
            next.veriff_aml_configured = Boolean(data?.veriff_aml_configured);
            setSettings(next);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const setToggle = (key: keyof SettingsData, value: boolean) => {
        setSettings((prev) => {
            const next = { ...prev, [key]: value ? 'yes' : 'no' };
            
            // Dependency 1: If Lock Profile is disabled, Allow Edit must be disabled
            if (key === 'lock_profile_after_verification' && !value) {
                next['allow_profile_edit_after_lock'] = 'no';
            }
            
            // Dependency 2: If Push Notifications is disabled, Send Exchange Rate Push must be disabled
            if (key === 'enable_push_notifications' && !value) {
                next['send_exchange_rate_push'] = 'no';
            }

            // Dependency 3: If Allow Edit is enabled, Lock Profile must be enabled
            if (key === 'allow_profile_edit_after_lock' && value) {
                next['lock_profile_after_verification'] = 'yes';
            }

            // Dependency 4: If Send Exchange Rate Push is enabled, Push Notifications must be enabled
            if (key === 'send_exchange_rate_push' && value) {
                next['enable_push_notifications'] = 'yes';
            }
            
            return next;
        });
    };

    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.SETTINGS, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!res.ok) {
                showModal('Save Failed', 'Could not save mobile settings.', 'danger');
                return;
            }
            await loadSettings();
            showModal('Saved', 'Mobile settings updated successfully.', 'success');
        } catch {
            showModal('Save Failed', 'Could not save mobile settings.', 'danger');
        } finally {
            setSavingSettings(false);
        }
    };

    const settingsRows = useMemo(() => ([
        { 
            key: 'require_email_otp', 
            label: 'Require Email OTP', 
            icon: <Mail className="h-5 w-5" />,
            description: 'Enforces verification of user email addresses via a 6-digit OTP code challenge during registration.'
        },
        { 
            key: 'require_mobile_otp', 
            label: 'Require Mobile OTP', 
            icon: <Smartphone className="h-5 w-5" />,
            description: 'Enforces verification of user phone numbers via an SMS verification challenge before allowing transfers.'
        },
        { 
            key: 'enable_liveness_check', 
            label: 'Enable Liveness Check', 
            icon: <ShieldCheck className="h-5 w-5" />,
            description: 'Automates customer identity validation using liveness checks and document verification via Veriff.'
        },
        { 
            key: 'enable_sanction_screening', 
            label: 'Enable Sanction Screening', 
            icon: <ShieldAlert className="h-5 w-5" />,
            description: 'Automatically screens newly registered remitters and beneficiaries against PEP/Sanction blacklists.'
        },
        { 
            key: 'lock_profile_after_verification', 
            label: 'Lock Profile After Verification', 
            icon: <BadgeCheck className="h-5 w-5" />,
            description: 'Locks remitter profile edits once identity is verified. If unticked, Allow Edit After Lock is automatically unticked and disabled.'
        },
        { 
            key: 'allow_profile_edit_after_lock', 
            label: 'Allow Edit After Lock', 
            icon: <RefreshCcw className="h-5 w-5" />,
            description: 'Allows remitters to edit their profiles even after verification locks them. (Requires Lock Profile After Verification).'
        },
        { 
            key: 'enable_google_sign_in', 
            label: 'Enable Google Sign-In', 
            icon: <Smartphone className="h-5 w-5" />,
            description: 'Allows users to sign up and authenticate quickly using Google Social sign-in.'
        },
        { 
            key: 'enable_apple_sign_in', 
            label: 'Enable Apple Sign-In', 
            icon: <Smartphone className="h-5 w-5" />,
            description: 'Allows users to sign up and authenticate quickly using Apple Social sign-in.'
        },
        { 
            key: 'enable_push_notifications', 
            label: 'Enable Push Notifications', 
            icon: <Bell className="h-5 w-5" />,
            description: 'Allows sending system alerts, status messages, and rate push updates. If unticked, Send Exchange Rate Push is automatically unticked and disabled.'
        },
        { 
            key: 'enable_email_notifications', 
            label: 'Enable Email Notifications', 
            icon: <Mail className="h-5 w-5" />,
            description: 'Allows sending automated registration receipts, transaction summaries, and system messages via email.'
        },
        { 
            key: 'enable_secure_message', 
            label: 'Enable Secure Message', 
            icon: <ShieldCheck className="h-5 w-5" />,
            description: 'Enables mobile support desk chat and secure messaging between customers and staff members.'
        },
        { 
            key: 'enable_in_app_ads', 
            label: 'Enable In-App Ads', 
            icon: <Newspaper className="h-5 w-5" />,
            description: 'Displays custom banner carousel ads and onboarding slides inside the mobile app.'
        },
        { 
            key: 'send_exchange_rate_push', 
            label: 'Send Exchange Rate Push', 
            icon: <Megaphone className="h-5 w-5" />,
            description: 'Sends automated real-time push alerts to customers on currency digital rate changes. (Requires Push Notifications).'
        },
        { 
            key: 'restrict_blacklisted_countries', 
            label: 'Block Blacklisted Countries', 
            icon: <ShieldAlert className="h-5 w-5" />,
            description: 'Rejects traffic and blocks account registrations originating from blacklisted countries.'
        },
        { 
            key: 'require_new_device_verification', 
            label: 'Require New Device Verification', 
            icon: <Smartphone className="h-5 w-5" />,
            description: 'Requires a secondary confirmation code when users attempt logging in from unrecognized mobile devices.'
        },
    ]), []);

    const veriffWebhookUrl = useMemo(() => {
        const base = API_BASE_URL.replace(/\/+$/, '');
        if (/^https?:\/\//i.test(base)) {
            return `${base}/webhooks/veriff`;
        }
        return 'https://YOUR_BACKEND_DOMAIN/api/webhooks/veriff';
    }, []);

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert
                confirmText="OK"
            />

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">App Flow Settings</h1>
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                        Configure onboarding checks, sign-in options, and liveness provider.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadSettings} className="glass-effect rounded-full px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                        Refresh
                    </button>
                    <button onClick={saveSettings} className="btn-primary flex items-center gap-2 rounded-full px-4 py-2 text-sm" disabled={savingSettings || loading}>
                        <Save className="h-4 w-4" />
                        {savingSettings ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="card-glass p-6">
                <div className="space-y-4">
                    {settingsRows.map((row) => {
                        const key = row.key as keyof SettingsData;
                        const checked = settings[key] === 'yes';
                        
                        // Disable if parent dependencies are unticked
                        const isDisabled = key === 'allow_profile_edit_after_lock' && settings['lock_profile_after_verification'] !== 'yes'
                            || key === 'send_exchange_rate_push' && settings['enable_push_notifications'] !== 'yes';

                        return (
                            <div 
                                key={key} 
                                className={`flex items-start justify-between rounded-3xl border p-5 transition-all duration-200 ${
                                    isDisabled 
                                        ? 'border-slate-100 bg-slate-50/30 opacity-60 dark:border-slate-800/40 dark:bg-slate-950/10'
                                        : 'border-slate-200/70 bg-white/40 hover:bg-white/60 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:bg-slate-900/50'
                                }`}
                            >
                                <div className="flex gap-3.5 pr-4">
                                    <div className={`mt-0.5 rounded-xl p-2.5 ${isDisabled ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' : 'bg-teal-50 text-teal-500 dark:bg-teal-950/40 dark:text-teal-400'}`}>
                                        {row.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{row.label}</div>
                                        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 leading-relaxed max-w-2xl">{row.description}</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isDisabled}
                                    onChange={(e) => setToggle(key, e.target.checked)}
                                    className="h-5 w-5 mt-1 cursor-pointer rounded border-slate-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/40 p-4 dark:border-slate-700 dark:bg-slate-900/30">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Security Policy</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Control access restrictions, device confirmation, and password rotation for mobile users.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">
                            Support Email
                            <input
                                value={settings.support_email}
                                onChange={(e) => setSettings((prev) => ({ ...prev, support_email: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder="support@linkforex.com"
                            />
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Password Rotation Days
                            <input
                                type="number"
                                min={30}
                                max={365}
                                value={settings.password_rotation_days}
                                onChange={(e) => setSettings((prev) => ({ ...prev, password_rotation_days: Number(e.target.value || 180) }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                            />
                        </label>

                        <div className="rounded-2xl border border-slate-200/70 bg-white/40 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
                            Users are prompted to update their password after the configured number of days. New-device verification uses an email code challenge.
                        </div>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">
                            Blacklisted Countries
                            <textarea
                                value={settings.blacklisted_countries}
                                onChange={(e) => setSettings((prev) => ({ ...prev, blacklisted_countries: e.target.value }))}
                                className="input-glass mt-1.5 min-h-28 w-full py-2.5 text-sm normal-case"
                                placeholder={'Iran\nNorth Korea\nAFG'}
                            />
                        </label>
                    </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/40 p-4 dark:border-slate-700 dark:bg-slate-900/30">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Trust Wallet Funding</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Mobile transfers use one fixed trust-wallet destination. Users submit transfer requests, fund this wallet, and staff reconcile and settle manually.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Wallet Label
                            <input
                                value={settings.trust_wallet_label}
                                onChange={(e) => setSettings((prev) => ({ ...prev, trust_wallet_label: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder="LinkForex Trust Wallet"
                            />
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Wallet Network
                            <input
                                value={settings.trust_wallet_network}
                                onChange={(e) => setSettings((prev) => ({ ...prev, trust_wallet_network: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder="TRON (TRC20)"
                            />
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">
                            Wallet Address
                            <textarea
                                value={settings.trust_wallet_address}
                                onChange={(e) => setSettings((prev) => ({ ...prev, trust_wallet_address: e.target.value }))}
                                className="input-glass mt-1.5 min-h-24 w-full py-2.5 text-sm normal-case"
                                placeholder="Paste the fixed wallet address used for all mobile transfers"
                            />
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">
                            Funding Instructions
                            <textarea
                                value={settings.trust_wallet_instructions}
                                onChange={(e) => setSettings((prev) => ({ ...prev, trust_wallet_instructions: e.target.value }))}
                                className="input-glass mt-1.5 min-h-28 w-full py-2.5 text-sm normal-case"
                                placeholder="Example: Send the exact amount to the wallet address, keep your transaction hash, and tap 'I have sent funds' in the app."
                            />
                        </label>
                    </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/40 p-4 dark:border-slate-700 dark:bg-slate-900/30">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Exchange Rate Push Template</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Customize the title and message used when customer digital rates change. Supported placeholders: <span className="font-semibold">{'{base}'}</span>, <span className="font-semibold">{'{currency}'}</span>, <span className="font-semibold">{'{pair}'}</span>, <span className="font-semibold">{'{rate}'}</span>.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Notification Title
                            <input
                                value={settings.exchange_rate_push_title}
                                onChange={(e) => setSettings((prev) => ({ ...prev, exchange_rate_push_title: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder="Exchange rates updated"
                            />
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">
                            Notification Body
                            <textarea
                                value={settings.exchange_rate_push_body}
                                onChange={(e) => setSettings((prev) => ({ ...prev, exchange_rate_push_body: e.target.value }))}
                                className="input-glass mt-1.5 min-h-24 w-full py-2.5 text-sm normal-case"
                                placeholder="New {base} to {currency} customer digital rate: {rate}"
                            />
                        </label>
                    </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/40 p-4 dark:border-slate-700 dark:bg-slate-900/30">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Veriff Integration</h3>
                        <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${settings.veriff_configured ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {settings.veriff_configured ? 'KYC Ready' : 'KYC Missing'}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${settings.veriff_aml_configured ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                {settings.veriff_aml_configured ? 'AML Ready' : 'AML Fallback'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">
                            Provider
                            <select
                                value={settings.liveness_provider}
                                onChange={(e) => setSettings((prev) => ({ ...prev, liveness_provider: e.target.value as 'none' | 'veriff' }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                            >
                                <option value="veriff">Veriff</option>
                                <option value="none">Disabled</option>
                            </select>
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">
                            Veriff Base URL
                            <input
                                value={settings.veriff_base_url}
                                onChange={(e) => setSettings((prev) => ({ ...prev, veriff_base_url: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder="https://stationapi.veriff.com"
                            />
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">
                            App Return URL
                            <input
                                value={settings.veriff_callback_url}
                                onChange={(e) => setSettings((prev) => ({ ...prev, veriff_callback_url: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder="https://linkforex.vercel.app/api/veriff-return"
                            />
                        </label>

                        <div className="md:col-span-2 rounded-2xl border border-slate-200/70 bg-white/50 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
                            Configure this URL in Veriff Station as the decision webhook:
                            <div className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-200">{veriffWebhookUrl}</div>
                            Use the same webhook URL for decision and watchlist-screening webhooks. Veriff requires an HTTPS return URL. This page redirects the user back to the LinkForex mobile app.
                        </div>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            API Key
                            <input
                                type="password"
                                value={settings.veriff_api_key}
                                onChange={(e) => setSettings((prev) => ({ ...prev, veriff_api_key: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder={settings.veriff_configured ? 'Leave blank to keep current key' : 'Enter Veriff API key'}
                            />
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            HMAC Secret
                            <input
                                type="password"
                                value={settings.veriff_hmac_secret}
                                onChange={(e) => setSettings((prev) => ({ ...prev, veriff_hmac_secret: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder={settings.veriff_configured ? 'Leave blank to keep current secret' : 'Enter Veriff HMAC secret'}
                            />
                        </label>

                        <div className="md:col-span-2 mt-2 rounded-2xl border border-cyan-200/70 bg-cyan-50/60 p-3 text-xs text-cyan-900 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-100">
                            Beneficiary AML screening can use a separate Veriff AML integration. If left blank, beneficiary screening falls back to the main Veriff KYC credentials above.
                        </div>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 md:col-span-2">
                            Veriff AML Base URL
                            <input
                                value={settings.veriff_aml_base_url}
                                onChange={(e) => setSettings((prev) => ({ ...prev, veriff_aml_base_url: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder="https://stationapi.veriff.com"
                            />
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            AML API Key
                            <input
                                type="password"
                                value={settings.veriff_aml_api_key}
                                onChange={(e) => setSettings((prev) => ({ ...prev, veriff_aml_api_key: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder={settings.veriff_aml_configured ? 'Leave blank to keep current AML key' : 'Enter Veriff AML API key'}
                            />
                        </label>

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            AML HMAC Secret
                            <input
                                type="password"
                                value={settings.veriff_aml_hmac_secret}
                                onChange={(e) => setSettings((prev) => ({ ...prev, veriff_aml_hmac_secret: e.target.value }))}
                                className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                placeholder={settings.veriff_aml_configured ? 'Leave blank to keep current AML secret' : 'Enter Veriff AML HMAC secret'}
                            />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
