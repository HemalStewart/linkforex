'use client';

import Link from 'next/link';
import { Coins, Smartphone } from 'lucide-react';

export default function BranchRatesMenuPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Branch Rates</h1>
                <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
                    Manage customer cash and customer digital rates from one place.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link
                    href="/admin/branch-currency-rates"
                    className="card-glass p-6 hover:shadow-xl transition-all"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <Coins className="h-5 w-5 text-teal-700 dark:text-teal-300" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer Cash Rate</h2>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Branch-level customer cash rates used for admin cash operations.
                    </p>
                </Link>

                <Link
                    href="/admin/mobile-users/control/exchange-rates"
                    className="card-glass p-6 hover:shadow-xl transition-all"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer Digital Rate</h2>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Mobile app rate visibility/configuration.
                    </p>
                </Link>
            </div>
        </div>
    );
}

