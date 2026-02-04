'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';
import { ENDPOINTS } from '@/app/lib/api';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, CreditCard, User, DollarSign, Calendar, ArrowRight, Shield, AlertTriangle, Send, Banknote } from 'lucide-react';

export default function TransferDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [transfer, setTransfer] = useState<any>(null);
    const [processing, setProcessing] = useState(false);

    // Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        status: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        isAlert: false
    });

    useEffect(() => {
        if (id) {
            fetchTransfer();
        }
    }, [id]);

    const fetchTransfer = async () => {
        try {
            const res = await fetch(ENDPOINTS.TRANSFERS.DETAIL(id));
            if (res.ok) {
                const data = await res.json();
                setTransfer(data);
            }
        } catch (error) {
            console.error('Failed to fetch transfer:', error);
        } finally {
            setLoading(false);
        }
    };

    const confirmStatusUpdate = (newStatus: string) => {
        let title = 'Update Status';
        let message = `Are you sure you want to update status to ${newStatus}?`;
        let type: 'info' | 'danger' | 'warning' | 'success' = 'info';

        if (newStatus === 'rejected') {
            title = 'Reject Transfer';
            message = 'Are you sure you want to REJECT this transfer? This action is reversible but should be done with caution.';
            type = 'danger';
        } else if (newStatus === 'completed') {
            title = 'Confirm Payout';
            message = 'Have you successfully sent the funds to the receiver? Mark this as PAID only after the transaction is complete.';
            type = 'success';
        } else if (newStatus === 'in_transit') {
            title = 'Confirm Funds Received';
            message = 'Have you confirmed the funds have arrived in the Trust Wallet?';
            type = 'info';
        }

        setConfirmModal({
            isOpen: true,
            title,
            message,
            status: newStatus,
            type,
            isAlert: false
        });
    };

    const handleConfirmUpdate = async () => {
        setProcessing(true);
        const newStatus = confirmModal.status;

        try {
            const res = await fetch(ENDPOINTS.TRANSFERS.DETAIL(id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                setConfirmModal({
                    isOpen: true,
                    title: 'Success',
                    message: 'Transfer status updated successfully.',
                    status: '',
                    type: 'success',
                    isAlert: true
                });
                fetchTransfer();
            } else {
                setConfirmModal({
                    isOpen: true,
                    title: 'Error',
                    message: 'Failed to update status. Please try again.',
                    status: '',
                    type: 'danger',
                    isAlert: true
                });
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            setConfirmModal({
                isOpen: true,
                title: 'Error',
                message: 'An unexpected error occurred.',
                status: '',
                type: 'danger',
                isAlert: true
            });
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            completed: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
            in_transit: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
            pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
            in_review: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
            rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        };
        return styles[status] || styles.pending;
    };

    const StatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return CheckCircle;
            case 'rejected': return AlertCircle;
            case 'in_transit': return Send;
            default: return Clock;
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse font-medium">Loading transfer details...</div>;
    if (!transfer) return (
        <div className="p-12 text-center">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Transfer Not Found</h3>
            <Link href="/admin/transfers" className="text-teal-600 hover:text-teal-500 font-bold mt-4 inline-block">Return to Transfers</Link>
        </div>
    );

    const CurrentStatusIcon = StatusIcon(transfer.status);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.isAlert ? () => setConfirmModal({ ...confirmModal, isOpen: false }) : handleConfirmUpdate}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                loading={processing}
                confirmText={confirmModal.isAlert ? "OK" : "Confirm"}
                isAlert={confirmModal.isAlert}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link href="/admin/transfers" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Transfers
                    </Link>
                    <div className="flex items-center space-x-4">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Transfer #{transfer.id}
                        </h1>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border flex items-center space-x-1.5 ${getStatusBadge(transfer.status)}`}>
                            <CurrentStatusIcon className="w-3.5 h-3.5" />
                            <span>{transfer.status.replace('_', ' ')}</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Transaction Info */}
                    <div className="card-glass p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                            <Banknote className="w-6 h-6 mr-2 text-teal-500" />
                            Transaction Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Source Amount</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white">£{parseFloat(transfer.source_amount).toFixed(2)}</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800">
                                <p className="text-sm font-bold text-teal-600/80 dark:text-teal-400/80 mb-1">Payout Amount</p>
                                <p className="text-3xl font-black text-teal-600 dark:text-teal-400">
                                    PKR {parseFloat(transfer.dest_amount).toFixed(2)}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-slate-500">
                                        <ArrowRight className="w-4 h-4" />
                                        <span className="font-medium">Exchange Rate</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{transfer.rate}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-slate-500">
                                        <CreditCard className="w-4 h-4" />
                                        <span className="font-medium">Payment Mode</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white capitalize">{transfer.payment_mode}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-slate-500">
                                        <DollarSign className="w-4 h-4" />
                                        <span className="font-medium">Fees</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">£0.00</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-slate-500">
                                        <Calendar className="w-4 h-4" />
                                        <span className="font-medium">Created At</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{new Date(transfer.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Parties involved */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="card-glass p-6 hover:scale-[1.01] transition-transform duration-300">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                                <User className="w-4 h-4 mr-2" />
                                Remitter
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="avatar-circle">
                                        {transfer.remitter_id.toString().charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 font-medium">Remitter ID</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{transfer.remitter_id}</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                    <p className="text-xs font-bold text-slate-400 mb-1">Source of Funds</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{transfer.source_of_funds}</p>
                                </div>
                                <Link
                                    href={`/admin/remitters/${transfer.remitter_id}`}
                                    className="block w-full text-center py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/20 dark:hover:text-teal-400 transition-colors"
                                >
                                    View Profile
                                </Link>
                            </div>
                        </div>

                        <div className="card-glass p-6 hover:scale-[1.01] transition-transform duration-300">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                                <Shield className="w-4 h-4 mr-2" />
                                Receiver
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="avatar-circle">
                                        {transfer.beneficiary_id.toString().charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 font-medium">Beneficiary ID</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{transfer.beneficiary_id}</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                    <p className="text-xs font-bold text-slate-400 mb-1">Delivery Method</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">Bank Deposit</p>
                                </div>
                                <div className="block w-full text-center py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold text-sm cursor-not-allowed">
                                    Receiver Details
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar / Actions */}
                <div className="space-y-8 h-fit">
                    {/* Action Card */}
                    <div className="card-glass p-6 border-t-4 border-t-teal-500 shadow-lg">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Process Transfer</h3>

                        <div className="space-y-6">
                            {/* Step 1: Confirm Funds */}
                            <div className={`relative pl-8 pb-6 border-l-2 ${transfer.status !== 'pending' ? 'border-teal-500' : 'border-slate-200'}`}>
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${transfer.status !== 'pending' ? 'bg-teal-500 border-teal-500' : 'bg-white border-slate-300'}`}></div>
                                <h4 className={`font-bold ${transfer.status !== 'pending' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>Confirm Funds</h4 >
                                <p className="text-xs text-slate-500 mb-3 font-medium leading-relaxed">Check if funds have arrived in the Trust Wallet.</p>

                                {transfer.status === 'pending' && (
                                    <button
                                        onClick={() => confirmStatusUpdate('in_transit')}
                                        disabled={processing}
                                        className="w-full py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors text-sm font-bold shadow-lg shadow-teal-500/20"
                                    >
                                        Confirm Funds Received
                                    </button>
                                )}
                                {['in_transit', 'completed'].includes(transfer.status) && (
                                    <span className="input-glass px-3 py-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center w-fit">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Funds Confirmed
                                    </span>
                                )}
                            </div>

                            {/* Step 2: Payout */}
                            <div className={`relative pl-8 border-l-2 ${transfer.status === 'completed' ? 'border-teal-500' : 'border-slate-200'}`}>
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${transfer.status === 'completed' ? 'bg-teal-500 border-teal-500' : 'bg-white border-slate-300'}`}></div>
                                <h4 className={`font-bold ${transfer.status === 'completed' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>Manual Payout</h4>
                                <p className="text-xs text-slate-500 mb-3 font-medium leading-relaxed">Manually send funds to the receiver and mark paid.</p>

                                {['in_transit', 'funds_received'].includes(transfer.status) && (
                                    <button
                                        onClick={() => confirmStatusUpdate('completed')}
                                        disabled={processing}
                                        className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all text-sm font-bold"
                                    >
                                        Mark as Paid
                                    </button>
                                )}
                                {transfer.status === 'completed' && (
                                    <span className="input-glass px-3 py-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center w-fit">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Payout Completed
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Danger Zone
                            </h4>
                            <button
                                onClick={() => confirmStatusUpdate('rejected')}
                                className="w-full py-2.5 border-2 border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-bold"
                            >
                                Cancel / Reject Transfer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
