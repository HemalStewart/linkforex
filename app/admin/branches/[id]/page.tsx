'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { isPrivilegedUser } from '@/app/lib/permissions';
import ConfirmModal from '../../components/ConfirmModal';
import {
    ArrowLeft,
    ArrowRightLeft,
    Building,
    Coins,
    Flag,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Printer,
    Save,
    Store,
    Tag,
    Trash2,
} from 'lucide-react';

const normalizeBranchPrefix = (value: string): string =>
    value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 3);

type CountryOption = {
    id?: string | number;
    name?: string | null;
};

type BranchFormData = {
    id: number | null;
    name: string;
    building_number: string;
    address_line_1: string;
    city: string;
    postcode: string;
    country: string;
    telephone_1: string;
    telephone_2: string;
    fax_1: string;
    fax_2: string;
    email_1: string;
    email_2: string;
    transaction_prefix: string;
    default_transaction_type: string;
    day_transfer_limit: string;
    branch_ownership_type: 'Own' | 'Agent';
    remarks: string;
    status: string;
    created_by: string;
    created_at: string;
    updated_by: string;
    updated_at: string;
};

const INITIAL_FORM: BranchFormData = {
    id: null,
    name: '',
    building_number: '',
    address_line_1: '',
    city: '',
    postcode: '',
    country: '',
    telephone_1: '',
    telephone_2: '',
    fax_1: '',
    fax_2: '',
    email_1: '',
    email_2: '',
    transaction_prefix: '',
    default_transaction_type: '',
    day_transfer_limit: '100000',
    branch_ownership_type: 'Own',
    remarks: '',
    status: 'active',
    created_by: '',
    created_at: '',
    updated_by: '',
    updated_at: '',
};

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="rounded-[28px] border border-white/8 bg-slate-950/20 p-6 md:p-7">
            <div className="mb-5">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>
            </div>
            {children}
        </section>
    );
}

