'use client';

import type { StoredAdminUser } from './adminUserScope';

const extractErrorMessage = async (response: Response): Promise<string> => {
    try {
        const data = await response.clone().json();
        return data?.messages?.error || data?.message || `Request failed with status ${response.status}`;
    } catch {
        return `Request failed with status ${response.status}`;
    }
};

export const openPdfReport = async (url: string, user: StoredAdminUser | null = null): Promise<void> => {
    const reportWindow = window.open('', '_blank');

    if (reportWindow) {
        reportWindow.document.write('<title>Loading PDF...</title><p style="font-family: sans-serif; padding: 16px;">Loading PDF...</p>');
        reportWindow.document.close();
    }

    try {
        const headers = new Headers();
        const actingUserId = user?.id ? String(user.id) : '';
        if (actingUserId) {
            headers.set('X-Acting-User-Id', actingUserId);
        }

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            throw new Error(await extractErrorMessage(response));
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        if (reportWindow) {
            reportWindow.location.replace(blobUrl);
        } else {
            window.open(blobUrl, '_blank', 'noopener,noreferrer');
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
