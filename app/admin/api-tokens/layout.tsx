import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Screening Usage',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
