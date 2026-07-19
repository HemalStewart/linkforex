'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import {
    branchMatchesAdminScope,
    getAdminBranchCode,
    getCurrentAdminUser,
    isPrivilegedAdminUser,
} from '@/app/lib/adminUserScope';
import ConfirmModal from '../../../components/ConfirmModal';
import { showToast, queueToast } from '@/app/lib/toast';
import {
    User, Calendar, MapPin, Briefcase, Phone, Building, CreditCard,
    Globe, FileText, Upload, Trash2, Plus, ArrowLeft,
    CheckCircle, Shield, Layers, Save, Users, AlertCircle
} from 'lucide-react';
import { usePagePermissions } from '@/app/lib/permissions';

type SelectOption = string | {
    value: string;
    label: string;
};

const isSenderBranch = (branch: any): boolean => {
    const defaultType = String(branch?.default_transaction_type ?? branch?.branch_default_transaction_type ?? '')
        .trim()
        .toLowerCase();
    return defaultType === 'sender' || defaultType === 'both';
};

const branchOptionValue = (branch: any): string =>
    String(branch?.code || branch?.transaction_prefix || branch?.name || branch?.id || '').trim();

const branchOptionLabel = (branch: any, fallback: string): string =>
    String(branch?.name || branch?.branch_name || branch?.code || branch?.transaction_prefix || fallback).trim();

const isLondonBranchOption = (option: { value: string; label: string }): boolean => {
    const combined = `${option.value} ${option.label}`.toLowerCase();
    return combined.includes('london') || option.value.toUpperCase() === 'LFX';
};

// --- HELPER COMPONENTS (Reused) ---

