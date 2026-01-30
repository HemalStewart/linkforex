'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';

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
        type: 'info' as 'info' | 'danger' | 'warning'
    });

    useEffect(() => {
        if (id) {
            fetchTransfer();
        }
    }, [id]);

    const fetchTransfer = async () => {
        try {
            const res = await fetch(`http://localhost:8888/linforex_backend/public/api/transfers/${id}`);
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
        let type: 'info' | 'danger' | 'warning' = 'info';

        if (newStatus === 'rejected') {
            title = 'Reject Transfer';
            message = 'Are you sure you want to REJECT this transfer? This action is reversible but should be done with caution.';
            type = 'danger';
        } else if (newStatus === 'completed') {
            title = 'Confirm Payout';
            message = 'Have you successfully sent the funds to the receiver? Mark this as PAID only after the transaction is complete.';
            type = 'info';
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
            type
        });
    };

    const handleConfirmUpdate = async () => {
        setProcessing(true);
        const newStatus = confirmModal.status;

        try {
            const res = await fetch(`http://localhost:8888/linforex_backend/public/api/transfers/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                // Ideally replace with toast, for now reusing confirm logic or silent success + refresh
                setConfirmModal({ ...confirmModal, isOpen: false });
                fetchTransfer();
            } else {
                alert('Failed to update status'); // We can improve this too later
                setConfirmModal({ ...confirmModal, isOpen: false });
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Error updating status');
            setConfirmModal({ ...confirmModal, isOpen: false });
        } finally {
            setProcessing(false);
        }
    };

    const getStatusColor = (status: string) => {
        const styles: Record<string, string> = {
            completed: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
            in_transit: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
            pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
            in_review: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
            rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        };
        return styles[status] || styles.pending;
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading transfer details...</div>;
    if (!transfer) return <div className="p-8 text-center text-red-500">Transfer not found</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleConfirmUpdate}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                loading={processing}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <nav className="flex items-center text-sm text-slate-500 mb-2">
                        <Link href="/admin/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
                        <span className="mx-2">/</span>
                        <Link href="/admin/transfers" className="hover:text-slate-900 dark:hover:text-white transition-colors">Transfers</Link>
                        <span className="mx-2">/</span>
                        <span className="text-slate-900 dark:text-white font-medium">#{transfer.id}</span>
                    </nav>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        Transfer #{transfer.id}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(transfer.status)}`}>
                            {transfer.status.replace('_', ' ').toUpperCase()}
                        </span>
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Transaction Info */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Transaction Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-slate-500">Source Amount</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">£{parseFloat(transfer.source_amount).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Payout Amount</p>
                                <p className="text-xl font-bold text-emerald-600">
                                    PKR {parseFloat(transfer.dest_amount).toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Exchange Rate</p>
                                <p className="font-medium">{transfer.rate}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Fees</p>
                                <p className="font-medium">£0.00</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Payment Mode</p>
                                <p className="font-medium capitalize">{transfer.payment_mode}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Created At</p>
                                <p className="font-medium">{new Date(transfer.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Parties involved */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Remitter</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                                        Remitter ID: {transfer.remitter_id}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Source of Funds</p>
                                    <p className="font-medium">{transfer.source_of_funds}</p>
                                </div>
                                <Link
                                    href={`/admin/remitters/${transfer.remitter_id}`}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
                                >
                                    View Profile &rarr;
                                </Link>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Receiver</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                                        Beneficiary ID: {transfer.beneficiary_id}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Details</p>
                                    <p className="font-medium">Bank Deposit / Cash Pickup</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar / Actions */}
                <div className="space-y-6">
                    {/* Action Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Process Transfer</h3>

                        <div className="space-y-4">
                            {/* Step 1: Confirm Funds */}
                            <div className={`p-4 rounded-lg border ${transfer.status === 'pending' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 opacity-60'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${transfer.status === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-200'}`}>1</div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">Confirm Funds</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Check if funds have arrived in the Trust Wallet.</p>

                                        {transfer.status === 'pending' && (
                                            <button
                                                onClick={() => confirmStatusUpdate('in_transit')}
                                                disabled={processing}
                                                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                Confirm Funds Received
                                            </button>
                                        )}
                                        {['in_transit', 'completed'].includes(transfer.status) && (
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                                                ✓ Funds Confirmed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Payout */}
                            <div className={`p-4 rounded-lg border ${['in_transit', 'funds_received'].includes(transfer.status) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50' : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 opacity-60'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${['in_transit', 'funds_received'].includes(transfer.status) ? 'bg-blue-500 text-white' : 'bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-200'}`}>2</div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">Manual Payout</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Manually send funds to the receiver and mark as paid.</p>

                                        {['in_transit', 'funds_received'].includes(transfer.status) && (
                                            <button
                                                onClick={() => confirmStatusUpdate('completed')}
                                                disabled={processing}
                                                className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                                            >
                                                Mark as Paid
                                            </button>
                                        )}
                                        {transfer.status === 'completed' && (
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                                                ✓ Payout Completed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Danger Zone</h4>
                            <button
                                onClick={() => confirmStatusUpdate('rejected')}
                                className="w-full py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
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
