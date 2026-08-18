'use client';

import type { StoredAdminUser } from './adminUserScope';
import { getStoredAdminSessionToken } from './authStorage';

const stripActingUser = (url: string): string => {
    try {
        const parsed = new URL(url, window.location.origin);
        parsed.searchParams.delete('acting_user_id');
        return parsed.toString();
    } catch {
        return url.replace(/([?&])acting_user_id=[^&]*(&)?/, (_, lead: string, tail: string) => {
            if (lead === '?' && tail) return '?';
            if (lead === '&' && tail) return '&';
            return '';
        }).replace(/[?&]$/, '');
    }
};

const filenameFor = (url: string): string => {
    try {
        const parsed = new URL(url, window.location.origin);
        const parts = parsed.pathname.split('/').filter(Boolean);
        const reportId = parts[parts.length - 2] || 'report';
        return `aml-report-${reportId}.pdf`;
    } catch {
        return 'aml-report.pdf';
    }
};

const extractErrorMessage = async (response: Response): Promise<string> => {
    try {
        const data = await response.clone().json();
        return data?.messages?.error || data?.message || `Request failed with status ${response.status}`;
    } catch {
        return `Request failed with status ${response.status}`;
    }
};

export const openPdfReport = async (
    url: string,
    user: StoredAdminUser | null = null,
    existingWindow: Window | null = null
): Promise<void> => {
    const reportWindow = existingWindow || window.open('', '_blank');

    if (reportWindow && !existingWindow) {
        reportWindow.document.write('<title>Loading PDF...</title><p style="font-family: sans-serif; padding: 16px;">Loading PDF...</p>');
        reportWindow.document.close();
    }

    try {
        const sessionToken = getStoredAdminSessionToken();

        const doFetch = async (targetUrl: string): Promise<Response> => {
            const headers = new Headers();
            if (sessionToken) {
                headers.set('Authorization', `Bearer ${sessionToken}`);
            }

            return fetch(targetUrl, {
                method: 'GET',
                headers,
            });
        };

        let response = await doFetch(url);
        if (!response.ok && response.status === 403) {
            response = await doFetch(stripActingUser(url));
        }

        if (!response.ok) {
            throw new Error(await extractErrorMessage(response));
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        if (reportWindow) {
            reportWindow.location.replace(blobUrl);
        } else {
            // The popup blocker refused the tab, and a second window.open would be
            // refused too because the click gesture has already ended. An anchor
            // is not blocked, so the report still reaches the user.
            const link = document.createElement('a');
            link.href = blobUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.download = filenameFor(url);
            document.body.appendChild(link);
            link.click();
            link.remove();
        }

        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open PDF report.';

        if (reportWindow) {
            reportWindow.document.open();
            reportWindow.document.write(
                `<title>PDF Open Failed</title><pre style="white-space: pre-wrap; font-family: sans-serif; padding: 16px;">${message}</pre>`
            );
            reportWindow.document.close();
        }

        throw error;
    }
};