function FormInput({ label, name, type = 'text', placeholder, disabled, step, defaultValue, required, Icon, value, onChange }: any) {
    return (
        <div className="w-full">
            <label htmlFor={name} className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className={`relative ${Icon ? 'input-icon' : ''}`}>
                {Icon && (
                    <div className="input-icon-left">
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
                    value={value}
                    onChange={onChange}
                    required={required}
                    className={`input-glass w-full py-3 ${Icon ? '' : 'pl-4'} pr-4 text-sm focus:scale-[1.01] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed`}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}

function FormSelect({ label, name, options, defaultValue, Icon, required, value, onChange, disabled }: any) {
    return (
        <div className="w-full">
            <label htmlFor={name} className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className={`relative ${Icon ? 'input-icon' : ''}`}>
                {Icon && (
                    <div className="input-icon-left">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                <select
                    id={name}
                    name={name}
                    defaultValue={defaultValue}
                    value={value}
                    onChange={onChange}
                    required={required}
                    disabled={disabled}
                    className={`input-glass w-full py-3 ${Icon ? '' : 'pl-4'} pr-10 appearance-none cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                    {options.map((opt: SelectOption, index: number) => {
                        const optionValue = typeof opt === 'string' ? opt : opt.value;
                        const optionLabel = typeof opt === 'string' ? opt : opt.label;
                        return (
                            <option key={`${name}-${optionValue}-${index}`} value={optionValue}>{optionLabel}</option>
                        );
                    })}
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
            <div className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl ${compact ? 'px-3 py-3' : 'px-4 py-8'} bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer text-center relative max-w-full overflow-hidden group hover:border-teal-400 dark:hover:border-teal-500`}>
                <div className="flex flex-col items-center justify-center">
                    {!compact && (
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-teal-500 transition-colors" />
                        </div>
                    )}
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate w-full px-2">
                        {defaultValue ? (
                            <span className="text-teal-600 dark:text-teal-400 flex items-center justify-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {defaultValue}
                            </span>
                        ) : (
                            <span className="group-hover:text-teal-500 transition-colors">{compact ? 'Upload' : 'Click to upload'}</span>
                        )}
                    </span>
                    <input type="file" name={name} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
            </div>
        </div>
    );
}

export default function CreateMobileUserRemitterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl');
    const currentUser = React.useMemo(() => getCurrentAdminUser(), []);
    const isPrivilegedUser = React.useMemo(() => isPrivilegedAdminUser(currentUser), [currentUser]);
    const scopedBranchCode = React.useMemo(() => getAdminBranchCode(currentUser), [currentUser]);
    const { canMultiBranch } = usePagePermissions('BRANCHES');

    const [branches, setBranches] = useState<any[]>([]);
    const [occupations, setOccupations] = useState<any[]>([]);
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


    React.useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await fetch(ENDPOINTS.BRANCHES.LIST);
                if (res.ok) {
                    const data = await res.json();
                    setBranches(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                console.error("Failed to fetch branches", e);
            }
        };
        const fetchOccupations = async () => {
            try {
                const res = await fetch(`${ENDPOINTS.OCCUPATIONS.LIST}?active=yes`);
                if (res.ok) {
                    const data = await res.json();
                    setOccupations(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                console.error("Failed to fetch occupations", e);
            }
        };
        fetchBranches();
        fetchOccupations();
    }, []);

    const occupationOptions = React.useMemo<SelectOption[]>(() => {
        return occupations.map((o: any) => ({
            value: o.name,
            label: o.name,
        }));
    }, [occupations]);

    const branchOptions = React.useMemo<SelectOption[]>(() => {
        const source = branches.length > 0 ? branches : (scopedBranchCode ? [{ code: scopedBranchCode, name: scopedBranchCode }] : []);
        const scoped = (isPrivilegedUser || canMultiBranch) ? source : source.filter((branch) => branchMatchesAdminScope(branch, currentUser));
        const senderBranches = scoped.filter(isSenderBranch);
        const filtered = branches.length > 0 ? senderBranches : scoped;
        const seen = new Set<string>();
        const options = filtered
            .map((branch) => {
                const optionValue = branchOptionValue(branch);
                const optionLabel = branchOptionLabel(branch, optionValue);
                return optionValue ? { value: optionValue, label: optionLabel || optionValue } : null;
            })
            .filter((option): option is { value: string; label: string } => {
                if (!option || seen.has(option.value)) return false;
                seen.add(option.value);
                return true;
            });
        const sorted = [...options].sort((a, b) => Number(isLondonBranchOption(b)) - Number(isLondonBranchOption(a)));
        return sorted.length > 0 ? sorted : [{ value: 'London - Link Forex Ltd', label: 'London - Link Forex Ltd' }];
    }, [branches, currentUser, isPrivilegedUser, scopedBranchCode]);

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
            role: 'customer',

            // --- MAPPING TO DATABASE COLS ---
            sys_entry_from: 'mobile_app', // registration source explicitly set for mobile users

            // Name Fields
            sender_name: data.sender_name,
            phone: data.telephone,
            telephone: data.telephone,

            // Individual Fields
            date_of_birth: data.date_of_birth,
            place_of_birth: data.place_of_birth,
            occupation: data.occupation,


            address_1: data.address_1,
            address_2: data.address_2,
            city: data.city,
            postcode: data.postcode,
            county: data.county,
            country: data.country,

           
            id_type: data.id_type,
            id_no: data.id_no,
            id_expire_date: data.id_expire_date,
            email: 'mobile-entry@linkforex.com',
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
                    message: 'Failed to create profile: ' + (JSON.stringify(errData.messages) || res.statusText),
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false,
                    redirectUrl: ''
                });
                return;
            }

            const result = await res.json();
            const remitterId = result.id;
            const remitterRouteKey = result.route_key || (result.id != null ? String(result.id) : '');

            // Note: Beneficiaries skipped here.

            queueToast('Success', 'New Mobile Individual Profile Created Successfully!', 'success');
            router.push(returnUrl ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}newRemitterId=${encodeURIComponent(remitterRouteKey)}` : '/admin/mobile-profiles');
        } catch (error) {
            console.error('Failed to submit:', error);
            showToast('Error', 'An error occurred. Please try again.', 'danger');
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
        <div className="max-w-7xl mx-auto pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalClose}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as any}
                isAlert={confirmModal.isAlert}
                confirmText={confirmModal.shouldRedirect ? "Continue" : "OK"}
            />

            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/mobile-profiles" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Mobile Profiles
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create Mobile Profile</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Onboard a new mobile app customer manually.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                {/* Section 1: Client Type & Branch */}
                <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-teal-500" />
                        Account Setup
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <input type="hidden" name="clientType" value="individual" />
                            <FormSelect
                                label="Branch"
                                name="branch_id"
                                Icon={Building}
                                options={branchOptions}
                                required
                                disabled={!isPrivilegedUser && !canMultiBranch}
                                defaultValue={scopedBranchCode || (typeof branchOptions[0] === 'string' ? branchOptions[0] : branchOptions[0]?.value)}
                            />
                            <div className="flex items-center mt-4 ml-1">
                                <input type="checkbox" id="sanction_list_verified" name="sanction_list_verified" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer" />
                                <label htmlFor="sanction_list_verified" className="ml-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Sanction List Verified
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Personal Details */}
                <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <User className="w-5 h-5 mr-2 text-teal-500" />
                        Personal Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput label="Sender ID" name="sender_id" placeholder="Enter Sender ID" required Icon={CreditCard} />
                                <FormInput label="Full Name" name="sender_name" placeholder="Full Name" required Icon={User} />
                                <FormInput label="Date of Birth" name="date_of_birth" type="date" required Icon={Calendar} />
                                <FormInput label="Place of Birth" name="place_of_birth" placeholder="City, Country" Icon={MapPin} />
                                <FormSelect label="Occupation" name="occupation" Icon={Briefcase} options={occupationOptions} required />
                        <FormInput label="Telephone" name="telephone" placeholder="Phone number" required Icon={Phone} />
                    </div>
                </div>

                {/* Section 3: Address */}
                <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-teal-500" />
                        Address Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <FormInput label="Address Line 1" name="address_1" placeholder="House/Flat Number, Street" required Icon={MapPin} />
                        </div>
                        <div className="md:col-span-2">
                            <FormInput label="Address Line 2" name="address_2" placeholder="Locality / Area" Icon={MapPin} />
                        </div>
                        <FormInput label="City" name="city" placeholder="City" required Icon={Building} />
                        <FormInput label="Postcode" name="postcode" placeholder="Postcode" required Icon={MapPin} />
                        <FormInput label="County" name="county" Icon={MapPin} />
                        <FormInput label="Country" name="country" defaultValue="United Kingdom" required Icon={Globe} />
                    </div>
                </div>

                {/* Section 5: IDs & Documents */}
                <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-teal-500" />
                        Identity Verification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <FormSelect label="ID Type" name="id_type" options={['Passport', 'Driving License', 'National ID', 'Residence Permit']} required Icon={CreditCard} />
                        <FormInput label="ID Number" name="id_no" required Icon={FileText} />
                        <FormInput label="ID Expiry Date" name="id_expire_date" type="date" required Icon={Calendar} />
                    </div>

                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 ml-1">Documents</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FormFileUpload label="ID Copy" name="passport_copy" compact />
                        <FormFileUpload label="Proof of Address" name="proof_of_address_doc" compact />
                        <FormFileUpload label="Source of Income" name="work_related_docs" compact />
                        <FormFileUpload label="AML Doc" name="sender_details_aml_screening_doc" compact />
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/mobile-profiles"
                        className="px-6 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors border border-slate-200 dark:border-slate-600"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        <Save className="w-4 h-4" />
                        <span>{loading ? 'Onboarding...' : 'Save'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
