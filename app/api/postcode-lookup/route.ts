import { NextRequest, NextResponse } from 'next/server';
import { getPostcodeLookupBaseUrl } from '@/app/lib/postcodeLookup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const normalisePostcode = (value: string): string => value.trim().replace(/\s+/g, ' ').toUpperCase();

export async function GET(request: NextRequest): Promise<Response> {
    const postcode = normalisePostcode(request.nextUrl.searchParams.get('postcode') || '');

    if (postcode.length < 3 || postcode.length > 12 || !/^[A-Z0-9 ]+$/.test(postcode)) {
        return NextResponse.json(
            {
                status: 'invalid_request',
                message: 'Enter a valid UK postcode.',
                addresses: [],
                count: 0,
            },
            { status: 400 }
        );
    }

    let providerUrl: URL;
    try {
        providerUrl = new URL(getPostcodeLookupBaseUrl());
        providerUrl.searchParams.set('postcode', postcode);
        providerUrl.searchParams.set('format', 'new');
    } catch {
        return NextResponse.json(
            {
                status: 'configuration_error',
                message: 'Postcode lookup is not configured correctly.',
                addresses: [],
                count: 0,
            },
            { status: 500 }
        );
    }

    try {
        const providerResponse = await fetch(providerUrl, {
            cache: 'no-store',
            signal: AbortSignal.timeout(10_000),
        });
        const payload = await providerResponse.json().catch(() => null);

        if (!providerResponse.ok) {
            return NextResponse.json(
                {
                    status: 'provider_error',
                    message: 'Postcode lookup is temporarily unavailable.',
                    addresses: [],
                    count: 0,
                },
                { status: 502 }
            );
        }

        return NextResponse.json(payload, {
            status: 200,
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch {
        return NextResponse.json(
            {
                status: 'provider_error',
                message: 'Postcode lookup is temporarily unavailable.',
                addresses: [],
                count: 0,
            },
            { status: 502 }
        );
    }
}
