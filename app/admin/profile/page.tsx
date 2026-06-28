'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { applyUiSettings, getStoredUiSettings, type UiSettings } from '@/app/lib/uiPreferences';
import { validatePassword } from '@/app/lib/validation';
import { resolveUploadsUrl } from '@/app/lib/uploads';
import Modal from '@/app/admin/components/Modal';
import ConfirmModal from '@/app/admin/components/ConfirmModal';
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
    Shield,
    User,
    Eye,
    EyeOff,
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
    twofa_status?: string;
    twofa_qr_code?: string;
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
    twofa_status?: string;
    twofa_qr_code?: string;
};


const resolvePhotoUrl = (value?: string | null, fallback?: string | null): string | null => {
    const raw = String(fallback || value || '').trim();
    if (!raw) return null;
    return resolveUploadsUrl(raw) || null;
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

export default function ProfilePage() {
    const storedUser = useMemo(() => getStoredUser<StoredUser>(), []);

    const [profileLoading, setProfileLoading] = useState(true);
    const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [uiSettings, setUiSettings] = useState<UiSettings>({
        tableFontSizePx: 14,
        toastMessageTimerMs: 3000,
        rowsPerPage: 10,
    });
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const email = useMemo(() => String(profile?.email || storedUser?.email || '').trim(), [profile, storedUser]);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
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
        newPassword: '',
        confirmPassword: '',
        twofaCode: '',
    });
    const [passwordErrorState, setPasswordErrorState] = useState('');
    const [confirmPasswordErrorState, setConfirmPasswordErrorState] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'danger' | 'success';
        isAlert: boolean;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isAlert: true
    });

    useEffect(() => {
        const syncUiSettings = () => {
            const loaded = getStoredUiSettings();
            setUiSettings(loaded);
        };
        syncUiSettings();
        window.addEventListener('ui-settings-change', syncUiSettings);
        return () => window.removeEventListener('ui-settings-change', syncUiSettings);
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

    const updateRowsPerPageSetting = (rawValue: string) => {
        const parsed = Number(rawValue);
        const nextRows = Number.isFinite(parsed) ? Math.max(5, Math.min(100, Math.round(parsed))) : 10;
        const next = { ...uiSettings, rowsPerPage: nextRows };
        setUiSettings(next);
        applyUiSettings(next);
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
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to crop image.',
                type: 'danger',
                isAlert: true
            });
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

        try {
            const formData = new FormData();
            formData.append('_method', 'PUT'); // Spoof PUT
            formData.append('profile_photo', photoFile);
            const res = await fetch(ENDPOINTS.USERS.DETAIL(storedUser.id), {
                method: 'POST', // Spoofed to PUT
                body: formData,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: data?.message || 'Failed to update profile picture.',
                    type: 'danger',
                    isAlert: true
                });
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
            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: 'Profile picture updated successfully.',
                type: 'success',
                isAlert: true
            });
        } catch {
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to update profile picture.',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setProfilePhotoUploading(false);
        }
    };

    const handlePasswordChange = async () => {
        const isTwoFaActive = profile?.twofa_status === 'active' || storedUser?.twofa_status === 'active';
        if (!email || !passwordForm.newPassword || !passwordForm.confirmPassword || (isTwoFaActive && !passwordForm.twofaCode)) {
            setConfirmModal({
                isOpen: true,
                title: 'Required Fields',
                message: 'Complete all password and 2FA fields first.',
                type: 'warning',
                isAlert: true
            });
            return;
        }

        if (isTwoFaActive && passwordForm.twofaCode.length !== 6) {
            setConfirmModal({
                isOpen: true,
                title: 'Invalid 2FA Code',
                message: 'Please enter a valid 6-digit 2FA code.',
                type: 'warning',
                isAlert: true
            });
            return;
        }

        const passwordError = validatePassword(passwordForm.newPassword);
        if (passwordError) {
            setPasswordErrorState(passwordError);
            return;
        } else {
            setPasswordErrorState('');
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setConfirmPasswordErrorState('New passwords do not match.');
            return;
        } else {
            setConfirmPasswordErrorState('');
        }

        setPasswordLoading(true);

        try {
            const res = await fetch(ENDPOINTS.AUTH.CHANGE_PASSWORD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    new_password: passwordForm.newPassword,
                    confirm_password: passwordForm.confirmPassword,
                    twofa_code: isTwoFaActive ? passwordForm.twofaCode : undefined,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Change Password Failed',
                    message: data?.message || 'Failed to change password.',
                    type: 'danger',
                    isAlert: true
                });
                return;
            }

            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: data?.message || 'Password changed successfully.',
                type: 'success',
                isAlert: true,
                onConfirm: () => {
                    setPasswordModalOpen(false);
                    setPasswordForm({
                        newPassword: '',
                        confirmPassword: '',
                        twofaCode: '',
                    });
                    setPasswordErrorState('');
                    setConfirmPasswordErrorState('');
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                }
            });
        } catch {
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to change password.',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setPasswordLoading(false);
        }
    };

    const handlePreferencesSave = () => {
        localStorage.setItem('uiSettings', JSON.stringify(uiSettings));
        applyUiSettings(uiSettings);
        setConfirmModal({
            isOpen: true,
            title: 'Success',
            message: 'UI Preferences saved successfully.',
            type: 'success',
            isAlert: true
        });
    };

    const isTwoFaActive = profile?.twofa_status === 'active' || storedUser?.twofa_status === 'active';
    const currentPhoto = photoPreview || resolvePhotoUrl(profile?.profile_photo, profile?.profile_photo_url);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
                onConfirm={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
            />
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

            <Modal isOpen={passwordModalOpen} onClose={() => {
                setPasswordModalOpen(false);
                setPasswordForm({
                    newPassword: '',
                    confirmPassword: '',
                    twofaCode: '',
                });
                setPasswordErrorState('');
                setConfirmPasswordErrorState('');
                setShowNewPassword(false);
                setShowConfirmPassword(false);
            }} title="Change Password" size="md">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    void handlePasswordChange();
                }} className="space-y-6">
                    <input type="text" name="username" value={email} readOnly autoComplete="username" style={{ position: 'absolute', top: '-1000px', left: '-1000px', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }} />
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    name="new-password"
                                    autoComplete="new-password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => {
                                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }));
                                        if (passwordErrorState) setPasswordErrorState('');
                                    }}
                                    className="input-glass w-full pr-10 text-sm"
                                    placeholder="Enter new password"
                                    required
                                />
                                <button
                                    type="button"
                                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                                    onClick={() => setShowNewPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-200 hover:text-teal-500 transition-colors"
                                >
                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 ml-1 leading-relaxed">
                                Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.
                            </p>
                            {passwordErrorState && (
                                <p className="text-xs text-rose-500 font-semibold mt-1 ml-1">{passwordErrorState}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirm-password"
                                    autoComplete="new-password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => {
                                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                                        if (confirmPasswordErrorState) setConfirmPasswordErrorState('');
                                    }}
                                    className="input-glass w-full pr-10 text-sm"
                                    placeholder="Confirm new password"
                                    required
                                />
                                <button
                                    type="button"
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-200 hover:text-teal-500 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {confirmPasswordErrorState && (
                                <p className="text-xs text-rose-500 font-semibold mt-1.5 ml-1">{confirmPasswordErrorState}</p>
                            )}
                        </div>
                        {isTwoFaActive && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">2FA Verification Code</label>
                                <input
                                    type="text"
                                    name="twofa-code"
                                    maxLength={6}
                                    pattern="\d{6}"
                                    inputMode="numeric"
                                    value={passwordForm.twofaCode}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setPasswordForm((prev) => ({ ...prev, twofaCode: val }));
                                    }}
                                    className="input-glass w-full text-sm font-mono tracking-widest text-center"
                                    placeholder="000000"
                                    required
                                />
                            </div>
                        )}
                    </div>

                    <div className="dialog-actions pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                setPasswordModalOpen(false);
                                setPasswordForm({
                                    newPassword: '',
                                    confirmPassword: '',
                                    twofaCode: '',
                                });
                                setPasswordErrorState('');
                                setConfirmPasswordErrorState('');
                                setShowNewPassword(false);
                                setShowConfirmPassword(false);
                            }}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                        >
                            {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {passwordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </Modal>

            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Profile</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage your personal profile photo, display preferences, and credentials.</p>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="card-glass p-6 space-y-6">
                        <div className="w-28 h-28 rounded-full overflow-hidden bg-teal-100 text-teal-700 flex items-center justify-center text-3xl font-black mx-auto shadow-md">
                            {currentPhoto ? (
                                <img src={currentPhoto} alt={toLabel(profile?.name || storedUser?.name, 'User')} className="h-full w-full object-cover" />
                            ) : (
                                toLabel(profile?.name || storedUser?.name, 'U').charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{toLabel(profile?.name || storedUser?.name)}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{toLabel(profile?.role || storedUser?.role)}</p>
                        </div>
                        <div className="space-y-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoSelection}
                                className="input-glass w-full file:mr-3 file:rounded-full file:border-0 file:bg-teal-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white cursor-pointer"
                            />
                            <button
                                type="button"
                                onClick={handlePhotoUpload}
                                disabled={!photoFile || profilePhotoUploading}
                                className="btn-primary w-full disabled:opacity-60 inline-flex items-center justify-center gap-2 py-3"
                            >
                                {profilePhotoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                {profilePhotoUploading ? 'Uploading...' : 'Update Profile Picture'}
                            </button>
                        </div>
                        <div className="pt-4 border-t border-slate-100/60 dark:border-slate-800/40">
                            <button
                                type="button"
                                onClick={() => setPasswordModalOpen(true)}
                                className="btn-secondary w-full inline-flex items-center justify-center gap-2 py-3"
                            >
                                <Lock className="w-4 h-4" />
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="card-glass p-8 space-y-6 shadow-md">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100/60 dark:border-slate-800/40 pb-3 flex items-center gap-2">
                            <User className="w-5 h-5 text-teal-500" />
                            Profile Details
                        </h3>
                        {profileLoading ? (
                            <div className="text-sm text-slate-500 animate-pulse">Loading profile...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <span className="input-icon-left"><Mail className="w-5 h-5 text-slate-400" /></span>
                                        <input type="email" readOnly value={toLabel(profile?.email || storedUser?.email, '')} className="input-glass w-full opacity-80 cursor-not-allowed" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phone</label>
                                    <div className="relative input-icon">
                                        <span className="input-icon-left"><Phone className="w-5 h-5 text-slate-400" /></span>
                                        <input type="text" readOnly value={toLabel(profile?.phone || storedUser?.phone, '')} className="input-glass w-full opacity-80 cursor-not-allowed" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Role</label>
                                    <div className="relative input-icon">
                                        <span className="input-icon-left"><Shield className="w-5 h-5 text-slate-400" /></span>
                                        <input type="text" readOnly value={toLabel(profile?.role || storedUser?.role, '')} className="input-glass w-full opacity-80 cursor-not-allowed" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Branch</label>
                                    <div className="relative input-icon">
                                        <span className="input-icon-left"><Building2 className="w-5 h-5 text-slate-400" /></span>
                                        <input type="text" readOnly value={toLabel(profile?.branch || storedUser?.branch, '')} className="input-glass w-full opacity-80 cursor-not-allowed" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {profile?.twofa_status === 'active' && (
                        <div className="card-glass p-8 space-y-6 shadow-md">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100/60 dark:border-slate-800/40 pb-3 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-teal-500" />
                                Two-Factor Authentication Setup
                            </h3>
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-100/80 dark:bg-slate-800 dark:border-slate-700/50 shrink-0">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                                            `otpauth://totp/LinkForex:${profile?.email || storedUser?.email || ''}?secret=${profile?.twofa_qr_code || ''}&issuer=LinkForex`
                                        )}`}
                                        alt="2FA QR Code"
                                        width={160}
                                        height={160}
                                        className="rounded-lg"
                                    />
                                </div>
                                <div className="space-y-4 flex-1 w-full text-center md:text-left">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Configure Authenticator App
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            Scan the QR code with Google Authenticator, Microsoft Authenticator, Authy, or any other TOTP-compliant authenticator app.
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            Manual Setup Code
                                        </p>
                                        <div className="mt-1 flex items-center justify-center md:justify-start gap-2">
                                            <code className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900/60 text-slate-800 dark:text-teal-400 rounded-lg text-sm font-mono font-bold tracking-wider select-all">
                                                {profile?.twofa_qr_code || '—'}
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card-glass p-8 space-y-6 shadow-md">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100/60 dark:border-slate-800/40 pb-3 flex items-center gap-2">
                            <Save className="w-5 h-5 text-teal-500" />
                            Display Preferences
                        </h3>
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
                                        className="input-glass w-full text-sm"
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
                                        className="input-glass w-full text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Default Rows Per Page ({uiSettings.rowsPerPage})
                                </label>
                                <div className="space-y-3">
                                    <input
                                        type="range"
                                        min={5}
                                        max={100}
                                        step={1}
                                        value={uiSettings.rowsPerPage ?? 10}
                                        onChange={(e) => updateRowsPerPageSetting(e.target.value)}
                                        className="w-full accent-teal-500"
                                    />
                                    <input
                                        type="number"
                                        min={5}
                                        max={100}
                                        step={1}
                                        value={uiSettings.rowsPerPage ?? 10}
                                        onChange={(e) => updateRowsPerPageSetting(e.target.value)}
                                        className="input-glass w-full text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={handlePreferencesSave}
                                className="btn-primary inline-flex items-center gap-2 py-2.5 px-6 font-semibold"
                            >
                                <Save className="w-4 h-4" />
                                Save
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
