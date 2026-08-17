import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Integration Usage',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
