'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MobileControlPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/mobile-users/control/overview');
    }, [router]);

    return (
        <div className="mx-auto max-w-7xl py-20 text-center text-slate-500 dark:text-slate-300">
            Redirecting to mobile control overview...
        </div>
    );
}
