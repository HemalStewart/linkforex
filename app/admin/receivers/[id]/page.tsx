'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { ArrowLeft, User, Building, CreditCard, Save, Loader2, ChevronRight, Search } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

export default function EditReceiverPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
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
        const fetchData = async () => {
            try {
                // Fetch remitters
                const remittersRes = await fetch(ENDPOINTS.REMITTERS.LIST);
                if (remittersRes.ok) {
                    setRemitters(await remittersRes.json());
                }

                // Fetch receiver details
                if (id) {
                    const receiverRes = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(id));
                    if (receiverRes.ok) {
                        const data = await receiverRes.json();
                        setFormData({
                            customer_id: data.customer_id,
                            name: data.name,
                            bank_name: data.bank_name,
                            account_number: data.account_number,
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(id), {
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
                    message: 'Receiver updated successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to update receiver',
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
                message: 'Error updating receiver',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        } finally {
            setSubmitting(false);
        }
    };

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading receiver details...</div>;

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/receivers');
        }
    };

    return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-fade-in-up">
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
          <Link href="/admin/receivers" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Receivers
                    </Link>
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Edit Receiver
                        </h1>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold uppercase">
                            ID: {id}
                        </span>
                    </div>
                </div>
            </div>

      <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="space-y-8">
                    {/* Search/Select Remitter */}
                    <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Linked Remitter <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <select
                                required
                                value={formData.customer_id}
                                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="input-glass w-full pl-12 appearance-none cursor-pointer"
                            >
                                <option value="">Select a Remitter...</option>
                                {remitters.map((remitter) => (
                                    <option key={remitter.id} value={remitter.id}>
                                        {remitter.name}{remitter.phone ? ` (${remitter.phone})` : ''}
                                    </option>
                                ))}
                            </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
                    </div>

          <div className="grid grid-cols-1 gap-6">
                        <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Legal Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-glass w-full pl-12"
                                    placeholder="Receiver's full name"
                                />
                            </div>
                        </div>

                        <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Bank Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="input-glass w-full pl-12"
                                    placeholder="Bank name"
                                />
                            </div>
                        </div>

                        <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Account Number / IBAN <span className="text-red-500">*</span></label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={formData.account_number}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="input-glass w-full pl-12"
                                    placeholder="Account number or IBAN"
                                />
                            </div>
                        </div>
                    </div>
                </div>

        <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/receivers"
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
        </div>
    );
}
