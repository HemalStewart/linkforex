'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import ConfirmModal from '../../components/ConfirmModal';
import {
    ArrowLeft,
    Store,
    Tag,
    ArrowRightLeft,
    Coins,
    MapPin,
    Building,
    Flag,
    Phone,
    Printer,
    Mail,
    MessageSquare,
    Save
} from 'lucide-react';

export default function CreateBranchPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [enteredBy, setEnteredBy] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        transaction_prefix: '',
        default_transaction_type: 'Receiver',
        day_transfer_limit: '',
        theme_1: '',
        theme_2: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        country: '',
        telephone_1: '',
        telephone_2: '',
        fax_1: '',
        fax_2: '',
        email_1: '',
        email_2: '',
        remarks: '',
        status: 'active'
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
        const parsed = getStoredUser<{ username?: string; name?: string }>();
        setEnteredBy(parsed?.username || parsed?.name || '');
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const addressParts = [
            formData.address_line_1,
            formData.address_line_2,
            formData.city,
            formData.country
        ].filter(Boolean);

        const payload = {
            ...formData,
            code: formData.transaction_prefix || undefined,
            phone: formData.telephone_1 || undefined,
            address: addressParts.length ? addressParts.join(', ') : undefined,
            day_transfer_limit: formData.day_transfer_limit ? Number(formData.day_transfer_limit) : 0,
            created_by: enteredBy || undefined,
            updated_by: enteredBy || undefined
        };

        try {
            const res = await fetch(ENDPOINTS.BRANCHES.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Branch created successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true
                });
            } else {
                const err = await res.text();
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: err || 'Failed to create branch',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to create branch',
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
            router.push('/admin/branches');
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

            <div className="mb-8">
                <Link href="/admin/branches" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Branches
                </Link>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Add Branch</h1>
                <p className="text-slate-500 dark:text-slate-300 mt-2">Create a new branch with transfer settings.</p>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch Name <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Store className="w-5 h-5" /></span>
                            <input
                                required
                                className="input-glass w-full"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Branch name"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Transaction Prefix <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Tag className="w-5 h-5" /></span>
                            <input
                                required
                                className="input-glass w-full uppercase"
                                value={formData.transaction_prefix}
                                onChange={(e) => setFormData({ ...formData, transaction_prefix: e.target.value })}
                                placeholder="Prefix"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Default Transaction Type <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><ArrowRightLeft className="w-5 h-5" /></span>
                            <select
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                                value={formData.default_transaction_type}
                                onChange={(e) => setFormData({ ...formData, default_transaction_type: e.target.value })}
                            >
                                <option value="Receiver">Receiver</option>
                                <option value="Sender">Sender</option>
                                <option value="Both">Both</option>
                            </select>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-200 pointer-events-none">⌄</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Daily Transfer Limit (£)</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Coins className="w-5 h-5" /></span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="input-glass w-full"
                                value={formData.day_transfer_limit}
                                onChange={(e) => setFormData({ ...formData, day_transfer_limit: e.target.value })}
                                placeholder="Daily limit amount"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Theme Option 1</label>
                        <input
                            className="input-glass w-full"
                            value={formData.theme_1}
                            onChange={(e) => setFormData({ ...formData, theme_1: e.target.value })}
                            placeholder="Theme option 1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Theme Option 2</label>
                        <input
                            className="input-glass w-full"
                            value={formData.theme_2}
                            onChange={(e) => setFormData({ ...formData, theme_2: e.target.value })}
                            placeholder="Theme option 2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address Line 1</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><MapPin className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.address_line_1}
                                onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                                placeholder="Address line 1"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address Line 2</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><MapPin className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.address_line_2}
                                onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                                placeholder="Address line 2"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">City</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Building className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="City"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Country</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Flag className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                placeholder="Country"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Primary Telephone</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Phone className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.telephone_1}
                                onChange={(e) => setFormData({ ...formData, telephone_1: e.target.value })}
                                placeholder="Telephone 1"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Secondary Telephone</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Phone className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.telephone_2}
                                onChange={(e) => setFormData({ ...formData, telephone_2: e.target.value })}
                                placeholder="Telephone 2"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Primary Fax</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Printer className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.fax_1}
                                onChange={(e) => setFormData({ ...formData, fax_1: e.target.value })}
                                placeholder="Fax number"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Secondary Fax</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Printer className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.fax_2}
                                onChange={(e) => setFormData({ ...formData, fax_2: e.target.value })}
                                placeholder="Alternate fax number"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Primary Email</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Mail className="w-5 h-5" /></span>
                            <input
                                type="email"
                                className="input-glass w-full"
                                value={formData.email_1}
                                onChange={(e) => setFormData({ ...formData, email_1: e.target.value })}
                                placeholder="Email address"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Secondary Email</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Mail className="w-5 h-5" /></span>
                            <input
                                type="email"
                                className="input-glass w-full"
                                value={formData.email_2}
                                onChange={(e) => setFormData({ ...formData, email_2: e.target.value })}
                                placeholder="Alternate email address"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Remarks</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><MessageSquare className="w-5 h-5" /></span>
                            <textarea
                                rows={3}
                                className="input-glass w-full resize-none"
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                placeholder="Additional notes"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/branches"
                        className="px-6 py-3 rounded-full glass-effect text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        <Save className="w-4 h-4" />
                        <span>{loading ? 'Saving...' : 'Create Branch'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
