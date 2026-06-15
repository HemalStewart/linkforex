'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';
import ConfirmModal from '../../../components/ConfirmModal';
import type { Campaign } from '../_shared';

export default function MobileCampaignsPage() {
    const [loading, setLoading] = useState(true);
    const [creatingCampaign, setCreatingCampaign] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [campaignForm, setCampaignForm] = useState({
        title: '',
        message: '',
        channel: 'both' as 'push' | 'email' | 'both',
        target_audience: 'all' as 'all' | 'kyc_pending' | 'kyc_verified' | 'inactive',
        include_exchange_rate: false,
    });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'danger' | 'success',
    });

    const showModal = (title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info') => {
        setConfirmModal({ isOpen: true, title, message, type });
    };

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.CAMPAIGNS);
            if (!res.ok) return;
            const data = await res.json();
            setCampaigns(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCampaigns();
    }, []);

    const createCampaign = async (sendNow = false) => {
        if (!campaignForm.title.trim() || !campaignForm.message.trim()) {
            showModal('Missing Details', 'Campaign title and message are required.', 'warning');
            return;
        }
        setCreatingCampaign(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.CAMPAIGNS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: campaignForm.title,
                    message: campaignForm.message,
                    channel: campaignForm.channel,
                    target_audience: campaignForm.target_audience,
                    include_exchange_rate: campaignForm.include_exchange_rate ? 'yes' : 'no',
                    send_now: sendNow ? 'yes' : 'no',
                }),
            });
            if (!res.ok) {
                showModal('Campaign Failed', 'Could not create campaign.', 'danger');
                return;
            }

            setCampaignForm({
                title: '',
                message: '',
                channel: 'both',
                target_audience: 'all',
                include_exchange_rate: false,
            });
            await loadCampaigns();
            showModal('Success', sendNow ? 'Campaign sent.' : 'Campaign saved as draft.', 'success');
        } catch {
            showModal('Campaign Failed', 'Could not create campaign.', 'danger');
        } finally {
            setCreatingCampaign(false);
        }
    };

    const sendDraftCampaign = async (campaignId: number) => {
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.SEND_CAMPAIGN(campaignId), { method: 'POST' });
            if (!res.ok) {
                showModal('Send Failed', 'Could not send campaign.', 'danger');
                return;
            }
            await loadCampaigns();
            showModal('Sent', 'Campaign sent successfully.', 'success');
        } catch {
            showModal('Send Failed', 'Could not send campaign.', 'danger');
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-fade-in-up">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                isAlert
                confirmText="OK"
            />

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Push / Email Campaigns</h1>
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                        Create campaigns and send them to filtered mobile audiences.
                    </p>
                </div>
                <button onClick={loadCampaigns} className="btn-primary flex items-center gap-2 rounded-full px-5">
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="card-glass p-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                        placeholder="Campaign title"
                        value={campaignForm.title}
                        onChange={(e) => setCampaignForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="input-glass py-2.5 text-sm md:col-span-2"
                    />
                    <textarea
                        placeholder="Campaign message"
                        value={campaignForm.message}
                        onChange={(e) => setCampaignForm((prev) => ({ ...prev, message: e.target.value }))}
                        className="input-glass min-h-24 py-2.5 text-sm md:col-span-2"
                    />
                    <select
                        value={campaignForm.channel}
                        onChange={(e) => setCampaignForm((prev) => ({ ...prev, channel: e.target.value as 'push' | 'email' | 'both' }))}
                        className="input-glass py-2.5 text-sm"
                    >
                        <option value="both">Push + Email</option>
                        <option value="push">Push only</option>
                        <option value="email">Email only</option>
                    </select>
                    <select
                        value={campaignForm.target_audience}
                        onChange={(e) => setCampaignForm((prev) => ({ ...prev, target_audience: e.target.value as 'all' | 'kyc_pending' | 'kyc_verified' | 'inactive' }))}
                        className="input-glass py-2.5 text-sm"
                    >
                        <option value="all">All users</option>
                        <option value="kyc_pending">KYC pending</option>
                        <option value="kyc_verified">KYC verified</option>
                        <option value="inactive">Inactive users</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 md:col-span-2">
                        <input
                            type="checkbox"
                            checked={campaignForm.include_exchange_rate}
                            onChange={(e) => setCampaignForm((prev) => ({ ...prev, include_exchange_rate: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        Include latest exchange rates in message
                    </label>
                    <div className="flex gap-2 md:col-span-2">
                        <button
                            onClick={() => createCampaign(false)}
                            disabled={creatingCampaign}
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Save Draft
                        </button>
                        <button
                            onClick={() => createCampaign(true)}
                            disabled={creatingCampaign}
                            className="btn-primary rounded-full px-4 py-2 text-sm"
                        >
                            Send Now
                        </button>
                    </div>
                </div>

                <div className="table-scroll mt-5 max-h-[420px] rounded-2xl border border-slate-200/70 dark:border-slate-700">
                    <table className="table-shell">
                        <thead className="table-head">
                            <tr>
                                <th>Title</th>
                                <th>Channel</th>
                                <th>Status</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {campaigns.slice(0, 100).map((campaign) => (
                                <tr key={campaign.id}>
                                    <td className="text-sm font-semibold text-slate-800 dark:text-slate-200">{campaign.title}</td>
                                    <td className="text-xs text-slate-600">{campaign.channel}</td>
                                    <td className="text-xs text-slate-600">{campaign.status}</td>
                                    <td className="text-right">
                                        {campaign.status === 'draft' && (
                                            <button
                                                onClick={() => sendDraftCampaign(campaign.id)}
                                                className="rounded-full bg-teal-500 px-3 py-1 text-xs font-bold text-white hover:bg-teal-600"
                                            >
                                                Send
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {campaigns.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                                        {loading ? 'Loading...' : 'No campaigns yet'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
