'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Mock Data for Search
const MOCK_REMITTERS = [
    { id: '1', name: 'John Smith', phone: '+447700900123', email: 'john@example.com' },
    { id: '2', name: 'Sarah Johnson', phone: '+447700900456', email: 'sarah@example.com' },
];

const MOCK_BENEFICIARIES = [
    { id: 'b1', name: 'Ahmad Khan', bank: 'ABL', account: '0010020030040050' },
    { id: 'b2', name: 'Fatima Noor', bank: 'HBL', account: '1122334455667788' },
];

export default function CreateTransferPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);

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
        purpose: 'Family Support'
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<typeof MOCK_REMITTERS>([]);
    const [selectedRemitter, setSelectedRemitter] = useState<any>(null);

    const handleSearchRemitter = () => {
        // Mock search logic
        if (!searchTerm) {
            setSearchResults([]);
            return;
        }
        const results = MOCK_REMITTERS.filter(r =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.phone.includes(searchTerm)
        );
        setSearchResults(results);
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

    const selectRemitter = (remitter: any) => {
        setSelectedRemitter(remitter);
        setFormData(prev => ({
            ...prev,
            remitterId: remitter.id,
            remitterName: remitter.name,
            remitterPhone: remitter.phone
        }));
        // Reset results to hide list
        setSearchResults([]);
        // Trigger screening
        simulateScreening('remitter');
    };

    const selectReceiver = (receiver: any) => {
        setFormData(prev => ({ ...prev, receiverName: receiver.name, receiverBank: receiver.bank }));
        simulateScreening('receiver');
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = () => {
        // In a real app, submit data to API
        alert('Transfer Created Successfully (Mock)');
        router.push('/admin/transfers');
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-20">
            {/* Header / Breadcrumbs */}
            <div className="mb-8">
                <nav className="flex items-center text-sm text-slate-500 mb-2">
                    <Link href="/admin/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
                    <span className="mx-2">/</span>
                    <Link href="/admin/transfers" className="hover:text-slate-900 dark:hover:text-white transition-colors">Transfers</Link>
                    <span className="mx-2">/</span>
                    <span className="text-slate-900 dark:text-white font-medium">New Transfer</span>
                </nav>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Transfer</h1>
            </div>

            {/* Stepper */}
            <div className="mb-8">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10"></div>

                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className={`flex flex-col items-center bg-slate-50 dark:bg-slate-900 px-2`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${step >= s
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">

                {/* Step 1: Remitter Selection */}
                {step === 1 && (
                    <div className="p-8 space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Who is sending money?</h2>
                            <p className="text-slate-500 text-sm">Search for an existing customer or add a new one.</p>
                        </div>

                        {/* Search & Select */}
                        <div className="max-w-lg mx-auto space-y-4">
                            {!selectedRemitter ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by Name or Phone (Try 'John' or '077')..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyUp={(e) => e.key === 'Enter' && handleSearchRemitter()}
                                            className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all"
                                        />
                                        <button
                                            onClick={handleSearchRemitter}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </button>
                                    </div>

                                    {/* Search Results */}
                                    {searchResults.length > 0 && (
                                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
                                            {searchResults.map(r => (
                                                <div
                                                    key={r.id}
                                                    onClick={() => selectRemitter(r)}
                                                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center justify-between transition-colors"
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                                                        <p className="text-sm text-slate-500">{r.phone}</p>
                                                    </div>
                                                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">Select</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="text-center pt-4">
                                        <span className="text-slate-400 text-sm">or</span>
                                    </div>

                                    <button
                                        className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 font-medium hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, isNewRemitter: true }));
                                            selectRemitter({ id: 'new', name: 'New Customer', phone: '' });
                                        }}
                                    >
                                        + Add New Customer
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center relative animate-fade-in">
                                    <button
                                        onClick={() => {
                                            setSelectedRemitter(null);
                                            setScreeningStatus('idle');
                                        }}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                    <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-slate-500">
                                        {formData.remitterName.charAt(0)}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{formData.remitterName}</h3>

                                    {/* Sanction Screening Widget */}
                                    <div className="my-4 flex items-center justify-center">
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
                                            <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full text-xs font-bold animate-fade-in">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Sanction Check Passed</span>
                                            </div>
                                        )}
                                    </div>

                                    {formData.isNewRemitter ? (
                                        <div className="mt-4 space-y-3 text-left">
                                            <input
                                                className="w-full p-2 border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                                                placeholder="Full Name"
                                                value={formData.remitterName === 'New Customer' ? '' : formData.remitterName}
                                                onChange={e => setFormData({ ...formData, remitterName: e.target.value })}
                                            />
                                            <input
                                                className="w-full p-2 border rounded bg-white dark:bg-slate-800 dark:border-slate-600"
                                                placeholder="Phone Number"
                                                value={formData.remitterPhone}
                                                onChange={e => setFormData({ ...formData, remitterPhone: e.target.value })}
                                            />
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
                            {MOCK_BENEFICIARIES.map(b => (
                                <div
                                    key={b.id}
                                    onClick={() => selectReceiver(b)}
                                    className={`p-4 border rounded-xl cursor-pointer transition-all ${formData.receiverName === b.name
                                            ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-700 ring-1 ring-slate-900 dark:ring-white'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{b.name}</p>
                                            <p className="text-sm text-slate-500">{b.bank}</p>
                                            <p className="text-xs text-slate-400 mt-1 font-mono">{b.account}</p>
                                        </div>
                                        {formData.receiverName === b.name && (
                                            <div className="w-5 h-5 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-slate-900">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Add New Beneficiary Button */}
                            <button className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-colors min-h-[120px]">
                                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                <span className="font-medium">Add New Receiver</span>
                            </button>
                        </div>

                        {/* Sanction Screening for Receiver */}
                        {formData.receiverName && (
                            <div className="flex justify-center pt-4 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
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
                                    <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full text-xs font-bold animate-fade-in">
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
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">You Send (GBP)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">£</span>
                                            <input
                                                type="number"
                                                className="w-full pl-8 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-lg font-bold"
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
                                        <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-1 rounded-full text-xs font-mono font-medium z-10 text-slate-500">
                                            1 GBP = {formData.rate} PKR
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">They Get (PKR)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₨</span>
                                            <input
                                                type="number"
                                                className="w-full pl-8 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-lg font-bold"
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label>
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Source of Funds</label>
                                    <select
                                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
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
                                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
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

                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
                            {/* Amount Summary */}
                            <div className="p-6 text-center bg-slate-900 dark:bg-slate-800 text-white">
                                <p className="text-slate-400 text-sm uppercase tracking-wide font-semibold mb-1">Total Payout Amount</p>
                                <div className="text-3xl font-bold">₨ {Number(formData.destAmount).toLocaleString()} <span className="text-lg text-slate-400 font-normal">PKR</span></div>
                                <div className="text-sm text-slate-400 mt-2">Rate: 1 GBP = {formData.rate} PKR</div>
                                <div className="mt-4 flex justify-center space-x-4">
                                    <span className="flex items-center space-x-1 text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2 py-1 rounded">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span>Remitter Screened</span>
                                    </span>
                                    <span className="flex items-center space-x-1 text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2 py-1 rounded">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span>Receiver Screened</span>
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-2 gap-8 text-sm">
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs flex items-center justify-center mr-2">1</span>
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
                                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs flex items-center justify-center mr-2">2</span>
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
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <button
                        onClick={prevStep}
                        disabled={step === 1}
                        className={`px-6 py-2.5 font-bold rounded-lg transition-colors ${step === 1
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        Back
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={nextStep}
                            disabled={
                                (step === 1 && (!formData.remitterName || screeningStatus !== 'passed')) ||
                                (step === 2 && (!formData.receiverName || receiverScreeningStatus !== 'passed')) ||
                                (step === 3 && !formData.sourceAmount)
                            }
                            className="px-8 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/20 dark:shadow-none flex items-center space-x-2"
                        >
                            <span>Next Step</span>
                            {(step === 1 && screeningStatus === 'scanning') || (step === 2 && receiverScreeningStatus === 'scanning') ? (
                                <svg className="w-4 h-4 animate-spin ml-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : null}
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            className="px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
                        >
                            Confirm Transfer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
