'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';

export interface RemitterOption {
    id: string | number;
    name?: string;
    sender_name?: string;
    sender_id?: string;
    phone?: string;
    telephone?: string;
    branch_name?: string;
    branch?: string;
    [key: string]: any;
}

interface RemitterSelectProps {
    remitters: RemitterOption[];
    value: string | number;
    onChange: (id: string) => void;
    label?: string;
    required?: boolean;
    placeholder?: string;
    disabled?: boolean;
}

export default function RemitterSelect({
    remitters,
    value,
    onChange,
    label,
    required = false,
    placeholder = "Type name, ID, or phone to search remitter...",
    disabled = false,
}: RemitterSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Find currently selected remitter object
    const selectedRemitter = useMemo(() => {
        if (!value) return null;
        const valStr = String(value).trim().toLowerCase();
        return remitters.find(r => 
            String(r.id).trim().toLowerCase() === valStr ||
            String(r.sender_id || '').trim().toLowerCase() === valStr
        ) || null;
    }, [remitters, value]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter remitters based on search query
    const filteredRemitters = useMemo(() => {
        if (!searchQuery.trim()) return remitters;
        const q = searchQuery.toLowerCase().trim();
        return remitters.filter(r => {
            const name = String(r.sender_name || r.name || '').toLowerCase();
            const senderId = String(r.sender_id || r.ref_id || '').toLowerCase();
            const idNo = String(r.id_number || r.id_no || '').toLowerCase();
            const postcode = String(r.postcode || '').toLowerCase();
            const phone = String(r.phone || r.telephone || '').toLowerCase();
            return name.includes(q) || senderId.includes(q) || idNo.includes(q) || postcode.includes(q) || phone.includes(q);
        });
    }, [remitters, searchQuery]);

    const getDisplayName = (r: RemitterOption) => {
        return r.sender_name || r.name || 'Unnamed';
    };

    const getFormattedFullLabel = (r: RemitterOption) => {
        const name = r.sender_name || r.name || 'Unnamed';
        const refId = r.sender_id || r.ref_id || '';
        const idNo = r.id_number || r.id_no || '';
        const postcode = r.postcode || '';

        const parts = [name];
        if (refId && refId !== '-') parts.push(refId);
        if (idNo && idNo !== '-') parts.push(idNo);
        if (postcode && postcode !== '-') parts.push(postcode);

        return parts.join(' - ');
    };

    const getSubText = (r: RemitterOption) => {
        const refId = r.sender_id || r.ref_id || '';
        const idNo = r.id_number || r.id_no || '';
        const postcode = r.postcode || '';

        const parts = [];
        if (refId && refId !== '-') parts.push(refId);
        if (idNo && idNo !== '-') parts.push(idNo);
        if (postcode && postcode !== '-') parts.push(postcode);

        return parts.join(' - ');
    };

    const handleSelect = (r: RemitterOption) => {
        onChange(String(r.id));
        setSearchQuery('');
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchQuery('');
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Main Trigger / Search Input */}
            <div className="relative">
                <div className="relative input-icon">
                    <span className="input-icon-left">
                        <Search className="w-5 h-5 text-slate-400" />
                    </span>
                    <input
                        type="text"
                        disabled={disabled}
                        placeholder={selectedRemitter ? getFormattedFullLabel(selectedRemitter) : placeholder}
                        value={isOpen ? searchQuery : (selectedRemitter ? getFormattedFullLabel(selectedRemitter) : searchQuery)}
                        onFocus={() => {
                            setIsOpen(true);
                            setSearchQuery('');
                        }}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (!isOpen) setIsOpen(true);
                        }}
                        className={`input-glass w-full pr-10 text-slate-900 dark:text-white font-medium ${
                            selectedRemitter && !isOpen ? 'font-semibold text-teal-600 dark:text-teal-400' : ''
                        }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                        {selectedRemitter && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                                title="Clear selection"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>
            </div>

            {/* Hidden Input for Form Validation */}
            <input
                type="text"
                className="sr-only opacity-0 w-0 h-0 absolute"
                required={required}
                value={value || ''}
                onChange={() => {}}
                tabIndex={-1}
            />

            {/* Floating Dropdown List */}
            {isOpen && (
                <div className="absolute z-[100] mt-2 w-full rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl max-h-72 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                    {filteredRemitters.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                            {searchQuery ? `No remitters found for "${searchQuery}"` : 'No remitters available'}
                        </div>
                    ) : (
                        filteredRemitters.map((r) => {
                            const isSelected = String(r.id) === String(value);
                            const name = getDisplayName(r);
                            const subText = getSubText(r);

                            return (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => handleSelect(r)}
                                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center justify-between group ${
                                        isSelected
                                            ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold'
                                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center space-x-2">
                                            <User className={`w-4 h-4 shrink-0 ${isSelected ? 'text-teal-500' : 'text-slate-400 group-hover:text-teal-500'}`} />
                                            <span className="text-sm font-semibold truncate">{name}</span>
                                        </div>
                                        {subText && (
                                            <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5 ml-6 truncate">
                                                {subText}
                                            </p>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <Check className="w-4 h-4 text-teal-500 shrink-0 ml-2" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
