'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';

// --- HELPER COMPONENTS (Reused) ---

function FormInput({ label, name, type = 'text', placeholder, disabled, step, defaultValue, required }: any) {
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
                required={required}
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

    const [clientType, setClientType] = useState<'individual' | 'business'>('individual');
    const [activeTab, setActiveTab] = useState('general');
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
        shouldRedirect: false,
        redirectUrl: ''
    });

    // Receiver State
    interface Receiver {
        firstName: string;
        lastName: string;
        relation: string;
        accountName: string;
        accountNumber: string;
        bankName: string;
        branchName: string;
    }
    const [receivers, setReceivers] = useState<Receiver[]>([
        { firstName: '', lastName: '', relation: '', accountName: '', accountNumber: '', bankName: '', branchName: '' }
    ]);

    const addReceiver = () => {
        setReceivers([...receivers, { firstName: '', lastName: '', relation: '', accountName: '', accountNumber: '', bankName: '', branchName: '' }]);
    };

    const removeReceiver = (index: number) => {
        if (receivers.length > 1) {
            setReceivers(receivers.filter((_, i) => i !== index));
        }
    };

    const updateReceiver = (index: number, field: keyof Receiver, value: string) => {
        const updated = [...receivers];
        updated[index][field] = value;
        setReceivers(updated);
    };

    // Director State
    interface Director {
        name: string;
        dob: string;
        address: string;
        idType: string;
        idNumber: string;
    }
    const [directors, setDirectors] = useState<Director[]>([
        { name: '', dob: '', address: '', idType: 'Passport', idNumber: '' }
    ]);

    const addDirector = () => setDirectors([...directors, { name: '', dob: '', address: '', idType: 'Passport', idNumber: '' }]);
    const removeDirector = (index: number) => setDirectors(directors.filter((_, i) => i !== index));
    const updateDirector = (index: number, field: keyof Director, value: string) => {
        const updated = [...directors];
        updated[index][field] = value;
        setDirectors(updated);
    };

    const tabs = [
        { id: 'general', label: 'General Details' },
        ...(clientType === 'business' ? [{ id: 'directors', label: 'Directors' }] : []),
        { id: 'kyc', label: 'KYC Documents' },
        { id: 'receivers', label: 'Beneficiaries' },
    ];

    const currentTabIndex = tabs.findIndex(t => t.id === activeTab);
    const isLastTab = currentTabIndex === tabs.length - 1;
    const isFirstTab = currentTabIndex === 0;

    const handleNext = () => {
        // Validation logic based on activeTab
        if (activeTab === 'general') {
            // Basic validation - check required fields via HTML5 validity or ref refs would be better
            // For now, allow simple pass, real validation happens on submit or we can add specific checks here
            const form = document.getElementById('createSenderForm') as HTMLFormElement;
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
        }

        if (activeTab === 'directors') {
            if (directors.length === 0 || !directors[0].name) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Validation Error',
                    message: 'Business clients must have at least one director.',
                    type: 'warning',
                    isAlert: true,
                    shouldRedirect: false,
                    redirectUrl: ''
                });
                return;
            }
        }

        if (currentTabIndex < tabs.length - 1) {
            setActiveTab(tabs[currentTabIndex + 1].id);
            window.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        if (currentTabIndex > 0) {
            setActiveTab(tabs[currentTabIndex - 1].id);
            window.scrollTo(0, 0);
        } else {
            router.back();
        }
    };

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

        // Validation: At least 1 receiver
        if (receivers.length === 0 || !receivers[0].firstName || !receivers[0].accountNumber) {
            setConfirmModal({
                isOpen: true,
                title: 'Validation Error',
                message: 'Please add at least one complete receiver.',
                type: 'warning',
                isAlert: true,
                shouldRedirect: false,
                redirectUrl: ''
            });
            setActiveTab('receivers');
            return;
        }

        // Validation: Business requires at least 1 director
        if (clientType === 'business' && (directors.length === 0 || !directors[0].name)) {
            setConfirmModal({
                isOpen: true,
                title: 'Validation Error',
                message: 'Business clients must have at least one director.',
                type: 'warning',
                isAlert: true,
                shouldRedirect: false,
                redirectUrl: ''
            });
            setActiveTab('directors');
            return;
        }

        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const data: any = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Map fields to API expects for individual client
        const apiData: any = {
            client_type: clientType,
            status: 'active',
            branch: data.branch_id,
            role: 'customer',
            name: clientType === 'business' ? data.company_name : data.sender_name,
            phone: data.telephone,

            // Individual Fields
            dob: clientType === 'business' ? null : data.date_of_birth,
            place_of_birth: clientType === 'business' ? null : data.place_of_birth,
            occupation: clientType === 'business' ? null : data.occupation,

            // Business Fields
            company_name: clientType === 'business' ? data.company_name : null,
            company_type: clientType === 'business' ? data.company_type : null,
            company_reg_no: clientType === 'business' ? data.company_reg_no : null,

            address_1: data.address_1,
            address_2: data.address_2,
            city: data.city,
            postcode: data.postcode,
            county: data.county,
            country: data.country,

            // ID details (For business, this might be primary contact ID or null if directors handled separately)
            id_type: data.id_type,
            id_number: data.id_no,
            id_expiry: data.id_expire_date,
            email: 'individual@example.com', // Placeholder
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
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to create remitter: ' + (JSON.stringify(errData.messages) || res.statusText),
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false,
                    redirectUrl: ''
                });
                return;
            }

            const result = await res.json();
            const remitterId = result.id; // Assuming API returns the created ID

            // 2. Create Directors (if business)
            if (clientType === 'business') {
                const directorPromises = directors.map(d => {
                    return fetch(ENDPOINTS.DIRECTORS.LIST, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            remitter_id: remitterId,
                            name: d.name,
                            dob: d.dob,
                            address: d.address,
                            id_type: d.idType,
                            id_number: d.idNumber
                        })
                    });
                });
                await Promise.all(directorPromises);
            }

            // 3. Create Receivers
            const receiverPromises = receivers.map(r => {
                return fetch(ENDPOINTS.BENEFICIARIES.LIST, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_id: remitterId,
                        name: r.firstName + ' ' + r.lastName,
                        account_number: r.accountNumber,
                        bank_name: r.bankName,
                        branch_name: r.branchName,
                        relation: r.relation,
                        status: 'active'
                    })
                });
            });

            await Promise.all(receiverPromises);

            await Promise.all(receiverPromises);

            setConfirmModal({
                isOpen: true,
                title: 'Success',
                message: `New ${clientType === 'business' ? 'Business' : 'Individual'} Remitter Created Successfully!`,
                type: 'info',
                isAlert: true,
                shouldRedirect: true,
                redirectUrl: returnUrl ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}newRemitterId=${remitterId}` : '/admin/remitters'
            });

        } catch (error) {
            console.error('Failed to submit:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred. Please try again.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
                redirectUrl: ''
            });
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect && confirmModal.redirectUrl) {
            router.push(confirmModal.redirectUrl);
        }
    };

    return (
        <div className="w-full px-6 md:px-12 pb-20 animate-fade-in">
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
                {/* Tabs / Steps */}
                <div className="px-8 pt-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex space-x-8">
                        {tabs.map((tab, index) => (
                            <div
                                key={tab.id}
                                className={`pb-4 text-sm font-medium border-b-2 flex items-center space-x-2 ${activeTab === tab.id
                                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                                    : index < currentTabIndex
                                        ? 'border-transparent text-emerald-600 dark:text-emerald-400'
                                        : 'border-transparent text-slate-400 dark:text-slate-500'
                                    }`}
                            >
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' :
                                    index < currentTabIndex ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {index + 1}
                                </span>
                                <span>{tab.label}</span>
                            </div>
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

                            <div className="flex flex-col md:flex-row gap-6 mb-6">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Client Type</label>
                                    <div className="flex space-x-4">
                                        <label className={`flex-1 border rounded-lg p-4 cursor-pointer transition-colors ${clientType === 'individual' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                            <input type="radio" name="clientType" value="individual" className="sr-only" checked={clientType === 'individual'} onChange={() => setClientType('individual')} />
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${clientType === 'individual' ? 'border-indigo-600' : 'border-slate-400'}`}>
                                                    {clientType === 'individual' && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                                                </div>
                                                <span className={`font-medium ${clientType === 'individual' ? 'text-indigo-900' : 'text-slate-700 dark:text-slate-300'}`}>Individual</span>
                                            </div>
                                        </label>
                                        <label className={`flex-1 border rounded-lg p-4 cursor-pointer transition-colors ${clientType === 'business' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                            <input type="radio" name="clientType" value="business" className="sr-only" checked={clientType === 'business'} onChange={() => setClientType('business')} />
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${clientType === 'business' ? 'border-indigo-600' : 'border-slate-400'}`}>
                                                    {clientType === 'business' && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                                                </div>
                                                <span className={`font-medium ${clientType === 'business' ? 'text-indigo-900' : 'text-slate-700 dark:text-slate-300'}`}>Business</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="Sender ID" name="sender_id" placeholder="Auto-generated" disabled defaultValue={'LF3992'} />

                                {clientType === 'business' ? (
                                    <>
                                        <div className="md:col-span-2">
                                            <FormInput label="Company Name *" name="company_name" placeholder="Registered Company Name" required />
                                        </div>
                                        <FormSelect label="Company Type *" name="company_type" options={['LTD', 'PLC', 'Sole Trader', 'Partnership', 'LLP']} />
                                        <FormInput label="Company Reg No *" name="company_reg_no" placeholder="Registration Number" required />
                                    </>
                                ) : (
                                    <>
                                        <FormInput label="Sender Name *" name="sender_name" placeholder="Full Name" required />
                                        <FormInput label="Date of Birth *" name="date_of_birth" type="date" required />
                                        <FormInput label="Place of Birth" name="place_of_birth" placeholder="City, Country" />
                                        <FormInput label="Occupation" name="occupation" placeholder="e.g. Engineer" />
                                    </>
                                )}

                                <FormInput label="Telephone *" name="telephone" placeholder="+44..." required />
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

                    {/* DIRECTORS TAB */}
                    {activeTab === 'directors' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
                                Please add at least one director for this business.
                            </div>

                            {directors.map((director, index) => (
                                <div key={index} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 relative group">
                                    <div className="absolute top-4 right-4">
                                        {directors.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeDirector(index)}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-4">Director #{index + 1}</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-1">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name *</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={director.name}
                                                onChange={(e) => updateDirector(index, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date of Birth *</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={director.dob}
                                                onChange={(e) => updateDirector(index, 'dob', e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Residential Address *</label>
                                            <textarea
                                                required
                                                rows={2}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={director.address}
                                                onChange={(e) => updateDirector(index, 'address', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">ID Type</label>
                                            <select
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={director.idType}
                                                onChange={(e) => updateDirector(index, 'idType', e.target.value)}
                                            >
                                                <option>Passport</option>
                                                <option>Driving License</option>
                                                <option>National ID</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">ID Number</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={director.idNumber}
                                                onChange={(e) => updateDirector(index, 'idNumber', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-center pt-4">
                                <button
                                    type="button"
                                    onClick={addDirector}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors flex items-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    <span>Add Another Director</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* RECEIVERS TAB */}
                    {activeTab === 'receivers' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                                Please add at least one receiver (Beneficiary) for this remitter.
                            </div>

                            {receivers.map((receiver, index) => (
                                <div key={index} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 relative group">
                                    <div className="absolute top-4 right-4">
                                        {receivers.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeReceiver(index)}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-4">Receiver #{index + 1}</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">First Name *</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={receiver.firstName}
                                                onChange={(e) => updateReceiver(index, 'firstName', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Last Name *</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={receiver.lastName}
                                                onChange={(e) => updateReceiver(index, 'lastName', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Relationship *</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={receiver.relation}
                                                onChange={(e) => updateReceiver(index, 'relation', e.target.value)}
                                            />
                                        </div>

                                        <div className="md:col-span-3 h-px bg-slate-200 dark:bg-slate-700 my-2"></div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Bank Name *</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={receiver.bankName}
                                                onChange={(e) => updateReceiver(index, 'bankName', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Branch Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={receiver.branchName}
                                                onChange={(e) => updateReceiver(index, 'branchName', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Account Number *</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={receiver.accountNumber}
                                                onChange={(e) => updateReceiver(index, 'accountNumber', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-center pt-4">
                                <button
                                    type="button"
                                    onClick={addReceiver}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition-colors flex items-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    <span>Add Another Receiver</span>
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {isFirstTab ? 'Cancel' : 'Back'}
                    </button>

                    <div className="flex space-x-4">
                        {!isLastTab && (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-8 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                Next Step
                            </button>
                        )}

                        {isLastTab && (
                            <button
                                type="submit"
                                form="createSenderForm"
                                disabled={loading}
                                className={`px-8 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span>{loading ? 'Creating...' : 'Create Remitter'}</span>
                            </button>
                        )}
                    </div>
                </div>
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
            </div>
        </div>
    );
}
