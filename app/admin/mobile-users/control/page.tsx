'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import {
    RefreshCcw,
    Smartphone,
    ShieldCheck,
    ShieldAlert,
    BadgeCheck,
    Bell,
    Mail,
    Megaphone,
    Newspaper,
    Save,
    Send,
    Plus,
    Trash2,
    Search
} from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

type Overview = {
    mobile_users_total: number;
    kyc_pending: number;
    kyc_verified: number;
    inactive_users: number;
    campaigns_sent: number;
    active_ads: number;
};

type SettingsData = {
    require_email_otp: 'yes' | 'no';
    require_mobile_otp: 'yes' | 'no';
    enable_liveness_check: 'yes' | 'no';
    enable_sanction_screening: 'yes' | 'no';
    lock_profile_after_verification: 'yes' | 'no';
    allow_profile_edit_after_lock: 'yes' | 'no';
    enable_google_sign_in: 'yes' | 'no';
    enable_apple_sign_in: 'yes' | 'no';
    enable_in_app_ads: 'yes' | 'no';
    enable_push_notifications: 'yes' | 'no';
    enable_email_notifications: 'yes' | 'no';
    enable_secure_message: 'yes' | 'no';
    send_exchange_rate_push: 'yes' | 'no';
    liveness_provider: 'none' | 'veriff';
    veriff_base_url: string;
    veriff_api_key: string;
    veriff_hmac_secret: string;
    veriff_callback_url: string;
    veriff_configured?: boolean;
};

type QueueUser = {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
    kyc_status: string;
    country?: string;
    veriff_status?: string;
    veriff_decision?: string;
    veriff_checked_at?: string;
    created_at?: string;
    updated_at?: string;
};

type Campaign = {
    id: number;
    title: string;
    message: string;
    channel: 'push' | 'email' | 'both';
    target_audience: 'all' | 'kyc_pending' | 'kyc_verified' | 'inactive';
    include_exchange_rate: 'yes' | 'no';
    status: 'draft' | 'sent';
    sent_at?: string | null;
};

type MobileAd = {
    id: number;
    title: string;
    description?: string;
    image_url?: string;
    click_url?: string;
    priority: number;
    status: 'active' | 'inactive';
};

const yesNoKeys: Array<keyof SettingsData> = [
    'require_email_otp',
    'require_mobile_otp',
    'enable_liveness_check',
    'enable_sanction_screening',
    'lock_profile_after_verification',
    'allow_profile_edit_after_lock',
    'enable_google_sign_in',
    'enable_apple_sign_in',
    'enable_in_app_ads',
    'enable_push_notifications',
    'enable_email_notifications',
    'enable_secure_message',
    'send_exchange_rate_push',
];

const defaultSettings: SettingsData = {
    require_email_otp: 'yes',
    require_mobile_otp: 'yes',
    enable_liveness_check: 'yes',
    enable_sanction_screening: 'yes',
    lock_profile_after_verification: 'yes',
    allow_profile_edit_after_lock: 'no',
    enable_google_sign_in: 'yes',
    enable_apple_sign_in: 'yes',
    enable_in_app_ads: 'no',
    enable_push_notifications: 'yes',
    enable_email_notifications: 'yes',
    enable_secure_message: 'yes',
    send_exchange_rate_push: 'no',
    liveness_provider: 'veriff',
    veriff_base_url: 'https://stationapi.veriff.com',
    veriff_api_key: '',
    veriff_hmac_secret: '',
    veriff_callback_url: '',
    veriff_configured: false,
};

