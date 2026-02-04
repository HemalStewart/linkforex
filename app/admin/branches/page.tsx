'use client';

import React from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import { Store, RefreshCw, Map, PlusCircle, Phone, Mail, User, Users, ArrowRightLeft, Coins, X } from 'lucide-react';

export default function BranchesPage() {
    const [branches, setBranches] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [formData, setFormData] = React.useState({
        id: null,
        name: '',
        code: '',
        address: '',
        phone: ''
    });

    React.useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.BRANCHES.LIST);
            if (res.ok) {
                const data = await res.json();
                const augmented = data.map((b: any) => ({
                    ...b,
                    manager: b.manager || 'Pending',
                    email: b.email || `${b.code?.toLowerCase() || 'branch'}@linkforex.com`,
                    staff: b.staff_count ?? 0,
                    transfers: b.transfers ?? 0,
                    revenue: b.revenue ?? '£0.00',
                    revenue_raw: b.revenue_raw ?? 0
                }));
                setBranches(augmented);
            } else {
                setBranches([]);
            }
        } catch (error) {
            console.error('Failed to fetch branches', error);
            setBranches([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = formData.id
                ? ENDPOINTS.BRANCHES.DETAIL(formData.id)
                : ENDPOINTS.BRANCHES.LIST;

            const method = formData.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchBranches();
                setFormData({ id: null, name: '', code: '', address: '', phone: '' });
            }
        } catch (error) {
            console.error('Failed to save branch', error);
        }
    };

    const openCreateModal = () => {
        setFormData({ id: null, name: '', code: '', address: '', phone: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (branch: any) => {
        setFormData({
            id: branch.id,
            name: branch.name,
            code: branch.code,
            address: branch.address,
            phone: branch.phone
        });
        setIsModalOpen(true);
    };

    const getStatusStyle = (status: string) => {
        return status === 'active'
            ? 'badge-glass bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400'
            : 'badge-glass bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
    };

    const totalStats = {
        totalBranches: branches.length,
        activeBranches: branches.filter(b => b.status === 'active').length,
        totalStaff: branches.reduce((sum, b) => sum + (b.staff || 0), 0),
        totalRevenue: branches.reduce((sum, b) => sum + (b.revenue_raw || 0), 0),
    };

    return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={formData.id ? 'Edit Branch' : 'Add New Branch'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300 ml-1">Name</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Store className="w-5 h-5" />
                            </span>
                            <input
                                required
                                className="input-glass w-full"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. London Central"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300 ml-1">Code</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Coins className="w-5 h-5" />
                            </span>
                            <input
                                required
                                className="input-glass w-full uppercase"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                placeholder="e.g. LON01"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300 ml-1">Address</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Map className="w-5 h-5" />
                            </span>
                            <input
                                required
                                className="input-glass w-full"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Full address"
                            />
                        </div>
                    </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300 ml-1">Phone</label>
                            <div className="relative input-icon">
                                <span className="input-icon-left">
                                    <Phone className="w-5 h-5" />
                                </span>
                                <input
                                    required
                                    className="input-glass w-full"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+44 ..."
                                />
                            </div>
                        </div>
          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 rounded-full font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
              className="btn-primary rounded-full px-8"
                        >
                            {formData.id ? 'Update Branch' : 'Create Branch'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Page Header */}
      <div className="flex items-center justify-between">
                <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Branches</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage branch locations and staff</p>
                </div>
        <div className="flex items-center space-x-4">
          <button onClick={fetchBranches} className="px-5 py-3 rounded-full border-0 glass-effect bg-teal-50/60 dark:bg-teal-900/10 text-slate-700 dark:text-slate-300 font-bold hover:bg-teal-100/70 dark:hover:bg-teal-900/20 hover:shadow-lg transition-all group">
            <span className="flex items-center space-x-2">
                            <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </span>
                    </button>
          <button className="px-5 py-3 rounded-full border-0 glass-effect bg-teal-50/60 dark:bg-teal-900/10 text-slate-700 dark:text-slate-300 font-bold hover:bg-teal-100/70 dark:hover:bg-teal-900/20 hover:shadow-lg transition-all group">
            <span className="flex items-center space-x-2">
              <Map className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span>View Map</span>
                        </span>
                    </button>
                    <button
                        onClick={openCreateModal}
            className="btn-primary flex items-center space-x-2 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 bg-gradient-to-r from-teal-500 to-teal-600 border-0 rounded-full px-6"
                    >
            <PlusCircle className="w-5 h-5" />
                        <span>Add Branch</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Branches', value: totalStats.totalBranches, icon: Store },
                    { label: 'Active Branches', value: totalStats.activeBranches, icon: Store },
                    { label: 'Total Staff', value: totalStats.totalStaff, icon: Users },
                    { label: 'Total Revenue', value: `£${totalStats.totalRevenue.toLocaleString()}`, icon: Coins },
                ].map((stat, i) => (
        <div key={i} className="card-glass p-6 hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center justify-between">
                            <div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{loading ? '-' : stat.value}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg bg-teal-500/90">
                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Branches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {branches.map((branch, index) => (
                    <div
                        key={branch.id}
className="card-glass p-8 hover:shadow-lg transition-all duration-300 group border border-white/40 dark:border-white/10"
                    >
                        {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 rounded-full bg-teal-50/80 dark:bg-teal-900/20 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-inner">
                  <Store className="w-8 h-8" />
                                </div>
                                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{branch.name}</h3>
                  <div className="flex items-center text-slate-500 dark:text-slate-400 space-x-2 text-sm font-medium">
                    <Map className="w-4 h-4" />
                                        <span>{branch.address}</span>
                                    </div>
                                </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold border-0 shadow-sm ${getStatusStyle(branch.status)}`}>
                                {branch.status.toUpperCase()}
                            </span>
                        </div>

                        {/* Manager */}
                        <div className="mb-8 p-5 rounded-[24px] bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-700/30 backdrop-blur-sm">
              <div className="flex items-center space-x-4">
                <div className="avatar-circle">
                                    {(branch.manager || '?').charAt(0)}
                                </div>
                                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Manager</p>
                  <p className="font-bold text-slate-900 dark:text-white">{branch.manager || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Info */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3 text-sm group/item">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-500 group-hover/item:text-teal-600 transition-colors">
                  <Phone className="w-4 h-4" />
                                </div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{branch.phone}</span>
                            </div>
              <div className="flex items-center space-x-3 text-sm group/item">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 group-hover/item:text-teal-600 transition-colors">
                  <Mail className="w-4 h-4" />
                                </div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{branch.email || '-'}</span>
                            </div>
                        </div>

                        {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-[24px] bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-lg font-black text-slate-900 dark:text-white">{branch.staff || 0}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Staff</p>
                            </div>
              <div className="text-center p-4 rounded-[24px] bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-lg font-black text-slate-900 dark:text-white">{branch.transfers || 0}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Transfers</p>
                            </div>
              <div className="text-center p-4 rounded-[24px] bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-lg font-black text-slate-900 dark:text-white">{branch.revenue || '-'}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Revenue</p>
                            </div>
                        </div>

                        {/* Actions */}
            <div className="flex space-x-4 pt-6 border-t border-slate-100 dark:border-slate-700/50">
              <button className="btn-primary flex-1 rounded-full font-bold shadow-md hover:shadow-lg active:scale-95">
                                View Details
                            </button>
                            <button
                                onClick={() => openEditModal(branch)}
                className="px-6 py-3 rounded-full glass-effect bg-teal-50/60 dark:bg-teal-900/10 text-slate-700 dark:text-slate-300 font-bold hover:bg-teal-100/70 dark:hover:bg-teal-900/20 hover:text-teal-700 transition-all border-0 shadow-sm hover:shadow-md active:scale-95"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
