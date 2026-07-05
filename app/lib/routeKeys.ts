export type RouteKeyRecord = {
    id?: string | number | null;
    route_key?: string | null;
};

export const routeKeyOf = (record: RouteKeyRecord | null | undefined): string => {
    if (!record) return '';

    const routeKey = String(record.route_key || '').trim();
    if (routeKey) return routeKey;

    return String(record.id ?? '').trim();
};
