'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../../components/ConfirmModal';
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Flag, Save, Loader2, CheckCircle, AlertTriangle, Building } from 'lucide-react';

export default function EditRemitterPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        status: 'active',
        kyc_status: 'pending',
        client_type: 'individual',
        dob: '',
        address_1: '',
        city: '',
        postcode: '',
        country: 'United Kingdom',
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false
    });

    useEffect(() => {
        if (id) {
            fetchRemitter();
        }
    }, [id]);

    const fetchRemitter = async () => {
        try {
            const res = await fetch(ENDPOINTS.REMITTERS.DETAIL(id));
            if (res.ok) {
                const data = await res.json();
                setFormData(data);
            }
        } catch (error) {
            console.error('Failed to fetch remitter:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(ENDPOINTS.REMITTERS.DETAIL(id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Remitter updated successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to update remitter',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
            }
        } catch (error) {
            console.error('Failed to submit:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Error updating remitter',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
    return <div className="max-w-4xl mx-auto p-12 text-center text-slate-500 font-medium animate-pulse">Loading remitter details...</div>;
    }

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/mobile-profiles');
        }
    };

    return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in-up">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
          <Link href="/admin/mobile-profiles" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Mobile Profiles
                    </Link>
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Edit Mobile Profile
                        </h1>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                            ID: {id}
                        </span>
                    </div>
                </div>
            </div>

      <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Personal Info */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
              <User className="w-5 h-5 mr-2 text-teal-500" />
                            Personal Information
                        </h3>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-glass w-full pl-12 py-3"
                                placeholder="Full name"
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-glass w-full pl-12 py-3"
                                placeholder="Email address"
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Phone <span className="text-red-500">*</span></label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-glass w-full pl-12 py-3"
                                placeholder="Phone number"
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Date of Birth</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="date"
                                value={formData.dob || ''}
                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="input-glass w-full pl-12 py-3"
                            />
                        </div>
                    </div>

                    {/* Status & KYC */}
          <div className="md:col-span-2 mt-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
              <CheckCircle className="w-5 h-5 mr-2 text-teal-500" />
                            Account Status
                        </h3>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Status</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                <div className={`w-2.5 h-2.5 rounded-full ${formData.status === 'active' ? 'bg-teal-500 ring-4 ring-teal-500/20' : formData.status === 'suspended' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                            </div>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-glass w-full pl-12 py-3 appearance-none cursor-pointer"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">KYC Status</label>
            <div className="relative">
                            <AlertTriangle className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${formData.kyc_status === 'verified' ? 'text-teal-500' : formData.kyc_status === 'rejected' ? 'text-red-500' : 'text-amber-500'}`} />
                            <select
                                value={formData.kyc_status}
                                onChange={(e) => setFormData({ ...formData, kyc_status: e.target.value })}
                className="input-glass w-full pl-12 py-3 appearance-none cursor-pointer"
                            >
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    {/* Address Info */}
          <div className="md:col-span-2 mt-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
              <MapPin className="w-5 h-5 mr-2 text-teal-500" />
                            Address Information
                        </h3>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Country</label>
            <div className="relative">
              <Flag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={formData.country || ''}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="input-glass w-full pl-12 py-3"
                                placeholder="United Kingdom"
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">City</label>
            <div className="relative">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={formData.city || ''}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input-glass w-full pl-12 py-3"
                                placeholder="London"
                            />
                        </div>
                    </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address Line</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={formData.address_1 || ''}
                                onChange={(e) => setFormData({ ...formData, address_1: e.target.value })}
                className="input-glass w-full pl-12 py-3"
                                placeholder="Address"
                            />
                        </div>
                    </div>

                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Postcode</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={formData.postcode || ''}
                                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                className="input-glass w-full pl-12 py-3"
                                placeholder="Postcode"
                            />
                        </div>
                    </div>
                </div>

        <div className="flex justify-end space-x-4 pt-8 mt-6 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/mobile-profiles"
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
                <span className="ml-2">Updating...</span>
                            </>
                        ) : (
                            <>
                <Save className="w-4 h-4" />
                <span className="ml-2">Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
