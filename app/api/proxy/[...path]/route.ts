import { NextRequest } from 'next/server';
import { getBackendApiBaseUrl } from '@/app/lib/backendProxy';

type RouteContext = { params: Promise<{ path: string[] }> };

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

const buildTargetUrl = (request: NextRequest, segments: string[]): URL => {
    const backendApiBaseUrl = getBackendApiBaseUrl();
    const target = new URL(backendApiBaseUrl);
    const basePath = target.pathname.replace(/\/+$/, '');
    const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join('/');
    target.pathname = encodedPath ? `${basePath}/${encodedPath}` : basePath;

    request.nextUrl.searchParams.forEach((value, key) => {
        target.searchParams.append(key, value);
    });

    return target;
};

const copyRequestHeaders = (request: NextRequest): Headers => {
    const headers = new Headers();
    request.headers.forEach((value, key) => {
        if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
        headers.set(key, value);
    });
    return headers;
};

const sanitizeResponseHeaders = (headers: Headers): Headers => {
    const clean = new Headers(headers);
    HOP_BY_HOP_HEADERS.forEach((header) => clean.delete(header));
    return clean;
};

const proxyRequest = async (request: NextRequest, context: RouteContext): Promise<Response> => {
    const { path = [] } = await context.params;
    let target: URL;
    try {
        target = buildTargetUrl(request, path);
    } catch (error) {
        return Response.json(
            {
                status: 500,
                error: 'invalid_backend_api_url',
                message: 'Invalid BACKEND_API_BASE_URL configuration',
                detail: error instanceof Error ? error.message : 'Unknown configuration error',
            },
            { status: 500 }
        );
    }

    const method = request.method.toUpperCase();

    const init: RequestInit = {
        method,
        headers: copyRequestHeaders(request),
        cache: 'no-store',
        redirect: 'manual',
    };

    if (method !== 'GET' && method !== 'HEAD') {
        const body = await request.arrayBuffer();
        if (body.byteLength > 0) {
            init.body = body;
        }
    }

    try {
        const upstream = await fetch(target.toString(), init);
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
                message: 'Unable to reach backend API server',
                detail: error instanceof Error ? error.message : 'Unknown proxy error',
            },
            { status: 502 }
        );
    }
};

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
    return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
    return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<Response> {
    return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
    return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
    return proxyRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext): Promise<Response> {
    return proxyRequest(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext): Promise<Response> {
    return proxyRequest(request, context);
}
