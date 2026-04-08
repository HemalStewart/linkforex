const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const DEFAULT_BACKEND_API_BASE_URL = 'http://localhost:8888/linforex_backend/public/api';

export const getBackendApiBaseUrl = (): string => {
    return stripTrailingSlash(
        (process.env.BACKEND_API_BASE_URL || DEFAULT_BACKEND_API_BASE_URL).trim()
    );
};

export const getBackendPublicBaseUrl = (): string => {
    const explicitPublicBase = (process.env.BACKEND_PUBLIC_BASE_URL || '').trim();
    if (explicitPublicBase) {
        return stripTrailingSlash(explicitPublicBase);
    }

    const apiBase = getBackendApiBaseUrl();
    if (apiBase.endsWith('/api')) {
        return apiBase.slice(0, -4);
    }

    return apiBase;
};
//new commit