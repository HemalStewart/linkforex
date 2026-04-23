'use client';

import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

type SortDir = 'asc' | 'desc';

export default function SortIndicator({
    active,
    dir,
    className = '',
}: {
    active: boolean;
    dir: SortDir;
    className?: string;
}) {
    const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
    return (
        <Icon
            className={`inline-block h-3.5 w-3.5 align-[-0.15em] ${active ? 'opacity-80' : 'opacity-55'} ${className}`}
            aria-hidden="true"
        />
    );
}

