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

const extractIpCandidates = (value: string | null): string[] => {
    const input = (value || '').trim();
    if (!input) {
        return [];
    }

    return input
        .split(',')
        .map((part) => part.trim().replace(/^for=/i, '').replace(/^["'\[]|["'\]]$/g, ''))
        .map((part) => {
            if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(part)) {
                return part.split(':', 1)[0];
            }
            return part;
        })
        .filter((part) => {
            if (!part) {
                return false;
            }

            if (part.includes(':') && part.startsWith('[') && part.endsWith(']')) {
                return true;
            }

            return true;
        });
};

const isValidIp = (value: string): boolean => {
    if (!value) {
        return false;
    }

    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
        return value.split('.').every((segment) => {
            const num = Number(segment);
            return num >= 0 && num <= 255;
        });
    }

    return /^[0-9a-f:]+$/i.test(value);
};

const isPrivateOrReservedIp = (value: string): boolean => {
    const ip = value.toLowerCase();

    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') {
        return true;
    }

    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) {
        const [a, b] = ip.split('.').map(Number);
        if (a === 10 || a === 127 || a === 0) return true;
        if (a === 192 && b === 168) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 169 && b === 254) return true;
        if (a === 100 && b >= 64 && b <= 127) return true;
        return false;
    }

    return (
        ip === '::' ||
        ip.startsWith('fc') ||
        ip.startsWith('fd') ||
        ip.startsWith('fe80:') ||
        ip.startsWith('::ffff:127.')
    );
};

const resolveClientIp = (request: NextRequest): string | null => {
    const headerNames = [
        'cf-connecting-ip',
        'x-real-ip',
        'x-client-ip',
        'x-forwarded-for',
        'x-vercel-forwarded-for',
        'true-client-ip',
        'forwarded',
    ];

    const fallback: string[] = [];

    for (const headerName of headerNames) {
        const candidates = extractIpCandidates(request.headers.get(headerName));
        for (const candidate of candidates) {
            if (!isValidIp(candidate)) {
                continue;
            }

            if (!isPrivateOrReservedIp(candidate)) {
                return candidate;
            }

            fallback.push(candidate);
        }
    }

    return fallback[0] || null;
};

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

    const clientIp = resolveClientIp(request);
    if (clientIp) {
        headers.set('x-client-ip', clientIp);
        headers.set('x-real-ip', clientIp);
        headers.set('x-forwarded-for', clientIp);
    }

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
        if (request.body) {
            init.body = request.body;
            // @ts-expect-error Node.js native fetch requires duplex: 'half' for ReadableStream bodies
            init.duplex = 'half';
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
