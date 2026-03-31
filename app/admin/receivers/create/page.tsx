'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { ArrowLeft, User, Building, CreditCard, Save, Loader2, ChevronRight, Search, MapPin, Phone, ShieldCheck, Landmark } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

type RemitterOption = {
    id: string | number;
    name: string;
    phone?: string;
};

const normalizeCountryLabel = (value: string) => {
    const normalized = value.trim().toLowerCase();
    switch (normalized) {
        case 'uk':
            return 'united kingdom';
        case 'united arab emirates':
            return 'uae';
        default:
            return normalized;
    }
};

export default function CreateReceiverPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl');
    const preselectedCustomerId = searchParams.get('customer_id') || '';
    const [loading, setLoading] = useState(false);
    const [remitters, setRemitters] = useState<RemitterOption[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [banksLoading, setBanksLoading] = useState(true);
    const [countries, setCountries] = useState<string[]>(['United Kingdom']);

    const paymentModes = [
        'Direct deposit to Allied Bank',
        'Direct deposit to another bank',
        'Cash over the counter or cash pickup'
    ];
    const bankCategories = {
        allied: 'allied',
        other: 'bank',
        cash: 'cash_pickup'
    };
    const idTypes = ['Passport', 'CNIC', 'Driving license', 'Other'];
    const [relationships, setRelationships] = useState<string[]>(['Family']);

    const [formData, setFormData] = useState({
        customer_id: preselectedCustomerId,
        name: '',
        country: countries[0],
        address: '',
        city: '',
        date_of_birth: '',
        place_of_birth: '',
        payment_mode: paymentModes[0],
        bank_name: 'Allied Bank',
        branch_name: '',
        account_number: '',
        iban: '',
        branch_code: '',
        receiver_id_type: '',
        receiver_id_number: '',
        relation: relationships[0] || 'Family',
        mobile_number: '',
        status: 'active',
    });

    const isAllied = formData.payment_mode === 'Direct deposit to Allied Bank';
    const isCashPickup = formData.payment_mode.toLowerCase().includes('cash') || formData.payment_mode.toLowerCase().includes('pickup');
    const paymentCategory = isAllied
        ? bankCategories.allied
        : isCashPickup
            ? bankCategories.cash
            : bankCategories.other;
    const availableBanks = banks.filter((bank) => {
        const status = String(bank.status || 'active').toLowerCase();
        if (status !== 'active') return false;
        if (bank.country && normalizeCountryLabel(String(bank.country)) !== normalizeCountryLabel(formData.country)) return false;
        return String(bank.category || '').toLowerCase() === paymentCategory;
    });
    const alliedBank = availableBanks.find((bank) => Number(bank.is_default) === 1) || availableBanks[0];

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false,
        redirectUrl: '/admin/receivers'
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

    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const res = await fetch(`${ENDPOINTS.COUNTRIES.LIST}?status=active&sort=name&dir=asc`);
                if (!res.ok) return;
                const data = await res.json();
                if (!Array.isArray(data)) return;

                const names = Array.from(
                    new Set(
                        data
                            .map((country) => String(country?.name || '').trim())
                            .filter(Boolean)
                    )
                );

                if (names.length === 0) return;
                setCountries(names);
                setFormData((prev) => {
                    const matched = prev.country
                        ? names.find((name) => normalizeCountryLabel(name) === normalizeCountryLabel(prev.country))
                        : null;

                    if (matched) {
                        if (matched === prev.country) return prev;
                        return { ...prev, country: matched };
                    }

                    if (prev.country && names.includes(prev.country)) {
                        return prev;
                    }

                    const fallback = names.includes('United Kingdom') ? 'United Kingdom' : names[0];
                    return { ...prev, country: fallback };
                });
            } catch (error) {
                console.error('Failed to fetch countries:', error);
            }
        };

        fetchCountries();
    }, []);

    useEffect(() => {
        const fetchRelationships = async () => {
            try {
                const res = await fetch(`${ENDPOINTS.RELATIONSHIPS.LIST}?status=active`);
                if (!res.ok) return;
                const data = await res.json();
                if (!Array.isArray(data)) return;
                const names = data
                    .map((row) => String(row?.name || '').trim())
                    .filter(Boolean);
                setRelationships(names.length ? names : ['Family']);
                setFormData((prev) => ({
                    ...prev,
                    relation: names.includes(prev.relation) ? prev.relation : (names[0] || prev.relation),
                }));
            } catch (error) {
                console.error('Failed to fetch relationships:', error);
            }
        };
        fetchRelationships();
    }, []);

    useEffect(() => {
        const fetchBanks = async () => {
            try {
                const res = await fetch(ENDPOINTS.BANKS.LIST);
                if (res.ok) {
                    const data = await res.json();
                    setBanks(data);
                }
            } catch (error) {
                console.error('Failed to fetch banks:', error);
            } finally {
                setBanksLoading(false);
            }
        };
        fetchBanks();
    }, []);

    useEffect(() => {
        if (!banks.length) return;

        if (isAllied) {
            const nextName = alliedBank?.name || 'Allied Bank';
            setFormData((prev) => ({
                ...prev,
                bank_name: nextName,
            }));
            return;
        }

        if (!availableBanks.find((bank) => bank.name === formData.bank_name)) {
            setFormData((prev) => ({ ...prev, bank_name: '' }));
        }
    }, [banks, formData.country, formData.payment_mode]);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: string[] = [];
        if (!formData.customer_id) errors.push('Linked remitter is required.');
        if (!formData.name.trim()) errors.push('Receiver name is required.');
        if (!formData.bank_name.trim()) errors.push('Bank name is required.');
        if (!isCashPickup && !formData.account_number.trim()) errors.push('Account number is required.');
        if (isCashPickup) {
            if (!formData.receiver_id_type.trim()) errors.push('Receiver ID type is required for cash pickup.');
            if (!formData.receiver_id_number.trim()) errors.push('Receiver ID number is required for cash pickup.');
        }
        if (errors.length) {
            setConfirmModal({
                isOpen: true,
                title: 'Missing Information',
                message: errors.join('\n'),
                type: 'warning',
                isAlert: true,
                shouldRedirect: false,
                redirectUrl: '/admin/receivers'
            });
            return;
        }
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
                const created = await res.json().catch(() => null);
                const newReceiverId = created?.id ? String(created.id) : '';
                const redirectUrl = returnUrl
                    ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}newReceiverId=${encodeURIComponent(newReceiverId)}`
                    : '/admin/receivers';

                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Receiver created successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true,
                    redirectUrl
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to create receiver',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false,
                    redirectUrl: '/admin/receivers'
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
                shouldRedirect: false,
                redirectUrl: '/admin/receivers'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        const redirectUrl = confirmModal.redirectUrl || '/admin/receivers';
        setConfirmModal({ ...confirmModal, isOpen: false, redirectUrl: '/admin/receivers' });
        if (confirmModal.shouldRedirect) {
            router.push(redirectUrl);
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
                type={confirmModal.type}
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
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-200 pointer-events-none rotate-90" />
                        </div>
            <p className="text-xs text-slate-400 mt-2 ml-1">Select the person sending money to this receiver.</p>
                    </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Mobile Number</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <Phone className="w-5 h-5" />
                                </span>
                                <input
                                    type="text"
                                    value={formData.mobile_number}
                                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                                    className="input-glass w-full"
                                    placeholder="Receiver mobile number"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Country</label>
                            <select
                                className="input-glass w-full"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            >
                                {countries.map((country) => (
                                    <option key={country} value={country}>{country}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">City</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <MapPin className="w-5 h-5" />
                                </span>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="input-glass w-full"
                                    placeholder="City"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <MapPin className="w-5 h-5" />
                                </span>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input-glass w-full"
                                    placeholder="Street address"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Date Of Birth</label>
                            <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                className="input-glass w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Place Of Birth</label>
                            <input
                                type="text"
                                value={formData.place_of_birth}
                                onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                                className="input-glass w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Relationship</label>
                            <select
                                className="input-glass w-full"
                                value={formData.relation}
                                onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                            >
                                {relationships.map((relation) => (
                                    <option key={relation} value={relation}>{relation}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Status</label>
                            <select
                                className="input-glass w-full"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Payment Mode</label>
                            <select
                                className="input-glass w-full"
                                value={formData.payment_mode}
                                onChange={(e) => {
                                    const nextMode = e.target.value;
                                    const nextBank = nextMode === 'Direct deposit to Allied Bank'
                                        ? 'Allied Bank'
                                        : (formData.bank_name === 'Allied Bank' ? '' : formData.bank_name);
                                    setFormData({
                                        ...formData,
                                        payment_mode: nextMode,
                                        bank_name: nextBank,
                                    });
                                }}
                            >
                                {paymentModes.map((mode) => (
                                    <option key={mode} value={mode}>{mode}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Bank Name <span className="text-red-500">*</span></label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <Building className="w-5 h-5" />
                                </span>
                                {isAllied ? (
                                    <input
                                        type="text"
                                        value="Allied Bank"
                                        readOnly
                                        className="input-glass w-full bg-slate-50 dark:bg-slate-800/40"
                                    />
                                ) : (
                                    <select
                                        required
                                        className="input-glass w-full"
                                        value={formData.bank_name}
                                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    >
                                        <option value="">{isCashPickup ? 'Select pickup bank' : 'Select bank'}</option>
                                        {banksLoading ? (
                                            <option value="">Loading banks...</option>
                                        ) : (
                                            availableBanks.map((bank) => (
                                                <option key={bank.id || bank.name} value={bank.name}>{bank.name}</option>
                                            ))
                                        )}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Account Number <span className="text-red-500">*</span></label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <CreditCard className="w-5 h-5" />
                                </span>
                                <input
                                    type="text"
                                    required={!isCashPickup}
                                    value={formData.account_number}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                    className="input-glass w-full"
                                    placeholder="Account number"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">IBAN</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <CreditCard className="w-5 h-5" />
                                </span>
                                <input
                                    type="text"
                                    value={formData.iban}
                                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                    className="input-glass w-full"
                                    placeholder="IBAN"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch Name</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <Landmark className="w-5 h-5" />
                                </span>
                                <input
                                    type="text"
                                    value={formData.branch_name}
                                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                                    className="input-glass w-full"
                                    placeholder="Branch name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch Code</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <Landmark className="w-5 h-5" />
                                </span>
                                <input
                                    type="text"
                                    value={formData.branch_code}
                                    onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                                    className="input-glass w-full"
                                    placeholder="Branch code"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver ID Type</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <ShieldCheck className="w-5 h-5" />
                                </span>
                                <select
                                    className="input-glass w-full"
                                    value={formData.receiver_id_type}
                                    onChange={(e) => setFormData({ ...formData, receiver_id_type: e.target.value })}
                                >
                                    <option value="">Select ID type</option>
                                    {idTypes.map((idType) => (
                                        <option key={idType} value={idType}>{idType}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver ID Number</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <ShieldCheck className="w-5 h-5" />
                                </span>
                                <input
                                    type="text"
                                    value={formData.receiver_id_number}
                                    onChange={(e) => setFormData({ ...formData, receiver_id_number: e.target.value })}
                                    className="input-glass w-full"
                                    placeholder="ID number"
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
