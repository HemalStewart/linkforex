import { NextRequest } from 'next/server';
import { getBackendApiBaseUrl } from '@/app/lib/backendProxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const forwardWebhook = async (request: NextRequest): Promise<Response> => {
    const target = `${getBackendApiBaseUrl()}/webhooks/veriff`;
    const body = await request.arrayBuffer();

    try {
        const upstream = await fetch(target, {
            method: 'POST',
            headers: {
                'Content-Type': request.headers.get('content-type') || 'application/json',
                'X-AUTH-CLIENT': request.headers.get('x-auth-client') || '',
                'X-HMAC-SIGNATURE': request.headers.get('x-hmac-signature') || '',
            },
            body,
            cache: 'no-store',
        });

        return new Response(upstream.body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: {
                'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        return Response.json(
            {
                status: 502,
                error: 'bad_gateway',
                message: 'Unable to forward Veriff webhook to backend',
                detail: error instanceof Error ? error.message : 'Unknown proxy error',
            },
            { status: 502 }
        );
    }
};

export async function POST(request: NextRequest): Promise<Response> {
    return forwardWebhook(request);
}
