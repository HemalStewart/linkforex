import { redirect } from 'next/navigation';

type MobileUserDetailRedirectProps = {
    params: Promise<{ id: string }>;
};

export default async function MobileUserDetailRedirect({ params }: MobileUserDetailRedirectProps) {
    const { id } = await params;
    redirect(`/admin/mobile-profiles/${id}`);
}
