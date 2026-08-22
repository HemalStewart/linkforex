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
import RemitterOverviewModal from '@/app/admin/components/RemitterOverviewModal';
import PostcodeLookup, { AddressData } from '@/app/admin/components/PostcodeLookup';
import { showToast, queueToast } from '@/app/lib/toast';
import {
    User, Calendar, MapPin, Briefcase, Phone, Building, CreditCard, Globe, FileText, Upload, Trash2, Plus, ArrowLeft, CheckCircle, Shield, Layers, Save, Users, AlertCircle, RefreshCcw, Eye, X
} from 'lucide-react';
import { usePagePermissions } from '@/app/lib/permissions';

type DuplicateMatch = {
    id: number;
    name: string;
    sender_id?: string;
    phone?: string;
    email?: string;
    id_number?: string;
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

const branchOptionLabel = (branch: any, fallback: string): string => {
    const rawName = String(branch?.name || branch?.branch_name || branch?.code || branch?.transaction_prefix || fallback).trim();
    return rawName.replace(/\s*\([^)]*\)\s*$/, '').trim();
};

const isLondonBranchOption = (option: { value: string; label: string }): boolean => {
    const combined = `${option.value} ${option.label}`.toLowerCase();
    return combined.includes('london') || option.value.toUpperCase() === 'LFX';
};

// --- HELPER COMPONENTS (Reused) ---

