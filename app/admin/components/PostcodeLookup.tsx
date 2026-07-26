'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Check, Loader2, Sparkles } from 'lucide-react';

export interface AddressData {
    address_1: string;
    address_2?: string;
    city: string;
    county?: string;
    country: string;
}

interface PostcodeLookupProps {
    value: string;
    onChange: (postcode: string) => void;
    onAddressSelect: (address: AddressData) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    required?: boolean;
    name?: string;
    inputClassName?: string;
}

export default function PostcodeLookup({
    value,
    onChange,
    onAddressSelect,
    placeholder = "Postcode (e.g. SW1A 1AA)",
    label = "Postcode",
    required = false,
    name = "postcode",
    inputClassName = "input-glass w-full",
}: PostcodeLookupProps) {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<AddressData[]>([]);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const performLookup = async (queryPostcode: string, autoApply = false) => {
        const clean = queryPostcode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (clean.length < 4) {
            setSuggestions([]);
            setStatusMsg(null);
            return;
        }

        setLoading(true);
        setStatusMsg(null);
        try {
            const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 200 && data.result) {
                    const r = data.result;
                    const ward = r.admin_ward || r.parish || '';
                    const district = r.admin_district || r.region || '';
                    const region = r.region || r.admin_county || '';

                    let countryName = 'United Kingdom';
                    if (r.country && !['England', 'Scotland', 'Wales', 'Northern Ireland'].includes(r.country)) {
                        countryName = r.country;
                    }

                    const cityVal = district || region || 'London';
                    const countyVal = r.admin_county || district || region;

                    const list: AddressData[] = [];
                    if (ward && district && ward !== district) {
                        list.push({
                            address_1: `${ward}, ${district}`,
                            city: cityVal,
                            county: countyVal,
                            country: countryName,
                        });
                        list.push({
                            address_1: ward,
                            city: cityVal,
                            county: countyVal,
                            country: countryName,
                        });
                    } else if (ward) {
                        list.push({
                            address_1: ward,
                            city: cityVal,
                            county: countyVal,
                            country: countryName,
                        });
                    }
                    if (district) {
                        list.push({
                            address_1: district,
                            city: cityVal,
                            county: countyVal,
                            country: countryName,
                        });
                    }

                    if (list.length === 0) {
                        list.push({
                            address_1: r.postcode,
                            city: cityVal,
                            county: countyVal,
                            country: countryName,
                        });
                    }

                    setSuggestions(list);
                    setShowDropdown(true);
                    setStatusMsg(`Found address for ${r.postcode}`);

                    if (autoApply && list.length > 0) {
                        onAddressSelect(list[0]);
                        if (r.postcode && r.postcode !== value) {
                            onChange(r.postcode);
                        }
                    }
                } else {
                    setSuggestions([]);
                    setStatusMsg('No matching UK postcode found.');
                }
            } else {
                setSuggestions([]);
                setStatusMsg('Postcode lookup not found.');
            }
        } catch (e) {
            console.error('Postcode lookup error:', e);
            setStatusMsg('Lookup error.');
        } finally {
            setLoading(false);
        }
    };

    // Auto lookup debounced when typing postcode
    useEffect(() => {
        const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (clean.length >= 5 && clean.length <= 8) {
            const timer = setTimeout(() => {
                performLookup(value, true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const handleSelect = (addr: AddressData) => {
        onAddressSelect(addr);
        setShowDropdown(false);
        setStatusMsg(`Applied: ${addr.address_1}, ${addr.city}`);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {label && (
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}
            <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 pointer-events-none">
                    <MapPin className="w-5 h-5" />
                </span>
                <input
                    type="text"
                    name={name}
                    value={value}
                    required={required}
                    onChange={(e) => {
                        onChange(e.target.value);
                    }}
                    placeholder={placeholder}
                    className={`${inputClassName} pl-10 pr-24 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 focus:ring-2 focus:ring-teal-500 transition-all`}
                />
                <button
                    type="button"
                    onClick={() => performLookup(value, true)}
                    disabled={loading || !value.trim()}
                    className="absolute right-2 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-medium text-xs rounded-lg shadow-sm flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                >
                    {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <>
                            <Search className="w-3.5 h-3.5" />
                            Lookup
                        </>
                    )}
                </button>
            </div>

            {statusMsg && (
                <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 ml-1 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 inline" /> {statusMsg}
                </p>
            )}

            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden backdrop-blur-lg">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Select Suggested Address</span>
                        <span className="text-[10px] text-teal-500 font-normal">postcodes.io</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {suggestions.map((item, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelect(item)}
                                className="w-full text-left px-4 py-2.5 hover:bg-teal-50 dark:hover:bg-slate-800/80 transition-colors flex items-start gap-3 group cursor-pointer"
                            >
                                <MapPin className="w-4 h-4 text-teal-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                                        {item.address_1}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {item.city}{item.county ? `, ${item.county}` : ''}, {item.country}
                                    </div>
                                </div>
                                <span className="text-xs text-teal-600 dark:text-teal-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                    Fill <Check className="w-3.5 h-3.5" />
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
