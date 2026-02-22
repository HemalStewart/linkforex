'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../../components/ConfirmModal';
import { ArrowLeft, User, Mail, Lock, Shield, Building, Save, MapPin, Phone, FileSignature, ChevronRight } from 'lucide-react';

export default function CreateUserPage() {
    const router = useRouter();

    const [branches, setBranches] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                // Parallel fetch roles and branches
                const [branchesRes, rolesRes] = await Promise.all([
                    fetch(ENDPOINTS.BRANCHES.LIST),
                    fetch(ENDPOINTS.ROLES.LIST)
                ]);

                if (branchesRes.ok) {
                    setBranches(await branchesRes.json());
                }
                if (rolesRes.ok) {
                    setRoles(await rolesRes.json());
                }
            } catch (e) {
                console.error("Failed to fetch data", e);
            }
        };
        fetchData();
    }, []);

    React.useEffect(() => {
        const parsed = getStoredUser<{ username?: string; name?: string }>();
        setEnteredBy(parsed?.username || parsed?.name || '');
    }, []);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false
    });

    const [enteredBy, setEnteredBy] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        address: '',
        phone: '',
        email: '',
        roleId: '', // We use roleId now
        branch: '',
        password: '',
        confirmPassword: '',
        status: 'active',
        twofaStatus: 'active'
    });

    const signatureInputRef = useRef<HTMLInputElement | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signatureClear, setSignatureClear] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Passwords do not match!',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
            return;
        }

        try {
            const roleName = roles.find(r => r.id.toString() === formData.roleId)?.name || 'staff';
            const payload = new FormData();
            payload.append('name', formData.name);
            payload.append('username', formData.username);
            payload.append('address', formData.address);
            payload.append('phone', formData.phone);
            payload.append('email', formData.email);
            if (formData.roleId) payload.append('role_id', formData.roleId);
            payload.append('role', roleName);
            if (formData.branch) payload.append('branch', formData.branch);
            payload.append('password', formData.password);
            payload.append('status', formData.status);
            payload.append('twofa_status', formData.twofaStatus);
            if (enteredBy) {
                payload.append('created_by', enteredBy);
                payload.append('updated_by', enteredBy);
            }
            if (signatureFile) payload.append('signature', signatureFile);
            if (signatureClear) payload.append('signature_clear', '1');

            const res = await fetch(ENDPOINTS.USERS.LIST, {
                method: 'POST',
                body: payload,
            });

            if (!res.ok) {
                let errMsg = `Unknown error (HTTP ${res.status} ${res.statusText})`;
                try {
                    const err = await res.json();
                    if (err?.messages) {
                        errMsg = JSON.stringify(err.messages);
                    } else if (err?.message) {
                        errMsg = err.message;
                    }
                } catch (e) {
                    try {
                        const text = await res.text();
                        if (text) errMsg = text;
                    } catch (e2) {
                        // ignore
                    }
                }

                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to create user: ' + errMsg,
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
                return;
            }

            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: 'System User Created Successfully!',
                type: 'success',
                isAlert: true,
                shouldRedirect: true
            });
        } catch (e) {
            console.error(e);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/users');
        }
    };

    return (
    <div className="max-w-7xl mx-auto pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalClose}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
            />

            {/* Header */}
      <div className="mb-8">
        <Link href="/admin/users" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
          <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Users
                </Link>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Add System User</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Create a new staff account for system access.</p>
            </div>

      <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Access Credentials */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
              <Shield className="w-5 h-5 mr-2 text-teal-500" />
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
                className="input-glass w-full"
                                placeholder="Email address"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Password <span className="text-red-500">*</span></label>
            <div className="relative input-icon">
              <span className="input-icon-left">
                <Lock className="w-5 h-5" />
              </span>
                            <input
                                type="password"
                                required
                className="input-glass w-full"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative input-icon">
              <span className="input-icon-left">
                <Lock className="w-5 h-5" />
              </span>
                            <input
                                type="password"
                                required
                className="input-glass w-full"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Personal & Access Info */}
          <div className="md:col-span-2 mt-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
              <User className="w-5 h-5 mr-2 text-teal-500" />
                            Personal & Access Details
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

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Assigned Branch</label>
            <div className="relative input-icon">
              <span className="input-icon-left">
                <Building className="w-5 h-5" />
              </span>
                            <select
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
                                <option value="suspended">Suspended</option>
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

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Signature</label>
            <div className="flex items-center justify-between gap-4 p-4 rounded-[20px] border border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-teal-50/80 dark:bg-teal-900/20 flex items-center justify-center">
                  <FileSignature className="w-5 h-5 text-teal-600 dark:text-teal-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {signatureFile ? signatureFile.name : 'No file chosen'}
                  </p>
                  <p className="text-xs text-slate-400">PNG, JPG, or PDF</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => signatureInputRef.current?.click()}
                  className="px-4 py-2 rounded-full glass-effect text-slate-600 dark:text-slate-300 font-semibold text-xs hover:shadow-md transition-all"
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => {
                      setSignatureFile(null);
                      setSignatureClear(true);
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
                accept=".png,.jpg,.jpeg,.pdf"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSignatureFile(file);
                    setSignatureClear(false);
                }}
              />
            </div>
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
            className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
            <Save className="w-4 h-4" />
                        <span>Create User</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
