const UPLOADS_PROXY_BASE = '/api/uploads';

/**
 * Resolve any backend-provided uploads URL/path into a same-origin URL.
 *
 * Why: the backend may be on a host with an invalid/self-signed certificate.
 * Browsers will refuse to load images directly (ERR_CERT_AUTHORITY_INVALID).
 * Serving uploads through Next's `/api/uploads/*` proxy keeps the browser on
 * our own trusted origin and avoids mixed-content / cert issues.
 */
export const resolveUploadsUrl = (rawUrl?: string | null): string => {
    const raw = String(rawUrl ?? '').trim();
    if (!raw) return '';

    // Already proxied (relative).
    if (raw === UPLOADS_PROXY_BASE || raw.startsWith(`${UPLOADS_PROXY_BASE}/`)) {
        return raw;
    }

    // Already proxied (absolute same-origin).
    if (typeof window !== 'undefined') {
        const origin = window.location.origin.replace(/\/+$/, '');
        if (
            raw === `${origin}${UPLOADS_PROXY_BASE}` ||
            raw.startsWith(`${origin}${UPLOADS_PROXY_BASE}/`)
        ) {
            return raw;
        }
    }

    // Absolute URL from backend (http(s)://host/uploads/...).
    if (/^https?:\/\//i.test(raw)) {
        try {
            const parsed = new URL(raw);
            const pathname = parsed.pathname || '';
            const idx = pathname.indexOf('/uploads/');
            if (idx >= 0) {
                const rest = pathname.slice(idx + '/uploads/'.length).replace(/^\/+/, '');
                const proxied = rest ? `${UPLOADS_PROXY_BASE}/${rest}` : UPLOADS_PROXY_BASE;
                return parsed.search ? `${proxied}${parsed.search}` : proxied;
            }

            // If it doesn't look like an uploads URL, leave it untouched.
            return raw;
        } catch {
            return raw;
        }
    }

    // Relative path such as `uploads/foo.png` or `/uploads/foo.png` or `foo.png`.
    const normalized = raw.replace(/^\/+/, '').replace(/^uploads\//, '');
    return normalized ? `${UPLOADS_PROXY_BASE}/${normalized}` : UPLOADS_PROXY_BASE;
};

