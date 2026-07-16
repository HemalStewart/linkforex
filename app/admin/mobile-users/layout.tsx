import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Mobile Users',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
