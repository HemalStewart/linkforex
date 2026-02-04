'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';

// Helpers and Modal code moved to /admin/users/create

export default function CreateTransferPage() {
    const router = useRouter();
    const searchParams = useSearchParams(); // Need to import this
    const [step, setStep] = useState(1);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
        shouldRedirect: false
    });

    // Screening State
    const [screeningStatus, setScreeningStatus] = useState<'idle' | 'scanning' | 'passed' | 'failed'>('idle');
    const [receiverScreeningStatus, setReceiverScreeningStatus] = useState<'idle' | 'scanning' | 'passed' | 'failed'>('idle');

    // Form State
    const [formData, setFormData] = useState({
        // Remitter
        remitterId: '',
        remitterName: '',
        remitterPhone: '',
        isNewRemitter: false,
        // Receiver
        receiverId: '',
        receiverName: '',
        receiverBank: '',
        receiverAccount: '',
        isNewReceiver: false,
        // Payment
        sourceAmount: '',
        destAmount: '',
        rate: '360.00',
        paymentMode: 'D', // D=Direct, C=Cash, etc.
        sourceOfFunds: 'Salary',
        purpose: 'Family Support',
        branchId: '',
        type: 'branch', // Default for Admin Panel
        collectionMethod: 'cash'
    });

    // Persist Form Data
    useEffect(() => {
        const savedData = sessionStorage.getItem('transferFormData');
        if (savedData) {
            setFormData(JSON.parse(savedData));
        }
        const savedStep = sessionStorage.getItem('transferFormStep');
        if (savedStep) {
            setStep(parseInt(savedStep));
        }
    }, []);

    useEffect(() => {
        sessionStorage.setItem('transferFormData', JSON.stringify(formData));
    }, [formData]);

    useEffect(() => {
        sessionStorage.setItem('transferFormStep', step.toString());
    }, [step]);

    // Handle Return from Create Remitter
    useEffect(() => {
        const newRemitterId = searchParams.get('newRemitterId');
        if (newRemitterId) {
            const fetchNewRemitter = async () => {
                try {
                    const res = await fetch(`${ENDPOINTS.REMITTERS.DETAIL(newRemitterId)}`);
                    if (res.ok) {
                        const remitter = await res.json();
                        selectRemitter(remitter);
                        // Optional: Clear the param from URL to avoid re-selecting on refresh? 
                        // For now, it's fine.
                    }
                } catch (e) { console.error(e); }
            };
            fetchNewRemitter();
        }
    }, [searchParams]);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedRemitter, setSelectedRemitter] = useState<any>(null);
    const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await fetch(ENDPOINTS.BRANCHES.LIST);
                if (res.ok) {
                    const data = await res.json();
                    setBranches(data);
                }
            } catch (e) { console.error(e); }
        };
        fetchBranches();
    }, []);
    const [userRole, setUserRole] = useState('admin'); // 'admin' or 'branch_user'
    const [userBranch, setUserBranch] = useState('LON001');

    // ... useEffect ...

    // ... 

    const [hasSearched, setHasSearched] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Debounced Search Effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm) {
                handleSearchRemitter();
            } else {
                setSearchResults([]);
                setHasSearched(false);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, userRole, userBranch]);

    const handleSearchRemitter = async () => {
        if (!searchTerm) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }
        setIsSearching(true);
        try {
            let url = `${ENDPOINTS.REMITTERS.LIST}?search=${searchTerm}`;
            if (userRole === 'branch_user') {
                url += `&branch=${userBranch}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
                setHasSearched(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const simulateScreening = (type: 'remitter' | 'receiver') => {
        if (type === 'remitter') {
            setScreeningStatus('scanning');
            setTimeout(() => {
                setScreeningStatus('passed');
            }, 1500);
        } else {
            setReceiverScreeningStatus('scanning');
            setTimeout(() => {
                setReceiverScreeningStatus('passed');
            }, 1500);
        }
    };

    const selectRemitter = async (remitter: any) => {
        setSelectedRemitter(remitter);
        setScreeningStatus('idle'); // Reset status on new selection
        setFormData(prev => ({
            ...prev,
            remitterId: remitter.id,
            remitterName: remitter.name,
            remitterPhone: remitter.phone
        }));
        // Reset results to hide list
        setSearchResults([]);

        // Fetch Beneficiaries
        try {
            const res = await fetch(`${ENDPOINTS.BENEFICIARIES.LIST}?customer_id=${remitter.id}`);
            if (res.ok) {
                setBeneficiaries(await res.json());
            }
        } catch (e) { console.error(e); }

        // Sanction check is now manual, removed auto-call
    };

    const selectReceiver = (receiver: any) => {
        setFormData(prev => ({
            ...prev,
            receiverId: receiver.id,
            receiverName: receiver.name,
            receiverBank: receiver.bank_name || receiver.bank // Handle API field name
        }));
        setReceiverScreeningStatus('idle'); // Reset status
        // Sanction check is now manual, removed auto-call
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        try {
            const apiData = {
                remitter_id: formData.remitterId,
                branch_id: formData.branchId,
                beneficiary_id: formData.receiverId, // Should make sure we have this from receiver selection
                source_amount: formData.sourceAmount,
                dest_amount: formData.destAmount,
                rate: formData.rate,
                payment_mode: formData.paymentMode,
                source_of_funds: formData.sourceOfFunds,
                purpose: formData.purpose,
                type: formData.type,
                collection_method: formData.collectionMethod,
                status: 'pending'
            };

            const res = await fetch(ENDPOINTS.TRANSFERS.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiData)
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Transfer Created Successfully',
                    type: 'info',
                    isAlert: true,
                    shouldRedirect: true
                });
                // Clear Storage
                sessionStorage.removeItem('transferFormData');
                sessionStorage.removeItem('transferFormStep');
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to create transfer',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
            }
        } catch (e) {
            console.error(e);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Error submitting transfer',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/transfers');
        }
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in pb-20">
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
            {/* Header / Breadcrumbs */}
            <div className="mb-8">
                <nav className="flex items-center text-sm text-slate-500 mb-2">
                    <Link href="/admin/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
                    <span className="mx-2">/</span>
                    <Link href="/admin/transfers" className="hover:text-slate-900 dark:hover:text-white transition-colors">Transfers</Link>
                    <span className="mx-2">/</span>
                    <span className="text-slate-900 dark:text-white font-medium">New Transfer</span>
                </nav>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Transfer</h1>
                    <select
                        value={userRole}
                        onChange={(e) => {
                            setUserRole(e.target.value);
                            // If switching to branch user, auto-select that branch in form data if possible
                            if (e.target.value === 'branch_user') {
                                setFormData(prev => ({ ...prev, branchId: userBranch }));
                            }
                        }}
                        className="input-glass px-4 py-2 text-sm"
                    >
                        <option value="admin">Simulate: Super Admin</option>
                        <option value="branch_user">Simulate: Branch Manager (LON)</option>
                    </select>
                </div>
            </div>

            {/* Stepper */}
            <div className="mb-8">
                <div className="flex items-center justify-between relative pt-1">
                    <div className="absolute left-0 top-4 w-full h-[2px] bg-slate-200/70 dark:bg-slate-700/70 -z-10"></div>

                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex flex-col items-center px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${step >= s
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-white/70 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                }`}>
                                {s}
                            </div>
                            <span className={`text-xs mt-2 font-medium ${step >= s ? 'text-slate-900 dark:text-white' : 'text-slate-500'
                                }`}>
                                {s === 1 && 'Remitter'}
                                {s === 2 && 'Receiver'}
                                {s === 3 && 'Payment'}
                                {s === 4 && 'Review'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Card */}
            <div className="card-glass overflow-hidden">

                {/* Step 1: Remitter Selection */}
                {step === 1 && (
                    <div className="p-8 space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Who is sending money?</h2>
                            <p className="text-slate-500 text-sm">Search for an existing remitter or add a new one.</p>
                        </div>

                        {/* Search & Select */}
                        <div className="max-w-4xl mx-auto space-y-4">
                            {!selectedRemitter ? (
                                <div className="space-y-4">
                                    <div className="relative input-icon">
                                        <span className="input-icon-left">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="Search by Name or Phone (Try 'John' or '077')..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyUp={(e) => e.key === 'Enter' && handleSearchRemitter()}
                                            className="input-glass w-full pr-12 py-3"
                                        />
                                        {isSearching ? (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 p-2">
                                                <svg className="w-5 h-5 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleSearchRemitter}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 glass-effect rounded-full hover:bg-white/70 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Search Results */}
                                    {searchResults.length > 0 ? (
                                        <div className="card-glass divide-y divide-slate-100/60 dark:divide-slate-700/60 max-h-60 overflow-y-auto">
                                            {searchResults.map(r => (
                                                <div
                                                    key={r.id}
                                                    onClick={() => selectRemitter(r)}
                                                    className="p-4 hover:bg-white/60 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between transition-colors"
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                                                        <p className="text-sm text-slate-500">{r.phone}</p>
                                                    </div>
                                                    <span className="badge-glass text-xs px-2 py-1">Select</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        hasSearched && !isSearching && (
                                            <div className="text-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-[24px] bg-white/40 dark:bg-slate-900/20">
                                                <p className="text-slate-500 dark:text-slate-400">No remitters found matching "{searchTerm}"</p>
                                            </div>
                                        )
                                    )}

                                    <div className="text-center pt-4">
                                        <span className="text-slate-400 text-sm">or</span>
                                    </div>

                                    <Link
                                        href="/admin/remitters/create?returnUrl=/admin/transfers/create"
                                        className="w-full py-3 glass-effect rounded-full text-slate-600 dark:text-slate-300 font-semibold hover:bg-white/70 dark:hover:bg-white/5 transition-colors flex items-center justify-center"
                                    >
                                        + Add New Remitter
                                    </Link>
                                </div>
                            ) : (
                                <div className="card-glass p-6 text-center relative animate-fade-in">
                                    <button
                                        onClick={() => {
                                            setSelectedRemitter(null);
                                            setScreeningStatus('idle');
                                        }}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                    <div className="avatar-circle avatar-circle-lg mx-auto mb-4">
                                        {formData.remitterName.charAt(0)}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{formData.remitterName}</h3>

                                    {/* Sanction Screening Widget */}
                                    {/* Sanction Screening Widget */}
                                    <div className="my-4 flex items-center justify-center">
                                        {screeningStatus === 'idle' && (
                                            <button
                                                onClick={() => simulateScreening('remitter')}
                                                className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 glass-effect hover:bg-white/70 dark:hover:bg-white/5 px-4 py-2 rounded-full text-xs font-bold transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>Check Sanctions</span>
                                            </button>
                                        )}
                                        {screeningStatus === 'scanning' && (
                                            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Running Sanction Check...</span>
                                            </div>
                                        )}
                                        {screeningStatus === 'passed' && (
                                            <div className="flex items-center space-x-2 text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-full text-xs font-bold animate-fade-in">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Sanction Check Passed</span>
                                            </div>
                                        )}
                                    </div>

                                    {formData.isNewRemitter ? (
                                        <div className="mt-4 space-y-3 text-left">
                                            <div className="relative input-icon">
                                                <span className="input-icon-left">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7 7 0 1118.88 6.196 7 7 0 015.12 17.804z" />
                                                    </svg>
                                                </span>
                                                <input
                                                    className="input-glass w-full"
                                                    placeholder="Full Name"
                                                    value={formData.remitterName === 'New Remitter' ? '' : formData.remitterName}
                                                    onChange={e => setFormData({ ...formData, remitterName: e.target.value })}
                                                />
                                            </div>
                                            <div className="relative input-icon">
                                                <span className="input-icon-left">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2l2 5-2 1a16 16 0 006 6l1-2 5 2v2a2 2 0 01-2 2h-1C9.716 19 5 14.284 5 8V7a2 2 0 00-2-2z" />
                                                    </svg>
                                                </span>
                                                <input
                                                    className="input-glass w-full"
                                                    placeholder="Phone Number"
                                                    value={formData.remitterPhone}
                                                    onChange={e => setFormData({ ...formData, remitterPhone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-slate-500">{formData.remitterPhone}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Receiver Selection */}
                {step === 2 && (
                    <div className="p-8 space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Who is receiving the money?</h2>
                            <p className="text-slate-500 text-sm">Select a beneficiary for {formData.remitterName}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Existing Beneficiaries */}
                            {beneficiaries.map(b => (
                                <div
                                    key={b.id}
                                    onClick={() => selectReceiver(b)}
                                    className={`p-4 border rounded-[24px] cursor-pointer transition-all ${formData.receiverName === b.name
                                        ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-900/20 ring-1 ring-teal-500/30'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{b.name}</p>
                                            <p className="text-sm text-slate-500">{b.bank}</p>
                                            <p className="text-xs text-slate-400 mt-1 font-mono">{b.account}</p>
                                        </div>
                                        {formData.receiverName === b.name && (
                                            <div className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center text-white">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Add New Beneficiary Button */}
                            <Link
                                href="/admin/receivers/create?returnUrl=/admin/transfers/create"
                                className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-[24px] flex flex-col items-center justify-center text-slate-500 hover:border-teal-300 hover:text-teal-600 transition-colors min-h-[120px]"
                            >
                                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                <span className="font-medium">Add New Receiver</span>
                            </Link>
                        </div>

                        {/* Sanction Screening for Receiver */}
                        {formData.receiverName && (
                            <div className="flex justify-center pt-4 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
                                {receiverScreeningStatus === 'idle' && (
                                    <button
                                        onClick={() => simulateScreening('receiver')}
                                        className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 glass-effect hover:bg-white/70 dark:hover:bg-white/5 px-4 py-2 rounded-full text-xs font-bold transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Check Beneficiary against Sanctions</span>
                                    </button>
                                )}
                                {receiverScreeningStatus === 'scanning' && (
                                    <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Checking Beneficiary against Sanctions...</span>
                                    </div>
                                )}
                                {receiverScreeningStatus === 'passed' && (
                                    <div className="flex items-center space-x-2 text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-full text-xs font-bold animate-fade-in">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Beneficiary Clean</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Payment Details */}
                {step === 3 && (
                    <div className="p-8 space-y-8">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">How much are they sending?</h2>
                            <p className="text-slate-500 text-sm">Enter amount and payment details.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Calculator */}
                            <div className="space-y-6">
                                <div className="card-glass p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">You Send (GBP)</label>
                                        <div className="relative input-icon">
                                            <span className="input-icon-left font-bold text-slate-400">£</span>
                                            <input
                                                type="number"
                                                className="input-glass w-full text-lg font-bold pr-4"
                                                placeholder="0.00"
                                                value={formData.sourceAmount}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    setFormData({
                                                        ...formData,
                                                        sourceAmount: e.target.value,
                                                        destAmount: val ? (val * parseFloat(formData.rate)).toFixed(2) : ''
                                                    });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center py-2 relative">
                                        <div className="h-px bg-slate-300 dark:bg-slate-600 w-full absolute"></div>
                                        <div className="glass-effect px-4 py-1.5 rounded-full text-sm font-mono font-medium z-10 text-slate-500 flex items-center shadow-sm">
                                            <span>1 GBP = </span>
                                            <input
                                                type="number"
                                                className="w-20 mx-2 px-1 py-0.5 input-glass text-center text-slate-900 dark:text-white focus:outline-none"
                                                value={formData.rate}
                                                onChange={(e) => {
                                                    const newRate = e.target.value;
                                                    const source = parseFloat(formData.sourceAmount);
                                                    setFormData({
                                                        ...formData,
                                                        rate: newRate,
                                                        destAmount: source && newRate ? (source * parseFloat(newRate)).toFixed(2) : ''
                                                    });
                                                }}
                                            />
                                            <span>PKR</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">They Get (PKR)</label>
                                        <div className="relative input-icon">
                                            <span className="input-icon-left font-bold text-slate-400 text-sm">PKR</span>
                                            <input
                                                type="number"
                                                className="input-glass w-full text-lg font-bold pr-4"
                                                placeholder="0.00"
                                                value={formData.destAmount}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Details */}
                            <div className="space-y-4">
                                {/* Hidden Fields for now as per request
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Channel (Type)</label>
                                        <select
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="branch">Branch (In-Person)</option>
                                            <option value="online">Online Web</option>
                                            <option value="mobile">Mobile App</option>
                                            <option value="agent">Agent</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transaction Location (Branch)</label>
                                        <select
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                            value={formData.branchId || ''}
                                            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                        >
                                            <option value="">Select Branch...</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.code || b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Collection Method</label>
                                        <select
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                            value={formData.collectionMethod}
                                            onChange={(e) => setFormData({ ...formData, collectionMethod: e.target.value })}
                                        >
                                            <option value="cash">Cash (Counter)</option>
                                            <option value="card">Card Payment</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Mode (Payout)</label>
                                        <select
                                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                            value={formData.paymentMode}
                                            onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                        >
                                            <option value="D">Direct Transfer (Bank Deposit)</option>
                                            <option value="P">Cash Pickup</option>
                                            <option value="C">Other Bank Transfer</option>
                                        </select>
                                    </div>
                                </div>
                            */}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Source of Funds</label>
                                    <select
                                        className="input-glass w-full"
                                        value={formData.sourceOfFunds}
                                        onChange={(e) => setFormData({ ...formData, sourceOfFunds: e.target.value })}
                                    >
                                        <option>Salary</option>
                                        <option>Savings</option>
                                        <option>Business Profit</option>
                                        <option>Gift</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purpose of Transfer</label>
                                    <input
                                        type="text"
                                        className="input-glass w-full"
                                        value={formData.purpose}
                                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review Transfer</h2>
                            <p className="text-slate-500 text-sm">Please confirm the details below.</p>
                        </div>

                        <div className="card-glass overflow-hidden divide-y divide-slate-200/50 dark:divide-slate-700/50">
                            {/* Amount Summary */}
                            <div className="p-6 text-center bg-gradient-to-br from-teal-600 via-teal-600 to-teal-500 text-white">
                                <p className="text-teal-100 text-sm uppercase tracking-wide font-semibold mb-1">Total Payout Amount</p>
                                <div className="text-3xl font-bold">PKR {Number(formData.destAmount).toLocaleString()}</div>
                                <div className="text-sm text-teal-100/80 mt-2">Rate: 1 GBP = {formData.rate} PKR</div>
                                <div className="mt-4 flex justify-center space-x-4">
                                    <span className="flex items-center space-x-1 text-teal-100 text-xs font-medium bg-white/15 px-2 py-1 rounded-full">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span>Remitter Screened</span>
                                    </span>
                                    <span className="flex items-center space-x-1 text-teal-100 text-xs font-medium bg-white/15 px-2 py-1 rounded-full">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span>Receiver Screened</span>
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-2 gap-8 text-sm">
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                                        <span className="w-6 h-6 rounded-full bg-teal-50/80 dark:bg-teal-900/20 text-xs flex items-center justify-center mr-2 text-teal-700 dark:text-teal-300">1</span>
                                        Remitter
                                    </h4>
                                    <div className="space-y-1 text-slate-600 dark:text-slate-300">
                                        <p className="font-medium text-slate-900 dark:text-white">{formData.remitterName}</p>
                                        <p>{formData.remitterPhone}</p>
                                        <p>{formData.sourceOfFunds}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                                        <span className="w-6 h-6 rounded-full bg-teal-50/80 dark:bg-teal-900/20 text-xs flex items-center justify-center mr-2 text-teal-700 dark:text-teal-300">2</span>
                                        Receiver
                                    </h4>
                                    <div className="space-y-1 text-slate-600 dark:text-slate-300">
                                        <p className="font-medium text-slate-900 dark:text-white">{formData.receiverName}</p>
                                        <p>{formData.receiverBank}</p>
                                        <p className="font-mono text-xs">{formData.receiverAccount}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer / Actions */}
                <div className="glass-effect p-6 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <button
                        onClick={prevStep}
                        disabled={step === 1}
                        className={`w-full sm:w-auto px-6 py-2.5 font-bold rounded-full transition-colors glass-effect ${step === 1
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-70'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/5'
                            }`}
                    >
                        Back
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={nextStep}
                            disabled={
                                (step === 1 && !formData.remitterName) ||
                                (step === 2 && !formData.receiverName) ||
                                (step === 3 && !formData.sourceAmount)
                            }
                            className="btn-primary w-full sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            <span>Next Step</span>
                            {(step === 1 && screeningStatus === 'scanning') || (step === 2 && receiverScreeningStatus === 'scanning') ? (
                                <svg className="w-4 h-4 animate-spin ml-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : null}
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            className="btn-primary w-full sm:flex-1 rounded-full"
                        >
                            Confirm Transfer
                        </button>
                    )}
                </div>
            </div>

        </div >
    );
}
