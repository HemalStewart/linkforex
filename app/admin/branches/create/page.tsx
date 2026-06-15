'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
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
};

const INITIAL_FORM: BranchFormData = {
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
};

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="rounded-[28px] border border-white/8 p-6 md:p-7">
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
    maxLength,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    icon: React.ReactNode;
    type?: string;
    required?: boolean;
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
                    maxLength={maxLength}
                    className="input-glass w-full"
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
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    required?: boolean;
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
                    className="input-glass w-full cursor-pointer appearance-none pr-10"
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

export default function CreateBranchPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [enteredBy, setEnteredBy] = useState('');
    const [countries, setCountries] = useState<string[]>([]);
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
        const parsed = getStoredUser<{ username?: string; name?: string }>();
        setEnteredBy(parsed?.username || parsed?.name || '');
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

    const countryOptions = useMemo(() => countries, [countries]);

    const updateField = <K extends keyof BranchFormData>(key: K, value: BranchFormData[K]) => {
        setFormData((current) => ({ ...current, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

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
            setLoading(false);
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
            setLoading(false);
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
            created_by: enteredBy || undefined,
            updated_by: enteredBy || undefined,
        };

        try {
            const res = await fetch(ENDPOINTS.BRANCHES.LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Branch created successfully.',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true,
                });
            } else {
                const err = await res.text();
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: err || 'Failed to create branch.',
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
                message: 'Failed to create branch.',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setConfirmModal((current) => ({ ...current, isOpen: false }));
        if (confirmModal.shouldRedirect) {
            router.push('/admin/branches');
        }
    };

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

            <div className="mb-8">
                <Link href="/admin/branches" className="group mb-2 inline-flex items-center text-sm font-bold text-slate-500 transition-colors hover:text-teal-600 dark:hover:text-teal-400">
                    <ArrowLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Branches
                </Link>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Add Branch</h1>
                <p className="mt-2 text-slate-500 dark:text-slate-300">Create a branch using the same branch, contact, and settings structure used across the admin panel.</p>
            </div>

            <form onSubmit={handleSubmit} className="card-glass relative space-y-6 overflow-hidden p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-500/5 blur-3xl"></div>

                <SectionCard title="Branch Details" description="Core location and branch identity information.">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <TextField label="Branch Name" value={formData.name} onChange={(value) => updateField('name', value)} placeholder="Enter branch name" icon={<Store className="h-5 w-5" />} required />
                        <TextField label="Building Number" value={formData.building_number} onChange={(value) => updateField('building_number', value)} placeholder="Enter building number" icon={<Building className="h-5 w-5" />} />
                        <TextField label="Address" value={formData.address_line_1} onChange={(value) => updateField('address_line_1', value)} placeholder="Enter branch address" icon={<MapPin className="h-5 w-5" />} />
                        <TextField label="City" value={formData.city} onChange={(value) => updateField('city', value)} placeholder="Enter city" icon={<Building className="h-5 w-5" />} />
                        <TextField label="Post Code" value={formData.postcode} onChange={(value) => updateField('postcode', value)} placeholder="Enter post code" icon={<MapPin className="h-5 w-5" />} />
                        <SelectField label="Country" value={formData.country} onChange={(value) => updateField('country', value)} icon={<Flag className="h-5 w-5" />}>
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
                        <TextField label="Primary Contact" value={formData.telephone_1} onChange={(value) => updateField('telephone_1', value)} placeholder="Enter primary contact number" icon={<Phone className="h-5 w-5" />} />
                        <TextField label="Secondary Contact" value={formData.telephone_2} onChange={(value) => updateField('telephone_2', value)} placeholder="Enter secondary contact number" icon={<Phone className="h-5 w-5" />} />
                        <TextField label="Primary Fax" value={formData.fax_1} onChange={(value) => updateField('fax_1', value)} placeholder="Enter primary fax" icon={<Printer className="h-5 w-5" />} />
                        <TextField label="Secondary Fax" value={formData.fax_2} onChange={(value) => updateField('fax_2', value)} placeholder="Enter secondary fax" icon={<Printer className="h-5 w-5" />} />
                        <TextField label="Primary Email" type="email" value={formData.email_1} onChange={(value) => updateField('email_1', value)} placeholder="Enter primary email" icon={<Mail className="h-5 w-5" />} />
                        <TextField label="Secondary Email" type="email" value={formData.email_2} onChange={(value) => updateField('email_2', value)} placeholder="Enter secondary email" icon={<Mail className="h-5 w-5" />} />
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
                                    className="input-glass w-full"
                                    value={formData.transaction_prefix}
                                    onChange={(e) => updateField('transaction_prefix', normalizeBranchPrefix(e.target.value))}
                                    placeholder="e.g. LON"
                                />
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Max 3 letters or numbers.</p>
                        </div>
                        <SelectField label="Default Transaction Type" value={formData.default_transaction_type} onChange={(value) => updateField('default_transaction_type', value)} icon={<ArrowRightLeft className="h-5 w-5" />} required>
                            <option value="">Select transaction type</option>
                            <option value="Receiver">Receiver</option>
                            <option value="Sender">Sender</option>
                        </SelectField>
                        <TextField label="Daily Transfer Limit" type="number" value={formData.day_transfer_limit} onChange={(value) => updateField('day_transfer_limit', value)} placeholder="100000" icon={<Coins className="h-5 w-5" />} />
                        <SelectField label="Branch Ownership Type" value={formData.branch_ownership_type} onChange={(value) => updateField('branch_ownership_type', value as 'Own' | 'Agent')} icon={<Store className="h-5 w-5" />}>
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
                                className="input-glass w-full resize-none"
                                value={formData.remarks}
                                onChange={(e) => updateField('remarks', e.target.value)}
                                placeholder="Add branch remarks"
                            />
                        </div>
                    </div>
                </SectionCard>

                <div className="mt-8 flex justify-end space-x-4 border-t border-slate-100 pt-8 dark:border-slate-700/50">
                    <Link href="/admin/branches" className="glass-effect rounded-full px-6 py-3 text-sm font-bold text-slate-600 transition-colors dark:text-slate-300">
                        Cancel
                    </Link>
                    <button type="submit" disabled={loading} className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40">
                        <Save className="h-4 w-4" />
                        <span>{loading ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
