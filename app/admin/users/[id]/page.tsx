'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../../components/ConfirmModal';
import { showToast, queueToast } from '@/app/lib/toast';
import Modal from '../../components/Modal';
import { resolveUploadsUrl } from '@/app/lib/uploads';
import { ArrowLeft, User, Mail, Shield, Building, Save, Loader2, ChevronRight, Lock, MapPin, Phone, FileSignature, RotateCcw } from 'lucide-react';

const generateBase32Secret = (length = 16): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const array = new Uint32Array(length);
    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(array);
    } else {
        for (let i = 0; i < length; i++) {
            array[i] = Math.floor(Math.random() * 32);
        }
    }
    for (let i = 0; i < length; i++) {
        secret += chars[array[i] % 32];
    }
    return secret;
};

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [enteredBy, setEnteredBy] = useState('');
    const [showQrModal, setShowQrModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        roleId: '',
        status: 'active',
        branch: '',
        phone: '',
        address: '',
        twofaStatus: 'active',
        twofaQrCode: ''
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger' | 'warning' | 'success';
        isAlert: boolean;
        shouldRedirect: boolean;
        onConfirm?: (() => void) | null;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        isAlert: true,
        shouldRedirect: false,
        onConfirm: null
    });

    const signatureInputRef = useRef<HTMLInputElement | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signatureClear, setSignatureClear] = useState(false);
    const [existingSignature, setExistingSignature] = useState<string | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (signatureFile) {
            const url = URL.createObjectURL(signatureFile);
            setPreviewUrl(url);
            return () => {
                URL.revokeObjectURL(url);
            };
        } else {
            setPreviewUrl(url => {
                if (url) URL.revokeObjectURL(url);
                return null;
            });
        }
    }, [signatureFile]);

    const activePreview = signatureFile
        ? previewUrl
        : (existingSignature && !signatureClear ? existingSignature : null);

    const handleRegenerateSecret = async () => {
        const newSecret = generateBase32Secret();
        setSubmitting(true);
        try {
            const payload = new FormData();
            payload.append('_method', 'PUT'); // Spoof PUT
            payload.append('twofa_qr_code', newSecret);
            if (enteredBy) {
                payload.append('updated_by', enteredBy);
            }

            const res = await fetch(ENDPOINTS.USERS.DETAIL(id), {
                method: 'POST', // Spoofed to PUT
                body: payload,
            });

            if (res.ok) {
                setFormData(prev => ({ ...prev, twofaQrCode: newSecret }));
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: '2FA Secret generated and automatically saved to database successfully.',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: false
                });
            } else {
                let errMsg = `Unknown error (HTTP ${res.status} ${res.statusText})`;
                try {
                    const err = await res.json();
                    if (err?.message) errMsg = err.message;
                } catch { }
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to auto-save 2FA secret: ' + errMsg,
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
            }
        } catch (error) {
            console.error('Failed to auto-save secret:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while saving the secret key to the database.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        } finally {
            setSubmitting(false);
        }
    };

    const promptRegenerate = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Regenerate 2FA Secret',
            message: 'Are you sure you want to generate a new 2FA secret? The user will need to scan the new QR code to log in, and their current authenticator configuration will stop working.',
            type: 'warning',
            isAlert: false,
            shouldRedirect: false,
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                handleRegenerateSecret();
            }
        });
    };

    useEffect(() => {
        const parsed = getStoredUser<{ username?: string; name?: string }>();
        setEnteredBy(parsed?.username || parsed?.name || '');
    }, []);

    useEffect(() => {
        if (id) {
            const loadData = async () => {
                setLoading(true);
                const loadedRoles = await fetchRoles();
                await fetchBranches();
                await fetchUser(loadedRoles);
                setLoading(false);
            };
            loadData();
        }
    }, [id]);

    const fetchBranches = async () => {
        try {
            const res = await fetch(ENDPOINTS.BRANCHES.LIST);
            if (res.ok) {
                setBranches(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await fetch(ENDPOINTS.ROLES.LIST);
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
                return data;
            }
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        }
        return [];
    };

    const fetchUser = async (loadedRoles: any[] = []) => {
        try {
            const res = await fetch(ENDPOINTS.USERS.DETAIL(id));
            if (res.ok) {
                const data = await res.json();

                let resolvedRoleId = '';
                if (data.role_id) {
                    resolvedRoleId = String(data.role_id);
                } else if (data.role && loadedRoles.length > 0) {
                    const match = loadedRoles.find(
                        r => r.name.toLowerCase() === data.role.toLowerCase()
                    );
                    if (match) {
                        resolvedRoleId = String(match.id);
                    }
                }

                setFormData({
                    name: data.name || '',
                    username: data.username || '',
                    email: data.email || '',
                    roleId: resolvedRoleId,
                    status: data.status || 'active',
                    branch: data.branch || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    twofaStatus: data.twofa_status || 'active',
                    twofaQrCode: data.twofa_qr_code || ''
                });
                if (data.signature) {
                    setExistingSignature(resolveUploadsUrl(data.signature) || null);
                }
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const roleName = roles.find(r => r.id.toString() === formData.roleId)?.name || 'staff';
            const payload = new FormData();
            payload.append('_method', 'PUT'); // Spoof PUT
            payload.append('name', formData.name);
            payload.append('username', formData.username);
            payload.append('address', formData.address);
            payload.append('phone', formData.phone);
            payload.append('email', formData.email);
            if (formData.roleId) payload.append('role_id', formData.roleId);
            payload.append('role', roleName);
            if (formData.branch) payload.append('branch', formData.branch);
            payload.append('status', formData.status);
            payload.append('twofa_status', formData.twofaStatus);
            payload.append('twofa_qr_code', formData.twofaQrCode);
            if (enteredBy) {
                payload.append('updated_by', enteredBy);
            }

            if (signatureFile) {
                const isAllowedSignatureImage = ['image/jpeg', 'image/png'].includes(signatureFile.type);
                if (!isAllowedSignatureImage) {
                    setConfirmModal({
                        isOpen: true,
                        title: 'Invalid Signature File',
                        message: 'Signature upload only supports JPG and PNG images.',
                        type: 'danger',
                        isAlert: true,
                        shouldRedirect: false
                    });
                    setSubmitting(false);
                    return;
                }
                payload.append('signature', signatureFile);
            }
            if (signatureClear) {
                payload.append('signature_clear', '1');
            }

            const res = await fetch(ENDPOINTS.USERS.DETAIL(id), {
                method: 'POST', // Spoofed to PUT
                body: payload,
            });

            if (res.ok) {
                queueToast('Success', 'User updated successfully', 'success');
                router.push('/admin/users');
            } else {
                let errMsg = `Unknown error (HTTP ${res.status} ${res.statusText})`;
                try {
                    const err = await res.json();
                    if (err?.message) errMsg = err.message;
                } catch { }
                showToast('Error', 'Failed to update user: ' + errMsg, 'danger');
            }
        } catch (error) {
            console.error('Failed to submit:', error);
            showToast('Error', 'Error updating user', 'danger');
        } finally {
            setSubmitting(false);
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/users');
        }
    };

    if (loading) {
        return <div className="max-w-7xl mx-auto p-12 text-center text-slate-500 font-medium animate-pulse">Loading user details...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleModalClose}
                onConfirm={confirmModal.onConfirm || handleModalClose}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.isAlert ? "OK" : "Proceed"}
                cancelText="Cancel"
            />

            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/users" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Users
                </Link>
                <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Edit System User</h1>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold">
                        ID: {id}
                    </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Update account settings and profile details for system access.</p>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Personal Details */}
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <User className="w-5 h-5 mr-2 text-teal-500" />
                            Personal Details
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Person Name <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <User className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                required
                                className="input-glass w-full"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Mobile No</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Phone className="w-5 h-5" />
                            </span>
                            <input
                                type="tel"
                                className="input-glass w-full"
                                placeholder="Phone number"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Person Address</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <MapPin className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                className="input-glass w-full"
                                placeholder="Street, City, Postcode"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Signature</label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-[20px] border border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-teal-50/80 dark:bg-teal-900/20 flex items-center justify-center shrink-0">
                                    <FileSignature className="w-5 h-5 text-teal-600 dark:text-teal-300" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                                        {signatureFile ? signatureFile.name : (existingSignature ? 'Existing signature uploaded' : 'No file chosen')}
                                    </p>
                                    <p className="text-xs text-slate-400">PNG or JPG only</p>
                                </div>
                            </div>

                            {activePreview && (
                                <div
                                    onClick={() => setShowSignatureModal(true)}
                                    className="h-12 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white px-2 py-1 flex items-center shrink-0 cursor-pointer hover:ring-2 hover:ring-teal-500/50 hover:scale-105 transition-all duration-300"
                                    title="Click to zoom signature"
                                >
                                    <img src={activePreview} alt="User signature" className="h-full w-auto object-contain max-w-[120px]" />
                                </div>
                            )}

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => signatureInputRef.current?.click()}
                                    className="px-4 py-2 rounded-full glass-effect text-slate-600 dark:text-slate-300 font-semibold text-xs hover:shadow-md transition-all"
                                >
                                    Upload New
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSignatureFile(null);
                                        setSignatureClear(true);
                                        setExistingSignature(null);
                                        if (signatureInputRef.current) signatureInputRef.current.value = '';
                                    }}
                                    className="px-4 py-2 rounded-full glass-effect text-slate-500 dark:text-slate-400 font-semibold text-xs hover:text-red-500 transition-all"
                                >
                                    Clear
                                </button>
                            </div>
                            <input
                                ref={signatureInputRef}
                                type="file"
                                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file && !['image/jpeg', 'image/png'].includes(file.type)) {
                                        setConfirmModal({
                                            isOpen: true,
                                            title: 'Invalid Signature File',
                                            message: 'Signature upload only supports JPG and PNG images.',
                                            type: 'danger',
                                            isAlert: true,
                                            shouldRedirect: false
                                        });
                                        e.target.value = '';
                                        setSignatureFile(null);
                                        return;
                                    }
                                    setSignatureFile(file);
                                    setSignatureClear(false);
                                }}
                            />
                        </div>
                    </div>

                    {/* Account Credentials */}
                    <div className="md:col-span-2 mt-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <Lock className="w-5 h-5 mr-2 text-teal-500" />
                            Account Credentials
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Username <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <User className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                required
                                autoComplete="off"
                                className="input-glass w-full"
                                placeholder="Username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Email Address <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Mail className="w-5 h-5" />
                            </span>
                            <input
                                type="email"
                                required
                                autoComplete="off"
                                className="input-glass w-full"
                                placeholder="Email address"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Access Details */}
                    <div className="md:col-span-2 mt-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                            <Shield className="w-5 h-5 mr-2 text-teal-500" />
                            Access Details
                        </h3>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Assigned Role</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Shield className="w-5 h-5" />
                            </span>
                            <select
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                                value={formData.roleId}
                                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                            >
                                <option value="">Select Role...</option>
                                {roles.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Assigned Branch <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Building className="w-5 h-5" />
                            </span>
                            <select
                                required
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                            >
                                <option value="">Select Branch...</option>
                                {branches.map((b: any) => (
                                    <option key={b.id} value={b.code || b.name}>
                                        {b.name} ({b.code})
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Status <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Shield className="w-5 h-5" />
                            </span>
                            <select
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                required
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">2FA Status <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Lock className="w-5 h-5" />
                            </span>
                            <select
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                                value={formData.twofaStatus}
                                onChange={(e) => setFormData({ ...formData, twofaStatus: e.target.value })}
                                required
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
                    </div>

                    {/* 2FA Secret Key management */}
                    <div className="md:col-span-2 p-6 rounded-[24px] bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Two-Factor Authentication Secret & QR Code
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {formData.twofaQrCode ? '2FA secret key is generated and stored.' : 'Warning: 2FA secret is missing.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {!formData.twofaQrCode ? (
                                    <button
                                        type="button"
                                        onClick={handleRegenerateSecret}
                                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                                    >
                                        <Lock className="w-3.5 h-3.5" />
                                        Generate Secret
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowQrModal(true)}
                                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                                        >
                                            <Shield className="w-3.5 h-3.5" />
                                            View QR Code
                                        </button>
                                        <button
                                            type="button"
                                            onClick={promptRegenerate}
                                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Regenerate Secret
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {formData.twofaQrCode ? (
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Secret Key:</span>
                                <code className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-teal-400 rounded-lg text-xs font-mono font-bold tracking-wider select-all">
                                    {formData.twofaQrCode}
                                </code>
                            </div>
                        ) : (
                            <div className="text-xs text-rose-500 font-semibold">
                                No secret key exists in form. Click Generate to configure one.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/users"
                        className="px-6 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors border border-slate-200 dark:border-slate-600"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Updating...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            <Modal isOpen={showQrModal} onClose={() => setShowQrModal(false)} title="Authenticator App QR Setup" size="md">
                <div className="space-y-6 flex flex-col items-center py-4">
                    <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-100">
                        {formData.twofaQrCode ? (
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                    `otpauth://totp/LinkForex:${formData.email || ''}?secret=${formData.twofaQrCode}&issuer=LinkForex`
                                )}`}
                                alt="2FA QR Code"
                                width={200}
                                height={200}
                                className="rounded-lg"
                            />
                        ) : (
                            <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 text-xs">
                                No secret generated
                            </div>
                        )}
                    </div>
                    <div className="text-center space-y-2 max-w-sm">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Scan to configure authenticator app
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Scan the QR code with Google Authenticator, Microsoft Authenticator Authy, or any other TOTP-compliant app.
                        </p>
                    </div>
                    <div className="w-full space-y-2">
                        <p className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Secret key (Manual config)
                        </p>
                        <div className="flex justify-center">
                            <code className="px-4 py-2 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-teal-400 rounded-lg text-base font-mono font-bold tracking-wider select-all border border-slate-200 dark:border-slate-800">
                                {formData.twofaQrCode || '—'}
                            </code>
                        </div>
                    </div>
                    <div className="w-full flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={() => setShowQrModal(false)} className="btn-secondary py-2 px-6">
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Signature Preview Modal */}
            <Modal isOpen={showSignatureModal} onClose={() => setShowSignatureModal(false)} title="Signature Preview" size="md">
                <div className="space-y-6 flex flex-col items-center py-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-inner border border-slate-100 dark:border-slate-800/80 w-full flex items-center justify-center min-h-[220px]">
                        {activePreview ? (
                            <img
                                src={activePreview}
                                alt="User signature full size"
                                className="max-w-full max-h-[380px] object-contain rounded-lg shadow-sm"
                            />
                        ) : (
                            <div className="text-slate-400 text-xs">
                                No signature preview available
                            </div>
                        )}
                    </div>
                    <div className="w-full flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={() => setShowSignatureModal(false)} className="btn-secondary py-2 px-6">
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