function FormInput({ label, name, type = 'text', placeholder, disabled, step, defaultValue, required, Icon, value, onChange, warning, error }: any) {
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
                    className={`input-glass w-full py-3 ${Icon ? '' : 'pl-4'} pr-4 text-sm focus:scale-[1.01] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed ${
                        error ? '!border-red-500 focus:!ring-red-500 bg-red-50/20' : warning ? '!border-amber-500 focus:!ring-amber-500 bg-amber-50/40 dark:bg-amber-950/20' : ''
                    }`}
                    placeholder={placeholder}
                />
            </div>
            {error && (
                <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 ml-1 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                </p>
            )}
            {!error && warning && (
                <p className="mt-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 ml-1 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {warning}
                </p>
            )}
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
                    className={`input-glass w-full py-3 ${Icon ? '' : 'pl-4'} cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                    {options.map((opt: SelectOption, index: number) => {
                        const optionValue = typeof opt === 'string' ? opt : opt.value;
                        const optionLabel = typeof opt === 'string' ? opt : opt.label;
                        return (
                            <option key={`${name}-${optionValue}-${index}`} value={optionValue}>{optionLabel}</option>
                        );
                    })}
                </select>
            </div>
        </div>
    );
}

function FormFileUpload({ label, name, compact, defaultValue, required }: any) {
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (file) {
            if (file.type.startsWith('image/')) {
                setPreviewUrl(URL.createObjectURL(file));
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const displayExisting = defaultValue && !selectedFile;
    const UPLOADS_BASE_URL = '/api/uploads';
    const fullExistingUrl = defaultValue
        ? (defaultValue.startsWith('http') || defaultValue.startsWith('/')
            ? defaultValue
            : `${UPLOADS_BASE_URL}/${defaultValue.replace(/^uploads\//, '')}`)
        : '';

    const isExistingImage = defaultValue && (
        defaultValue.toLowerCase().endsWith('.jpg') ||
        defaultValue.toLowerCase().endsWith('.jpeg') ||
        defaultValue.toLowerCase().endsWith('.png') ||
        defaultValue.toLowerCase().endsWith('.gif') ||
        defaultValue.toLowerCase().endsWith('.webp')
    );

    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div 
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl ${compact ? 'px-3 py-3' : 'px-4 py-8'} bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer text-center relative max-w-full overflow-hidden group hover:border-teal-400 dark:hover:border-teal-500`}
            >
                <div className="flex flex-col items-center justify-center">
                    {previewUrl ? (
                        <div className="relative w-16 h-16 mb-2 rounded-lg border border-slate-200 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    ) : selectedFile ? (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2">
                            <FileText className="w-5 h-5 text-teal-500 animate-pulse" />
                        </div>
                    ) : isExistingImage && displayExisting ? (
                        <div className="relative w-16 h-16 mb-2 rounded-lg border border-slate-200 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                            <img src={fullExistingUrl} alt="Existing Preview" className="w-full h-full object-cover" />
                        </div>
                    ) : displayExisting ? (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2">
                            <FileText className="w-5 h-5 text-teal-600" />
                        </div>
                    ) : !compact ? (
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-teal-500 transition-colors" />
                        </div>
                    ) : null}

                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate w-full px-2">
                        {selectedFile ? (
                            <span className="text-teal-600 dark:text-teal-400 flex items-center justify-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {selectedFile.name}
                            </span>
                        ) : displayExisting ? (
                            <span className="text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" /> {defaultValue.split('/').pop()}
                            </span>
                        ) : (
                            <span className="group-hover:text-teal-500 transition-colors">{compact ? 'Upload' : 'Click to upload'}</span>
                        )}
                    </span>

                    <div className="flex items-center space-x-2 mt-2 z-10">
                        {selectedFile && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-500 hover:bg-rose-100 hover:text-rose-600 text-[10px] font-bold transition-colors"
                            >
                                Clear
                            </button>
                        )}
                        {displayExisting && (
                            <a
                                href={fullExistingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-[10px] font-bold transition-colors flex items-center gap-0.5"
                            >
                                <Eye className="w-2.5 h-2.5" /> View Existing
                            </a>
                        )}
                    </div>

                    <input 
                        type="file" 
                        ref={inputRef}
                        name={name} 
                        required={required && !defaultValue} 
                        onChange={handleFileChange}
                        className="hidden" 
                    />
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
    const { canMultiBranch } = usePagePermissions('REMITTERS');
    const scopedBranchCode = React.useMemo(() => getAdminBranchCode(currentUser), [currentUser]);

    const [branches, setBranches] = useState<any[]>([]);
    const [branchesLoaded, setBranchesLoaded] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [lastSenderId, setLastSenderId] = useState<string | null>(null);
    const [idType, setIdType] = useState('Passport');
    const [country, setCountry] = useState('United Kingdom');
    const [postcode, setPostcode] = useState('');
    const [address1, setAddress1] = useState('');
    const [address2, setAddress2] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [possibleDuplicates, setPossibleDuplicates] = useState<DuplicateMatch[]>([]);
    const [viewRemitter, setViewRemitter] = useState<any | null>(null);
    const [viewRemitterReceivers, setViewRemitterReceivers] = useState<any[]>([]);
    const [accessRequestBusy, setAccessRequestBusy] = useState<number | null>(null);
    const [accessRequestModal, setAccessRequestModal] = useState<{ isOpen: boolean; match: DuplicateMatch | null }>({ isOpen: false, match: null });
    const [duplicateFormSignals, setDuplicateFormSignals] = useState({
        sender_id: '',
        sender_name: '',
        company_name: '',
        date_of_birth: '',
        telephone: '',
        email: '',
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


    const [countries, setCountries] = useState<any[]>([]);
    const [occupations, setOccupations] = useState<any[]>([]);

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
            } finally {
                setBranchesLoaded(true);
            }
        };
        const fetchCountries = async () => {
            try {
                const res = await fetch(ENDPOINTS.COUNTRIES.LIST);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        const filtered = data.filter((c: any) =>
                            String(c.black_list_country || '').toLowerCase() !== 'yes' &&
                            String(c.status || '').toLowerCase() !== 'inactive'
                        );
                        setCountries(filtered);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch countries", e);
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
        fetchCountries();
        fetchOccupations();
    }, []);

    const countryOptions = React.useMemo<SelectOption[]>(() => {
        return countries.map((c: any) => ({
            value: c.name,
            label: c.name,
        }));
    }, [countries]);

    const countryOfBirthOptions = React.useMemo<SelectOption[]>(() => {
        return [
            { value: '', label: 'Select Country of Birth' },
            ...countries.map((c: any) => ({
                value: c.name,
                label: c.name,
            })),
        ];
    }, [countries]);

    const occupationOptions = React.useMemo<SelectOption[]>(() => {
        return [
            { value: '', label: 'Select Occupation' },
            ...occupations.map((o: any) => ({
                value: o.name,
                label: o.name,
            })),
        ];
    }, [occupations]);

    const branchOptions = React.useMemo<SelectOption[]>(() => {
        if (!branchesLoaded) return [];

        const source = branches;
        const scoped = (isPrivilegedUser || canMultiBranch) ? source : source.filter((branch) => branchMatchesAdminScope(branch, currentUser));
        const senderBranches = scoped.filter(isSenderBranch);
        const filtered = senderBranches;
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
        return sorted;
    }, [branches, branchesLoaded, currentUser, isPrivilegedUser, canMultiBranch]);

    React.useEffect(() => {
        if (branchOptions.length === 0) return;

        setSelectedBranch((current) => {
            if (current && branchOptions.some((option) => (typeof option === 'string' ? option : option.value) === current)) {
                return current;
            }

            const preferred = branchOptions.find((option) => {
                const normalized = typeof option === 'string' ? { value: option, label: option } : option;
                return isLondonBranchOption(normalized);
            }) ?? branchOptions[0];

            return typeof preferred === 'string' ? preferred : preferred.value;
        });
    }, [branchOptions]);

    React.useEffect(() => {
        if (!canMultiBranch && scopedBranchCode) {
            setSelectedBranch(scopedBranchCode);
        }
    }, [canMultiBranch, scopedBranchCode]);

    const senderIdBranch = canMultiBranch ? selectedBranch : scopedBranchCode;

    React.useEffect(() => {
        if (!senderIdBranch) {
            setLastSenderId(null);
            return;
        }

        const controller = new AbortController();
        const loadLastSenderId = async () => {
            try {
                const query = new URLSearchParams({ branch: senderIdBranch });
                const response = await fetch(
                    withActingUserParam(`${ENDPOINTS.REMITTERS.LAST_SENDER_ID}?${query.toString()}`, currentUser),
                    { signal: controller.signal },
                );
                if (!response.ok) return;
                const data = await response.json();
                setLastSenderId(data?.last_sender_id ? String(data.last_sender_id) : null);
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error('Failed to load the last remitter reference ID', error);
                }
            }
        };

        void loadLastSenderId();
        return () => controller.abort();
    }, [currentUser, senderIdBranch]);

    const hasMinimumDuplicateSignals = React.useCallback((signals: typeof duplicateFormSignals): boolean => {
        const senderId = (signals.sender_id || '').trim();
        const name = (signals.sender_name || '').trim();
        const idNo = (signals.id_no || '').trim();
        const email = (signals.email || '').trim();
        const phoneDigits = (signals.telephone || '').replace(/\D+/g, '');
        const hasNameContext = Boolean(name && (signals.date_of_birth || signals.postcode || signals.address_1 || name.length >= 3));
        return Boolean(senderId || idNo || phoneDigits.length >= 6 || (email.length >= 4 && email.includes('@')) || hasNameContext);
    }, []);

    const buildDuplicateQuery = React.useCallback((signals: typeof duplicateFormSignals): string => {
        const params = new URLSearchParams();
        if (signals.sender_id?.trim()) params.set('sender_id', signals.sender_id.trim());
        if (signals.sender_name?.trim()) params.set('sender_name', signals.sender_name.trim());
        if (signals.email?.trim()) params.set('email', signals.email.trim());
        if (signals.date_of_birth?.trim()) params.set('dob', signals.date_of_birth.trim());
        if (signals.telephone?.trim()) params.set('phone', signals.telephone.trim());
        if (signals.id_no?.trim()) params.set('id_no', signals.id_no.trim());
        if (signals.postcode?.trim()) params.set('postcode', signals.postcode.trim());
        if (signals.address_1?.trim()) params.set('address_1', signals.address_1.trim());
        if (signals.city?.trim()) params.set('city', signals.city.trim());
        if (signals.country?.trim()) params.set('country', signals.country.trim());

        return params.toString();
    }, []);

    const fetchPotentialMatches = React.useCallback(async (signals: typeof duplicateFormSignals): Promise<DuplicateMatch[]> => {
        if (!hasMinimumDuplicateSignals(signals)) {
            return [];
        }

        let query = buildDuplicateQuery(signals);
        if (!query) return [];

        // Whether a match counts as another branch's customer depends on the
        // branch being registered into, not on whichever branch the signed-in
        // user happens to belong to.
        const targetBranch = canMultiBranch ? selectedBranch : scopedBranchCode;
        if (targetBranch) {
            query += `&branch=${encodeURIComponent(targetBranch)}`;
        }

        const response = await fetch(withActingUserParam(`${ENDPOINTS.REMITTERS.POTENTIAL_MATCHES}?${query}`, currentUser));
        if (!response.ok) {
            return [];
        }

        const data = await response.json() as { matches?: DuplicateMatch[] };
        return Array.isArray(data.matches) ? data.matches : [];
    }, [buildDuplicateQuery, currentUser, hasMinimumDuplicateSignals, canMultiBranch, selectedBranch, scopedBranchCode]);

    React.useEffect(() => {
        if (!hasMinimumDuplicateSignals(duplicateFormSignals)) {
            setPossibleDuplicates([]);
            return;
        }

        // The lookup runs silently while typing. Only a confirmed match is
        // surfaced, so the form stays quiet until there is something to report.
        const timer = window.setTimeout(async () => {
            try {
                const matches = await fetchPotentialMatches(duplicateFormSignals);
                setPossibleDuplicates(matches);
            } catch (error) {
                console.error('Failed to check potential duplicate remitters', error);
                setPossibleDuplicates([]);
            }
        }, 450);

        return () => window.clearTimeout(timer);
    }, [duplicateFormSignals, fetchPotentialMatches, hasMinimumDuplicateSignals]);

    const fieldWarnings = React.useMemo(() => {
        const warnings: Record<string, string> = {};
        if (possibleDuplicates.length === 0) return warnings;

        const typedSenderId = (duplicateFormSignals.sender_id || '').trim().toLowerCase();
        const typedName = (duplicateFormSignals.sender_name || '').trim().toLowerCase();
        const typedPhone = (duplicateFormSignals.telephone || '').replace(/\D+/g, '');
        const typedEmail = (duplicateFormSignals.email || '').trim().toLowerCase();
        const typedIdNo = (duplicateFormSignals.id_no || '').trim().toLowerCase();

        for (const match of possibleDuplicates) {
            const matchSenderId = (match.sender_id || '').trim().toLowerCase();
            const matchName = (match.name || '').trim().toLowerCase();
            const matchPhone = (match.phone || '').replace(/\D+/g, '');
            const matchEmail = (match.email || '').trim().toLowerCase();
            const matchIdNo = (match.id_number || '').trim().toLowerCase();

            if (typedSenderId && matchSenderId && typedSenderId === matchSenderId && !warnings.sender_id) {
                warnings.sender_id = `Already existing Reference ID (${match.sender_id})`;
            }
            if (typedName && matchName && typedName === matchName && !warnings.sender_name) {
                warnings.sender_name = `Already existing Remitter Name (${match.name})`;
            }
            if (typedPhone && matchPhone && typedPhone === matchPhone && !warnings.telephone) {
                warnings.telephone = `Already existing Mobile Number (${match.phone})`;
            }
            if (typedEmail && matchEmail && typedEmail === matchEmail && !warnings.email) {
                warnings.email = `Already existing Email Address (${match.email})`;
            }
            if (typedIdNo && matchIdNo && typedIdNo === matchIdNo && !warnings.id_no) {
                warnings.id_no = `Already existing ID Number (${match.id_number})`;
            }
        }

        return warnings;
    }, [possibleDuplicates, duplicateFormSignals]);

    const createRemitter = React.useCallback(async (
        payload: any,
        forceCreate: boolean
    ): Promise<{ createdId?: string | number; createdRouteKey?: string; blockedByDuplicate?: boolean }> => {
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
            const duplicateData = await res.json() as {
                error?: string; message?: string; matches?: DuplicateMatch[];
                origin_branch?: string; matched_field?: string; request_created?: boolean;
            };

            // The customer already exists at another branch. A second record must not
            // be created; that branch is asked to release the original instead, so
            // this is reported as an outcome rather than something to override.
            if (duplicateData.error === 'cross_branch_duplicate') {
                setConfirmModal({
                    isOpen: true,
                    title: 'Approval Required From Another Branch',
                    message: (duplicateData.message || 'This customer is already registered at another branch.')
                        + (duplicateData.request_created
                            ? ' An approval request has been sent to that branch.'
                            : ' An approval request for this customer is already awaiting review.'),
                    type: 'warning',
                    isAlert: true,
                    shouldRedirect: false,
                    redirectUrl: ''
                });
                return { blockedByDuplicate: true };
            }

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
            const errData = await res.json().catch(() => ({}));
            console.error('Error creating remitter:', errData);
            let message = 'Failed to create remitter';
            if (errData?.messages) {
                message = typeof errData.messages === 'object' ? Object.values(errData.messages).join(', ') : String(errData.messages);
            } else if (errData?.message) {
                message = String(errData.message);
            }
            setConfirmModal({
                isOpen: true,
                title: 'Validation Error',
                message,
                type: 'warning',
                isAlert: true,
                shouldRedirect: false,
                redirectUrl: ''
            });
            return {};
        }

        const result = await res.json();
        return { createdId: result.id, createdRouteKey: result.route_key || (result.id != null ? String(result.id) : undefined) };
    }, [currentUser]);

    // The match card carries a summary only, so the full customer and their
    // receivers are loaded before the overview is shown.
    const openRemitterOverview = async (match: DuplicateMatch) => {
        setViewRemitter(match);
        setViewRemitterReceivers([]);
        try {
            const [full, recs] = await Promise.all([
                fetch(withActingUserParam(ENDPOINTS.REMITTERS.DETAIL(match.id), currentUser)).then(r => r.ok ? r.json() : null),
                fetch(withActingUserParam(`${ENDPOINTS.BENEFICIARIES.LIST}?customer_id=${match.id}`, currentUser)).then(r => r.ok ? r.json() : []),
            ]);
            if (full) setViewRemitter(full?.data ?? full);
            setViewRemitterReceivers(Array.isArray(recs) ? recs : (recs?.data ?? []));
        } catch {
            // the summary from the match card is still shown if the load fails
        }
    };

    // Access to another branch's customer is only ever requested here, by the
    // user pressing the button - never as a side effect of saving.
    const requestBranchPermission = async (match: DuplicateMatch) => {
        setAccessRequestBusy(match.id);
        try {
            const res = await fetch(
                withActingUserParam(`${ENDPOINTS.REMITTERS.LIST}/${match.id}/request-branch-access`, currentUser),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ branch: selectedBranch || '' }),
                }
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast('Error', body?.messages?.error || body?.message || 'Could not send the approval request.', 'danger');
                return;
            }
            showToast('Approval Requested', body?.message || 'An approval request has been sent.', 'success');
        } catch {
            showToast('Error', 'Could not send the approval request.', 'danger');
        } finally {
            setAccessRequestBusy(null);
        }
    };

    const verificationLabel = (state?: string) => {
        const normalized = (state || '').toLowerCase();
        if (normalized === 'verified') return 'Already Verified';
        if (normalized === 'pending') return 'Pending';
        if (normalized === 'rejected') return 'Rejected';
        if (normalized === 'expired') return 'ID Expired';
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
            sender_id: data.sender_id,

            // Name Fields
            sender_name: data.sender_name,
            phone: data.telephone,
            telephone: data.telephone,

            // Individual Fields
            date_of_birth: data.date_of_birth,
            gender: data.gender,
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
            const remitterRouteKey = submitResult.createdRouteKey;
            if (!remitterId || !remitterRouteKey) {
                return;
            }

            const remitterRouteKeyStr = String(remitterRouteKey);
            setCreatedRemitterId(remitterRouteKeyStr);
            await loadRemitterVeriffState(remitterRouteKeyStr);

            if (returnUrl) {
                queueToast('Success', 'New Individual Remitter Created Successfully!', 'success');
                router.push(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}newRemitterId=${encodeURIComponent(remitterRouteKeyStr)}`);
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
            const remitterRouteKey = submitResult.createdRouteKey;
            if (!remitterId || !remitterRouteKey) return;
            const remitterRouteKeyStr = String(remitterRouteKey);
            setCreatedRemitterId(remitterRouteKeyStr);
            await loadRemitterVeriffState(remitterRouteKeyStr);

            if (returnUrl) {
                queueToast('Success', 'New Individual Remitter Created Successfully!', 'success');
                router.push(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}newRemitterId=${encodeURIComponent(remitterRouteKeyStr)}`);
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
            {viewRemitter && (
                <RemitterOverviewModal
                    remitter={viewRemitter}
                    receivers={viewRemitterReceivers}
                    onClose={() => setViewRemitter(null)}
                />
            )}

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
                isOpen={accessRequestModal.isOpen}
                onClose={() => setAccessRequestModal({ isOpen: false, match: null })}
                onConfirm={() => {
                    const match = accessRequestModal.match;
                    setAccessRequestModal({ isOpen: false, match: null });
                    if (match) void requestBranchPermission(match);
                }}
                title="Request Permission"
                message={accessRequestModal.match
                    ? `${accessRequestModal.match.name} is registered at ${accessRequestModal.match.branch || 'another branch'}. Send an approval request to that branch so this branch can use the remitter?`
                    : ''}
                type="warning"
                isAlert={false}
                confirmText="Send Request"
                cancelText="Cancel"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create New Remitter</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Onboard a new remitter to the platform.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                {canMultiBranch && (
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
                                    disabled={!branchesLoaded}
                                    value={selectedBranch}
                                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSelectedBranch(event.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 2: Personal Details */}
                <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                        <User className="w-5 h-5 mr-2 text-teal-500" />
                        Personal Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <FormInput
                                label="Reference ID"
                                name="sender_id"
                                placeholder="Enter Reference ID"
                                required
                                Icon={CreditCard}
                                warning={fieldWarnings.sender_id}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, sender_id: e.target.value }))}
                            />
                            <p className="mt-1.5 ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                Last saved Reference ID: <span className="font-semibold text-slate-700 dark:text-slate-200">{lastSenderId || 'None'}</span>
                            </p>
                        </div>
                        <FormInput
                            label="Full Name"
                            name="sender_name"
                            placeholder="Full Name"
                            required
                            Icon={User}
                            warning={fieldWarnings.sender_name}
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
                        <FormSelect
                            label="Gender"
                            name="gender"
                            Icon={User}
                            options={[
                                { value: '', label: 'Select Gender' },
                                { value: 'Male', label: 'Male' },
                                { value: 'Female', label: 'Female' },
                                { value: 'Other', label: 'Other' },
                                { value: 'Prefer not to say', label: 'Prefer not to say' },
                            ]}
                        />
                        <FormSelect label="Country of Birth" name="place_of_birth" Icon={Globe} options={countryOfBirthOptions} />
                        <FormSelect label="Occupation" name="occupation" Icon={Briefcase} options={occupationOptions} required />
                        <FormInput
                            label="Mobile number"
                            name="telephone"
                            placeholder="Mobile number"
                            required
                            Icon={Phone}
                            warning={fieldWarnings.telephone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, telephone: e.target.value }))}
                        />
                        <FormInput
                            label="Email"
                            name="email"
                            type="email"
                            placeholder="Email address"
                            Icon={FileText}
                            warning={fieldWarnings.email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateFormSignals((prev) => ({ ...prev, email: e.target.value }))}
                        />
                    </div>
                </div>

                {possibleDuplicates.length > 0 && (
                    <div className="mb-8 border-b border-slate-100 dark:border-slate-700/50 pb-8">
                        <div className="rounded-2xl border p-5 transition-all border-amber-300 bg-amber-50/90 dark:border-amber-500/40 dark:bg-amber-950/30">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                                <div className="w-full">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                                            {`⚠️ Existing Remitter Record Found (${possibleDuplicates.length})`}
                                        </p>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                                        A remitter matching your entered information already exists in the system. Review existing record(s) below before saving.
                                    </p>

                                    {possibleDuplicates.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            {possibleDuplicates.slice(0, 5).map((match) => (
                                                <div key={`dup-${match.id}`} className="rounded-xl border border-amber-200/80 bg-white/95 dark:border-amber-700/40 dark:bg-slate-900/90 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-bold text-sm text-slate-900 dark:text-white">{match.name}</span>
                                                            {match.sender_id && <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">ID: {match.sender_id}</span>}
                                                        </div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                                                            {match.phone && <span><strong>Phone:</strong> {match.phone}</span>}
                                                            {match.email && <span><strong>Email:</strong> {match.email}</span>}
                                                            {match.id_number && <span><strong>ID No:</strong> {match.id_number}</span>}
                                                            {match.branch && <span><strong>Branch:</strong> {match.branch}</span>}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${verificationBadgeClass(match.verification_state)}`}>
                                                                {verificationLabel(match.verification_state)}
                                                            </span>
                                                            {match.id_expired && (match.verification_state || '').toLowerCase() !== 'expired' && (
                                                                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                                    ID Expired
                                                                </span>
                                                            )}
                                                            {Array.isArray(match.reasons) && match.reasons.map((r, i) => (
                                                                <span key={i} className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                                                    {r}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 flex flex-wrap items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => void openRemitterOverview(match)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:text-teal-300 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800 transition-colors inline-flex items-center gap-1.5"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            View Remitter
                                                        </button>
                                                        <a
                                                            href={`/admin/remitters/${match.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center gap-1.5"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                            Edit Remitter
                                                        </a>
                                                        {match.same_branch === false && (
                                                            <button
                                                                type="button"
                                                                disabled={accessRequestBusy === match.id}
                                                                onClick={() => setAccessRequestModal({ isOpen: true, match })}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 dark:text-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                                            >
                                                                <Shield className="w-3.5 h-3.5" />
                                                                {accessRequestBusy === match.id ? 'Requesting...' : 'Request Permission'}
                                                            </button>
                                                        )}
                                                    </div>
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
                        <div>
                            <PostcodeLookup
                                label="Postcode"
                                name="postcode"
                                value={postcode}
                                required
                                onChange={(val) => {
                                    setPostcode(val);
                                    setDuplicateFormSignals((prev) => ({ ...prev, postcode: val }));
                                }}
                                onAddressSelect={(addr: AddressData) => {
                                    if (addr.address_1) {
                                        setAddress1(addr.address_1);
                                        setDuplicateFormSignals((prev) => ({ ...prev, address_1: addr.address_1 }));
                                    }
                                    if (addr.address_2) setAddress2(addr.address_2);
                                    if (addr.city) {
                                        setCity(addr.city);
                                        setDuplicateFormSignals((prev) => ({ ...prev, city: addr.city }));
                                    }
                                    if (addr.country) {
                                        setCountry(addr.country);
                                        setDuplicateFormSignals((prev: any) => ({ ...prev, country: addr.country }));
                                    }
                                }}
                            />
                        </div>
                        <FormSelect
                            label="Country"
                            name="country"
                            options={countryOptions}
                            value={country}
                            required
                            Icon={Globe}
                            onChange={(e: any) => {
                                setCountry(e.target.value);
                                setDuplicateFormSignals((prev: any) => ({ ...prev, country: e.target.value }));
                            }}
                        />
                        <div className="md:col-span-2">
                            <FormInput
                                label="Address Line 1"
                                name="address_1"
                                value={address1}
                                placeholder="House/Flat Number, Street"
                                required
                                Icon={MapPin}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setAddress1(e.target.value);
                                    setDuplicateFormSignals((prev) => ({ ...prev, address_1: e.target.value }));
                                }}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <FormInput
                                label="Address Line 2"
                                name="address_2"
                                value={address2}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress2(e.target.value)}
                                placeholder="Locality / Area"
                                Icon={MapPin}
                            />
                        </div>
                        <FormInput
                            label="City"
                            name="city"
                            value={city}
                            placeholder="City"
                            required
                            Icon={Building}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setCity(e.target.value);
                                setDuplicateFormSignals((prev) => ({ ...prev, city: e.target.value }));
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
                            options={['NIC', 'Passport', 'Driving License', 'CNIC', 'Other']}
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
                            warning={fieldWarnings.id_no}
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
                        <FormFileUpload label="ID Copy" name="passport_copy" compact />
                        <FormFileUpload label="Proof of Address" name="proof_of_address_doc" compact />
                        <FormFileUpload label="Source of Income" name="work_related_docs" compact />
                        <FormFileUpload label="AML Doc" name="sender_details_aml_screening_doc" compact />
                    </div>
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
                        className="btn-primary flex items-center"
                    >
                        <Save className="w-4 h-4" />
                        <span>{loading ? 'Onboarding...' : 'Save'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
