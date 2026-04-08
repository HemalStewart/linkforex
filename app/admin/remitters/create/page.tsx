'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import {
    User, Calendar, MapPin, Briefcase, Phone, Building, CreditCard,
    Globe, FileText, Upload, Trash2, Plus, ArrowLeft,
    CheckCircle, Shield, Layers, Save, Users, AlertCircle, RefreshCcw
} from 'lucide-react';

type DuplicateMatch = {
    id: number;
    name: string;
    sender_id?: string;
    branch?: string;
    status?: string;
    score?: number;
    reasons?: string[];
    same_branch?: boolean;
    verification_state?: string;
    id_expired?: boolean;
    id_expiry?: string;
    veriff_status?: string;
    veriff_decision?: string;
};

type VeriffState = {
    verification_state?: string;
    veriff_status?: string;
    veriff_decision?: string;
    veriff_reason?: string;
    veriff_url?: string;
    veriff_checked_at?: string;
    id_expiry?: string;
    id_expired?: boolean;
    branch_veriff_enabled?: boolean;
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

function FormSelect({ label, name, options, defaultValue, Icon, required, value, onChange }: any) {
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
                    className={`input-glass w-full py-3 ${Icon ? '' : 'pl-4'} pr-10 appearance-none cursor-pointer text-sm`}
                >
                    {options.map((opt: string, index: number) => (
                        <option key={`${name}-${opt}-${index}`} value={opt}>{opt}</option>
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

export default function CreateRemitterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl');

    const [clientType, setClientType] = useState<'individual' | 'business'>('individual');
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [duplicateChecking, setDuplicateChecking] = useState(false);
    const [possibleDuplicates, setPossibleDuplicates] = useState<DuplicateMatch[]>([]);
    const [duplicateFormSignals, setDuplicateFormSignals] = useState({
        sender_name: '',
        company_name: '',
        date_of_birth: '',
        telephone: '',
        id_no: '',
        postcode: '',
        address_1: '',
        city: '',
        country: 'United Kingdom',
    });
    const [duplicateModal, setDuplicateModal] = useState<{
        isOpen: boolean;
        message: string;
        matches: DuplicateMatch[];
        payload: any | null;
    }>({
        isOpen: false,
        message: '',
        matches: [],
        payload: null,
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning',
        isAlert: true,
        shouldRedirect: false,
        redirectUrl: ''
    });
    const [createdRemitterId, setCreatedRemitterId] = useState<string>('');
    const [createdRemitterVeriff, setCreatedRemitterVeriff] = useState<VeriffState | null>(null);
    const [veriffActionLoading, setVeriffActionLoading] = useState(false);

    // Director State - Limited to 3 to match Database Schema (bc_d1, bc_d2, bc_d3)
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

    const addDirector = () => {
        if (directors.length < 3) {
            setDirectors([...directors, { name: '', dob: '', address: '', idType: 'Passport', idNumber: '' }]);
        }
    };

    const removeDirector = (index: number) => setDirectors(directors.filter((_, i) => i !== index));
    const updateDirector = (index: number, field: keyof Director, value: string) => {
        const updated = [...directors];
        updated[index][field] = value;
        setDirectors(updated);
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

    const hasMinimumDuplicateSignals = React.useCallback((signals: typeof duplicateFormSignals): boolean => {
        const rawName = clientType === 'business' ? signals.company_name : signals.sender_name;
        const name = rawName.trim();
        const idNo = signals.id_no.trim();
        const phoneDigits = (signals.telephone || '').replace(/\D+/g, '');
        const hasNameContext = Boolean(name && (signals.date_of_birth || signals.postcode || signals.address_1));
        return Boolean(idNo || phoneDigits.length >= 7 || hasNameContext);
    }, [clientType]);

    const buildDuplicateQuery = React.useCallback((signals: typeof duplicateFormSignals): string => {
        const params = new URLSearchParams();
        const resolvedName = (clientType === 'business' ? signals.company_name : signals.sender_name).trim();

        if (resolvedName) params.set('sender_name', resolvedName);
        if (signals.date_of_birth.trim()) params.set('dob', signals.date_of_birth.trim());
        if (signals.telephone.trim()) params.set('phone', signals.telephone.trim());
        if (signals.id_no.trim()) params.set('id_no', signals.id_no.trim());
        if (signals.postcode.trim()) params.set('postcode', signals.postcode.trim());
        if (signals.address_1.trim()) params.set('address_1', signals.address_1.trim());
        if (signals.city.trim()) params.set('city', signals.city.trim());
        if (signals.country.trim()) params.set('country', signals.country.trim());

        return params.toString();
    }, [clientType]);

    const fetchPotentialMatches = React.useCallback(async (signals: typeof duplicateFormSignals): Promise<DuplicateMatch[]> => {
        if (!hasMinimumDuplicateSignals(signals)) {
            return [];
        }

        const query = buildDuplicateQuery(signals);
        if (!query) return [];

        const response = await fetch(`${ENDPOINTS.REMITTERS.POTENTIAL_MATCHES}?${query}`);
        if (!response.ok) {
            return [];
        }

        const data = await response.json() as { matches?: DuplicateMatch[] };
        return Array.isArray(data.matches) ? data.matches : [];
    }, [buildDuplicateQuery, hasMinimumDuplicateSignals]);

    React.useEffect(() => {
        if (!hasMinimumDuplicateSignals(duplicateFormSignals)) {
            setPossibleDuplicates([]);
            return;
        }

        const timer = window.setTimeout(async () => {
            setDuplicateChecking(true);
            try {
                const matches = await fetchPotentialMatches(duplicateFormSignals);
                setPossibleDuplicates(matches);
            } catch (error) {
                console.error('Failed to check potential duplicate remitters', error);
                setPossibleDuplicates([]);
            } finally {
                setDuplicateChecking(false);
            }
        }, 450);

        return () => window.clearTimeout(timer);
    }, [duplicateFormSignals, fetchPotentialMatches, hasMinimumDuplicateSignals]);

    const createRemitter = React.useCallback(async (
        payload: any,
        forceCreate: boolean
    ): Promise<{ createdId?: string | number; blockedByDuplicate?: boolean }> => {
        let body: BodyInit;
        const headers: Record<string, string> = {};

        if (payload instanceof FormData) {
            const fd = new FormData();
            payload.forEach((value, key) => fd.append(key, value));
            if (forceCreate) fd.set('force_create', '1');
            body = fd;
        } else {
            const jsonBody = forceCreate ? { ...payload, force_create: 1 } : payload;
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(jsonBody);
        }

        const res = await fetch(ENDPOINTS.REMITTERS.LIST, {
            method: 'POST',
            headers,
            body,
        });

        if (res.status === 409) {
            const duplicateData = await res.json() as { message?: string; matches?: DuplicateMatch[] };
            const matches = Array.isArray(duplicateData.matches) ? duplicateData.matches : [];
            setPossibleDuplicates(matches);
            setDuplicateModal({
                isOpen: true,
                message: duplicateData.message || 'Possible matching remitter already exists.',
                matches,
                payload,
            });
            return { blockedByDuplicate: true };
        }

        if (!res.ok) {
            const errData = await res.json();
            console.error('Error creating remitter:', errData);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to create remitter: ' + (JSON.stringify(errData.messages || errData.message || errData) || res.statusText),
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
                redirectUrl: ''
            });
            return {};
        }

        const result = await res.json();
        return { createdId: result.id };
    }, []);

    const verificationLabel = (state?: string) => {
        const normalized = (state || '').toLowerCase();
        if (normalized === 'verified') return 'Already Verified';
        if (normalized === 'pending') return 'Pending';
        if (normalized === 'rejected') return 'Rejected';
        if (normalized === 'expired') return 'Expired ID';
        return 'Not Verified';
    };

    const verificationBadgeClass = (state?: string) => {
        const normalized = (state || '').toLowerCase();
        if (normalized === 'verified') return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
        if (normalized === 'pending') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        if (normalized === 'rejected') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
        if (normalized === 'expired') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300';
    };

    const loadRemitterVeriffState = React.useCallback(async (remitterId: string | number) => {
        try {
            const response = await fetch(ENDPOINTS.REMITTERS.DETAIL(remitterId));
            if (!response.ok) return;
            const data = await response.json();
            setCreatedRemitterVeriff({
                verification_state: data.verification_state,
                veriff_status: data.veriff_status,
                veriff_decision: data.veriff_decision,
                veriff_reason: data.veriff_reason,
                veriff_url: data.veriff_url,
                veriff_checked_at: data.veriff_checked_at,
                id_expiry: data.id_expiry,
                id_expired: Boolean(data.id_expired),
                branch_veriff_enabled: Boolean(data.branch_veriff_enabled),
            });
        } catch (error) {
            console.error('Failed to load verification state', error);
        }
    }, []);

    const triggerVeriffAction = React.useCallback(async (action: 'start' | 'sync') => {
        if (!createdRemitterId) return;
        setVeriffActionLoading(true);
        try {
            const endpoint = action === 'start'
                ? ENDPOINTS.REMITTERS.VERIFF_START(createdRemitterId)
                : ENDPOINTS.REMITTERS.VERIFF_SYNC(createdRemitterId);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Verification Error',
                    message: data?.message || 'Unable to process verification action.',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false,
                    redirectUrl: '',
                });
                return;
            }

            const remitter = data?.remitter;
            if (remitter) {
                setCreatedRemitterVeriff({
                    verification_state: remitter.verification_state,
                    veriff_status: remitter.veriff_status,
                    veriff_decision: remitter.veriff_decision,
                    veriff_reason: remitter.veriff_reason,
                    veriff_url: remitter.veriff_url,
                    veriff_checked_at: remitter.veriff_checked_at,
                    id_expiry: remitter.id_expiry,
                    id_expired: Boolean(remitter.id_expired),
                    branch_veriff_enabled: Boolean(remitter.branch_veriff_enabled),
                });
            } else {
                await loadRemitterVeriffState(createdRemitterId);
            }

            if (action === 'start' && (data?.session_url || remitter?.veriff_url)) {
                const target = data?.session_url || remitter?.veriff_url;
                if (target) {
                    window.open(target, '_blank', 'noopener,noreferrer');
                }
            }
        } catch (error) {
            console.error('Verification action failed', error);
            setConfirmModal({
                isOpen: true,
                title: 'Verification Error',
                message: 'Unable to process verification action.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
                redirectUrl: '',
            });
        } finally {
            setVeriffActionLoading(false);
        }
    }, [createdRemitterId, loadRemitterVeriffState]);

    const refreshVerificationStatus = React.useCallback(async () => {
        if (!createdRemitterId) return;
        setVeriffActionLoading(true);
        try {
            await loadRemitterVeriffState(createdRemitterId);
        } catch (error) {
            console.error('Failed to refresh verification state', error);
        } finally {
            setVeriffActionLoading(false);
        }
    }, [createdRemitterId, loadRemitterVeriffState]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

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
            return;
        }

        setLoading(true);
        setCreatedRemitterId('');
        setCreatedRemitterVeriff(null);
        const submitFormData = new FormData(e.currentTarget);
        const data: any = {};
        submitFormData.forEach((value, key) => {
            data[key] = value;
        });

        // Base API Data mapped to `sender_details` table columns
        const apiData: any = {
            client_type: clientType,
            status: 'active',
            kyc_status: 'pending',
            branch: data.branch_id,
            role: 'customer', // Logical role

            // --- MAPPING TO DATABASE COLS ---
            sys_entry_from: 'admin', // registration source

            // Name Fields: `sender_name` is generic, but for Business it might use `bc_company_name`
            sender_name: clientType === 'business' ? data.company_name : data.sender_name,
            phone: data.telephone,
            telephone: data.telephone,

            // Individual Fields
            date_of_birth: clientType === 'business' ? null : data.date_of_birth,
            place_of_birth: clientType === 'business' ? null : data.place_of_birth,
            occupation: clientType === 'business' ? null : data.occupation,

            // Business Fields (bc_ prefix in DB)
            bc_company_name: clientType === 'business' ? data.company_name : null,
            bc_type_of_company: clientType === 'business' ? data.company_type : null,
            // company_reg_no mapped to other_info or dedicated col if exists? 
            // DB has no `company_reg_no`, maybe `bc_company_house_no`?
            bc_company_house_no: clientType === 'business' ? data.company_reg_no : null,

            // Address Mappings
            address_1: data.address_1,
            address_2: data.address_2,
            city: data.city,
            postcode: data.postcode,
            county: data.county,
            country: data.country,

            // ID details
            id_type: data.id_type,
            id_no: data.id_no,
            id_expire_date: data.id_expire_date,
            email: (data.email || '').trim() || null,
        };

        // --- FLATTEN DIRECTORS INTO API PAYLOAD (bc_d1, bc_d2, bc_d3) ---
        if (clientType === 'business') {
            directors.forEach((d, i) => {
                const prefix = `bc_d${i + 1}`; // bc_d1, bc_d2, bc_d3
                apiData[`${prefix}_name`] = d.name;
                apiData[`${prefix}_dob`] = d.dob;
                apiData[`${prefix}_address1`] = d.address;
                apiData[`${prefix}_file_director_id`] = d.idType + ':' + d.idNumber; // composite or strictly mapped
                // Add other mappings if detailed fields exist
            });
        }

        try {
            const payload = new FormData();
            Object.entries(apiData).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    payload.append(key, String(value));
                }
            });

            const uploadFields = ['passport_copy', 'proof_of_address_doc', 'work_related_docs', 'sender_details_aml_screening_doc', 'other_doc', 'id_copy'];
            uploadFields.forEach((field) => {
                const file = submitFormData.get(field);
                if (file instanceof File && file.size > 0) {
                    payload.append(field, file);
                }
            });

            const submitResult = await createRemitter(payload, false);
            if (submitResult.blockedByDuplicate) {
                return;
            }
            const remitterId = submitResult.createdId;
            if (!remitterId) {
                return;
            }

            const remitterIdStr = String(remitterId);
            setCreatedRemitterId(remitterIdStr);
            await loadRemitterVeriffState(remitterIdStr);

            if (returnUrl) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: `New ${clientType === 'business' ? 'Business' : 'Individual'} Remitter Created Successfully!`,
                    type: 'info',
                    isAlert: true,
                    shouldRedirect: true,
                    redirectUrl: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}newRemitterId=${remitterIdStr}`
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Saved',
                    message: 'Remitter created. You can verify this remitter now from the Verification panel.',
                    type: 'info',
                    isAlert: true,
                    shouldRedirect: false,
                    redirectUrl: ''
                });
            }

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

    const handleConfirmDuplicateCreate = async () => {
        if (!duplicateModal.payload) return;

        setDuplicateModal((prev) => ({ ...prev, isOpen: false }));
        setLoading(true);
        setCreatedRemitterId('');
        setCreatedRemitterVeriff(null);
        try {
            const submitResult = await createRemitter(duplicateModal.payload, true);
            const remitterId = submitResult.createdId;
            if (!remitterId) return;
            const remitterIdStr = String(remitterId);
            setCreatedRemitterId(remitterIdStr);
            await loadRemitterVeriffState(remitterIdStr);

            if (returnUrl) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: `New ${clientType === 'business' ? 'Business' : 'Individual'} Remitter Created Successfully!`,
                    type: 'info',
                    isAlert: true,
                    shouldRedirect: true,
                    redirectUrl: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}newRemitterId=${remitterIdStr}`
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Saved',
                    message: 'Remitter created. You can verify this remitter now from the Verification panel.',
                    type: 'info',
                    isAlert: true,
                    shouldRedirect: false,
                    redirectUrl: ''
                });
            }
        } catch (error) {
            console.error('Failed to force-create remitter', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An error occurred while creating remitter.',
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
            <ConfirmModal
                isOpen={duplicateModal.isOpen}
                onClose={() => setDuplicateModal({ isOpen: false, message: '', matches: [], payload: null })}
                onConfirm={handleConfirmDuplicateCreate}
                title="Possible Existing Remitter Found"
                message={duplicateModal.message || 'Potential match found. Please review before creating a duplicate profile.'}
                type="warning"
                isAlert={false}
                confirmText="Create Anyway"
                cancelText="Review Details"
                loading={loading}
            />

            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/remitters" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Remitters
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create New Remitter</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Onboard a new customer to the platform.</p>
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
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 ml-1">Client Type</label>
                            <div className="flex space-x-4">
                                <label className={`flex-1 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${clientType === 'individual' ? 'ring-2 ring-teal-500 bg-teal-50/50 dark:bg-teal-900/10' : ''}`}>
                                    <input type="radio" name="clientType" value="individual" className="sr-only" checked={clientType === 'individual'} onChange={() => setClientType('individual')} />
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${clientType === 'individual' ? 'border-teal-600' : 'border-slate-400'}`}>
                                            {clientType === 'individual' && <div className="w-2 h-2 rounded-full bg-teal-600"></div>}
                                        </div>
                                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Individual</span>
                                    </div>
                                </label>
                                <label className={`flex-1 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${clientType === 'business' ? 'ring-2 ring-teal-500 bg-teal-50/50 dark:bg-teal-900/10' : ''}`}>
                                    <input type="radio" name="clientType" value="business" className="sr-only" checked={clientType === 'business'} onChange={() => setClientType('business')} />
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${clientType === 'business' ? 'border-teal-600' : 'border-slate-400'}`}>
                                            {clientType === 'business' && <div className="w-2 h-2 rounded-full bg-teal-600"></div>}
                                        </div>
                                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Business</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div>
                            <FormSelect label="Branch" name="branch_id" Icon={Building} options={branches.length > 0 ? branches.map(b => b.code || b.name) : ['London - Link Forex Ltd']} required />
                            <div className="flex items-center mt-4 ml-1">
                                <input type="checkbox" id="sanction_list_verified" name="sanction_list_verified" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer" />
                                <label htmlFor="sanction_list_verified" className="ml-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Sanction List Verified
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Personal / Company Details */}
                <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <User className="w-5 h-5 mr-2 text-teal-500" />
                        {clientType === 'business' ? 'Company Details' : 'Personal Details'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput label="Sender ID" name="sender_id" placeholder="Auto-generated" disabled defaultValue={'LF3992'} Icon={CreditCard} />
                        {clientType === 'business' ? (
                            <>
                                <div className="md:col-span-2">
                                    <FormInput
                                        label="Company Name"
                                        name="company_name"
                                        placeholder="Registered Company Name"
                                        required
                                        Icon={Building}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, company_name: e.target.value }))}
                                    />
                                </div>
                                <FormSelect label="Company Type" name="company_type" options={['LTD', 'PLC', 'Sole Trader', 'Partnership', 'LLP']} Icon={Layers} required />
                                <FormInput label="Company Reg No" name="company_reg_no" placeholder="Registration Number" required Icon={FileText} />
                                <FormInput label="Trading Address" name="bc_trading_address" placeholder="If different from reg address" Icon={MapPin} />
                            </>
                        ) : (
                            <>
                                <FormInput
                                    label="Full Name"
                                    name="sender_name"
                                    placeholder="Full Name"
                                    required
                                    Icon={User}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, sender_name: e.target.value }))}
                                />
                                <FormInput
                                    label="Date of Birth"
                                    name="date_of_birth"
                                    type="date"
                                    required
                                    Icon={Calendar}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                                />
                                <FormInput label="Place of Birth" name="place_of_birth" placeholder="City, Country" Icon={MapPin} />
                                <FormInput label="Occupation" name="occupation" placeholder="Occupation" Icon={Briefcase} />
                            </>
                        )}
                        <FormInput
                            label="Telephone"
                            name="telephone"
                            placeholder="Phone number"
                            required
                            Icon={Phone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, telephone: e.target.value }))}
                        />
                        <FormInput
                            label="Email (Optional)"
                            name="email"
                            type="email"
                            placeholder="Email address"
                            Icon={FileText}
                        />
                    </div>
                </div>

                {(duplicateChecking || possibleDuplicates.length > 0) && (
                    <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                        <div className={`rounded-2xl border px-4 py-4 ${possibleDuplicates.length > 0 ? 'border-amber-300/70 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/10' : 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/40'}`}>
                            <div className="flex items-start gap-3">
                                <AlertCircle className={`mt-0.5 h-4 w-4 ${possibleDuplicates.length > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
                                <div className="w-full">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {duplicateChecking ? 'Checking for possible duplicates...' : `Possible match found (${possibleDuplicates.length})`}
                                    </p>
                                    {!duplicateChecking && possibleDuplicates.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {possibleDuplicates.slice(0, 3).map((match) => (
                                                <div key={`dup-${match.id}`} className="rounded-xl border border-amber-200/60 bg-white/70 px-3 py-2 text-xs text-slate-700 dark:border-amber-500/30 dark:bg-slate-900/40 dark:text-slate-300">
                                                    <div className="font-semibold">
                                                        {match.name} {match.sender_id ? `(${match.sender_id})` : ''}
                                                    </div>
                                                    <div className="mt-1">
                                                        Branch: {match.branch || '-'} · Score: {match.score ?? 0}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${verificationBadgeClass(match.verification_state)}`}>
                                                            {verificationLabel(match.verification_state)}
                                                        </span>
                                                        {match.id_expired ? (
                                                            <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                                ID Expired
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {Array.isArray(match.reasons) && match.reasons.length > 0 && (
                                                        <div className="mt-1 text-amber-700 dark:text-amber-300">
                                                            {match.reasons.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 3: Address */}
                <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-teal-500" />
                        Address Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <FormInput
                                label="Address Line 1"
                                name="address_1"
                                placeholder="House/Flat Number, Street"
                                required
                                Icon={MapPin}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, address_1: e.target.value }))}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <FormInput label="Address Line 2" name="address_2" placeholder="Locality / Area" Icon={MapPin} />
                        </div>
                        <FormInput
                            label="City"
                            name="city"
                            placeholder="City"
                            required
                            Icon={Building}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, city: e.target.value }))}
                        />
                        <FormInput
                            label="Postcode"
                            name="postcode"
                            placeholder="Postcode"
                            required
                            Icon={MapPin}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, postcode: e.target.value }))}
                        />
                        <FormInput label="County" name="county" Icon={MapPin} />
                        <FormInput
                            label="Country"
                            name="country"
                            defaultValue="United Kingdom"
                            required
                            Icon={Globe}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, country: e.target.value }))}
                        />
                    </div>
                </div>

                {/* Section 4: Directors (Business Only) - Max 3 */}
                {clientType === 'business' && (
                    <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                                <Users className="w-5 h-5 mr-2 text-teal-500" />
                                Directors (Max 3)
                            </h3>
                            {directors.length < 3 && (
                                <button type="button" onClick={addDirector} className="text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-full transition-colors flex items-center">
                                    <Plus className="w-3 h-3 mr-1" /> Add Director
                                </button>
                            )}
                        </div>

                        {/* Info Note */}
                        <div className="mb-6 bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl text-xs text-teal-700 dark:text-teal-300 flex items-start">
                            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                            <p>System supports up to 3 directors. Please enter details for at least one director / owner.</p>
                        </div>

                        <div className="space-y-4">
                            {directors.map((director, index) => (
                                <div key={index} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 relative group">
                                    <div className="absolute top-4 right-4">
                                        {directors.length > 1 && (
                                            <button type="button" onClick={() => removeDirector(index)} className="text-red-400 hover:text-red-600 p-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Director {index + 1}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <FormInput label="Full Name" value={director.name} onChange={(e: any) => updateDirector(index, 'name', e.target.value)} required Icon={User} />
                                        </div>
                                        <FormInput label="Date of Birth" type="date" value={director.dob} onChange={(e: any) => updateDirector(index, 'dob', e.target.value)} required Icon={Calendar} />
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address</label>
                                            <textarea rows={2} className="input-glass w-full text-sm p-3" value={director.address} onChange={(e) => updateDirector(index, 'address', e.target.value)} required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID Type</label>
                                            <select className="input-glass w-full py-3 px-4 text-sm" value={director.idType} onChange={(e) => updateDirector(index, 'idType', e.target.value)}>
                                                <option>Passport</option>
                                                <option>Driving License</option>
                                                <option>National ID</option>
                                            </select>
                                        </div>
                                        <FormInput label="ID Number" value={director.idNumber} onChange={(e: any) => updateDirector(index, 'idNumber', e.target.value)} Icon={FileText} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section 5: IDs & Documents */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-teal-500" />
                        Identity Verification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <FormSelect label="ID Type" name="id_type" options={['Passport', 'Driving License', 'National ID', 'Residence Permit']} required Icon={CreditCard} />
                        <FormInput
                            label="ID Number"
                            name="id_no"
                            required
                            Icon={FileText}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, id_no: e.target.value }))}
                        />
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

                <div className="mb-8 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl p-5 bg-white/60 dark:bg-slate-900/40">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Verification Status</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                                Verification starts after saving because a remitter ID is required.
                            </p>
                        </div>
                        {createdRemitterVeriff?.verification_state ? (
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${verificationBadgeClass(createdRemitterVeriff.verification_state)}`}>
                                {verificationLabel(createdRemitterVeriff.verification_state)}
                            </span>
                        ) : null}
                    </div>

                    {!createdRemitterId ? (
                        <p className="text-xs text-slate-500 dark:text-slate-300 mt-4">
                            Save remitter to enable `Start Verification` and `Sync Result`.
                        </p>
                    ) : (
                        <div className="mt-4 space-y-3">
                            <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-4">
                                <span>Remitter ID: <span className="font-semibold text-slate-800 dark:text-slate-200">{createdRemitterId}</span></span>
                                <span>ID Expiry: <span className="font-semibold text-slate-800 dark:text-slate-200">{createdRemitterVeriff?.id_expiry || '-'}</span></span>
                                <span>Last Check: <span className="font-semibold text-slate-800 dark:text-slate-200">{createdRemitterVeriff?.veriff_checked_at || '-'}</span></span>
                            </div>
                            {createdRemitterVeriff?.id_expired ? (
                                <p className="text-xs font-semibold text-red-600 dark:text-red-300">ID is expired. Re-verification and updated ID are required before transfer.</p>
                            ) : null}
                            {createdRemitterVeriff?.branch_veriff_enabled === false ? (
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">Branch verification is currently disabled by backend flag.</p>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => void refreshVerificationStatus()}
                                    disabled={veriffActionLoading}
                                    className="px-3 py-2 rounded-full text-xs font-bold glass-effect text-slate-700 dark:text-slate-200 disabled:opacity-40"
                                >
                                    <RefreshCcw className={`inline-block w-3 h-3 mr-1 ${veriffActionLoading ? 'animate-spin' : ''}`} />
                                    Refresh Status
                                </button>
                                <button
                                    type="button"
                                    onClick={() => triggerVeriffAction('start')}
                                    disabled={veriffActionLoading || createdRemitterVeriff?.branch_veriff_enabled === false || (createdRemitterVeriff?.verification_state === 'verified' && !createdRemitterVeriff?.id_expired)}
                                    className="px-3 py-2 rounded-full text-xs font-bold glass-effect text-slate-700 dark:text-slate-200 disabled:opacity-40"
                                >
                                    {veriffActionLoading ? 'Working...' : 'Start Verification'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => triggerVeriffAction('sync')}
                                    disabled={veriffActionLoading || createdRemitterVeriff?.branch_veriff_enabled === false}
                                    className="px-3 py-2 rounded-full text-xs font-bold glass-effect text-slate-700 dark:text-slate-200 disabled:opacity-40"
                                >
                                    Sync Result
                                </button>
                                {createdRemitterVeriff?.veriff_url ? (
                                    <button
                                        type="button"
                                        onClick={() => window.open(createdRemitterVeriff.veriff_url, '_blank', 'noopener,noreferrer')}
                                        className="px-3 py-2 rounded-full text-xs font-bold glass-effect text-slate-700 dark:text-slate-200"
                                    >
                                        Open Verification Link
                                    </button>
                                ) : null}
                                <Link
                                    href={`/admin/remitters/${createdRemitterId}`}
                                    className="px-3 py-2 rounded-full text-xs font-bold glass-effect text-slate-700 dark:text-slate-200"
                                >
                                    Open Remitter Details
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/remitters"
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
