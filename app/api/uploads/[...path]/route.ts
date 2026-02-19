import { NextRequest } from 'next/server';
import { getBackendPublicBaseUrl } from '@/app/lib/backendProxy';

type RouteContext = { params: Promise<{ path: string[] }> };

const HOP_BY_HOP_HEADERS = new Set([
    'connection',
    'content-length',
    'host',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
]);

const buildUploadsTargetUrl = (request: NextRequest, segments: string[]): URL => {
    const backendPublicBaseUrl = getBackendPublicBaseUrl();
    const target = new URL(backendPublicBaseUrl);
    const basePath = target.pathname.replace(/\/+$/, '');
    const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join('/');
    target.pathname = encodedPath
        ? `${basePath}/uploads/${encodedPath}`
        : `${basePath}/uploads`;

    request.nextUrl.searchParams.forEach((value, key) => {
        target.searchParams.append(key, value);
    });

    return target;
};

const sanitizeResponseHeaders = (headers: Headers): Headers => {
    const clean = new Headers(headers);
    HOP_BY_HOP_HEADERS.forEach((header) => clean.delete(header));
    return clean;
};

const proxyUpload = async (request: NextRequest, context: RouteContext): Promise<Response> => {
    const { path = [] } = await context.params;
    let target: URL;
    try {
        target = buildUploadsTargetUrl(request, path);
    } catch (error) {
        return Response.json(
            {
                status: 500,
                error: 'invalid_backend_public_url',
                message: 'Invalid BACKEND_PUBLIC_BASE_URL or BACKEND_API_BASE_URL configuration',
                detail: error instanceof Error ? error.message : 'Unknown configuration error',
            },
            { status: 500 }
        );
    }

    try {
        const upstream = await fetch(target.toString(), {
            method: request.method,
            headers: {
                accept: request.headers.get('accept') || '*/*',
            },
            cache: 'no-store',
            redirect: 'manual',
        });

        return new Response(upstream.body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: sanitizeResponseHeaders(upstream.headers),
        });
    } catch (error) {
        return Response.json(
            {
                status: 502,
                error: 'bad_gateway',
                message: 'Unable to reach backend uploads server',
                detail: error instanceof Error ? error.message : 'Unknown proxy error',
            },
            { status: 502 }
        );
    }
};

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
    return proxyUpload(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext): Promise<Response> {
    return proxyUpload(request, context);
}
