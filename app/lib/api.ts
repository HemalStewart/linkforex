export const API_BASE_URL = 'http://localhost:8888/linforex_backend/public/api';

export const ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/login`,
    },
    REMITTERS: {
        LIST: `${API_BASE_URL}/remitters`,
        DETAIL: (id: string | number) => `${API_BASE_URL}/remitters/${id}`,
        POTENTIAL_MATCHES: `${API_BASE_URL}/remitters/potential-matches`,
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
};
