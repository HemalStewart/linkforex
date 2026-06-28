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
    withActingUserParam,
} from '@/app/lib/adminUserScope';
import ConfirmModal from '../../components/ConfirmModal';
import { showToast, queueToast } from '@/app/lib/toast';
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

function FormFileUpload({ label, name, compact, defaultValue, required }: any) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                {label} {required && <span className="text-red-500">*</span>}
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
                    <input type="file" name={name} required={required} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
            </div>
        </div>
    );
}

const idTypesRequiringIssuedDate = new Set(['passport', 'driving license', 'residence permit']);

const idTypeNeedsIssuedDate = (idType: string): boolean => idTypesRequiringIssuedDate.has(idType.trim().toLowerCase());

const isUkCountry = (country: string): boolean => {
    const normalized = country.trim().toLowerCase();
    return ['uk', 'gb', 'great britain', 'united kingdom', 'england', 'scotland', 'wales', 'northern ireland'].includes(normalized);
};

const isValidUkPassportNumber = (value: string): boolean => /^\d{9}$/.test(value.trim());

export default function CreateRemitterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl');
    const currentUser = React.useMemo(() => getCurrentAdminUser(), []);
    const isPrivilegedUser = React.useMemo(() => isPrivilegedAdminUser(currentUser), [currentUser]);
    const scopedBranchCode = React.useMemo(() => getAdminBranchCode(currentUser), [currentUser]);

    const [branches, setBranches] = useState<any[]>([]);
    const [idType, setIdType] = useState('Passport');
    const [country, setCountry] = useState('United Kingdom');
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
        fetchBranches();
    }, []);

    const branchOptions = React.useMemo<SelectOption[]>(() => {
        const source = branches.length > 0 ? branches : (scopedBranchCode ? [{ code: scopedBranchCode, name: scopedBranchCode }] : []);
        const scoped = isPrivilegedUser ? source : source.filter((branch) => branchMatchesAdminScope(branch, currentUser));
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

    const hasMinimumDuplicateSignals = React.useCallback((signals: typeof duplicateFormSignals): boolean => {
        const rawName = signals.sender_name;
        const name = rawName.trim();
        const idNo = signals.id_no.trim();
        const phoneDigits = (signals.telephone || '').replace(/\D+/g, '');
        const hasNameContext = Boolean(name && (signals.date_of_birth || signals.postcode || signals.address_1));
        return Boolean(idNo || phoneDigits.length >= 7 || hasNameContext);
    }, []);

    const buildDuplicateQuery = React.useCallback((signals: typeof duplicateFormSignals): string => {
        const params = new URLSearchParams();
        const resolvedName = signals.sender_name.trim();

        if (resolvedName) params.set('sender_name', resolvedName);
        if (signals.date_of_birth.trim()) params.set('dob', signals.date_of_birth.trim());
        if (signals.telephone.trim()) params.set('phone', signals.telephone.trim());
        if (signals.id_no.trim()) params.set('id_no', signals.id_no.trim());
        if (signals.postcode.trim()) params.set('postcode', signals.postcode.trim());
        if (signals.address_1.trim()) params.set('address_1', signals.address_1.trim());
        if (signals.city.trim()) params.set('city', signals.city.trim());
        if (signals.country.trim()) params.set('country', signals.country.trim());

        return params.toString();
    }, []);

    const fetchPotentialMatches = React.useCallback(async (signals: typeof duplicateFormSignals): Promise<DuplicateMatch[]> => {
        if (!hasMinimumDuplicateSignals(signals)) {
            return [];
        }

        const query = buildDuplicateQuery(signals);
        if (!query) return [];

        const response = await fetch(withActingUserParam(`${ENDPOINTS.REMITTERS.POTENTIAL_MATCHES}?${query}`, currentUser));
        if (!response.ok) {
            return [];
        }

        const data = await response.json() as { matches?: DuplicateMatch[] };
        return Array.isArray(data.matches) ? data.matches : [];
    }, [buildDuplicateQuery, currentUser, hasMinimumDuplicateSignals]);

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

        const res = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.LIST, currentUser), {
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
    }, [currentUser]);

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
            const response = await fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(remitterId), currentUser));
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
    }, [currentUser]);

    const triggerVeriffAction = React.useCallback(async (action: 'start' | 'sync') => {
        if (!createdRemitterId) return;
        setVeriffActionLoading(true);
        try {
            const endpoint = action === 'start'
                ? ENDPOINTS.REMITTERS.VERIFF_START(createdRemitterId)
                : ENDPOINTS.REMITTERS.VERIFF_SYNC(createdRemitterId);
            const res = await fetch(withActingUserParam(endpoint, currentUser), {
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
    }, [createdRemitterId, currentUser, loadRemitterVeriffState]);

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

    const validateIdentityDetails = (data: any, submitFormData: FormData): string | null => {
        const selectedIdType = String(data.id_type || '').trim();
        const idNumber = String(data.id_no || '').trim();
        const idExpiry = String(data.id_expire_date || '').trim();
        const idIssued = String(data.id_issued_date || '').trim();
        const countryValue = String(data.country || '').trim();
        const idCopy = submitFormData.get('passport_copy');

        if (!selectedIdType) return 'ID Type is required.';
        if (!idNumber) return 'ID Number is required.';
        if (!idExpiry) return 'ID Expiry Date is required.';
        if (idTypeNeedsIssuedDate(selectedIdType) && !idIssued) {
            return 'ID Issued Date is required for the selected ID type.';
        }
        if (selectedIdType.toLowerCase() === 'passport' && isUkCountry(countryValue) && !isValidUkPassportNumber(idNumber)) {
            return 'UK passport number must be exactly 9 digits.';
        }
        if (!(idCopy instanceof File) || idCopy.size === 0) {
            return 'ID Copy is required.';
        }

        return null;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCreatedRemitterId('');
        setCreatedRemitterVeriff(null);
        const submitFormData = new FormData(e.currentTarget);
        const data: any = {};
        submitFormData.forEach((value, key) => {
            data[key] = value;
        });

        const validationMessage = validateIdentityDetails(data, submitFormData);
        if (validationMessage) {
            setConfirmModal({
                isOpen: true,
                title: 'Validation Error',
                message: validationMessage,
                type: 'warning',
                isAlert: true,
                shouldRedirect: false,
                redirectUrl: ''
            });
            return;
        }

        setLoading(true);

        // Base API Data mapped to `sender_details` table columns
        const apiData: any = {
            client_type: 'individual',
            status: 'active',
            kyc_status: 'pending',
            branch: data.branch_id,
            role: 'customer', // Logical role

            // --- MAPPING TO DATABASE COLS ---
            sys_entry_from: 'admin', // registration source

            // Name Fields
            sender_name: data.sender_name,
            phone: data.telephone,
            telephone: data.telephone,

            // Individual Fields
            date_of_birth: data.date_of_birth,
            place_of_birth: data.place_of_birth,
            occupation: data.occupation,


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
            id_issued_date: data.id_issued_date,
            id_expire_date: data.id_expire_date,
            email: (data.email || '').trim() || null,
        };
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
                queueToast('Success', 'New Individual Remitter Created Successfully!', 'success');
                router.push(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}newRemitterId=${remitterIdStr}`);
            } else {
                queueToast('Saved', 'Remitter created successfully.', 'success');
                router.push('/admin/remitters');
            }
        } catch (error) {
            console.error('Failed to submit:', error);
            showToast('Error', 'An error occurred. Please try again.', 'danger');
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
                queueToast('Success', 'New Individual Remitter Created Successfully!', 'success');
                router.push(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}newRemitterId=${remitterIdStr}`);
            } else {
                queueToast('Saved', 'Remitter created successfully.', 'success');
                router.push('/admin/remitters');
            }
        } catch (error) {
            console.error('Failed to force-create remitter', error);
            showToast('Error', 'An error occurred while creating remitter.', 'danger');
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

                {/* Section 1: Branch setup */}
                <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-teal-500" />
                        Account Setup
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <FormSelect
                                label="Branch"
                                name="branch_id"
                                Icon={Building}
                                options={branchOptions}
                                required
                                defaultValue={typeof branchOptions[0] === 'string' ? branchOptions[0] : branchOptions[0]?.value}
                            />
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
                        <FormInput label="Sender ID" name="sender_id" placeholder="Auto-generated" disabled defaultValue={'LF3992'} Icon={CreditCard} />
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
                                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${verificationBadgeClass(match.verification_state)}`}>
                                                            {verificationLabel(match.verification_state)}
                                                        </span>
                                                        {match.id_expired ? (
                                                            <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
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
                            value={country}
                            required
                            Icon={Globe}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setCountry(e.target.value);
                                setDuplicateFormSignals((prev) => ({ ...prev, country: e.target.value }));
                            }}
                        />
                    </div>
                </div>

                {/* Section 5: IDs & Documents */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-teal-500" />
                        Identity Verification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <FormSelect
                            label="ID Type"
                            name="id_type"
                            options={['Passport', 'Driving License', 'National ID', 'Residence Permit']}
                            required
                            Icon={CreditCard}
                            value={idType}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIdType(e.target.value)}
                        />
                        <FormInput
                            label="ID Number"
                            name="id_no"
                            required
                            Icon={FileText}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, id_no: e.target.value }))}
                        />
                        <FormInput
                            label="ID Issued Date"
                            name="id_issued_date"
                            type="date"
                            required={idTypeNeedsIssuedDate(idType)}
                            Icon={Calendar}
                        />
                        <FormInput label="ID Expiry Date" name="id_expire_date" type="date" required Icon={Calendar} />
                    </div>

                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 ml-1">Documents</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FormFileUpload label="ID Copy" name="passport_copy" compact required />
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
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${verificationBadgeClass(createdRemitterVeriff.verification_state)}`}>
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
