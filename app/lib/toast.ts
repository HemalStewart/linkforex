export type ToastType = 'danger' | 'warning' | 'info' | 'success';

export interface ToastPayload {
    title: string;
    message: string;
    type?: ToastType;
}

export function showToast(title: string, message: string, type: ToastType = 'info') {
    if (typeof window !== 'undefined') {
        const event = new CustomEvent('show-toast', {
            detail: { title, message, type }
        });
        window.dispatchEvent(event);
    }
}

export function queueToast(title: string, message: string, type: ToastType = 'info') {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_toast', JSON.stringify({ title, message, type }));
    }
}
