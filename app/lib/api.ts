const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const toPathname = (value: string): string => {
    try {
        return new URL(value, 'http://localhost').pathname;
    } catch {
        return value;
    }
};

const normalizeBaseUrl = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return stripTrailingSlash(trimmed);
};

export const API_BASE_URL = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL || '/api/proxy'
);

export const UPLOADS_BASE_URL = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || '/api/uploads'
);

const apiBasePathname = toPathname(API_BASE_URL);

export const isApiRequestUrl = (rawUrl: string, origin = 'http://localhost'): boolean => {
    if (!rawUrl) return false;

    try {
        const parsed = new URL(rawUrl, origin);
        return (
            parsed.pathname === apiBasePathname ||
            parsed.pathname.startsWith(`${apiBasePathname}/`)
        );
    } catch {
        return false;
    }
};

export const ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/login`,
        CHANGE_PASSWORD: `${API_BASE_URL}/auth/change-password`,
    },
    REMITTERS: {
        LIST: `${API_BASE_URL}/remitters`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/remitters/${id}`,
        POTENTIAL_MATCHES: `${API_BASE_URL}/remitters/potential-matches`,
        VERIFF_START: (id: string | number) => `${API_BASE_URL}/remitters/${id}/veriff/start`,
        VERIFF_SYNC: (id: string | number) => `${API_BASE_URL}/remitters/${id}/veriff/sync`,
    },
    BENEFICIARIES: {
        LIST: `${API_BASE_URL}/beneficiaries`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/beneficiaries/${id}`,
    },
    TRANSFERS: {
        LIST: `${API_BASE_URL}/transfers`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/transfers/${id}`,
        APPROVE: (id: string | number) => `${API_BASE_URL}/transfers/${id}/approve`,
        CANCEL: (id: string | number) => `${API_BASE_URL}/transfers/${id}/cancel`,
    },
    USERS: {
        LIST: `${API_BASE_URL}/users`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/users/${id}`,
    },
    CURRENCIES: {
        LIST: `${API_BASE_URL}/currencies`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/currencies/${id}`,
    },
    BRANCHES: {
        LIST: `${API_BASE_URL}/branches`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/branches/${id}`,
    },
    BRANCH_CURRENCY_RATES: {
        LIST: `${API_BASE_URL}/branch-currency-rates`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/branch-currency-rates/${id}`,
    },
    BRANCH_ACCESS_REQUESTS: {
        LIST: `${API_BASE_URL}/branch-access-requests`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/branch-access-requests/${id}`,
        CHECK: `${API_BASE_URL}/branch-access-requests/check`,
        APPROVE: (id: string | number) => `${API_BASE_URL}/branch-access-requests/${id}/approve`,
        REJECT: (id: string | number) => `${API_BASE_URL}/branch-access-requests/${id}/reject`,
    },
    ROLES: {
        LIST: `${API_BASE_URL}/roles`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/roles/${id}`,
    },
    PERMISSION_GROUPS: {
        LIST: `${API_BASE_URL}/permission-groups`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/permission-groups/${id}`,
        IMPORT: `${API_BASE_URL}/permission-groups/import`,
    },
    LOGS: {
        LIST: `${API_BASE_URL}/logs`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/logs/${id}`,
        SIGNOFF: `${API_BASE_URL}/logs/signoff`,
    },
    REPORTS: {
        SUMMARY: `${API_BASE_URL}/reports/summary`,
        TRENDS: `${API_BASE_URL}/reports/trends`,
    },
    AUDIT_LOGS: {
        LIST: `${API_BASE_URL}/audit-logs`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/audit-logs/${id}`,
    },
    DIRECTORS: {
        LIST: `${API_BASE_URL}/directors`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/directors/${id}`,
    },
    COUNTRIES: {
        LIST: `${API_BASE_URL}/countries`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/countries/${id}`,
    },
    BANKS: {
        LIST: `${API_BASE_URL}/banks`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/banks/${id}`,
    },
    PURPOSES: {
        LIST: `${API_BASE_URL}/purposes`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/purposes/${id}`,
    },
    RELATIONSHIPS: {
        LIST: `${API_BASE_URL}/relationships`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/relationships/${id}`,
    },
    TRANSACTION_SETTINGS: {
        LIST: `${API_BASE_URL}/transaction-settings`,
    },
    MOBILE_ADMIN: {
        OVERVIEW: `${API_BASE_URL}/mobile-admin/overview`,
        SETTINGS: `${API_BASE_URL}/mobile-admin/settings`,
        EXCHANGE_RATES: `${API_BASE_URL}/mobile-admin/exchange-rates`,
        EXCHANGE_RATE_DETAIL: (id: string | number) => `${API_BASE_URL}/mobile-admin/exchange-rates/${id}`,
        USER_RATE_OVERRIDES: `${API_BASE_URL}/mobile-admin/user-rate-overrides`,
        USER_RATE_OVERRIDE_DETAIL: (id: string | number) => `${API_BASE_URL}/mobile-admin/user-rate-overrides/${id}`,
        REVIEW_QUEUE: `${API_BASE_URL}/mobile-admin/review-queue`,
        REVIEW_APPROVE: (id: string | number) => `${API_BASE_URL}/mobile-admin/review-queue/${id}/approve`,
        REVIEW_REJECT: (id: string | number) => `${API_BASE_URL}/mobile-admin/review-queue/${id}/reject`,
        TRANSFERS: `${API_BASE_URL}/mobile-admin/transfers`,
        TRANSFER_DETAIL: (id: string | number) => `${API_BASE_URL}/mobile-admin/transfers/${id}`,
        CAMPAIGNS: `${API_BASE_URL}/mobile-admin/campaigns`,
        SEND_CAMPAIGN: (id: string | number) => `${API_BASE_URL}/mobile-admin/campaigns/${id}/send`,
        ADS: `${API_BASE_URL}/mobile-admin/ads`,
        AD_DETAIL: (id: string | number) => `${API_BASE_URL}/mobile-admin/ads/${id}`,
    },
    MOBILE_AUTH: {
        START_LIVENESS: `${API_BASE_URL}/auth/liveness/start`,
        SYNC_LIVENESS: `${API_BASE_URL}/auth/liveness/sync`,
    },
    SUPPORT: {
        LIST: `${API_BASE_URL}/support/tickets`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/support/tickets/${id}`,
        UPDATE: (id: string | number) => `${API_BASE_URL}/support/tickets/${id}`,
        DELETE: (id: string | number) => `${API_BASE_URL}/support/tickets/${id}`,
        REPLY: (id: string | number) => `${API_BASE_URL}/support/tickets/${id}/reply`,
        MINE: `${API_BASE_URL}/support/tickets/mine`,
    },
};
