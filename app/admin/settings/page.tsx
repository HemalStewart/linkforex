'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ENDPOINTS, UPLOADS_BASE_URL } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { applyUiSettings, getStoredUiSettings } from '@/app/lib/uiPreferences';
import {
    Building2,
    Camera,
    Check,
    Loader2,
    Lock,
    Mail,
    Phone,
    Save,
    Settings,
    Shield,
    User,
} from 'lucide-react';

type StoredUser = {
    id?: string | number;
    name?: string;
    username?: string;
    email?: string;
    phone?: string;
    role?: string;
    branch?: string;
    profile_photo?: string;
    profile_photo_url?: string;
};

type ProfileData = {
    id?: string | number;
    name?: string;
    username?: string;
    email?: string;
    phone?: string;
    role?: string;
    branch?: string;
    status?: string;
    profile_photo?: string;
    profile_photo_url?: string;
};

type MessageState = {
    text: string;
    tone: 'success' | 'error';
};

const defaultFooterText = '© 2026 LinkForex. Protected by 256-bit encryption.';

const resolvePhotoUrl = (value?: string | null, fallback?: string | null): string | null => {
    const absolute = String(fallback || '').trim();
    if (absolute) return absolute;

    const relative = String(value || '').trim();
    if (!relative) return null;
    if (/^https?:\/\//i.test(relative)) return relative;
    const normalized = relative.replace(/^\/+/, '').replace(/^uploads\//, '');
    return `${UPLOADS_BASE_URL}/${normalized}`;
};

const toLabel = (value?: string | null, fallback = '—'): string => {
    const text = String(value || '').trim();
    return text || fallback;
};

const persistStoredUser = (nextUser: StoredUser) => {
    if (typeof window === 'undefined') return;
    const serialized = JSON.stringify(nextUser);
    if (localStorage.getItem('user')) {
        localStorage.setItem('user', serialized);
    } else {
        sessionStorage.setItem('user', serialized);
    }
    window.dispatchEvent(new StorageEvent('storage', { key: 'user', newValue: serialized }));
};

export default function SettingsPage() {
    const storedUser = useMemo(() => getStoredUser<StoredUser>(), []);
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<MessageState | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [generalSettings, setGeneralSettings] = useState({
        footerText: defaultFooterText,
    });
    const [securitySettings, setSecuritySettings] = useState({
        twoFactor: true,
        sessionTimeout: '30',
        passwordExpiry: '90',
    });
    const [uiSettings, setUiSettings] = useState<{ tableFontSizePx: number }>({
        tableFontSizePx: 14,
    });
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
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
                    twoFactor: parsed?.twoFactor !== false,
                    sessionTimeout: String(parsed?.sessionTimeout ?? '30'),
                    passwordExpiry: String(parsed?.passwordExpiry ?? '90'),
                });
            } catch {
                // Keep defaults
            }
        }

        const loadedUiSettings = getStoredUiSettings();
        setUiSettings(loadedUiSettings);
        applyUiSettings(loadedUiSettings);
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!storedUser?.id) {
                setProfile(storedUser ?? null);
                setProfileLoading(false);
                return;
            }

            setProfileLoading(true);
            try {
                const res = await fetch(ENDPOINTS.USERS.DETAIL(storedUser.id), { cache: 'no-store' });
                if (!res.ok) {
                    setProfile(storedUser);
                    return;
                }
                const data = await res.json();
                setProfile(data);
                const url = resolvePhotoUrl(data?.profile_photo, data?.profile_photo_url);
                setPhotoPreview(url);
                persistStoredUser({
                    ...(storedUser || {}),
                    ...data,
                    profile_photo_url: url || undefined,
                });
            } catch {
                setProfile(storedUser);
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfile();
    }, [storedUser]);

    const updateTableFontSize = (rawValue: string) => {
        const parsed = Number(rawValue);
        const nextSize = Number.isFinite(parsed) ? Math.max(10, Math.min(20, Math.round(parsed))) : 14;
        const next = { ...uiSettings, tableFontSizePx: nextSize };
        setUiSettings(next);
        applyUiSettings(next);
    };

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

    const handlePhotoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setPhotoFile(file);
        if (!file) {
            setPhotoPreview(resolvePhotoUrl(profile?.profile_photo, profile?.profile_photo_url));
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPhotoPreview(objectUrl);
    };

    const handlePhotoUpload = async () => {
        if (!storedUser?.id || !photoFile) return;

        setProfilePhotoUploading(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('profile_photo', photoFile);
            const res = await fetch(ENDPOINTS.USERS.DETAIL(storedUser.id), {
                method: 'PUT',
                body: formData,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage({ text: data?.message || 'Failed to update profile picture.', tone: 'error' });
                return;
            }

            const nextUrl = resolvePhotoUrl(data?.profile_photo, data?.profile_photo_url);
            setProfile((prev) => ({ ...(prev || {}), ...data, profile_photo_url: nextUrl || undefined }));
            setPhotoFile(null);
            setPhotoPreview(nextUrl);
            persistStoredUser({
                ...(storedUser || {}),
                ...data,
                profile_photo_url: nextUrl || undefined,
            });
            setMessage({ text: 'Profile picture updated successfully.', tone: 'success' });
        } catch {
            setMessage({ text: 'Failed to update profile picture.', tone: 'error' });
        } finally {
            setProfilePhotoUploading(false);
        }
    };

    const handlePasswordChange = async () => {
        const email = String(profile?.email || storedUser?.email || '').trim();
        if (!email || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setMessage({ text: 'Complete all password fields first.', tone: 'error' });
            return;
        }

        setPasswordLoading(true);
        setMessage(null);

        try {
            const res = await fetch(ENDPOINTS.AUTH.CHANGE_PASSWORD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    current_password: passwordForm.currentPassword,
                    new_password: passwordForm.newPassword,
                    confirm_password: passwordForm.confirmPassword,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage({ text: data?.message || 'Failed to change password.', tone: 'error' });
                return;
            }

            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setMessage({ text: data?.message || 'Password changed successfully.', tone: 'success' });
        } catch {
            setMessage({ text: 'Failed to change password.', tone: 'error' });
        } finally {
            setPasswordLoading(false);
        }
    };

    const currentPhoto = photoPreview || resolvePhotoUrl(profile?.profile_photo, profile?.profile_photo_url);

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage profile, security, and workspace preferences.</p>
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

                    {activeTab === 'profile' && (
                        <div className="card-glass p-8 animate-scale-in space-y-8">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                                    <User className="w-6 h-6 text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Profile</h2>
                                    <p className="text-sm text-slate-500 font-medium">Profile details are read-only. Use the actions below for updates.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                <div className="xl:col-span-1">
                                    <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700/70 p-6 bg-white/50 dark:bg-slate-900/20 space-y-4">
                                        <div className="w-28 h-28 rounded-full overflow-hidden bg-teal-100 text-teal-700 flex items-center justify-center text-3xl font-black mx-auto">
                                            {currentPhoto ? (
                                                <img src={currentPhoto} alt={toLabel(profile?.name || storedUser?.name, 'User')} className="h-full w-full object-cover" />
                                            ) : (
                                                toLabel(profile?.name || storedUser?.name, 'U').charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-base font-bold text-slate-900 dark:text-white">{toLabel(profile?.name || storedUser?.name)}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{toLabel(profile?.role || storedUser?.role)}</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoSelection}
                                            className="input-glass w-full file:mr-3 file:rounded-full file:border-0 file:bg-teal-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={handlePhotoUpload}
                                            disabled={!photoFile || profilePhotoUploading}
                                            className="btn-primary w-full disabled:opacity-60 inline-flex items-center justify-center gap-2"
                                        >
                                            {profilePhotoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                            {profilePhotoUploading ? 'Uploading...' : 'Update Profile Picture'}
                                        </button>
                                    </div>
                                </div>

                                <div className="xl:col-span-2 space-y-6">
                                    <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700/70 p-6 bg-white/50 dark:bg-slate-900/20">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Profile Details</h3>
                                        {profileLoading ? (
                                            <div className="text-sm text-slate-500">Loading profile...</div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Name</label>
                                                    <input type="text" readOnly value={toLabel(profile?.name || storedUser?.name, '')} className="input-glass w-full opacity-80 cursor-not-allowed" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Username</label>
                                                    <input type="text" readOnly value={toLabel(profile?.username || storedUser?.username, '')} className="input-glass w-full opacity-80 cursor-not-allowed" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email</label>
                                                    <div className="relative input-icon">
                                                        <span className="input-icon-left"><Mail className="w-5 h-5" /></span>
                                                        <input type="email" readOnly value={toLabel(profile?.email || storedUser?.email, '')} className="input-glass w-full opacity-80 cursor-not-allowed" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phone</label>
                                                    <div className="relative input-icon">
                                                        <span className="input-icon-left"><Phone className="w-5 h-5" /></span>
                                                        <input type="text" readOnly value={toLabel(profile?.phone || storedUser?.phone, '')} className="input-glass w-full opacity-80 cursor-not-allowed" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Role</label>
                                                    <div className="relative input-icon">
                                                        <span className="input-icon-left"><Shield className="w-5 h-5" /></span>
                                                        <input type="text" readOnly value={toLabel(profile?.role || storedUser?.role, '')} className="input-glass w-full opacity-80 cursor-not-allowed" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Branch</label>
                                                    <div className="relative input-icon">
                                                        <span className="input-icon-left"><Building2 className="w-5 h-5" /></span>
                                                        <input type="text" readOnly value={toLabel(profile?.branch || storedUser?.branch, '')} className="input-glass w-full opacity-80 cursor-not-allowed" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700/70 p-6 bg-white/50 dark:bg-slate-900/20">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Table Font Size</h3>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                            Table Font Size ({uiSettings.tableFontSizePx}px)
                                        </label>
                                        <div className="space-y-3">
                                            <input
                                                type="range"
                                                min={10}
                                                max={20}
                                                step={1}
                                                value={uiSettings.tableFontSizePx}
                                                onChange={(e) => updateTableFontSize(e.target.value)}
                                                className="w-full accent-teal-500"
                                            />
                                            <input
                                                type="number"
                                                min={10}
                                                max={20}
                                                step={1}
                                                value={uiSettings.tableFontSizePx}
                                                onChange={(e) => updateTableFontSize(e.target.value)}
                                                className="input-glass w-full"
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700/70 p-6 bg-white/50 dark:bg-slate-900/20">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Change Password</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                                                <input
                                                    type="password"
                                                    value={passwordForm.currentPassword}
                                                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                                                    className="input-glass w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                                                <input
                                                    type="password"
                                                    value={passwordForm.newPassword}
                                                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                                                    className="input-glass w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Confirm Password</label>
                                                <input
                                                    type="password"
                                                    value={passwordForm.confirmPassword}
                                                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                                    className="input-glass w-full"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handlePasswordChange}
                                                disabled={passwordLoading}
                                                className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                                            >
                                                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                                {passwordLoading ? 'Updating...' : 'Change Password'}
                                            </button>
                                        </div>
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
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security Preferences</h2>
                                    <p className="text-sm text-slate-500 font-medium">Control session and password rotation preferences.</p>
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
                                                onChange={(e) => setSecuritySettings((prev) => ({ ...prev, twoFactor: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                                        </label>
                                    </div>
                                    <p className="text-sm text-teal-800/70 dark:text-teal-200/70 leading-relaxed">
                                        Keep extra verification enabled for admin accounts.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Session Timeout (minutes)</label>
                                        <input
                                            type="number"
                                            value={securitySettings.sessionTimeout}
                                            onChange={(e) => setSecuritySettings((prev) => ({ ...prev, sessionTimeout: e.target.value }))}
                                            className="input-glass w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Password Expiry (days)</label>
                                        <input
                                            type="number"
                                            value={securitySettings.passwordExpiry}
                                            onChange={(e) => setSecuritySettings((prev) => ({ ...prev, passwordExpiry: e.target.value }))}
                                            className="input-glass w-full"
                                        />
                                    </div>
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
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
