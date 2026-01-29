'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// --- HELPER COMPONENTS (Reused) ---

function FormInput({ label, name, type = 'text', placeholder, disabled, step, defaultValue }: any) {
    return (
        <div className="w-full">
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {label}
            </label>
            <input
                type={type}
                id={name}
                name={name}
                disabled={disabled}
                step={step}
                defaultValue={defaultValue}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition-shadow transition-colors"
                placeholder={placeholder}
            />
        </div>
    );
}

function FormSelect({ label, name, options, defaultValue }: any) {
    return (
        <div className="w-full">
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {label}
            </label>
            <select
                id={name}
                name={name}
                defaultValue={defaultValue}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow transition-colors"
            >
                {options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}

function FormFileUpload({ label, name, compact, defaultValue }: any) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {label}
            </label>
            <div className={`border border-dashed border-slate-300 dark:border-slate-600 rounded-lg ${compact ? 'px-3 py-2' : 'px-4 py-6'} bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center relative max-w-full overflow-hidden`}>
                <div className="flex flex-col items-center justify-center">
                    {!compact && (
                        <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate w-full px-2">
                        {defaultValue ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">{defaultValue}</span>
                        ) : (
                            compact ? 'Upload' : 'Click to upload'
                        )}
                    </span>
                    <input type="file" name={name} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
            </div>
        </div>
    );
}

function DocumentRow({ label, name }: any) {
    return (
        <div className="flex items-center space-x-2 md:space-x-4 py-1">
            <div className="w-1/3 min-w-[120px]">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate block" title={label}>{label}</span>
            </div>
            <div className="flex-1 flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1">
                <label className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-600">
                    Browse
                    <input type="file" name={name} className="hidden" />
                </label>
                <span className="text-xs text-slate-400 dark:text-slate-500 flex-1 truncate">No file selected.</span>
                <button type="button" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium px-1">Upload</button>
                <button type="button" className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 font-medium px-1">Clear</button>
            </div>
        </div>
    );
}

export default function CreateCustomerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl');

    const [clientType, setClientType] = useState('individual'); // 'individual' or 'business'
    const [activeTab, setActiveTab] = useState('general');

    // Define tabs based on client type
    const tabs = clientType === 'individual' ? [
        { id: 'general', label: 'General' },
        { id: 'kyc', label: 'KYC & ID' },
    ] : [
        { id: 'business', label: 'Business Client' },
        { id: 'directors', label: 'Directors' },
    ];

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // In a real app, you would save data here.
        alert('Customer Created Successfully!');

        if (returnUrl) {
            router.push(returnUrl);
        } else {
            router.push('/admin/customers');
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
            <div className="mb-8">
                <nav className="flex items-center text-sm text-slate-500 mb-2">
                    <Link href="/admin/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
                    <span className="mx-2">/</span>
                    <Link href="/admin/customers" className="hover:text-slate-900 dark:hover:text-white transition-colors">Customers</Link>
                    <span className="mx-2">/</span>
                    <span className="text-slate-900 dark:text-white font-medium">Add New</span>
                </nav>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add New Customer</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Enter the details of the new customer below.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* VISIBLE CLIENT TYPE TOGGLE */}
                <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                        client type
                    </span>
                    <div className="flex p-1 bg-slate-200 dark:bg-slate-950 rounded-lg max-w-md">
                        <button
                            type="button"
                            onClick={() => {
                                setClientType('individual');
                                setActiveTab('general');
                            }}
                            className={`flex-1 py-3 px-4 rounded-md text-sm font-bold transition-all flex items-center justify-center space-x-2 ${clientType === 'individual'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <span>Private Individual</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setClientType('business');
                                setActiveTab('business');
                            }}
                            className={`flex-1 py-3 px-4 rounded-md text-sm font-bold transition-all flex items-center justify-center space-x-2 ${clientType === 'business'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            <span>Business Client</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-8 pt-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                type="button"
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Content */}
                <form id="createSenderForm" onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* GENERAL TAB (Individual) */}
                    {clientType === 'individual' && activeTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Branch Selection Highlight */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 grid gap-4">
                                <FormSelect
                                    label="Branch *"
                                    name="branch_id"
                                    options={['London - Link Forex Ltd', 'Manchester', 'Birmingham']}
                                    defaultValue={'London - Link Forex Ltd'}
                                />
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="sanction_list_verified"
                                        name="sanction_list_verified"
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="sanction_list_verified" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Sanction List Verified
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="Sender ID" name="sender_id" placeholder="Auto-generated" disabled defaultValue={'LF3992'} />
                                <FormInput label="Sender Name *" name="sender_name" placeholder="Full Name" />
                                <FormInput label="Date of Birth *" name="date_of_birth" type="date" />
                                <FormInput label="Place of Birth" name="place_of_birth" placeholder="City, Country" />
                                <FormInput label="Telephone *" name="telephone" placeholder="+44..." />
                                <FormInput label="Occupation" name="occupation" placeholder="e.g. Engineer" />
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-4">Address Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <FormInput label="Address Line 1 *" name="address_1" placeholder="House/Flat Number, Street" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <FormInput label="Address Line 2" name="address_2" placeholder="Locality / Area" />
                                    </div>
                                    <FormInput label="City *" name="city" placeholder="e.g. London" />
                                    <FormInput label="Postcode *" name="postcode" placeholder="e.g. SW1A 1AA" />
                                    <FormInput label="County" name="county" />
                                    <FormInput label="Country *" name="country" defaultValue="United Kingdom" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* KYC & ID TAB (Individual) */}
                    {clientType === 'individual' && activeTab === 'kyc' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormSelect label="ID Type *" name="id_type" options={['Passport', 'Driving License', 'National ID', 'Residence Permit']} />
                                <FormInput label="ID Number *" name="id_no" />
                                <FormInput label="ID Expiry Date *" name="id_expire_date" type="date" />

                                <div className="pt-8 md:col-span-2">
                                    <div className="flex flex-wrap gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center space-x-2">
                                            <input type="checkbox" id="id_verified" name="id_verified" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                            <label htmlFor="id_verified" className="text-sm font-bold text-slate-700 dark:text-slate-300">ID Verified</label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input type="checkbox" id="proof_of_funds" name="proof_of_funds" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                            <label htmlFor="proof_of_funds" className="text-sm font-bold text-slate-700 dark:text-slate-300">Proof of Funds</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-6">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Document Uploads</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormFileUpload label="Passport Copy" name="passport_copy" />
                                    <FormFileUpload label="Other Document" name="other_doc" />
                                    <FormFileUpload label="Work Related Docs" name="work_related_docs" />
                                    <FormFileUpload label="Signature" name="signature_file_name" />
                                    <FormFileUpload label="AML Screening Doc" name="sender_details_aml_screening_doc" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BUSINESS CLIENT TAB */}
                    {clientType === 'business' && activeTab === 'business' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <FormInput label="Company Name *" name="bc_company_name" placeholder="e.g. Acme Trading Ltd" />
                                </div>
                                <FormSelect label="Company Type *" name="bc_type_of_company" options={['LTD', 'PLC', 'Sole Trader', 'Partnership', 'LLP']} />
                                <FormInput label="Registration No. *" name="bc_company_house_no" />
                                <div className="md:col-span-2">
                                    <FormInput label="Trading Name" name="bc_trading_name" placeholder="If different from Company Name" />
                                </div>
                                <div className="md:col-span-2">
                                    <FormInput label="Registered Address *" name="bc_compnay_address" placeholder="Official Registered Address" />
                                </div>
                                <div className="md:col-span-2">
                                    <FormInput label="Trading Address" name="bc_trading_address" placeholder="Physical location if different" />
                                </div>
                                <FormInput label="Business Landline *" name="bc_landline_no" />
                            </div>
                        </div>
                    )}

                    {/* DIRECTORS TAB (Business) */}
                    {clientType === 'business' && activeTab === 'directors' && (
                        <div className="space-y-8 animate-fade-in">
                            {[1, 2, 3].map((num) => (
                                <div key={num} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 relative">
                                    <div className="absolute top-0 left-0 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-br-xl text-xs font-bold uppercase tracking-wider">
                                        Director {num}
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <FormInput label="Full Name" name={`bc_d${num}_name`} />
                                        <FormInput label="Shareholding (%)" name={`bc_d${num}_number_of_shares`} type="number" step="0.01" />
                                        <FormInput label="Date of Birth" name={`bc_d${num}_dob`} type="date" />
                                        <FormInput label="Place of Birth" name={`bc_d${num}_place_of_birth`} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                                        <div className="md:col-span-2">
                                            <FormInput label="Address Line 1" name={`bc_d${num}_address1`} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <FormInput label="Address Line 2" name={`bc_d${num}_address2`} />
                                        </div>
                                        <FormInput label="Postcode" name={`bc_d${num}_post_code`} />
                                        <FormInput label="Country" name={`bc_d${num}_country`} />
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Required Documents</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            <DocumentRow label="ID Document" name={`bc_d${num}_file_director_id`} />
                                            <DocumentRow label="Proof Of Address" name={`bc_d${num}_file_proof_of_address`} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="createSenderForm"
                        className="px-8 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 flex items-center"
                    >
                        <span>Create Customer</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
