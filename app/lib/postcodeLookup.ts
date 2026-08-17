const DEFAULT_POSTCODE_LOOKUP_BASE_URL =
    'https://www.link-forex.co.uk/linkmt1/postalcode_api/';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

/**
 * Server-only configuration for the UK postcode address provider.
 * Set POSTCODE_LOOKUP_BASE_URL per customer when their provider host changes.
 */
export const getPostcodeLookupBaseUrl = (): string => {
    return stripTrailingSlash(
        (process.env.POSTCODE_LOOKUP_BASE_URL || DEFAULT_POSTCODE_LOOKUP_BASE_URL).trim()
    );
};
