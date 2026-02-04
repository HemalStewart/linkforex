'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { ArrowLeft, User, Building, CreditCard, Save, Loader2, ChevronRight, Search } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

export default function CreateReceiverPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [remitters, setRemitters] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        customer_id: '',
        name: '',
        bank_name: '',
        account_number: '',
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
        // Fetch remitters for selection
        const fetchRemitters = async () => {
            try {
                const res = await fetch(ENDPOINTS.REMITTERS.LIST);
                if (res.ok) {
                    const data = await res.json();
                    setRemitters(data);
                }
            } catch (error) {
                console.error('Failed to fetch remitters:', error);
            }
        };
        fetchRemitters();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.LIST, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Receiver created successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to create receiver',
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
                message: 'Error creating receiver',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/receivers');
        }
    };

    return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
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
            <div>
        <Link href="/admin/receivers" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
          <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Receivers
                </Link>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Add New Receiver</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Link a new beneficiary to an existing remitter.</p>
            </div>

      <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="space-y-8">
                    {/* Search/Select Remitter */}
                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Linked Remitter <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-5 h-5" />
                            </span>
                            <select
                                required
                                value={formData.customer_id}
                                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                            >
                                <option value="">Select a Remitter...</option>
                                {remitters.map((remitter) => (
                                    <option key={remitter.id} value={remitter.id}>
                                        {remitter.name}{remitter.phone ? ` (${remitter.phone})` : ''}
                                    </option>
                                ))}
                            </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                        </div>
            <p className="text-xs text-slate-400 mt-2 ml-1">Select the person sending money to this receiver.</p>
                    </div>

          <div className="grid grid-cols-1 gap-6">
                        <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Legal Name <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <User className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-glass w-full"
                                placeholder="Receiver's full name"
                            />
                        </div>
                        </div>

                        <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Bank Name <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Building className="w-5 h-5" />
                            </span>
                                <input
                                    type="text"
                                    required
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="input-glass w-full"
                                    placeholder="e.g. Bank of London"
                                />
                            </div>
                        </div>

                        <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Account Number / IBAN <span className="text-red-500">*</span></label>
              <div className="relative input-icon">
                <span className="input-icon-left">
                    <CreditCard className="w-5 h-5" />
                </span>
                                <input
                                    type="text"
                                    required
                                    value={formData.account_number}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                    className="input-glass w-full"
                                    placeholder="Account number or IBAN"
                                />
                            </div>
                        </div>
                    </div>
                </div>

        <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/receivers"
                        className="px-6 py-3 rounded-full glass-effect text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        {loading ? (
                            <>
                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            <>
                <Save className="w-4 h-4" />
                                <span>Create Receiver</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
