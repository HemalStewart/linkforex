import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Role',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