export default function MobileControlPage() {
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [creatingCampaign, setCreatingCampaign] = useState(false);
    const [creatingAd, setCreatingAd] = useState(false);
    const [initialLoaded, setInitialLoaded] = useState(false);

    const [overview, setOverview] = useState<Overview>({
        mobile_users_total: 0,
        kyc_pending: 0,
        kyc_verified: 0,
        inactive_users: 0,
        campaigns_sent: 0,
        active_ads: 0,
    });
    const [settings, setSettings] = useState<SettingsData>(defaultSettings);
    const [queue, setQueue] = useState<QueueUser[]>([]);
    const [queueStatus, setQueueStatus] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
    const [queueSearch, setQueueSearch] = useState('');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [ads, setAds] = useState<MobileAd[]>([]);

    const [campaignForm, setCampaignForm] = useState({
        title: '',
        message: '',
        channel: 'both' as 'push' | 'email' | 'both',
        target_audience: 'all' as 'all' | 'kyc_pending' | 'kyc_verified' | 'inactive',
        include_exchange_rate: false,
    });

    const [adForm, setAdForm] = useState({
        title: '',
        description: '',
        image_url: '',
        click_url: '',
        priority: 0,
        status: 'active' as 'active' | 'inactive',
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'danger' | 'success',
    });

    const showModal = useCallback((title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info') => {
        setConfirmModal({ isOpen: true, title, message, type });
    }, []);

    const loadOverview = useCallback(async () => {
        const res = await fetch(ENDPOINTS.MOBILE_ADMIN.OVERVIEW);
        if (!res.ok) return;
        const data = await res.json();
        setOverview((prev) => ({ ...prev, ...data }));
    }, []);

    const loadSettings = useCallback(async () => {
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
        next.veriff_callback_url = String(data?.veriff_callback_url || next.veriff_callback_url || '').trim();
        next.veriff_api_key = '';
        next.veriff_hmac_secret = '';
        next.veriff_configured = Boolean(data?.veriff_configured);
        setSettings(next);
    }, []);

    const loadQueue = useCallback(async (
        status: 'pending' | 'verified' | 'rejected' | 'all',
        search: string
    ) => {
        const query = new URLSearchParams();
        query.set('status', status);
        if (search.trim()) query.set('search', search.trim());
        const res = await fetch(`${ENDPOINTS.MOBILE_ADMIN.REVIEW_QUEUE}?${query.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setQueue(Array.isArray(data) ? data : []);
    }, []);

    const loadCampaigns = useCallback(async () => {
        const res = await fetch(ENDPOINTS.MOBILE_ADMIN.CAMPAIGNS);
        if (!res.ok) return;
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : []);
    }, []);

    const loadAds = useCallback(async () => {
        const res = await fetch(ENDPOINTS.MOBILE_ADMIN.ADS);
        if (!res.ok) return;
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
    }, []);

    const reloadAll = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadOverview(),
                loadSettings(),
                loadCampaigns(),
                loadAds(),
                loadQueue(queueStatus, queueSearch),
            ]);
        } finally {
            setLoading(false);
            setInitialLoaded(true);
        }
    }, [loadOverview, loadSettings, loadCampaigns, loadAds, loadQueue, queueStatus, queueSearch]);

    useEffect(() => {
        const boot = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    loadOverview(),
                    loadSettings(),
                    loadCampaigns(),
                    loadAds(),
                    loadQueue('pending', ''),
                ]);
            } finally {
                setLoading(false);
                setInitialLoaded(true);
            }
        };

        boot();
    }, [loadOverview, loadSettings, loadCampaigns, loadAds, loadQueue]);

    useEffect(() => {
        if (!initialLoaded) return;
        const t = window.setTimeout(() => {
            loadQueue(queueStatus, queueSearch);
        }, 300);
        return () => window.clearTimeout(t);
    }, [initialLoaded, queueStatus, queueSearch, loadQueue]);

    const setToggle = (key: keyof SettingsData, value: boolean) => {
        setSettings((prev) => ({ ...prev, [key]: value ? 'yes' : 'no' }));
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
            const data = await res.json();
            const next: SettingsData = { ...defaultSettings };
            yesNoKeys.forEach((key) => {
                const value = String(data?.[key] || next[key]).toLowerCase();
                next[key] = value === 'yes' ? 'yes' : 'no';
            });
            const provider = String(data?.liveness_provider || next.liveness_provider).toLowerCase();
            next.liveness_provider = provider === 'none' ? 'none' : 'veriff';
            next.veriff_base_url = String(data?.veriff_base_url || next.veriff_base_url || '').trim();
            next.veriff_callback_url = String(data?.veriff_callback_url || next.veriff_callback_url || '').trim();
            next.veriff_api_key = '';
            next.veriff_hmac_secret = '';
            next.veriff_configured = Boolean(data?.veriff_configured);
            setSettings(next);
            showModal('Saved', 'Mobile settings updated successfully.', 'success');
        } catch {
            showModal('Save Failed', 'Could not save mobile settings.', 'danger');
        } finally {
            setSavingSettings(false);
        }
    };

    const createCampaign = async (sendNow = false) => {
        if (!campaignForm.title.trim() || !campaignForm.message.trim()) {
            showModal('Missing Details', 'Campaign title and message are required.', 'warning');
            return;
        }
        setCreatingCampaign(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.CAMPAIGNS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: campaignForm.title.trim(),
                    message: campaignForm.message.trim(),
                    channel: campaignForm.channel,
                    target_audience: campaignForm.target_audience,
                    include_exchange_rate: campaignForm.include_exchange_rate ? 'yes' : 'no',
                    status: sendNow ? 'sent' : 'draft',
                }),
            });
            if (!res.ok) {
                showModal('Campaign Failed', 'Could not create campaign.', 'danger');
                return;
            }
            setCampaignForm({
                title: '',
                message: '',
                channel: 'both',
                target_audience: 'all',
                include_exchange_rate: false,
            });
            await Promise.all([loadCampaigns(), loadOverview()]);
            showModal('Success', sendNow ? 'Campaign sent.' : 'Campaign saved as draft.', 'success');
        } catch {
            showModal('Campaign Failed', 'Could not create campaign.', 'danger');
        } finally {
            setCreatingCampaign(false);
        }
    };

    const sendDraftCampaign = async (campaignId: number) => {
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.SEND_CAMPAIGN(campaignId), { method: 'POST' });
            if (!res.ok) {
                showModal('Send Failed', 'Could not send campaign.', 'danger');
                return;
            }
            await Promise.all([loadCampaigns(), loadOverview()]);
            showModal('Sent', 'Campaign sent successfully.', 'success');
        } catch {
            showModal('Send Failed', 'Could not send campaign.', 'danger');
        }
    };

    const createAd = async () => {
        if (!adForm.title.trim()) {
            showModal('Missing Details', 'Ad title is required.', 'warning');
            return;
        }
        setCreatingAd(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.ADS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adForm),
            });
            if (!res.ok) {
                showModal('Create Failed', 'Could not create ad.', 'danger');
                return;
            }
            setAdForm({
                title: '',
                description: '',
                image_url: '',
                click_url: '',
                priority: 0,
                status: 'active',
            });
            await Promise.all([loadAds(), loadOverview()]);
            showModal('Created', 'Ad created successfully.', 'success');
        } catch {
            showModal('Create Failed', 'Could not create ad.', 'danger');
        } finally {
            setCreatingAd(false);
        }
    };

    const toggleAdStatus = async (ad: MobileAd) => {
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.AD_DETAIL(ad.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: ad.status === 'active' ? 'inactive' : 'active',
                }),
            });
            if (!res.ok) {
                showModal('Update Failed', 'Could not update ad.', 'danger');
                return;
            }
            await Promise.all([loadAds(), loadOverview()]);
        } catch {
            showModal('Update Failed', 'Could not update ad.', 'danger');
        }
    };

    const deleteAd = async (ad: MobileAd) => {
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.AD_DETAIL(ad.id), { method: 'DELETE' });
            if (!res.ok) {
                showModal('Delete Failed', 'Could not delete ad.', 'danger');
                return;
            }
            await Promise.all([loadAds(), loadOverview()]);
        } catch {
            showModal('Delete Failed', 'Could not delete ad.', 'danger');
        }
    };

    const syncLivenessForUser = async (user: QueueUser) => {
        if (!user?.email) {
            showModal('Sync Failed', 'User email is missing.', 'warning');
            return;
        }

        try {
            const res = await fetch(ENDPOINTS.MOBILE_AUTH.SYNC_LIVENESS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showModal('Sync Failed', data?.message || 'Could not sync liveness decision.', 'danger');
                return;
            }

            await Promise.all([
                loadQueue(queueStatus, queueSearch),
                loadOverview(),
            ]);
            showModal('Synced', 'Latest liveness decision pulled from Veriff.', 'success');
        } catch {
            showModal('Sync Failed', 'Could not sync liveness decision.', 'danger');
        }
    };

    const settingsRows = useMemo(() => ([
        { key: 'require_email_otp', label: 'Require Email OTP', icon: <Mail className="h-4 w-4" /> },
        { key: 'require_mobile_otp', label: 'Require Mobile OTP', icon: <Smartphone className="h-4 w-4" /> },
        { key: 'enable_liveness_check', label: 'Enable Liveness Check', icon: <ShieldCheck className="h-4 w-4" /> },
        { key: 'enable_sanction_screening', label: 'Enable Sanction Screening', icon: <ShieldAlert className="h-4 w-4" /> },
        { key: 'lock_profile_after_verification', label: 'Lock Profile After Verification', icon: <BadgeCheck className="h-4 w-4" /> },
        { key: 'allow_profile_edit_after_lock', label: 'Allow Edit After Lock', icon: <RefreshCcw className="h-4 w-4" /> },
        { key: 'enable_google_sign_in', label: 'Enable Google Sign-In', icon: <Smartphone className="h-4 w-4" /> },
        { key: 'enable_apple_sign_in', label: 'Enable Apple Sign-In', icon: <Smartphone className="h-4 w-4" /> },
        { key: 'enable_push_notifications', label: 'Enable Push Notifications', icon: <Bell className="h-4 w-4" /> },
        { key: 'enable_email_notifications', label: 'Enable Email Notifications', icon: <Mail className="h-4 w-4" /> },
        { key: 'enable_secure_message', label: 'Enable Secure Message', icon: <ShieldCheck className="h-4 w-4" /> },
        { key: 'enable_in_app_ads', label: 'Enable In-App Ads', icon: <Newspaper className="h-4 w-4" /> },
        { key: 'send_exchange_rate_push', label: 'Send Exchange Rate Push', icon: <Megaphone className="h-4 w-4" /> },
    ]), []);

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
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Mobile Control Center</h1>
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                        Manage registration checks, profile review queue, notifications, and in-app ads.
                    </p>
                </div>
                <button
                    onClick={reloadAll}
                    className="btn-primary flex items-center gap-2 rounded-full px-5"
                >
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                {[
                    { label: 'Mobile Users', value: overview.mobile_users_total, icon: <Smartphone className="h-4 w-4" /> },
                    { label: 'KYC Pending', value: overview.kyc_pending, icon: <ShieldAlert className="h-4 w-4" /> },
                    { label: 'KYC Verified', value: overview.kyc_verified, icon: <ShieldCheck className="h-4 w-4" /> },
                    { label: 'Inactive', value: overview.inactive_users, icon: <BadgeCheck className="h-4 w-4" /> },
                    { label: 'Campaigns Sent', value: overview.campaigns_sent, icon: <Send className="h-4 w-4" /> },
                    { label: 'Active Ads', value: overview.active_ads, icon: <Newspaper className="h-4 w-4" /> },
                ].map((card) => (
                    <div key={card.label} className="card-glass p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            {card.icon}
                            {card.label}
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="card-glass p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">App Flow Settings</h2>
                        <button onClick={saveSettings} className="btn-primary flex items-center gap-2 rounded-full px-4 py-2 text-sm" disabled={savingSettings}>
                            <Save className="h-4 w-4" />
                            {savingSettings ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {settingsRows.map((row) => {
                            const key = row.key as keyof SettingsData;
                            const checked = settings[key] === 'yes';
                            return (
                                <label key={key} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/40 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/30">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        {row.icon}
                                        {row.label}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => setToggle(key, e.target.checked)}
                                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                </label>
                            );
                        })}
                    </div>
                    <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/40 p-4 dark:border-slate-700 dark:bg-slate-900/30">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Veriff Integration</h3>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${settings.veriff_configured ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {settings.veriff_configured ? 'Configured' : 'Not Configured'}
                            </span>
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
                                Callback URL
                                <input
                                    value={settings.veriff_callback_url}
                                    onChange={(e) => setSettings((prev) => ({ ...prev, veriff_callback_url: e.target.value }))}
                                    className="input-glass mt-1.5 w-full py-2.5 text-sm normal-case"
                                    placeholder="https://your-domain/api/webhooks/veriff"
                                />
                            </label>

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
                        </div>
                    </div>
                </div>

                <div className="card-glass p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Profile Review Queue</h2>
                        <div className="flex items-center gap-2">
                            <select
                                value={queueStatus}
                                onChange={(e) => setQueueStatus(e.target.value as 'pending' | 'verified' | 'rejected' | 'all')}
                                className="input-glass rounded-full px-3 py-2 text-xs font-bold"
                            >
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                    </div>
                    <div className="input-icon relative mb-3">
                        <div className="input-icon-left">
                            <Search className="h-4 w-4" />
                        </div>
                        <input
                            value={queueSearch}
                            onChange={(e) => setQueueSearch(e.target.value)}
                            placeholder="Search by name, email, phone, ID"
                            className="input-glass w-full py-2.5 text-sm"
                        />
                    </div>
                    <div className="max-h-[360px] overflow-auto rounded-2xl border border-slate-200/70 dark:border-slate-700">
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">KYC</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Liveness</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {queue.slice(0, 80).map((u) => (
                                    <tr key={u.id}>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{u.name || '-'}</div>
                                            <div className="text-xs text-slate-500">{u.email || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold uppercase text-slate-600">{u.kyc_status || '-'}</td>
                                        <td className="px-4 py-3 text-xs font-bold uppercase text-slate-600">{u.status || '-'}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-[11px] font-bold uppercase text-slate-600">{u.veriff_status || '-'}</div>
                                            <div className="text-[10px] uppercase text-slate-400">{u.veriff_decision || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => syncLivenessForUser(u)}
                                                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                            >
                                                Sync
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {queue.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No users in queue</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="card-glass p-6">
                    <h2 className="mb-4 text-lg font-extrabold text-slate-900 dark:text-white">Push / Email Campaigns</h2>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                            placeholder="Campaign title"
                            value={campaignForm.title}
                            onChange={(e) => setCampaignForm((prev) => ({ ...prev, title: e.target.value }))}
                            className="input-glass py-2.5 text-sm md:col-span-2"
                        />
                        <textarea
                            placeholder="Campaign message"
                            value={campaignForm.message}
                            onChange={(e) => setCampaignForm((prev) => ({ ...prev, message: e.target.value }))}
                            className="input-glass min-h-24 py-2.5 text-sm md:col-span-2"
                        />
                        <select
                            value={campaignForm.channel}
                            onChange={(e) => setCampaignForm((prev) => ({ ...prev, channel: e.target.value as 'push' | 'email' | 'both' }))}
                            className="input-glass py-2.5 text-sm"
                        >
                            <option value="both">Push + Email</option>
                            <option value="push">Push only</option>
                            <option value="email">Email only</option>
                        </select>
                        <select
                            value={campaignForm.target_audience}
                            onChange={(e) => setCampaignForm((prev) => ({ ...prev, target_audience: e.target.value as 'all' | 'kyc_pending' | 'kyc_verified' | 'inactive' }))}
                            className="input-glass py-2.5 text-sm"
                        >
                            <option value="all">All users</option>
                            <option value="kyc_pending">KYC pending</option>
                            <option value="kyc_verified">KYC verified</option>
                            <option value="inactive">Inactive users</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 md:col-span-2">
                            <input
                                type="checkbox"
                                checked={campaignForm.include_exchange_rate}
                                onChange={(e) => setCampaignForm((prev) => ({ ...prev, include_exchange_rate: e.target.checked }))}
                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            Include latest exchange rates in message
                        </label>
                        <div className="flex gap-2 md:col-span-2">
                            <button
                                onClick={() => createCampaign(false)}
                                disabled={creatingCampaign}
                                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                Save Draft
                            </button>
                            <button
                                onClick={() => createCampaign(true)}
                                disabled={creatingCampaign}
                                className="btn-primary rounded-full px-4 py-2 text-sm"
                            >
                                Send Now
                            </button>
                        </div>
                    </div>
                    <div className="mt-5 max-h-56 overflow-auto rounded-2xl border border-slate-200/70 dark:border-slate-700">
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Title</th>
                                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Channel</th>
                                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {campaigns.slice(0, 50).map((campaign) => (
                                    <tr key={campaign.id}>
                                        <td className="px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{campaign.title}</td>
                                        <td className="px-3 py-2 text-xs uppercase text-slate-600">{campaign.channel}</td>
                                        <td className="px-3 py-2 text-xs uppercase text-slate-600">{campaign.status}</td>
                                        <td className="px-3 py-2 text-right">
                                            {campaign.status === 'draft' && (
                                                <button
                                                    onClick={() => sendDraftCampaign(campaign.id)}
                                                    className="rounded-full bg-teal-500 px-3 py-1 text-xs font-bold text-white hover:bg-teal-600"
                                                >
                                                    Send
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {campaigns.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">No campaigns yet</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card-glass p-6">
                    <h2 className="mb-4 text-lg font-extrabold text-slate-900 dark:text-white">In-App Ads</h2>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                            placeholder="Ad title"
                            value={adForm.title}
                            onChange={(e) => setAdForm((prev) => ({ ...prev, title: e.target.value }))}
                            className="input-glass py-2.5 text-sm md:col-span-2"
                        />
                        <textarea
                            placeholder="Description"
                            value={adForm.description}
                            onChange={(e) => setAdForm((prev) => ({ ...prev, description: e.target.value }))}
                            className="input-glass min-h-20 py-2.5 text-sm md:col-span-2"
                        />
                        <input
                            placeholder="Image URL"
                            value={adForm.image_url}
                            onChange={(e) => setAdForm((prev) => ({ ...prev, image_url: e.target.value }))}
                            className="input-glass py-2.5 text-sm md:col-span-2"
                        />
                        <input
                            placeholder="Click URL"
                            value={adForm.click_url}
                            onChange={(e) => setAdForm((prev) => ({ ...prev, click_url: e.target.value }))}
                            className="input-glass py-2.5 text-sm md:col-span-2"
                        />
                        <input
                            type="number"
                            placeholder="Priority"
                            value={adForm.priority}
                            onChange={(e) => setAdForm((prev) => ({ ...prev, priority: Number(e.target.value || 0) }))}
                            className="input-glass py-2.5 text-sm"
                        />
                        <select
                            value={adForm.status}
                            onChange={(e) => setAdForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                            className="input-glass py-2.5 text-sm"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <button
                            onClick={createAd}
                            disabled={creatingAd}
                            className="btn-primary flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm md:col-span-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Ad
                        </button>
                    </div>
                    <div className="mt-5 max-h-56 overflow-auto rounded-2xl border border-slate-200/70 dark:border-slate-700">
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Title</th>
                                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Priority</th>
                                    <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {ads.slice(0, 50).map((ad) => (
                                    <tr key={ad.id}>
                                        <td className="px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{ad.title}</td>
                                        <td className="px-3 py-2 text-xs uppercase text-slate-600">{ad.status}</td>
                                        <td className="px-3 py-2 text-xs text-slate-600">{ad.priority}</td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => toggleAdStatus(ad)}
                                                    className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                                >
                                                    {ad.status === 'active' ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    onClick={() => deleteAd(ad)}
                                                    className="rounded-full border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {ads.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">No ads yet</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
