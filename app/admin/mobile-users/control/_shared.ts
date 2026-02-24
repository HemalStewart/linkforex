export type Overview = {
    mobile_users_total: number;
    kyc_pending: number;
    kyc_verified: number;
    inactive_users: number;
    campaigns_sent: number;
    active_ads: number;
};

export type SettingsData = {
    require_email_otp: 'yes' | 'no';
    require_mobile_otp: 'yes' | 'no';
    enable_liveness_check: 'yes' | 'no';
    enable_sanction_screening: 'yes' | 'no';
    lock_profile_after_verification: 'yes' | 'no';
    allow_profile_edit_after_lock: 'yes' | 'no';
    enable_google_sign_in: 'yes' | 'no';
    enable_apple_sign_in: 'yes' | 'no';
    enable_in_app_ads: 'yes' | 'no';
    enable_push_notifications: 'yes' | 'no';
    enable_email_notifications: 'yes' | 'no';
    enable_secure_message: 'yes' | 'no';
    send_exchange_rate_push: 'yes' | 'no';
    liveness_provider: 'none' | 'veriff';
    veriff_base_url: string;
    veriff_api_key: string;
    veriff_hmac_secret: string;
    veriff_callback_url: string;
    veriff_configured?: boolean;
};

export type YesNoSettingKey = Exclude<
    keyof SettingsData,
    'liveness_provider' | 'veriff_base_url' | 'veriff_api_key' | 'veriff_hmac_secret' | 'veriff_callback_url' | 'veriff_configured'
>;

export type QueueUser = {
    id: number;
    name: string;
    email: string;
    phone: string;
    status: string;
    kyc_status: string;
    country?: string;
    veriff_status?: string;
    veriff_decision?: string;
    veriff_checked_at?: string;
    mobile_verified_at?: string;
    sanction_status?: string;
    sanction_reason?: string;
    sanction_checked_at?: string;
    created_at?: string;
    updated_at?: string;
};

export type Campaign = {
    id: number;
    title: string;
    message: string;
    channel: 'push' | 'email' | 'both';
    target_audience: 'all' | 'kyc_pending' | 'kyc_verified' | 'inactive';
    include_exchange_rate: 'yes' | 'no';
    status: 'draft' | 'sent';
    sent_at?: string | null;
};

export type MobileAd = {
    id: number;
    title: string;
    description?: string;
    image_url?: string;
    click_url?: string;
    priority: number;
    status: 'active' | 'inactive';
};

export const yesNoKeys: YesNoSettingKey[] = [
    'require_email_otp',
    'require_mobile_otp',
    'enable_liveness_check',
    'enable_sanction_screening',
    'lock_profile_after_verification',
    'allow_profile_edit_after_lock',
    'enable_google_sign_in',
    'enable_apple_sign_in',
    'enable_in_app_ads',
    'enable_push_notifications',
    'enable_email_notifications',
    'enable_secure_message',
    'send_exchange_rate_push',
];

export const defaultSettings: SettingsData = {
    require_email_otp: 'yes',
    require_mobile_otp: 'yes',
    enable_liveness_check: 'yes',
    enable_sanction_screening: 'yes',
    lock_profile_after_verification: 'yes',
    allow_profile_edit_after_lock: 'no',
    enable_google_sign_in: 'yes',
    enable_apple_sign_in: 'yes',
    enable_in_app_ads: 'no',
    enable_push_notifications: 'yes',
    enable_email_notifications: 'yes',
    enable_secure_message: 'yes',
    send_exchange_rate_push: 'no',
    liveness_provider: 'veriff',
    veriff_base_url: 'https://stationapi.veriff.com',
    veriff_api_key: '',
    veriff_hmac_secret: '',
    veriff_callback_url: '',
    veriff_configured: false,
};
