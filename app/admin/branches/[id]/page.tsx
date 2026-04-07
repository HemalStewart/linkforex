'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import { getStoredUser } from '@/app/lib/authStorage';
import { isPrivilegedUser } from '@/app/lib/permissions';
import ConfirmModal from '../../components/ConfirmModal';
import {
    ArrowLeft,
    Store,
    Tag,
    ArrowRightLeft,
    Coins,
    MapPin,
    Building,
    Flag,
    Phone,
    Printer,
    Mail,
    MessageSquare,
    Save,
    Trash2
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

    const [formData, setFormData] = useState({
        id: null as number | null,
        name: '',
        transaction_prefix: '',
        default_transaction_type: 'Receiver',
        day_transfer_limit: '',
        theme_1: '',
        theme_2: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        country: '',
        telephone_1: '',
        telephone_2: '',
        fax_1: '',
        fax_2: '',
        email_1: '',
        email_2: '',
        remarks: '',
        status: 'active',
        created_by: '',
        created_at: '',
        updated_by: '',
        updated_at: ''
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: true,
        shouldRedirect: false
    });

    useEffect(() => {
        let ignore = false;

        const resolvePermissions = async () => {
            const parsed = getStoredUser<{ role?: string | null; username?: string | null; email?: string | null; name?: string | null; system_defined?: string | null }>();
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
                if (!response.ok) {
                    return;
                }
                const data = await response.json() as CountryOption[];
                if (!Array.isArray(data)) {
                    return;
                }
                const names = Array.from(
                    new Set(
                        data
                            .map((country) => String(country?.name || '').trim())
                            .filter(Boolean)
                    )
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
            fetchBranch();
        }
    }, [branchId]);

    const isReadOnly = isViewMode || !canEditBranch;

    const countryOptions = useMemo(() => {
        if (!formData.country || countries.includes(formData.country)) {
            return countries;
        }
        return [formData.country, ...countries];
    }, [countries, formData.country]);

    const fetchBranch = async () => {
        try {
            const res = await fetch(ENDPOINTS.BRANCHES.DETAIL(branchId as string));
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    id: data.id,
                    name: data.name || '',
                    transaction_prefix: data.transaction_prefix ?? data.code ?? '',
                    default_transaction_type: data.default_transaction_type || 'Receiver',
                    day_transfer_limit: data.day_transfer_limit ?? '',
                    theme_1: data.theme_1 || '',
                    theme_2: data.theme_2 || '',
                    address_line_1: data.address_line_1 || '',
                    address_line_2: data.address_line_2 || '',
                    city: data.city || '',
                    country: data.country || '',
                    telephone_1: data.telephone_1 ?? data.phone ?? '',
                    telephone_2: data.telephone_2 || '',
                    fax_1: data.fax_1 || '',
                    fax_2: data.fax_2 || '',
                    email_1: data.email_1 || '',
                    email_2: data.email_2 || '',
                    remarks: data.remarks || '',
                    status: data.status || 'active',
                    created_by: data.created_by || '',
                    created_at: data.created_at || '',
                    updated_by: data.updated_by || '',
                    updated_at: data.updated_at || ''
                });
            }
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
                message: 'Branch prefix is required and must be up to 3 letters/numbers.',
                type: 'warning',
                isAlert: true,
                shouldRedirect: false
            });
            setSaving(false);
            return;
        }

        const addressParts = [
            formData.address_line_1,
            formData.address_line_2,
            formData.city,
            formData.country
        ].filter(Boolean);

        const payload = {
            ...formData,
            transaction_prefix: normalizedPrefix,
            code: normalizedPrefix || undefined,
            phone: formData.telephone_1 || undefined,
            address: addressParts.length ? addressParts.join(', ') : undefined,
            day_transfer_limit: formData.day_transfer_limit ? Number(formData.day_transfer_limit) : 0,
            updated_by: enteredBy || undefined
        };

        try {
            const res = await fetch(ENDPOINTS.BRANCHES.DETAIL(branchId as string), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Branch updated successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true
                });
            } else {
                const err = await res.text();
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: err || 'Failed to update branch',
                    type: 'danger',
                    isAlert: true,
                    shouldRedirect: false
                });
            }
        } catch (error) {
            console.error(error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to update branch',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
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
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to delete branch',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/branches');
        }
    };

    if (loading) {
        return <div className="max-w-7xl mx-auto py-20 text-center text-slate-500 dark:text-slate-300">Loading...</div>;
    }

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
                confirmText="OK"
            />

            <div className="mb-8 flex items-center justify-between">
                <div>
                    <Link href="/admin/branches" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Branches
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{isViewMode ? 'View Branch' : 'Edit Branch'}</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2">{isViewMode ? 'Review branch details and transfer settings.' : 'Update branch details and transfer settings.'}</p>
                </div>
                {!isViewMode && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={!canDeleteBranch}
                        className={`px-5 py-3 rounded-full text-sm font-bold transition-colors flex items-center space-x-2 glass-effect ${canDeleteBranch ? 'text-slate-600 dark:text-slate-300 hover:text-red-600' : 'cursor-not-allowed opacity-50 text-slate-400 dark:text-slate-500'}`}
                        title={canDeleteBranch ? 'Delete branch' : 'Delete permission required'}
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                    </button>
                )}
            </div>

            <div className="card-glass p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Branch Summary</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-300">Key details and audit info</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    {[
                        { label: 'Branch Name', value: formData.name },
                        { label: 'Transaction Prefix', value: formData.transaction_prefix, nowrap: true },
                        { label: 'Default Transaction Type', value: formData.default_transaction_type, nowrap: true },
                        { label: 'Day Transfer Limit', value: formData.day_transfer_limit ? `£${Number(formData.day_transfer_limit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-' },
                        { label: 'Primary Telephone', value: formData.telephone_1, nowrap: true },
                        { label: 'Secondary Telephone', value: formData.telephone_2, nowrap: true },
                        { label: 'Entered User', value: formData.created_by || '-' },
                        { label: 'Entered Date', value: formData.created_at ? new Date(formData.created_at).toLocaleString() : '-' },
                        { label: 'Modified User', value: formData.updated_by || '-' },
                        { label: 'Modified Date', value: formData.updated_at ? new Date(formData.updated_at).toLocaleString() : '-' }
                    ].map((row) => (
                        <div key={row.label} className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 px-4 py-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">{row.label}</div>
                            <div className={`mt-1 font-semibold text-slate-800 dark:text-slate-100 ${row.nowrap ? 'whitespace-nowrap' : 'break-words'}`}>{row.value || '-'}</div>
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <fieldset disabled={isReadOnly} className="contents">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch Name <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Store className="w-5 h-5" /></span>
                            <input
                                required
                                className="input-glass w-full"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Transaction Prefix <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Tag className="w-5 h-5" /></span>
                            <input
                                required
                                className="input-glass w-full uppercase"
                                value={formData.transaction_prefix}
                                maxLength={3}
                                onChange={(e) => setFormData({ ...formData, transaction_prefix: normalizeBranchPrefix(e.target.value) })}
                            />
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Max 3 characters.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Default Transaction Type <span className="text-red-500">*</span></label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><ArrowRightLeft className="w-5 h-5" /></span>
                            <select
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                                value={formData.default_transaction_type}
                                onChange={(e) => setFormData({ ...formData, default_transaction_type: e.target.value })}
                            >
                                <option value="Receiver">Receiver</option>
                                <option value="Sender">Sender</option>
                                <option value="Both">Both</option>
                            </select>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-200 pointer-events-none">⌄</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Daily Transfer Limit (£)</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Coins className="w-5 h-5" /></span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="input-glass w-full"
                                value={formData.day_transfer_limit}
                                onChange={(e) => setFormData({ ...formData, day_transfer_limit: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Theme Option 1</label>
                        <input
                            className="input-glass w-full"
                            value={formData.theme_1}
                            onChange={(e) => setFormData({ ...formData, theme_1: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Theme Option 2</label>
                        <input
                            className="input-glass w-full"
                            value={formData.theme_2}
                            onChange={(e) => setFormData({ ...formData, theme_2: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address Line 1</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><MapPin className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.address_line_1}
                                onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address Line 2</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><MapPin className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.address_line_2}
                                onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">City</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Building className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Country</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Flag className="w-5 h-5" /></span>
                            <select
                                className="input-glass w-full pr-10 appearance-none cursor-pointer"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            >
                                <option value="">Select country</option>
                                {countryOptions.map((country) => (
                                    <option key={country} value={country}>
                                        {country}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Primary Telephone</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Phone className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.telephone_1}
                                onChange={(e) => setFormData({ ...formData, telephone_1: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Secondary Telephone</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Phone className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.telephone_2}
                                onChange={(e) => setFormData({ ...formData, telephone_2: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Primary Fax</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Printer className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.fax_1}
                                onChange={(e) => setFormData({ ...formData, fax_1: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Secondary Fax</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Printer className="w-5 h-5" /></span>
                            <input
                                className="input-glass w-full"
                                value={formData.fax_2}
                                onChange={(e) => setFormData({ ...formData, fax_2: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Primary Email</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Mail className="w-5 h-5" /></span>
                            <input
                                type="email"
                                className="input-glass w-full"
                                value={formData.email_1}
                                onChange={(e) => setFormData({ ...formData, email_1: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Secondary Email</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Mail className="w-5 h-5" /></span>
                            <input
                                type="email"
                                className="input-glass w-full"
                                value={formData.email_2}
                                onChange={(e) => setFormData({ ...formData, email_2: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Remarks</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><MessageSquare className="w-5 h-5" /></span>
                            <textarea
                                rows={3}
                                className="input-glass w-full resize-none"
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/branches"
                        className="px-6 py-3 rounded-full glass-effect text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors"
                    >
                        {isViewMode ? 'Back' : 'Cancel'}
                    </Link>
                    {!isReadOnly && (
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Saving...' : 'Update Branch'}</span>
                        </button>
                    )}
                </div>
                </fieldset>
            </form>
        </div>
    );
}
