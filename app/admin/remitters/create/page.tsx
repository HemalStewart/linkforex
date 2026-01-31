'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';

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

export default function CreateRemitterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl');

    const [activeTab, setActiveTab] = useState('general');
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const tabs = [
        { id: 'general', label: 'General' },
        { id: 'kyc', label: 'KYC & ID' },
    ];

    React.useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await fetch(ENDPOINTS.BRANCHES.LIST);
                if (res.ok) {
                    const data = await res.json();
                    setBranches(data);
                }
            } catch (e) {
                console.error("Failed to fetch branches", e);
            }
        };
        fetchBranches();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const data: any = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Map fields to API expects for individual client
        const apiData: any = {
            client_type: 'individual',
            status: 'active',
            branch: data.branch_id,
            role: 'customer', // Keep 'customer' role for backend consistency if that's what backend expects for remitters
            name: data.sender_name,
            phone: data.telephone,
            dob: data.date_of_birth,
            place_of_birth: data.place_of_birth,
            occupation: data.occupation,
            address_1: data.address_1,
            address_2: data.address_2,
            city: data.city,
            postcode: data.postcode,
            county: data.county,
            country: data.country,
            id_type: data.id_type,
            id_number: data.id_no,
            id_expiry: data.id_expire_date,
            email: 'individual@example.com', // Placeholder as form lacks email
        };

        try {
            const res = await fetch(ENDPOINTS.REMITTERS.LIST, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiData),
            });

            if (!res.ok) {
                const errData = await res.json();
                console.error('Error creating remitter:', errData);
                alert('Failed to create remitter: ' + (JSON.stringify(errData.messages) || res.statusText));
                return;
            }

            const result = await res.json();
            alert('Remitter Created Successfully!');

            if (returnUrl) {
                router.push(returnUrl);
            } else {
                router.push('/admin/remitters');
            }
        } catch (error) {
            console.error('Failed to submit:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
            <div className="mb-8">
                <nav className="flex items-center text-sm text-slate-500 mb-2">
                    <Link href="/admin/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
                    <span className="mx-2">/</span>
                    <Link href="/admin/remitters" className="hover:text-slate-900 dark:hover:text-white transition-colors">Remitters</Link>
                    <span className="mx-2">/</span>
                    <span className="text-slate-900 dark:text-white font-medium">Add New</span>
                </nav>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add New Remitter</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Enter the details of the new remitter below.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">

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
                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Branch Selection Highlight */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 grid gap-4">
                                <div className="w-full">
                                    <label htmlFor="branch_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                        Branch *
                                    </label>
                                    <select
                                        id="branch_id"
                                        name="branch_id"
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow transition-colors"
                                    >
                                        {branches.length > 0 ? branches.map((b: any) => (
                                            <option key={b.id} value={b.code || b.name}>{b.name} ({b.code})</option>
                                        )) : <option value="LON001">London - Link Forex Ltd</option>}
                                    </select>
                                </div>
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

                    {/* KYC & ID TAB */}
                    {activeTab === 'kyc' && (
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
                                    <FormFileUpload label="ID Copy / Passport" name="passport_copy" />
                                    <FormFileUpload label="Proof of Address" name="proof_of_address_doc" />
                                    <FormFileUpload label="Source of Income/Funds" name="work_related_docs" />
                                    <FormFileUpload label="Signature" name="signature_file_name" />
                                    <FormFileUpload label="AML Screening Doc" name="sender_details_aml_screening_doc" />
                                    <FormFileUpload label="Other Supporting Document" name="other_doc" />
                                </div>
                            </div>
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
                        disabled={loading}
                        className={`px-8 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span>{loading ? 'Creating...' : 'Create Remitter'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