function TextField({
    label,
    value,
    onChange,
    placeholder,
    icon,
    type = 'text',
    required = false,
    disabled = false,
    maxLength,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    icon: React.ReactNode;
    type?: string;
    required?: boolean;
    disabled?: boolean;
    maxLength?: number;
}) {
    return (
        <div>
            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>
            <div className="relative input-icon">
                <span className="input-icon-left">{icon}</span>
                <input
                    type={type}
                    required={required}
                    disabled={disabled}
                    maxLength={maxLength}
                    className="input-glass w-full disabled:cursor-not-allowed disabled:opacity-70"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}

function SelectField({
    label,
    value,
    onChange,
    icon,
    children,
    required = false,
    disabled = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    required?: boolean;
    disabled?: boolean;
}) {
    return (
        <div>
            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>
            <div className="relative input-icon">
                <span className="input-icon-left">{icon}</span>
                <select
                    required={required}
                    disabled={disabled}
                    className="input-glass w-full cursor-pointer appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-70"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {children}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-200">⌄</span>
            </div>
        </div>
    );
}

export default function EditBranchPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const branchId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const isViewMode = searchParams.get('mode') === 'view';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enteredBy, setEnteredBy] = useState('');
    const [countries, setCountries] = useState<string[]>([]);
    const [canEditBranch, setCanEditBranch] = useState(false);
    const [canDeleteBranch, setCanDeleteBranch] = useState(false);
    const [formData, setFormData] = useState<BranchFormData>(INITIAL_FORM);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false,
    });

    useEffect(() => {
        let ignore = false;

        const resolvePermissions = async () => {
            const parsed = getStoredUser<{ role?: string | null; username?: string | null; name?: string | null; system_defined?: string | null }>();
            setEnteredBy(parsed?.username || parsed?.name || '');

            if (!parsed) {
                if (!ignore) {
                    setCanEditBranch(false);
                    setCanDeleteBranch(false);
                }
                return;
            }

            if (isPrivilegedUser(parsed)) {
                if (!ignore) {
                    setCanEditBranch(true);
                    setCanDeleteBranch(true);
                }
                return;
            }

            const roleName = String(parsed.role || '').trim().toLowerCase();
            if (!roleName) {
                if (!ignore) {
                    setCanEditBranch(false);
                    setCanDeleteBranch(false);
                }
                return;
            }

            try {
                const response = await fetch(ENDPOINTS.PERMISSION_GROUPS.LIST);
                if (!response.ok) {
                    if (!ignore) {
                        setCanEditBranch(false);
                        setCanDeleteBranch(false);
                    }
                    return;
                }

                const data = await response.json();
                const rows = Array.isArray(data) ? data : [];
                const hasPermission = (operationName: 'EDIT' | 'DELETE') => rows.some((row) => {
                    const role = String(row?.role_name || '').trim().toLowerCase();
                    const section = String(row?.page_section || '').trim().toUpperCase();
                    const operation = String(row?.operation || '').trim().toUpperCase();
                    const active = String(row?.active || '').trim().toLowerCase();
                    if (role !== roleName) return false;
                    if (active !== 'yes') return false;
                    if (operation !== operationName) return false;
                    return section === 'BRANCH' || section === 'BRANCHES';
                });

                if (!ignore) {
                    setCanEditBranch(hasPermission('EDIT'));
                    setCanDeleteBranch(hasPermission('DELETE'));
                }
            } catch {
                if (!ignore) {
                    setCanEditBranch(false);
                    setCanDeleteBranch(false);
                }
            }
        };

        void resolvePermissions();
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        const loadCountries = async () => {
            try {
                const response = await fetch(`${ENDPOINTS.COUNTRIES.LIST}?status=active&sort=name&dir=asc`);
                if (!response.ok) return;
                const data = (await response.json()) as CountryOption[];
                if (!Array.isArray(data)) return;

                const names = Array.from(
                    new Set(
                        data
                            .map((country) => String(country?.name || '').trim())
                            .filter(Boolean),
                    ),
                ).sort((left, right) => left.localeCompare(right));
                setCountries(names);
            } catch (error) {
                console.error('Failed to load countries', error);
            }
        };

        void loadCountries();
    }, []);

    useEffect(() => {
        if (branchId) {
            void fetchBranch();
        }
    }, [branchId]);

    const isReadOnly = isViewMode || !canEditBranch;

    const countryOptions = useMemo(() => {
        if (!formData.country || countries.includes(formData.country)) {
            return countries;
        }
        return [formData.country, ...countries];
    }, [countries, formData.country]);

    const updateField = <K extends keyof BranchFormData>(key: K, value: BranchFormData[K]) => {
        setFormData((current) => ({ ...current, [key]: value }));
    };

    const fetchBranch = async () => {
        try {
            const res = await fetch(ENDPOINTS.BRANCHES.DETAIL(branchId as string));
            if (!res.ok) return;
            const data = await res.json();
            setFormData({
                id: data.id,
                name: data.name || '',
                building_number: data.building_number || '',
                address_line_1: data.address_line_1 || '',
                city: data.city || '',
                postcode: data.postcode || '',
                country: data.country || '',
                telephone_1: data.telephone_1 ?? data.phone ?? '',
                telephone_2: data.telephone_2 || '',
                fax_1: data.fax_1 || '',
                fax_2: data.fax_2 || '',
                email_1: data.email_1 || '',
                email_2: data.email_2 || '',
                transaction_prefix: data.transaction_prefix ?? data.code ?? '',
                default_transaction_type: data.default_transaction_type || '',
                day_transfer_limit: data.day_transfer_limit != null ? String(data.day_transfer_limit) : '100000',
                branch_ownership_type: data.branch_ownership_type === 'Agent' ? 'Agent' : 'Own',
                remarks: data.remarks || '',
                status: data.status || 'active',
                created_by: data.created_by || '',
                created_at: data.created_at || '',
                updated_by: data.updated_by || '',
                updated_at: data.updated_at || '',
            });
        } catch (error) {
            console.error('Failed to fetch branch:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!branchId || isReadOnly) return;
        setSaving(true);

        const normalizedPrefix = normalizeBranchPrefix(formData.transaction_prefix);
        if (!normalizedPrefix) {
            setConfirmModal({
                isOpen: true,
                title: 'Validation Error',
                message: 'Transaction prefix is required and must be up to 3 letters or numbers.',
                type: 'warning',
                isAlert: true,
                shouldRedirect: false,
            });
            setSaving(false);
            return;
        }

        if (!formData.default_transaction_type) {
            setConfirmModal({
                isOpen: true,
                title: 'Validation Error',
                message: 'Please select a default transaction type.',
                type: 'warning',
                isAlert: true,
                shouldRedirect: false,
            });
            setSaving(false);
            return;
        }

        const addressParts = [
            formData.building_number,
            formData.address_line_1,
            formData.city,
            formData.postcode,
            formData.country,
        ].filter(Boolean);

        const payload = {
            ...formData,
            transaction_prefix: normalizedPrefix,
            code: normalizedPrefix,
            phone: formData.telephone_1 || undefined,
            address: addressParts.length ? addressParts.join(', ') : undefined,
            day_transfer_limit: formData.day_transfer_limit ? Number(formData.day_transfer_limit) : 100000,
            updated_by: enteredBy || undefined,
        };

        try {
            const res = await fetch(ENDPOINTS.BRANCHES.DETAIL(branchId as string), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Branch updated successfully.',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true,
                });
            } else {
                const err = await res.text();
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: err || 'Failed to update branch.',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false,
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to update branch.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!branchId || !canDeleteBranch || isViewMode) return;
        const res = await fetch(ENDPOINTS.BRANCHES.DETAIL(branchId as string), { method: 'DELETE' });
        if (res.ok) {
            router.push('/admin/branches');
        } else {
            const errorData = await res.json().catch(() => null);
            const errorMessage =
                errorData?.messages?.error ||
                errorData?.message ||
                errorData?.error ||
                'Failed to delete branch.';
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: errorMessage,
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
            });
        }
    };

    const handleModalClose = () => {
        setConfirmModal((current) => ({ ...current, isOpen: false }));
        if (confirmModal.shouldRedirect) {
            router.push('/admin/branches');
        }
    };

    if (loading) {
        return <div className="mx-auto max-w-7xl py-20 text-center text-slate-500 dark:text-slate-300">Loading...</div>;
    }

    const summaryRows = [
        { label: 'Branch Name', value: formData.name },
        { label: 'Transaction Prefix', value: formData.transaction_prefix, nowrap: true },
        { label: 'Ownership Type', value: formData.branch_ownership_type },
        { label: 'Default Transaction Type', value: formData.default_transaction_type || '-' },
        { label: 'Daily Transfer Limit', value: formData.day_transfer_limit ? `£${Number(formData.day_transfer_limit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-' },
        { label: 'Primary Contact', value: formData.telephone_1 || '-' },
        { label: 'Primary Email', value: formData.email_1 || '-' },
        { label: 'Entered User', value: formData.created_by || '-' },
        { label: 'Entered Date', value: formData.created_at ? new Date(formData.created_at).toLocaleString() : '-' },
        { label: 'Modified User', value: formData.updated_by || '-' },
        { label: 'Modified Date', value: formData.updated_at ? new Date(formData.updated_at).toLocaleString() : '-' },
    ];

    return (
        <div className="mx-auto max-w-7xl animate-fade-in-up pb-20">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={handleModalClose}
                onConfirm={handleModalClose}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type as never}
                isAlert={confirmModal.isAlert}
                confirmText="OK"
            />

            <div className="mb-8 flex items-center justify-between">
                <div>
                    <Link href="/admin/branches" className="group mb-2 inline-flex items-center text-sm font-bold text-slate-500 transition-colors hover:text-teal-600 dark:hover:text-teal-400">
                        <ArrowLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back to Branches
                    </Link>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{isViewMode ? 'View Branch' : 'Edit Branch'}</h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-300">{isViewMode ? 'Review branch details, contacts, and settings.' : 'Update branch details, contacts, and settings.'}</p>
                </div>
                {!isViewMode && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={!canDeleteBranch}
                        className={`glass-effect flex items-center space-x-2 rounded-full px-5 py-3 text-sm font-bold transition-colors ${canDeleteBranch ? 'text-slate-600 hover:text-red-600 dark:text-slate-300' : 'cursor-not-allowed text-slate-400 opacity-50 dark:text-slate-500'}`}
                        title={canDeleteBranch ? 'Delete branch' : 'Delete permission required'}
                    >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                    </button>
                )}
            </div>

            <div className="card-glass mb-8 p-6">
                <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Branch Summary</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-300">Key details and audit information.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
                    {summaryRows.map((row) => (
                        <div key={row.label} className="rounded-2xl border border-slate-100/70 bg-slate-50/40 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-900/30">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">{row.label}</div>
                            <div className={`mt-1 font-semibold text-slate-800 dark:text-slate-100 ${row.nowrap ? 'whitespace-nowrap' : 'break-words'}`}>{row.value || '-'}</div>
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card-glass relative space-y-6 overflow-hidden p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-500/5 blur-3xl"></div>

                <fieldset disabled={isReadOnly} className="contents">
                    <SectionCard title="Branch Details" description="Core location and branch identity information.">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <TextField label="Branch Name" value={formData.name} onChange={(value) => updateField('name', value)} placeholder="Enter branch name" icon={<Store className="h-5 w-5" />} required disabled={isReadOnly} />
                            <TextField label="Building Number" value={formData.building_number} onChange={(value) => updateField('building_number', value)} placeholder="Enter building number" icon={<Building className="h-5 w-5" />} disabled={isReadOnly} />
                            <TextField label="Address" value={formData.address_line_1} onChange={(value) => updateField('address_line_1', value)} placeholder="Enter branch address" icon={<MapPin className="h-5 w-5" />} disabled={isReadOnly} />
                            <TextField label="City" value={formData.city} onChange={(value) => updateField('city', value)} placeholder="Enter city" icon={<Building className="h-5 w-5" />} disabled={isReadOnly} />
                            <TextField label="Post Code" value={formData.postcode} onChange={(value) => updateField('postcode', value)} placeholder="Enter post code" icon={<MapPin className="h-5 w-5" />} disabled={isReadOnly} />
                            <SelectField label="Country" value={formData.country} onChange={(value) => updateField('country', value)} icon={<Flag className="h-5 w-5" />} disabled={isReadOnly}>
                                <option value="">Select country</option>
                                {countryOptions.map((country) => (
                                    <option key={country} value={country}>
                                        {country}
                                    </option>
                                ))}
                            </SelectField>
                        </div>
                    </SectionCard>

                    <SectionCard title="Contact Section" description="Primary and secondary contact details for this branch.">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <TextField label="Primary Contact" value={formData.telephone_1} onChange={(value) => updateField('telephone_1', value)} placeholder="Enter primary contact number" icon={<Phone className="h-5 w-5" />} disabled={isReadOnly} />
                            <TextField label="Secondary Contact" value={formData.telephone_2} onChange={(value) => updateField('telephone_2', value)} placeholder="Enter secondary contact number" icon={<Phone className="h-5 w-5" />} disabled={isReadOnly} />
                            <TextField label="Primary Fax" value={formData.fax_1} onChange={(value) => updateField('fax_1', value)} placeholder="Enter primary fax" icon={<Printer className="h-5 w-5" />} disabled={isReadOnly} />
                            <TextField label="Secondary Fax" value={formData.fax_2} onChange={(value) => updateField('fax_2', value)} placeholder="Enter secondary fax" icon={<Printer className="h-5 w-5" />} disabled={isReadOnly} />
                            <TextField label="Primary Email" type="email" value={formData.email_1} onChange={(value) => updateField('email_1', value)} placeholder="Enter primary email" icon={<Mail className="h-5 w-5" />} disabled={isReadOnly} />
                            <TextField label="Secondary Email" type="email" value={formData.email_2} onChange={(value) => updateField('email_2', value)} placeholder="Enter secondary email" icon={<Mail className="h-5 w-5" />} disabled={isReadOnly} />
                        </div>
                    </SectionCard>

                    <SectionCard title="Branch Settings" description="Prefix, transaction defaults, limits, and ownership setup.">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Transaction Prefix <span className="text-red-500">*</span></label>
                                <div className="relative input-icon">
                                    <span className="input-icon-left"><Tag className="h-5 w-5" /></span>
                                    <input
                                        required
                                        maxLength={3}
                                        disabled={isReadOnly}
                                        className="input-glass w-full uppercase disabled:cursor-not-allowed disabled:opacity-70"
                                        value={formData.transaction_prefix}
                                        onChange={(e) => updateField('transaction_prefix', normalizeBranchPrefix(e.target.value))}
                                        placeholder="e.g. LON"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Max 3 letters or numbers.</p>
                            </div>
                            <SelectField label="Default Transaction Type" value={formData.default_transaction_type} onChange={(value) => updateField('default_transaction_type', value)} icon={<ArrowRightLeft className="h-5 w-5" />} required disabled={isReadOnly}>
                                <option value="">Select transaction type</option>
                                <option value="Receiver">Receiver</option>
                                <option value="Sender">Sender</option>
                            </SelectField>
                            <TextField label="Daily Transfer Limit" type="number" value={formData.day_transfer_limit} onChange={(value) => updateField('day_transfer_limit', value)} placeholder="100000" icon={<Coins className="h-5 w-5" />} disabled={isReadOnly} />
                            <SelectField label="Branch Ownership Type" value={formData.branch_ownership_type} onChange={(value) => updateField('branch_ownership_type', value as 'Own' | 'Agent')} icon={<Store className="h-5 w-5" />} disabled={isReadOnly}>
                                <option value="Own">Own</option>
                                <option value="Agent">Agent</option>
                            </SelectField>
                        </div>
                    </SectionCard>

                    <SectionCard title="Remarks" description="Internal notes for the branch record.">
                        <div>
                            <label className="mb-2 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Remarks</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left"><MessageSquare className="h-5 w-5" /></span>
                                <textarea
                                    rows={4}
                                    disabled={isReadOnly}
                                    className="input-glass w-full resize-none disabled:cursor-not-allowed disabled:opacity-70"
                                    value={formData.remarks}
                                    onChange={(e) => updateField('remarks', e.target.value)}
                                    placeholder="Add branch remarks"
                                />
                            </div>
                        </div>
                    </SectionCard>
                </fieldset>

                <div className="mt-8 flex justify-end space-x-4 border-t border-slate-100 pt-8 dark:border-slate-700/50">
                    <Link href="/admin/branches" className="glass-effect rounded-full px-6 py-3 text-sm font-bold text-slate-600 transition-colors dark:text-slate-300">
                        {isViewMode ? 'Back' : 'Cancel'}
                    </Link>
                    {!isReadOnly && (
                        <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40">
                            <Save className="h-4 w-4" />
                            <span>{saving ? 'Saving...' : 'Update Branch'}</span>
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
