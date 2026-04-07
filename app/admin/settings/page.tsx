'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ENDPOINTS, UPLOADS_BASE_URL } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { applyUiSettings, getStoredUiSettings, type UiSettings } from '@/app/lib/uiPreferences';
import Modal from '@/app/admin/components/Modal';
import {
    Building2,
    Camera,
    Check,
    Crop,
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
    window.dispatchEvent(new CustomEvent('admin-user-updated', { detail: nextUser }));
};

const CROP_SIZE = 280;

type CropState = {
    zoom: number;
    offsetX: number;
    offsetY: number;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const getDisplayMetrics = (imageWidth: number, imageHeight: number, zoom: number) => {
    const baseScale = Math.max(CROP_SIZE / imageWidth, CROP_SIZE / imageHeight);
    const displayWidth = imageWidth * baseScale * zoom;
    const displayHeight = imageHeight * baseScale * zoom;
    return { displayWidth, displayHeight };
};

const clampOffsets = (imageWidth: number, imageHeight: number, zoom: number, offsetX: number, offsetY: number) => {
    const { displayWidth, displayHeight } = getDisplayMetrics(imageWidth, imageHeight, zoom);
    const maxOffsetX = Math.max(0, (displayWidth - CROP_SIZE) / 2);
    const maxOffsetY = Math.max(0, (displayHeight - CROP_SIZE) / 2);
    return {
        offsetX: clamp(offsetX, -maxOffsetX, maxOffsetX),
        offsetY: clamp(offsetY, -maxOffsetY, maxOffsetY),
    };
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
    });
    const [uiSettings, setUiSettings] = useState<UiSettings>({
        tableFontSizePx: 14,
        toastMessageTimerMs: 3000,
    });
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
    const [cropState, setCropState] = useState<CropState>({ zoom: 1, offsetX: 0, offsetY: 0 });
    const [cropImageSize, setCropImageSize] = useState({ width: 0, height: 0 });
    const imageRef = useRef<HTMLImageElement | null>(null);
    const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number; active: boolean }>({
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0,
        active: false,
    });
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

    const updateToastTimer = (rawValue: string) => {
        const parsed = Number(rawValue);
        const nextTimer = Number.isFinite(parsed) ? Math.max(1000, Math.min(10000, Math.round(parsed / 500) * 500)) : 3000;
        const next = { ...uiSettings, toastMessageTimerMs: nextTimer };
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
        if (!file) {
            setPhotoFile(null);
            setPhotoPreview(resolvePhotoUrl(profile?.profile_photo, profile?.profile_photo_url));
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setCropSourceUrl(objectUrl);
        setCropState({ zoom: 1, offsetX: 0, offsetY: 0 });
        setCropImageSize({ width: 0, height: 0 });
        setCropModalOpen(true);
    };

    const closeCropModal = () => {
        if (cropSourceUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(cropSourceUrl);
        }
        setCropModalOpen(false);
        setCropSourceUrl(null);
        setCropState({ zoom: 1, offsetX: 0, offsetY: 0 });
        dragStateRef.current.active = false;
    };

    const handleCropImageLoad = () => {
        const image = imageRef.current;
        if (!image) return;
        setCropImageSize({
            width: image.naturalWidth,
            height: image.naturalHeight,
        });
    };

    const beginDrag = (clientX: number, clientY: number) => {
        dragStateRef.current = {
            startX: clientX,
            startY: clientY,
            originX: cropState.offsetX,
            originY: cropState.offsetY,
            active: true,
        };
    };

    const updateDrag = (clientX: number, clientY: number) => {
        if (!dragStateRef.current.active || !cropImageSize.width || !cropImageSize.height) return;
        const nextX = dragStateRef.current.originX + (clientX - dragStateRef.current.startX);
        const nextY = dragStateRef.current.originY + (clientY - dragStateRef.current.startY);
        const clamped = clampOffsets(cropImageSize.width, cropImageSize.height, cropState.zoom, nextX, nextY);
        setCropState((prev) => ({ ...prev, ...clamped }));
    };

    const endDrag = () => {
        dragStateRef.current.active = false;
    };

    useEffect(() => {
        if (!cropModalOpen) return;

        const handleMouseMove = (event: MouseEvent) => updateDrag(event.clientX, event.clientY);
        const handleTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0];
            if (touch) updateDrag(touch.clientX, touch.clientY);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', endDrag);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', endDrag);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', endDrag);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', endDrag);
        };
    }, [cropModalOpen, cropState.zoom, cropImageSize.width, cropImageSize.height]);

    const handleCropConfirm = async () => {
        const image = imageRef.current;
        if (!image || !cropImageSize.width || !cropImageSize.height) return;

        const { displayWidth, displayHeight } = getDisplayMetrics(cropImageSize.width, cropImageSize.height, cropState.zoom);
        const left = (CROP_SIZE - displayWidth) / 2 + cropState.offsetX;
        const top = (CROP_SIZE - displayHeight) / 2 + cropState.offsetY;
        const sx = clamp(((0 - left) / displayWidth) * cropImageSize.width, 0, cropImageSize.width);
        const sy = clamp(((0 - top) / displayHeight) * cropImageSize.height, 0, cropImageSize.height);
        const sw = clamp((CROP_SIZE / displayWidth) * cropImageSize.width, 1, cropImageSize.width - sx);
        const sh = clamp((CROP_SIZE / displayHeight) * cropImageSize.height, 1, cropImageSize.height - sy);

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        if (!context) return;

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, sx, sy, sw, sh, 0, 0, 512, 512);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.92));
        if (!blob) {
            setMessage({ text: 'Failed to crop image.', tone: 'error' });
            return;
        }

        const croppedFile = new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);

        setPhotoFile(croppedFile);
        setPhotoPreview((prev) => {
            if (prev?.startsWith('blob:')) {
                URL.revokeObjectURL(prev);
            }
            return previewUrl;
        });
        closeCropModal();
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
            <Modal isOpen={cropModalOpen} onClose={closeCropModal} title="Crop Profile Picture" size="lg">
                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        <div
                            className="relative overflow-hidden rounded-[32px] border border-slate-200/70 dark:border-slate-700/70 bg-slate-100/70 dark:bg-slate-900/40 shadow-inner select-none"
                            style={{ width: CROP_SIZE, height: CROP_SIZE }}
                            onMouseDown={(event) => beginDrag(event.clientX, event.clientY)}
                            onTouchStart={(event) => {
                                const touch = event.touches[0];
                                if (touch) beginDrag(touch.clientX, touch.clientY);
                            }}
                        >
                            {cropSourceUrl && (
                                <img
                                    ref={imageRef}
                                    src={cropSourceUrl}
                                    alt="Crop preview"
                                    onLoad={handleCropImageLoad}
                                    draggable={false}
                                    className="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
                                    style={{
                                        width: cropImageSize.width ? getDisplayMetrics(cropImageSize.width, cropImageSize.height, cropState.zoom).displayWidth : 'auto',
                                        height: cropImageSize.height ? getDisplayMetrics(cropImageSize.width, cropImageSize.height, cropState.zoom).displayHeight : 'auto',
                                        transform: `translate(calc(-50% + ${cropState.offsetX}px), calc(-50% + ${cropState.offsetY}px))`,
                                    }}
                                />
                            )}
                            <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-2 ring-white/80 dark:ring-teal-300/70" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Drag to position. Use zoom for a tighter crop.</p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                            Zoom ({cropState.zoom.toFixed(1)}x)
                        </label>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={cropState.zoom}
                            onChange={(event) => {
                                const zoom = Number(event.target.value);
                                const clamped = clampOffsets(cropImageSize.width, cropImageSize.height, zoom, cropState.offsetX, cropState.offsetY);
                                setCropState((prev) => ({ ...prev, zoom, ...clamped }));
                            }}
                            className="w-full accent-teal-500"
                        />
                    </div>

                    <div className="dialog-actions">
                        <button type="button" onClick={closeCropModal} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="button" onClick={() => void handleCropConfirm()} className="btn-primary inline-flex items-center gap-2">
                            <Crop className="h-4 w-4" />
                            Crop & Use
                        </button>
                    </div>
                </div>
            </Modal>

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
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Profile Display Settings</h3>
                                        <div className="space-y-6">
                                            <div>
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
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                    Toast Message Timer ({(uiSettings.toastMessageTimerMs / 1000).toFixed(1)}s)
                                                </label>
                                                <div className="space-y-3">
                                                    <input
                                                        type="range"
                                                        min={1000}
                                                        max={10000}
                                                        step={500}
                                                        value={uiSettings.toastMessageTimerMs}
                                                        onChange={(e) => updateToastTimer(e.target.value)}
                                                        className="w-full accent-teal-500"
                                                    />
                                                    <input
                                                        type="number"
                                                        min={1000}
                                                        max={10000}
                                                        step={500}
                                                        value={uiSettings.toastMessageTimerMs}
                                                        onChange={(e) => updateToastTimer(e.target.value)}
                                                        className="input-glass w-full"
                                                    />
                                                </div>
                                            </div>
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
