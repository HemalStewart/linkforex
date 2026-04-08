'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { ArrowLeft, User, Building, CreditCard, Save, Loader2, ChevronRight, Search, MapPin, Phone, ShieldCheck, Landmark } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

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

export default function EditReceiverPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [remitters, setRemitters] = useState<any[]>([]);
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
        customer_id: '',
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
        shouldRedirect: false
    });

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
                    return { ...prev, country: prev.country || fallback };
                });
            } catch (error) {
                console.error('Failed to fetch countries:', error);
            }
        };

        void fetchCountries();
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
        const fetchData = async () => {
            try {
                // Fetch remitters
                const remittersRes = await fetch(ENDPOINTS.REMITTERS.LIST);
                if (remittersRes.ok) {
                    setRemitters(await remittersRes.json());
                }

                const banksRes = await fetch(ENDPOINTS.BANKS.LIST);
                if (banksRes.ok) {
                    setBanks(await banksRes.json());
                }

                // Fetch receiver details
                if (id) {
                    const receiverRes = await fetch(ENDPOINTS.BENEFICIARIES.DETAIL(id));
                    if (receiverRes.ok) {
                        const data = await receiverRes.json();
                        setFormData({
                            customer_id: data.customer_id,
                            name: data.name ?? '',
                            country: data.country ?? countries[0],
                            address: data.address ?? '',
                            city: data.city ?? '',
                            date_of_birth: data.date_of_birth ?? '',
                            place_of_birth: data.place_of_birth ?? '',
                            payment_mode: data.payment_mode ?? paymentModes[0],
                            bank_name: data.bank_name ?? 'Allied Bank',
                            branch_name: data.branch_name ?? '',
                            account_number: data.account_number ?? '',
                            iban: data.iban ?? '',
                            branch_code: data.branch_code ?? '',
                            receiver_id_type: data.receiver_id_type ?? '',
                            receiver_id_number: data.receiver_id_number ?? '',
                            relation: data.relation ?? relationships[0] ?? 'Family',
                            mobile_number: data.mobile_number ?? '',
                            status: data.status ?? 'active',
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
                setBanksLoading(false);
            }
        };
        fetchData();
    }, [id]);

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
                shouldRedirect: false
            });
            return;
        }
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Mobile Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.mobile_number}
                                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                                    className="input-glass w-full pl-12"
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
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="City"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input-glass w-full pl-12"
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
                                    setFormData({ ...formData, payment_mode: nextMode, bank_name: nextBank });
                                }}
                            >
                                {paymentModes.map((mode) => (
                                    <option key={mode} value={mode}>{mode}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Bank Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                {isAllied ? (
                                    <input
                                        type="text"
                                        value="Allied Bank"
                                        readOnly
                                        className="input-glass w-full pl-12 bg-slate-50 dark:bg-slate-800/40"
                                    />
                                ) : (
                                    <select
                                        required
                                        className="input-glass w-full pl-12"
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
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    required={!isCashPickup}
                                    value={formData.account_number}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="Account number"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">IBAN</label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.iban}
                                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="IBAN"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch Name</label>
                            <div className="relative">
                                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.branch_name}
                                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="Branch name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch Code</label>
                            <div className="relative">
                                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.branch_code}
                                    onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="Branch code"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Receiver ID Type</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <select
                                    className="input-glass w-full pl-12"
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
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.receiver_id_number}
                                    onChange={(e) => setFormData({ ...formData, receiver_id_number: e.target.value })}
                                    className="input-glass w-full pl-12"
                                    placeholder="ID number"
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
                                <span>Save</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
