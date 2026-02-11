'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../components/ConfirmModal';
import {
    ArrowLeft,
    Save,
    Trash2,
    Building,
    Tag,
    User,
    Calendar,
    Phone,
    MapPin,
    Globe,
    Briefcase,
    CreditCard,
    Shield,
    Layers,
    FileText
} from 'lucide-react';

export default function EditRemitterPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<any>({
        company: '',
        company_name: '',
        company_type: '',
        company_reg_no: '',
        branch: '',
        sender_id: '',
        sender_name: '',
        status: 'active',
        sanction_list_verified: 'no',
        dob: '',
        place_of_birth: '',
        phone: '',
        postcode: '',
        address_1: '',
        address_2: '',
        city: '',
        county: '',
        country: '',
        occupation: '',
        id_verified: 'no',
        proof_of_funds: 'no',
        id_type: '',
        id_number: '',
        id_expiry: '',
        other_info: '',
        use_in: 'All',
        id_copy: '',
        other_doc: '',
        work_related_docs: '',
        sender_details_aml_screening_doc: '',
        sender_aml_result: '',
        rescreening_sender: '',
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
        if (id) fetchRemitter();
    }, [id]);

    const fetchRemitter = async () => {
        try {
            const res = await fetch(ENDPOINTS.REMITTERS.DETAIL(id));
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    company: data.company || data.company_name || '',
                    company_name: data.company_name || '',
                    company_type: data.company_type || '',
                    company_reg_no: data.company_reg_no || '',
                    branch: data.branch || '',
                    sender_id: data.sender_id || '',
                    sender_name: data.sender_name || data.name || '',
                    status: data.status || 'active',
                    sanction_list_verified: data.sanction_list_verified || 'no',
                    dob: data.dob || '',
                    place_of_birth: data.place_of_birth || '',
                    phone: data.phone || '',
                    postcode: data.postcode || '',
                    address_1: data.address_1 || '',
                    address_2: data.address_2 || '',
                    city: data.city || '',
                    county: data.county || '',
                    country: data.country || '',
                    occupation: data.occupation || '',
                    id_verified: data.id_verified || 'no',
                    proof_of_funds: data.proof_of_funds || 'no',
                    id_type: data.id_type || '',
                    id_number: data.id_number || '',
                    id_expiry: data.id_expiry || '',
                    other_info: data.other_info || '',
                    use_in: data.use_in || 'All',
                    id_copy: data.id_copy || data.passport_copy || '',
                    other_doc: data.other_doc || '',
                    work_related_docs: data.work_related_docs || '',
                    sender_details_aml_screening_doc: data.sender_details_aml_screening_doc || '',
                    sender_aml_result: data.sender_aml_result || '',
                    rescreening_sender: data.rescreening_sender || '',
                    created_by: data.created_by || '',
                    created_at: data.created_at || '',
                    updated_by: data.updated_by || '',
                    updated_at: data.updated_at || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch remitter:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            ...formData,
            name: formData.sender_name,
            sender_name: formData.sender_name,
            active: formData.status === 'active' ? 'Active' : 'Inactive'
        };

        try {
            const res = await fetch(ENDPOINTS.REMITTERS.DETAIL(id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Remitter updated successfully',
                    type: 'success',
                    isAlert: true,
                    shouldRedirect: true
                });
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to update remitter',
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
                message: 'Error updating remitter',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(ENDPOINTS.REMITTERS.DETAIL(id), { method: 'DELETE' });
            if (res.ok) {
                router.push('/admin/remitters');
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to delete remitter',
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
                message: 'Failed to delete remitter',
                type: 'danger',
                isAlert: true,
                shouldRedirect: false
            });
        }
    };

    const handleModalClose = () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        if (confirmModal.shouldRedirect) {
            router.push('/admin/remitters');
        }
    };

    const yesNoText = (value: string) => (String(value).toLowerCase() === 'yes' ? 'Yes' : 'No');
    const displayText = (value: string | null | undefined) => (value && String(value).trim() ? value : '-');

    const summaryLeft = [
        { label: 'Branch', value: displayText(formData.branch), nowrap: false },
        { label: 'Sender Id', value: displayText(formData.sender_id), nowrap: true },
        { label: 'Sender Name', value: displayText(formData.sender_name), nowrap: false },
        { label: 'Date Of Birth', value: displayText(formData.dob), nowrap: true },
        { label: 'Place Of Birth', value: displayText(formData.place_of_birth), nowrap: false },
        { label: 'Telephone', value: displayText(formData.phone), nowrap: true },
        { label: 'Postcode', value: displayText(formData.postcode), nowrap: true },
        { label: 'Address 1', value: displayText(formData.address_1), nowrap: false },
        { label: 'Address 2', value: displayText(formData.address_2), nowrap: false },
        { label: 'Entered User', value: displayText(formData.created_by), nowrap: true },
        { label: 'Entered Date', value: formData.created_at ? new Date(formData.created_at).toLocaleString() : '-', nowrap: true }
    ];

    const summaryRight = [
        { label: 'Sanction List Verified', value: yesNoText(formData.sanction_list_verified), nowrap: true },
        { label: 'Active', value: formData.status === 'active' ? 'Active' : 'Inactive', nowrap: true },
        { label: 'Use In', value: displayText(formData.use_in), nowrap: true },
        { label: 'Country', value: displayText(formData.country), nowrap: false },
        { label: 'City', value: displayText(formData.city), nowrap: false },
        { label: 'Occupation', value: displayText(formData.occupation), nowrap: false },
        { label: 'ID Type', value: displayText(formData.id_type), nowrap: true },
        { label: 'ID No', value: displayText(formData.id_number), nowrap: true },
        { label: 'ID Expire Date', value: displayText(formData.id_expiry), nowrap: true },
        { label: 'Modified User', value: displayText(formData.updated_by), nowrap: true },
        { label: 'Modified Date', value: formData.updated_at ? new Date(formData.updated_at).toLocaleString() : '-', nowrap: true }
    ];

    if (loading) {
        return <div className="max-w-7xl mx-auto p-12 text-center text-slate-500 dark:text-slate-300">Loading remitter details...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
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

            <div className="flex items-center justify-between">
                <div>
                    <Link href="/admin/remitters" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Remitters
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Remitter Details</h1>
                    <p className="text-slate-500 dark:text-slate-300 mt-2">Field view and edit for sender profile</p>
                </div>
                <button
                    onClick={handleDelete}
                    className="px-5 py-3 rounded-full text-sm font-bold transition-colors flex items-center space-x-2 glass-effect text-slate-600 dark:text-slate-300 hover:text-red-600"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                </button>
            </div>

            <div className="card-glass p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {[summaryLeft, summaryRight].map((column, idx) => (
                        <div key={idx} className="rounded-3xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/35 dark:bg-slate-900/30 px-5 py-2">
                            {column.map((row, rowIdx) => (
                                <div
                                    key={`${row.label}-${rowIdx}`}
                                    className={`flex items-center justify-between gap-4 py-3 ${rowIdx !== column.length - 1 ? 'border-b border-slate-100/70 dark:border-slate-700/50' : ''}`}
                                >
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">{row.label}</span>
                                    <span className={`text-sm font-semibold text-slate-800 dark:text-slate-100 text-right ${row.nowrap ? 'whitespace-nowrap' : 'break-words'}`}>
                                        {row.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card-glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Branch</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Building className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Id</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Tag className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.sender_id} onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender Name</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><User className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.sender_name} onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Date Of Birth</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Calendar className="w-5 h-5" /></span>
                            <input type="date" className="input-glass w-full" value={formData.dob || ''} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Place of Birth</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Globe className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.place_of_birth} onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Telephone</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Phone className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Postcode</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><MapPin className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.postcode} onChange={(e) => setFormData({ ...formData, postcode: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address 1</label>
                        <input className="input-glass w-full" value={formData.address_1} onChange={(e) => setFormData({ ...formData, address_1: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Address 2</label>
                        <input className="input-glass w-full" value={formData.address_2} onChange={(e) => setFormData({ ...formData, address_2: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">City</label>
                        <input className="input-glass w-full" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">County</label>
                        <input className="input-glass w-full" value={formData.county} onChange={(e) => setFormData({ ...formData, county: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Country</label>
                        <input className="input-glass w-full" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Occupation</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Briefcase className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID Type</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><CreditCard className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.id_type} onChange={(e) => setFormData({ ...formData, id_type: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID No</label>
                        <input className="input-glass w-full" value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID Expire Date</label>
                        <input type="date" className="input-glass w-full" value={formData.id_expiry || ''} onChange={(e) => setFormData({ ...formData, id_expiry: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sanction List Verified</label>
                        <select className="input-glass w-full" value={formData.sanction_list_verified} onChange={(e) => setFormData({ ...formData, sanction_list_verified: e.target.value })}>
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">ID Verified</label>
                        <select className="input-glass w-full" value={formData.id_verified} onChange={(e) => setFormData({ ...formData, id_verified: e.target.value })}>
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Proof Of Funds</label>
                        <select className="input-glass w-full" value={formData.proof_of_funds} onChange={(e) => setFormData({ ...formData, proof_of_funds: e.target.value })}>
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Use In</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Layers className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.use_in} onChange={(e) => setFormData({ ...formData, use_in: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Sender AML Result</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><Shield className="w-5 h-5" /></span>
                            <input className="input-glass w-full" value={formData.sender_aml_result} onChange={(e) => setFormData({ ...formData, sender_aml_result: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Re/screening Sender</label>
                        <input className="input-glass w-full" value={formData.rescreening_sender} onChange={(e) => setFormData({ ...formData, rescreening_sender: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Other Info</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left"><FileText className="w-5 h-5" /></span>
                            <textarea rows={3} className="input-glass w-full resize-none" value={formData.other_info} onChange={(e) => setFormData({ ...formData, other_info: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-8 mt-6 border-t border-slate-100 dark:border-slate-700/50">
                    <Link
                        href="/admin/remitters"
                        className="px-6 py-3 rounded-full glass-effect text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
                    >
                        <Save className="w-4 h-4" />
                        <span>{submitting ? 'Updating...' : 'Save Changes'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
