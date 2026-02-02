'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import {
    User, Calendar, MapPin, Briefcase, Phone, Building, CreditCard,
    Globe, FileText, Upload, Trash2, Plus, ArrowLeft, ArrowRight,
    CheckSquare, Shield, CheckCircle, AlertTriangle, Layers, Users
} from 'lucide-react';

// --- HELPER COMPONENTS (Reused) ---

function FormInput({ label, name, type = 'text', placeholder, disabled, step, defaultValue, required, Icon }: any) {
    return (
        <div className="w-full">
            <label htmlFor={name} className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                {label}
            </label>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                <input
                    type={type}
                    id={name}
                    name={name}
                    disabled={disabled}
                    step={step}
                    defaultValue={defaultValue}
                    required={required}
                    className={`input-glass w-full py-3 ${Icon ? 'pl-12' : 'pl-4'} pr-4 text-sm focus:scale-[1.01] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed`}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}

function FormSelect({ label, name, options, defaultValue, Icon }: any) {
    return (
        <div className="w-full">
            <label htmlFor={name} className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                {label}
            </label>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                <select
                    id={name}
                    name={name}
                    defaultValue={defaultValue}
                    className={`input-glass w-full py-3 ${Icon ? 'pl-12' : 'pl-4'} pr-10 appearance-none cursor-pointer text-sm`}
                >
                    {options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>
    );
}

function FormFileUpload({ label, name, compact, defaultValue }: any) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                {label}
            </label>
            <div className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl ${compact ? 'px-3 py-3' : 'px-4 py-8'} bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer text-center relative max-w-full overflow-hidden group hover:border-indigo-400 dark:hover:border-indigo-500`}>
                <div className="flex flex-col items-center justify-center">
                    {!compact && (
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                    )}
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate w-full px-2">
                        {defaultValue ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {defaultValue}
                            </span>
                        ) : (
                            <span className="group-hover:text-indigo-500 transition-colors">{compact ? 'Upload' : 'Click to upload document'}</span>
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
        <div className="w-full px-6 md:px-12 pb-20 animate-fade-in relative z-10">
            {/* Background Decorations */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <nav className="flex items-center text-sm text-slate-500 mb-2">
                        <Link href="/admin/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center">
                            <Layers className="w-3.5 h-3.5 mr-1" />
                            Dashboard
                        </Link>
                        <span className="mx-2 text-slate-300">/</span>
                        <Link href="/admin/remitters" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Remitters</Link>
                        <span className="mx-2 text-slate-300">/</span>
                        <span className="text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">Add New</span>
                    </nav>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Create New Remitter</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">Onboard a new customer to the platform.</p>
                </div>
                <div className="hidden md:block">
                    {/* Optional header action area */}
                </div>
            </div>

            <div className="card-glass rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-800/50 overflow-hidden relative">
                {/* Decorative top border */}
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                {/* Tabs / Steps */}
                <div className="px-8 pt-8 pb-0 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex space-x-2 md:space-x-8 overflow-x-auto pb-6 scrollbar-hide">
                        {tabs.map((tab, index) => {
                            const isActive = activeTab === tab.id;
                            const isCompleted = index < currentTabIndex;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => isCompleted ? setActiveTab(tab.id) : null}
                                    disabled={!isCompleted && !isActive}
                                    className={`group flex items-center space-x-3 pb-2 border-b-2 transition-all duration-300 whitespace-nowrap min-w-fit px-2 ${isActive
                                        ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                                        : isCompleted
                                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 rounded-t-lg'
                                            : 'border-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110'
                                        : isCompleted
                                            ? 'bg-emerald-500 text-white shadow-md'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                        }`}>
                                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
                                    </div>
                                    <span className={`text-sm font-bold ${isActive ? 'scale-105' : ''} transition-transform`}>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form Content */}
                <form id="createSenderForm" onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Branch Selection Highlight */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 grid gap-4 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="w-full relative z-10">
                                    <FormSelect label="Branch *" name="branch_id" Icon={Building} options={branches.length > 0 ? branches.map(b => b.code || b.name) : ['London - Link Forex Ltd']} />
                                </div>
                                <div className="flex items-center relative z-10">
                                    <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full cursor-pointer hover:border-indigo-500 transition-colors">
                                        <input
                                            type="checkbox"
                                            id="sanction_list_verified"
                                            name="sanction_list_verified"
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <label htmlFor="sanction_list_verified" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                            Sanction List Verified
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 mb-6">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 pl-1">Client Type</label>
                                    <div className="flex space-x-4">
                                        <label className={`flex-1 border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 ${clientType === 'individual' ? 'bg-indigo-50/50 border-indigo-500 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                            <input type="radio" name="clientType" value="individual" className="sr-only" checked={clientType === 'individual'} onChange={() => setClientType('individual')} />
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${clientType === 'individual' ? 'border-indigo-600' : 'border-slate-400'}`}>
                                                    {clientType === 'individual' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>}
                                                </div>
                                                <span className={`font-bold text-lg ${clientType === 'individual' ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>Individual</span>
                                                <User className={`w-5 h-5 ml-auto ${clientType === 'individual' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            </div>
                                        </label>
                                        <label className={`flex-1 border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 ${clientType === 'business' ? 'bg-indigo-50/50 border-indigo-500 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                            <input type="radio" name="clientType" value="business" className="sr-only" checked={clientType === 'business'} onChange={() => setClientType('business')} />
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${clientType === 'business' ? 'border-indigo-600' : 'border-slate-400'}`}>
                                                    {clientType === 'business' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>}
                                                </div>
                                                <span className={`font-bold text-lg ${clientType === 'business' ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>Business</span>
                                                <Building className={`w-5 h-5 ml-auto ${clientType === 'business' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput label="Sender ID" name="sender_id" placeholder="Auto-generated" disabled defaultValue={'LF3992'} Icon={CreditCard} />

                                {clientType === 'business' ? (
                                    <>
                                        <div className="md:col-span-2">
                                            <FormInput label="Company Name *" name="company_name" placeholder="Registered Company Name" required Icon={Building} />
                                        </div>
                                        <FormSelect label="Company Type *" name="company_type" options={['LTD', 'PLC', 'Sole Trader', 'Partnership', 'LLP']} Icon={Layers} />
                                        <FormInput label="Company Reg No *" name="company_reg_no" placeholder="Registration Number" required Icon={FileText} />
                                    </>
                                ) : (
                                    <>
                                        <FormInput label="Sender Name *" name="sender_name" placeholder="Full Name" required Icon={User} />
                                        <FormInput label="Date of Birth *" name="date_of_birth" type="date" required Icon={Calendar} />
                                        <FormInput label="Place of Birth" name="place_of_birth" placeholder="City, Country" Icon={MapPin} />
                                        <FormInput label="Occupation" name="occupation" placeholder="e.g. Engineer" Icon={Briefcase} />
                                    </>
                                )}

                                <FormInput label="Telephone *" name="telephone" placeholder="+44..." required Icon={Phone} />
                            </div>

                            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 mt-6">
                                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                                    Address Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <FormInput label="Address Line 1 *" name="address_1" placeholder="House/Flat Number, Street" Icon={MapPin} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <FormInput label="Address Line 2" name="address_2" placeholder="Locality / Area" Icon={MapPin} />
                                    </div>
                                    <FormInput label="City *" name="city" placeholder="e.g. London" Icon={Building} />
                                    <FormInput label="Postcode *" name="postcode" placeholder="e.g. SW1A 1AA" Icon={MapPin} />
                                    <FormInput label="County" name="county" Icon={MapPin} />
                                    <FormInput label="Country *" name="country" defaultValue="United Kingdom" Icon={Globe} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* KYC & ID TAB */}
                    {activeTab === 'kyc' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center">
                                    <CreditCard className="w-4 h-4 mr-2 text-indigo-500" />
                                    Identity Verification
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormSelect label="ID Type *" name="id_type" options={['Passport', 'Driving License', 'National ID', 'Residence Permit']} Icon={CreditCard} />
                                    <FormInput label="ID Number *" name="id_no" Icon={FileText} />
                                    <FormInput label="ID Expiry Date *" name="id_expire_date" type="date" Icon={Calendar} />

                                    <div className="md:col-span-2 pt-2">
                                        <div className="flex flex-wrap gap-6 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <div className="flex items-center space-x-3 group cursor-pointer">
                                                <div className="relative flex items-center justify-center">
                                                    <input type="checkbox" id="id_verified" name="id_verified" className="peer w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                                </div>
                                                <label htmlFor="id_verified" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer peer-checked:text-indigo-600">ID Verified</label>
                                            </div>
                                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                            <div className="flex items-center space-x-3 group cursor-pointer">
                                                <input type="checkbox" id="proof_of_funds" name="proof_of_funds" className="w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                                <label htmlFor="proof_of_funds" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Proof of Funds</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center pl-1">
                                    <Shield className="w-4 h-4 mr-2 text-indigo-500" />
                                    Document Uploads
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <FormFileUpload label="ID Copy / Passport" name="passport_copy" />
                                    <FormFileUpload label="Proof of Address" name="proof_of_address_doc" />
                                    <FormFileUpload label="Source of Income/Funds" name="work_related_docs" compact />
                                    <FormFileUpload label="Signature" name="signature_file_name" compact />
                                    <FormFileUpload label="AML Screening Doc" name="sender_details_aml_screening_doc" compact />
                                    <FormFileUpload label="Other Supporting Document" name="other_doc" compact />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DIRECTORS TAB */}
                    {activeTab === 'directors' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center">
                                <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                                Please add at least one director for this business.
                            </div>

                            {directors.map((director, index) => (
                                <div key={index} className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-xl relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    <div className="absolute top-6 right-6 z-10">
                                        {directors.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeDirector(index)}
                                                className="text-red-500 hover:text-white hover:bg-red-500 transition-all duration-300 text-xs font-bold px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center space-x-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span>Remove</span>
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-8 flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 text-slate-500">
                                            {index + 1}
                                        </div>
                                        Director Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                        <div className="md:col-span-1">
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Name *</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><User className="w-5 h-5" /></div>
                                                <input
                                                    type="text"
                                                    required
                                                    className="input-glass w-full pl-12 py-3 text-sm"
                                                    value={director.name}
                                                    onChange={(e) => updateDirector(index, 'name', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Date of Birth *</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Calendar className="w-5 h-5" /></div>
                                                <input
                                                    type="date"
                                                    required
                                                    className="input-glass w-full pl-12 py-3 text-sm"
                                                    value={director.dob}
                                                    onChange={(e) => updateDirector(index, 'dob', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Residential Address *</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-4 text-slate-400"><MapPin className="w-5 h-5" /></div>
                                                <textarea
                                                    required
                                                    rows={2}
                                                    className="input-glass w-full pl-12 py-3 text-sm"
                                                    value={director.address}
                                                    onChange={(e) => updateDirector(index, 'address', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID Type</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><CreditCard className="w-5 h-5" /></div>
                                                <select
                                                    className="input-glass w-full pl-12 py-3 text-sm appearance-none"
                                                    value={director.idType}
                                                    onChange={(e) => updateDirector(index, 'idType', e.target.value)}
                                                >
                                                    <option>Passport</option>
                                                    <option>Driving License</option>
                                                    <option>National ID</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID Number</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><FileText className="w-5 h-5" /></div>
                                                <input
                                                    type="text"
                                                    className="input-glass w-full pl-12 py-3 text-sm"
                                                    value={director.idNumber}
                                                    onChange={(e) => updateDirector(index, 'idNumber', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-center pt-8">
                                <button
                                    type="button"
                                    onClick={addDirector}
                                    className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors flex items-center space-x-2 shadow-sm border border-slate-200 dark:border-slate-700"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>Add Another Director</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* RECEIVERS TAB */}
                    {activeTab === 'receivers' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center">
                                <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                                Please add at least one receiver (Beneficiary) for this remitter.
                            </div>

                            {receivers.map((receiver, index) => (
                                <div key={index} className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-xl relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    <div className="absolute top-6 right-6 z-10">
                                        {receivers.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeReceiver(index)}
                                                className="text-red-500 hover:text-white hover:bg-red-500 transition-all duration-300 text-xs font-bold px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center space-x-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span>Remove</span>
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-8 flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 text-slate-500">
                                            {index + 1}
                                        </div>
                                        Beneficiary Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">First Name *</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><User className="w-5 h-5" /></div>
                                                <input
                                                    type="text"
                                                    required
                                                    className="input-glass w-full pl-12 py-3 text-sm"
                                                    value={receiver.firstName}
                                                    onChange={(e) => updateReceiver(index, 'firstName', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Last Name *</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><User className="w-5 h-5" /></div>
                                                <input
                                                    type="text"
                                                    required
                                                    className="input-glass w-full pl-12 py-3 text-sm"
                                                    value={receiver.lastName}
                                                    onChange={(e) => updateReceiver(index, 'lastName', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Relationship *</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Users className="w-5 h-5" /></div>
                                                <input
                                                    type="text"
                                                    required
                                                    className="input-glass w-full pl-12 py-3 text-sm"
                                                    value={receiver.relation}
                                                    onChange={(e) => updateReceiver(index, 'relation', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-3 h-px bg-slate-100 dark:bg-slate-700 my-4"></div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Bank Name *</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Building className="w-5 h-5" /></div>
                                                <input
                                                    type="text"
                                                    required
                                                    className="input-glass w-full pl-12 py-3 text-sm"
                                                    value={receiver.bankName}
                                                    onChange={(e) => updateReceiver(index, 'bankName', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch Name</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><MapPin className="w-5 h-5" /></div>
                                                <input
                                                    type="text"
                                                    className="input-glass w-full pl-12 py-3 text-sm"
                                                    value={receiver.branchName}
                                                    onChange={(e) => updateReceiver(index, 'branchName', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Account Number *</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><CreditCard className="w-5 h-5" /></div>
                                                <input
                                                    type="text"
                                                    required
                                                    className="input-glass w-full pl-12 py-3 text-sm"
                                                    value={receiver.accountNumber}
                                                    onChange={(e) => updateReceiver(index, 'accountNumber', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-center pt-8">
                                <button
                                    type="button"
                                    onClick={addReceiver}
                                    className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors flex items-center space-x-2 shadow-sm border border-slate-200 dark:border-slate-700"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>Add Another Receiver</span>
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex justify-between items-center relative z-20">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="px-8 py-3 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all flex items-center group"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                        {isFirstTab ? 'Cancel' : 'Back'}
                    </button>

                    <div className="flex space-x-4">
                        {!isLastTab && (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-10 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 transition-all flex items-center group"
                            >
                                <span>Next Step</span>
                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}

                        {isLastTab && (
                            <button
                                type="submit"
                                form="createSenderForm"
                                disabled={loading}
                                className={`px-10 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 transition-all flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        <span>Create Remitter</span>
                                    </>
                                )}
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
