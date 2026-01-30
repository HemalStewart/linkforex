'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateReceiverPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [remitters, setRemitters] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        customer_id: '',
        name: '',
        bank_name: '',
        account_number: '',
    });

    useEffect(() => {
        // Fetch remitters for selection
        const fetchRemitters = async () => {
            try {
                const res = await fetch('http://localhost:8888/linforex_backend/public/api/remitters');
                if (res.ok) {
                    const data = await res.json();
                    setRemitters(data);
                }
            } catch (error) {
                console.error('Failed to fetch remitters:', error);
            }
        };
        fetchRemitters();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8888/linforex_backend/public/api/beneficiaries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push('/admin/receivers');
            } else {
                alert('Failed to create receiver');
            }
        } catch (error) {
            console.error('Failed to submit:', error);
            alert('Error creating receiver');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <nav className="flex items-center text-sm text-slate-500 mb-2">
                    <Link href="/admin/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
                    <span className="mx-2">/</span>
                    <Link href="/admin/receivers" className="hover:text-slate-900 dark:hover:text-white transition-colors">Receivers</Link>
                    <span className="mx-2">/</span>
                    <span className="text-slate-900 dark:text-white font-medium">Add New</span>
                </nav>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add New Receiver</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Linked Remitter *</label>
                    <select
                        required
                        value={formData.customer_id}
                        onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-slate-500 dark:focus:border-slate-400 text-slate-900 dark:text-white"
                    >
                        <option value="">Select a Remitter</option>
                        {remitters.map((remitter) => (
                            <option key={remitter.id} value={remitter.id}>
                                {remitter.name} ({remitter.phone})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name *</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-slate-500 dark:focus:border-slate-400 text-slate-900 dark:text-white"
                        placeholder="Receiver's full legal name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bank Name *</label>
                    <input
                        type="text"
                        required
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-slate-500 dark:focus:border-slate-400 text-slate-900 dark:text-white"
                        placeholder="e.g. Bank of London"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Account Number / IBAN *</label>
                    <input
                        type="text"
                        required
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-slate-500 dark:focus:border-slate-400 text-slate-900 dark:text-white"
                        placeholder="Account number or IBAN"
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <Link
                        href="/admin/receivers"
                        className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Receiver'}
                    </button>
                </div>
            </form>
        </div>
    );
}
