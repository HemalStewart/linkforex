import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Branch Access Flags',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
