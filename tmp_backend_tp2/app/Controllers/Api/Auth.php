<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\API\ResponseTrait;
use App\Libraries\EmailService;
use App\Services\VeriffService;

class Auth extends BaseController
{
    use ResponseTrait;
    private ?array $cachedPayload = null;
    private ?VeriffService $veriffService = null;

    private function firstHeaderValue(array $headerNames): ?string
    {
        foreach ($headerNames as $headerName) {
            $value = trim((string) $this->request->getHeaderLine($headerName));
            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }

    private function resolveClientIp(): ?string
    {
        $headerIp = $this->firstHeaderValue([
            'cf-connecting-ip',
            'x-real-ip',
            'x-client-ip',
            'x-forwarded-for',
            'x-vercel-forwarded-for',
            'true-client-ip',
        ]);

        if ($headerIp) {
            $candidate = trim(explode(',', $headerIp)[0] ?? '');
            if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                return $candidate;
            }
        }

        $requestIp = trim((string) $this->request->getIPAddress());
        if (filter_var($requestIp, FILTER_VALIDATE_IP)) {
            return $requestIp;
        }

        return null;
    }

    private function resolveCountryFromHeaders(): ?string
    {
        $countryName = $this->firstHeaderValue([
            'x-vercel-ip-country-name',
            'x-country-name',
        ]);
        if ($countryName) {
            return $countryName;
        }

        $countryCode = strtoupper((string) ($this->firstHeaderValue([
            'x-vercel-ip-country',
            'cf-ipcountry',
            'x-country-code',
        ]) ?? ''));

        if ($countryCode !== '' && $countryCode !== 'XX' && preg_match('/^[A-Z]{2}$/', $countryCode)) {
            return $countryCode;
        }

        return null;
    }

    private function veriffService(): VeriffService
    {
        if ($this->veriffService === null) {
            $this->veriffService = new VeriffService();
        }

        return $this->veriffService;
    }

    private function isLocalIp(string $ip): bool
    {
        return $ip === '127.0.0.1' || $ip === '::1' || str_starts_with($ip, '192.168.') || str_starts_with($ip, '10.') || str_starts_with($ip, '172.16.');
    }

    private function resolveCountry(?string $ip): ?string
    {
        $headerCountry = $this->resolveCountryFromHeaders();
        if ($headerCountry) {
            return $headerCountry;
        }

        if (!$ip)
            return null;
        if ($this->isLocalIp($ip))
            return 'Local';

        try {
            $client = service('curlrequest');
            $response = $client->get('https://ipapi.co/' . $ip . '/json/', [
                'timeout' => 2.5
            ]);
            if ($response->getStatusCode() !== 200)
                return null;
            $data = json_decode($response->getBody(), true);
            if (!is_array($data))
                return null;
            return $data['country_name'] ?? $data['country'] ?? null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function getMobileAppSettings(): array
    {
        $model = new \App\Models\MobileAppSettingModel();
        $settings = $model->first();
        return is_array($settings) ? $settings : [];
    }

    private function normalizePhone(string $phone): string
    {
        $normalized = preg_replace('/\s+/', '', trim($phone));
        if ($normalized === null) {
            return '';
        }

        if ($normalized !== '' && preg_match('/[^0-9+]/', $normalized) === 1) {
            return $normalized;
        }

        if ($normalized !== '' && $normalized[0] !== '+') {
            $normalized = '+' . ltrim($normalized, '0');
        }

        return $normalized;
    }

    private function phoneLookupCandidates(string $identifier): array
    {
        $identifier = trim($identifier);
        if ($identifier === '' || strpos($identifier, '@') !== false) {
            return [];
        }

        $candidates = [];
        $push = static function (array &$items, ?string $value): void {
            $value = trim((string) $value);
            if ($value !== '' && !in_array($value, $items, true)) {
                $items[] = $value;
            }
        };

        $normalized = $this->normalizePhone($identifier);
        $push($candidates, $normalized);

        $digits = preg_replace('/\D+/', '', $identifier) ?? '';
        if ($digits === '') {
            return $candidates;
        }

        if (str_starts_with($digits, '0094')) {
            $push($candidates, '+94' . substr($digits, 4));
        }
        if (str_starts_with($digits, '0044')) {
            $push($candidates, '+44' . substr($digits, 4));
        }
        if (str_starts_with($digits, '94')) {
            $push($candidates, '+' . $digits);
        }
        if (str_starts_with($digits, '44')) {
            $push($candidates, '+' . $digits);
        }

        if (str_starts_with($digits, '07')) {
            if (strlen($digits) === 10) {
                $sriLankaPhone = '+94' . substr($digits, 1);
                $push($candidates, $sriLankaPhone);
                $push($candidates, '+44' . substr($sriLankaPhone, 1));
            }
            if (strlen($digits) === 11) {
                $push($candidates, '+44' . substr($digits, 1));
            }
        }

        // Legacy mobile-app records were accidentally stored as +4494...
        if (str_starts_with($digits, '947')) {
            $push($candidates, '+44' . $digits);
        }

        return $candidates;
    }

    private function findRemitterByIdentifier(\App\Models\RemitterModel $model, string $identifier): ?array
    {
        $identifier = trim($identifier);
        $phoneCandidates = $this->phoneLookupCandidates($identifier);

        $query = $model->groupStart()->where('email', $identifier);
        foreach ($phoneCandidates as $candidate) {
            $query->orWhere('phone', $candidate);
        }
        $query->groupEnd();

        $user = $query->first();
        return is_array($user) ? $user : null;
    }


    private function normalizePlatform(?string $platform): ?string
    {
        $normalized = strtolower(trim((string) $platform));
        if ($normalized === '') {
            return null;
        }

        if (in_array($normalized, ['android', 'ios', 'web'], true)) {
            return $normalized;
        }

        return 'android';
    }

    private function upsertRemitterDeviceRecord(
        int $remitterId,
        string $deviceId,
        ?string $deviceName = null,
        ?string $platform = null,
        ?string $fcmToken = null
    ): void {
        $deviceId = trim($deviceId);
        if ($remitterId <= 0 || $deviceId === '') {
            return;
        }

        $deviceModel = new \App\Models\RemitterDeviceModel();
        $existing = $deviceModel
            ->where('remitter_id', $remitterId)
            ->where('device_id', $deviceId)
            ->first();

        $payload = [
            'remitter_id' => $remitterId,
            'device_id' => $deviceId,
            'device_name' => ($deviceName !== null && trim($deviceName) !== '') ? trim($deviceName) : null,
            'platform' => $this->normalizePlatform($platform),
            'last_seen_at' => date('Y-m-d H:i:s'),
        ];

        if ($fcmToken !== null) {
            $payload['fcm_token'] = trim($fcmToken) !== '' ? trim($fcmToken) : null;
        }

        if ($existing) {
            $deviceModel->update((int) $existing['id'], $payload);
            return;
        }

        $deviceModel->insert($payload);
    }

    private function isAllowedSignupPhone(string $phone): bool
    {
        return preg_match('/^\+(44|94)\d{9,12}$/', $phone) === 1;
    }

    private function getActiveMobileAds(string $placement): array
    {
        $model = new \App\Models\MobileAdModel();
        $now = date('Y-m-d H:i:s');

        $rows = $model
            ->where('status', 'active')
            ->where('placement', $placement)
            ->groupStart()
                ->where('start_at IS NULL', null, false)
                ->orWhere('start_at <=', $now)
            ->groupEnd()
            ->groupStart()
                ->where('end_at IS NULL', null, false)
                ->orWhere('end_at >=', $now)
            ->groupEnd()
            ->orderBy('priority', 'DESC')
            ->orderBy('id', 'DESC')
            ->findAll(8);

        return array_map(function (array $row) use ($placement): array {
            return [
                'id' => $row['id'] ?? null,
                'title' => $row['title'] ?? '',
                'description' => $row['description'] ?? '',
                'image_url' => $this->absoluteAssetUrl($row['image_url'] ?? ''),
                'click_url' => $row['click_url'] ?? '',
                'placement' => $row['placement'] ?? $placement,
                'priority' => (int) ($row['priority'] ?? 0),
            ];
        }, $rows);
    }

    private function absoluteAssetUrl(?string $value): string
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return '';
        }

        if (preg_match('/^https?:\/\//i', $raw) === 1) {
            return $raw;
        }

        $host = trim((string) $this->request->getServer('HTTP_HOST'));
        if ($host !== '') {
            $scheme = $this->request->isSecure() ? 'https' : 'http';
            return $scheme . '://' . $host . '/' . ltrim($raw, '/');
        }

        helper('url');
        return base_url($raw);
    }

    private function parseListSetting(?string $raw): array
    {
        $items = preg_split('/[\r\n,]+/', (string) $raw) ?: [];
        $normalized = [];
        foreach ($items as $item) {
            $value = strtolower(trim((string) $item));
            if ($value !== '') {
                $normalized[] = $value;
            }
        }

        return array_values(array_unique($normalized));
    }

    private function resolveCountryMeta(?string $ip): array
    {
        if (!$ip) {
            return ['name' => null, 'code' => null];
        }

        if ($this->isLocalIp($ip)) {
            return ['name' => 'Local', 'code' => 'LO'];
        }

        try {
            $client = service('curlrequest');
            $response = $client->get('https://ipapi.co/' . $ip . '/json/', [
                'timeout' => 2.5,
            ]);
            if ($response->getStatusCode() !== 200) {
                return ['name' => null, 'code' => null];
            }

            $data = json_decode($response->getBody(), true);
            if (!is_array($data)) {
                return ['name' => null, 'code' => null];
            }

            return [
                'name' => $data['country_name'] ?? $data['country'] ?? null,
                'code' => strtoupper((string) ($data['country_code_iso3'] ?? $data['country_code'] ?? '')),
            ];
        } catch (\Throwable $e) {
            return ['name' => null, 'code' => null];
        }
    }

    private function resolveAccessDecision(array $settings): array
    {
        $ip = $this->resolveClientIp();
        $countryMeta = $this->resolveCountryMeta($ip);
        $countryName = trim((string) ($countryMeta['name'] ?? ''));
        $countryCode = strtolower(trim((string) ($countryMeta['code'] ?? '')));
        $restricted = ($settings['restrict_blacklisted_countries'] ?? 'no') === 'yes';
        $blacklisted = $this->parseListSetting((string) ($settings['blacklisted_countries'] ?? ''));

        $countryNameNormalized = strtolower($countryName);
        $blocked = false;
        if ($restricted && $countryNameNormalized !== '') {
            $blocked = in_array($countryNameNormalized, $blacklisted, true)
                || ($countryCode !== '' && in_array($countryCode, $blacklisted, true));
        }

        if ($blocked && $this->isWhitelistedTestingCountry($countryName, $countryCode)) {
            $blocked = false;
        }

        return [
            'ip' => $ip,
            'country' => $countryName !== '' ? $countryName : null,
            'country_code' => $countryCode !== '' ? strtoupper($countryCode) : null,
            'allowed' => !$blocked,
            'message' => $blocked
                ? 'Access to the mobile app is restricted from your current country.'
                : null,
        ];
    }

    private function passwordRotationDays(array $settings): int
    {
        $days = (int) ($settings['password_rotation_days'] ?? 180);
        return $days > 0 ? $days : 180;
    }

    private function boolSetting(array $settings, string $key, string $default = 'no'): bool
    {
        return (($settings[$key] ?? $default) === 'yes');
    }

    private function supportEmail(array $settings): string
    {
        return trim((string) ($settings['support_email'] ?? ''));
    }

    private function isProfileComplete(array $user): bool
    {
        $requiredFields = ['name', 'email', 'phone', 'dob', 'address_1', 'city', 'country'];

        foreach ($requiredFields as $field) {
            if (trim((string) ($user[$field] ?? '')) === '') {
                return false;
            }
        }

        return true;
    }

    private function isPasswordRotationRequired(array $user, array $settings): bool
    {
        $rotationDays = $this->passwordRotationDays($settings);
        $changedAt = trim((string) ($user['password_changed_at'] ?? $user['updated_at'] ?? $user['created_at'] ?? ''));
        if ($changedAt === '' || strtotime($changedAt) === false) {
            return false;
        }

        return strtotime($changedAt . " +{$rotationDays} days") <= time();
    }

    private function issueDeviceVerification(array $user, string $deviceId, array $settings, ?string $deviceName = null): array
    {
        $code = (string) random_int(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', time() + 10 * 60);
        $model = new \App\Models\RemitterModel();

        $model->update((int) $user['id'], [
            'pending_device_id' => $deviceId,
            'device_verification_code' => $code,
            'device_verification_expires_at' => $expiresAt,
        ]);

        $emailSent = false;
        try {
            $emailService = new EmailService();
            $emailSent = $emailService->sendDeviceVerificationCode((string) $user['email'], $code, $deviceName);
        } catch (\Throwable $e) {
            log_message('error', 'Device verification email service error: ' . $e->getMessage());
            $emailSent = false;
        }

        return [
            'code' => $code,
            'expires_at' => $expiresAt,
            'email_sent' => $emailSent,
        ];
    }

    private function requestPayload(): array
    {
        if ($this->cachedPayload !== null) {
            return $this->cachedPayload;
        }

        $json = null;
        try {
            $json = $this->request->getJSON(true);
        } catch (\Throwable $e) {
            // Ignore invalid JSON (e.g. multipart/form-data uploads)
            $json = null;
        }
        if (is_array($json) && !empty($json)) {
            $this->cachedPayload = $json;
            return $this->cachedPayload;
        }

        $raw = $this->request->getRawInput();
        $this->cachedPayload = is_array($raw) ? $raw : [];
        return $this->cachedPayload;
    }

    private function requestInput(string $key, $default = null)
    {
        $payload = $this->requestPayload();
        if (array_key_exists($key, $payload)) {
            return $payload[$key];
        }

        $value = $this->request->getVar($key);
        return $value !== null ? $value : $default;
    }

    private function mobileIdTypeOptions(): array
    {
        return [
            'Passport',
            'CNIC',
            'Driving licence',
            'National ID',
            'Residence permit',
            'Other',
        ];
    }

    private function validateMobileBeneficiaryData(array $data): array
    {
        $errors = [];

        $name = trim((string) ($data['name'] ?? ''));
        $country = trim((string) ($data['country'] ?? ''));
        $address = trim((string) ($data['address'] ?? ''));
        $city = trim((string) ($data['city'] ?? ''));
        $dateOfBirth = trim((string) ($data['date_of_birth'] ?? ''));
        $placeOfBirth = trim((string) ($data['place_of_birth'] ?? ''));
        $bankName = trim((string) ($data['bank_name'] ?? ''));
        $paymentMode = trim((string) ($data['payment_mode'] ?? ''));
        $iban = preg_replace('/\s+/', '', trim((string) ($data['iban'] ?? ''))) ?? '';
        $accountNumber = trim((string) ($data['account_number'] ?? ''));
        $receiverIdType = trim((string) ($data['receiver_id_type'] ?? ''));
        $receiverIdNumber = trim((string) ($data['receiver_id_number'] ?? ''));
        $mobileNumber = trim((string) ($data['mobile_number'] ?? ''));

        $paymentModeKey = strtolower($paymentMode);
        $isCashPickup = $paymentModeKey !== '' && (str_contains($paymentModeKey, 'cash') || str_contains($paymentModeKey, 'pickup'));
        $isOtherBank = str_contains($paymentModeKey, 'another bank');

        if ($name === '') {
            $errors['name'] = 'Beneficiary name is required.';
        }
        if ($country === '') {
            $errors['country'] = 'Country is required.';
        }
        if ($address === '') {
            $errors['address'] = 'Address is required.';
        }
        if ($city === '') {
            $errors['city'] = 'City is required.';
        }
        if ($dateOfBirth === '') {
            $errors['date_of_birth'] = 'Date of birth is required.';
        }
        if ($placeOfBirth === '') {
            $errors['place_of_birth'] = 'Place of birth is required.';
        }
        if ($paymentMode === '') {
            $errors['payment_mode'] = 'Payment mode is required.';
        }

        if ($isOtherBank) {
            if ($bankName === '' && $iban === '') {
                $errors['bank_name'] = 'Select a bank or enter an IBAN number.';
            }
        } elseif ($bankName === '') {
            $errors['bank_name'] = 'Bank name is required.';
        }

        if ($iban !== '' && strlen($iban) < 15) {
            $errors['iban'] = 'IBAN must be at least 15 characters.';
        }

        if ($mobileNumber !== '') {
            $digits = preg_replace('/\D+/', '', $mobileNumber) ?? '';
            if (strlen($digits) < 8) {
                $errors['mobile_number'] = 'Mobile number must be at least 8 digits.';
            }
        }

        if ($isCashPickup) {
            if ($receiverIdType === '') {
                $errors['receiver_id_type'] = 'Receiver ID type is required for cash pickup.';
            }
            if ($receiverIdNumber === '') {
                $errors['receiver_id_number'] = 'Receiver ID number is required for cash pickup.';
            }
        }

        if (strcasecmp($receiverIdType, 'CNIC') === 0) {
            $cnicDigits = preg_replace('/\D+/', '', $receiverIdNumber) ?? '';
            if ($cnicDigits !== '' && strlen($cnicDigits) !== 13) {
                $errors['receiver_id_number'] = 'CNIC must be exactly 13 digits.';
            }
        }

        return $errors;
    }

    private function resolveMobileAppUser(string $email, bool $requireActive = true): array
    {
        $email = trim($email);
        if ($email === '') {
            return [
                'ok' => false,
                'status' => 400,
                'message' => 'Email is required.',
            ];
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();
        if (!$user) {
            return [
                'ok' => false,
                'status' => 404,
                'message' => 'User not found',
            ];
        }

        if (($user['registration_source'] ?? '') !== 'mobile_app') {
            return [
                'ok' => false,
                'status' => 401,
                'message' => 'Unauthorized access. App users only.',
            ];
        }

        if ($requireActive && ($user['status'] ?? '') !== 'active') {
            return [
                'ok' => false,
                'status' => 401,
                'message' => 'Account is not active',
            ];
        }

        return [
            'ok' => true,
            'user' => $user,
        ];
    }

    private function mobileTransferAccessIssue(array $user, array $settings): ?array
    {
        $access = $this->resolveAccessDecision($settings);
        if (!$access['allowed']) {
            return [
                'status' => 403,
                'payload' => [
                    'status' => 403,
                    'message' => $access['message'] ?? 'Access is restricted from your current location.',
                    'access_blocked' => true,
                    'access_country' => $access['country'],
                    'access_country_code' => $access['country_code'],
                    'support_email' => $this->supportEmail($settings),
                ],
            ];
        }

        if ($this->boolSetting($settings, 'require_mobile_otp') && empty($user['mobile_verified_at'])) {
            return [
                'status' => 401,
                'payload' => [
                    'status' => 401,
                    'message' => 'Mobile number must be verified before you can transfer money.',
                ],
            ];
        }

        if (!$this->isProfileComplete($user)) {
            return [
                'status' => 422,
                'payload' => [
                    'status' => 422,
                    'message' => 'Please complete your personal information before creating a transfer.',
                    'profile_complete' => false,
                ],
            ];
        }

        if ($this->isPasswordRotationRequired($user, $settings)) {
            return [
                'status' => 403,
                'payload' => [
                    'status' => 403,
                    'message' => 'Your password has expired. Please update it to continue.',
                    'password_change_required' => true,
                    'password_rotation_days' => $this->passwordRotationDays($settings),
                    'support_email' => $this->supportEmail($settings),
                    'email' => $user['email'] ?? null,
                ],
            ];
        }

        $livenessEnabled = (($settings['enable_liveness_check'] ?? 'yes') === 'yes' && ($settings['liveness_provider'] ?? 'veriff') === 'veriff');
        $kycStatus = strtolower(trim((string) ($user['kyc_status'] ?? 'pending')));
        if ($livenessEnabled && in_array($kycStatus, ['pending', 'submitted'], true)) {
            return [
                'status' => 403,
                'payload' => [
                    'status' => 403,
                    'message' => 'Please complete your identity verification before sending money.',
                    'requires_liveness' => true,
                    'kyc_status' => $user['kyc_status'] ?? 'pending',
                ],
            ];
        }

        if (($settings['enable_sanction_screening'] ?? 'yes') === 'yes') {
            $sanctionStatus = strtolower(trim((string) ($user['sanction_status'] ?? 'pending')));
            if ($sanctionStatus !== '' && $sanctionStatus !== 'clear') {
                return [
                    'status' => 403,
                    'payload' => [
                        'status' => 403,
                        'message' => $sanctionStatus === 'hit'
                            ? 'Your profile is blocked by sanction screening. Please contact support.'
                            : 'Your profile is under compliance review. Transfers are temporarily unavailable.',
                        'sanction_status' => $user['sanction_status'] ?? 'pending',
                        'support_email' => $this->supportEmail($settings),
                    ],
                ];
            }
        }

        return null;
    }

    private function isTrustWalletMode(string $paymentMode): bool
    {
        $modeKey = strtolower(trim($paymentMode));
        if ($modeKey === '') {
            $modeKey = 'trust_wallet';
        }

        return str_contains($modeKey, 'wallet');
    }

    private function nextMobileTransferCode(): string
    {
        $model = new \App\Models\TransferModel();
        $prefix = 'MOB' . date('ymd');

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $code = sprintf('%s%05d', $prefix, random_int(10000, 99999));
            if (!$model->where('code', $code)->first()) {
                return $code;
            }
        }

        return 'MOB' . strtoupper(substr(bin2hex(random_bytes(6)), 0, 12));
    }

    private function isPayoutEnabledCurrency(string $currencyCode): bool
    {
        $countryModel = new \App\Models\CountryModel();
        return $countryModel->isPayoutEnabledCurrency($currencyCode);
    }

    private function enrichMobileTransfers(array $rows): array
    {
        $beneficiaryIds = [];
        foreach ($rows as $row) {
            $beneficiaryId = (int) ($row['beneficiary_id'] ?? 0);
            if ($beneficiaryId > 0) {
                $beneficiaryIds[] = $beneficiaryId;
            }
        }

        $beneficiaryMap = [];
        if (!empty($beneficiaryIds)) {
            $beneficiaryModel = new \App\Models\BeneficiaryModel();
            $beneficiaries = $beneficiaryModel
                ->whereIn('id', array_values(array_unique($beneficiaryIds)))
                ->findAll();

            foreach ($beneficiaries as $beneficiary) {
                $beneficiaryMap[(int) ($beneficiary['id'] ?? 0)] = $beneficiary;
            }
        }

        return array_map(function (array $row) use ($beneficiaryMap): array {
            $meta = [];
            if (!empty($row['meta_json'])) {
                $decoded = json_decode((string) $row['meta_json'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $meta = $decoded;
                }
            }

            $beneficiary = $beneficiaryMap[(int) ($row['beneficiary_id'] ?? 0)] ?? null;
            $row['transfer_meta'] = $meta;
            $row['payout_currency'] = $meta['payout_currency'] ?? $meta['destination_currency'] ?? null;
            $row['source_currency'] = $meta['source_currency'] ?? 'GBP';
            $row['payment_reference'] = $meta['payment_reference'] ?? $meta['transaction_id'] ?? null;
            $row['wallet_tx_hash'] = $meta['wallet_tx_hash'] ?? null;
            $row['beneficiary_name'] = $beneficiary['name'] ?? ($meta['beneficiary_name'] ?? null);
            $row['beneficiary_bank_name'] = $beneficiary['bank_name'] ?? ($meta['beneficiary_bank_name'] ?? null);
            $row['beneficiary_account_number'] = $beneficiary['account_number'] ?? ($meta['beneficiary_account_number'] ?? null);
            $row['beneficiary_mobile_number'] = $beneficiary['mobile_number'] ?? ($meta['beneficiary_mobile_number'] ?? null);
            $row['status_history'] = is_array($meta['wallet_status_history'] ?? null) ? $meta['wallet_status_history'] : [];
            unset($row['meta_json']);

            return $row;
        }, $rows);
    }

    private function veriffHeaders(string $apiKey, string $hmacSecret, string $body = ''): array
    {
        return $this->veriffService()->veriffHeaders($apiKey, $hmacSecret, $body);
    }

    private function pathValue(array $data, array $paths, $fallback = null)
    {
        return $this->veriffService()->pathValue($data, $paths, $fallback);
    }

    private function applyVeriffResult(array $remitter, array $payload, string $source): array
    {
        return $this->veriffService()->applyVeriffResult($remitter, $payload, $source);
    }

    private function evaluateSanctionResult(array $remitter): array
    {
        $name = strtolower(trim((string) ($remitter['name'] ?? $remitter['sender_name'] ?? '')));
        $country = strtolower(trim((string) ($remitter['country'] ?? '')));
        $dob = trim((string) ($remitter['dob'] ?? ''));
        $idNumber = strtolower(trim((string) ($remitter['id_number'] ?? '')));

        $score = 0.0;
        $reasons = [];
        $status = 'clear';

        foreach (['sanction', 'terror', 'fraud', 'blocked', 'blacklist'] as $keyword) {
            if ($name !== '' && str_contains($name, $keyword)) {
                $score += 85;
                $reasons[] = "Name contains risky keyword: {$keyword}";
                $status = 'hit';
                break;
            }
        }

        if ($status !== 'hit') {
            if ($name === '') {
                $score += 30;
                $reasons[] = 'Name missing';
            }
            if ($dob === '') {
                $score += 25;
                $reasons[] = 'Date of birth missing';
            }
            if ($idNumber === '') {
                $score += 20;
                $reasons[] = 'ID number missing';
            }
            if ($country === '') {
                $score += 10;
                $reasons[] = 'Country missing';
            }

            if ($score >= 55) {
                $status = 'review';
            } else {
                $status = 'clear';
            }
        }

        $reasonText = empty($reasons) ? 'No sanctions risk indicators found.' : implode('; ', $reasons);
        $amlResult = $status === 'clear' ? 'PASS' : ($status === 'review' ? 'REVIEW' : 'HIT');
        $isVerified = $status === 'clear' ? 'yes' : 'no';

        return [
            'sanction_status' => $status,
            'sanction_score' => $score,
            'sanction_reason' => $reasonText,
            'sanction_checked_at' => date('Y-m-d H:i:s'),
            'sanction_reference' => 'AUTO-' . date('YmdHis'),
            'sanction_raw_payload' => json_encode([
                'engine' => 'internal-rule-engine',
                'name' => $remitter['name'] ?? null,
                'country' => $remitter['country'] ?? null,
                'dob' => $remitter['dob'] ?? null,
                'score' => $score,
                'status' => $status,
                'reasons' => $reasons,
            ], JSON_UNESCAPED_SLASHES),
            'sanction_list_verified' => $isVerified,
            'sender_aml_result' => $amlResult,
        ];
    }

    public function login()
    {
        $identifier = trim((string) ($this->requestInput('email', $this->requestInput('username', ''))));
        $password = $this->requestInput('password');

        if (!$identifier || !$password) {
            return $this->fail('Email or username and password are required', 400);
        }

        $model = new \App\Models\UserModel();
        $user = $model
            ->groupStart()
                ->where('email', $identifier)
                ->orWhere('username', $identifier)
            ->groupEnd()
            ->first();

        if (!$user) {
            return $this->fail('Invalid login credentials', 401);
        }

        // Verify Status
        if ($user['status'] !== 'active') {
            return $this->fail('Account is not active', 401);
        }

        // Verify Password
        // Note: For existing dummy users with plain text passwords, this check might fail if not hashed.
        // We updated the model to hash on insert/update. 
        // We should assume passwords in DB are hashed. 
        // If you are testing with old data, you might need to re-save them.
        if (!password_verify($password, $user['password'])) {
            // Fallback for plain text passwords (ONLY FOR DEV/MIGRATION PURPOSES)
            if ($password === $user['password']) {
                // Migrate to hash? Not safely possible here without update.
                // let's just proceed but warns.
            } else {
                return $this->fail('Invalid password', 401);
            }
        }

        // don't return password
        unset($user['password']);
        if (!empty($user['profile_photo'])) {
            helper('url');
            $user['profile_photo_url'] = base_url((string) $user['profile_photo']);
        }

        // Log sign-in
        try {
            $logModel = new \App\Models\UserLogModel();
            $ip = $this->resolveClientIp();
            $country = $this->resolveCountry($ip);
            $logModel->insert([
                'user_id' => $user['id'] ?? null,
                'username' => $user['username'] ?? $user['email'] ?? null,
                'transfers_impact' => 0,
                'transfers_approve_impact' => 0,
                'log_country' => $country,
                'log_ip' => $ip,
                'sign_in' => date('Y-m-d H:i:s'),
                'sign_off' => null,
                'sign_off_note' => null
            ]);
        } catch (\Throwable $e) {
            // fail silently to not block login
        }

        return $this->respond([
            'status' => 200,
            'message' => 'Login successful',
            'user' => $user
        ]);
    }

    public function registerApp()
    {
        $name = trim((string) ($this->requestInput('name', $this->requestInput('fullname', ''))));
        $email = trim((string) ($this->request->getPost('email') ?? $this->request->getVar('email') ?? $this->request->getGet('email')));
        $phone = $this->normalizePhone((string) ($this->requestInput('phone', $this->requestInput('mobile', ''))));
        $dateOfBirth = trim((string) ($this->requestInput('date_of_birth', $this->requestInput('dob', ''))));
        $password = (string) $this->requestInput('password');
        $confirmPassword = (string) ($this->requestInput('confirm_password', $this->requestInput('password_confirmation', '')));
        $mobileVerified = filter_var($this->requestInput('mobile_verified', false), FILTER_VALIDATE_BOOLEAN);
        $settings = $this->getMobileAppSettings();
        $access = $this->resolveAccessDecision($settings);

        if (!$access['allowed']) {
            return $this->respond([
                'status' => 403,
                'message' => $access['message'] ?? 'Access is restricted from your current location.',
                'access_blocked' => true,
                'access_country' => $access['country'],
                'access_country_code' => $access['country_code'],
                'support_email' => $this->supportEmail($settings),
            ], 403);
        }

        $validationData = [
            'name' => $name,
            'email' => $email,
            'date_of_birth' => $dateOfBirth,
            'password' => $password,
            'confirm_password' => $confirmPassword,
        ];

        $rules = [
            'name' => 'required',
            'email' => 'required|valid_email|is_unique[remitters.email]',
            'date_of_birth' => 'required|valid_date',
            'password' => 'required|min_length[8]',
            'confirm_password' => 'required|matches[password]'
        ];

        if (!$this->validateData($validationData, $rules)) {
            return $this->fail($this->validator->getErrors());
        }
        $requireEmailOtp = ($settings['require_email_otp'] ?? 'yes') === 'yes';
        $requireMobileOtp = ($settings['require_mobile_otp'] ?? 'no') === 'yes';
        $sanctionEnabled = ($settings['enable_sanction_screening'] ?? 'yes') === 'yes';
        $accountNeedsActivation = $requireEmailOtp || ($requireMobileOtp && !$mobileVerified);

        if ($phone === '') {
            return $this->fail(['phone' => 'Mobile number is required.'], 400);
        }

            if (!$this->isAllowedSignupPhone($phone)) {
            return $this->fail(['phone' => 'Only United Kingdom (+44) and Sri Lanka (+94) mobile numbers can sign up for testing.'], 400);
        }

        $otp = rand(100000, 999999);

        // Optional: Hash the OTP before storing if you want extra security, 
        // but for simple verification storing plain text is often acceptable for short expiry.
        // For this task we'll store it directly in verification_token column.

        $data = [
            'name' => $name,
            'email' => $email,
            'phone' => $phone !== '' ? $phone : null,
            'dob' => $dateOfBirth,
            'password' => $password,
            'registration_source' => 'mobile_app',
            'status' => $accountNeedsActivation ? 'inactive' : 'active',
            'kyc_status' => 'pending',
            'verification_token' => $requireEmailOtp ? (string) $otp : null,
            'email_verified_at' => $requireEmailOtp ? null : date('Y-m-d H:i:s'),
            'mobile_verified_at' => ($mobileVerified || !$requireMobileOtp) ? date('Y-m-d H:i:s') : null,
            'password_changed_at' => date('Y-m-d H:i:s'),
            'sanction_status' => $sanctionEnabled ? 'pending' : 'clear',
        ];

        $model = new \App\Models\RemitterModel();

        if ($model->insert($data)) {
            $emailSent = false;
            $message = 'User registered successfully.';
            if ($requireEmailOtp) {
                try {
                    $emailService = new EmailService();
                    $emailSent = $emailService->sendOtpEmail($data['email'], $otp);
                } catch (\Throwable $e) {
                    log_message('error', 'OTP email service error: ' . $e->getMessage());
                    $emailSent = false;
                }

                if ($emailSent) {
                    $message .= ' Please check your email for the OTP.';
                } else {
                    $message .= ' Failed to send OTP.';
                }
            } else {
                $message .= ' Email verification is currently disabled.';
            }

            $response = [
                'status' => 201,
                'message' => $message,
                'requires_email_otp' => $requireEmailOtp,
                'requires_mobile_otp' => $requireMobileOtp,
            ];

            if (
                $requireEmailOtp
                && !$emailSent
                && (ENVIRONMENT !== 'production' || trim((string) getenv('SMTP_USER')) === '')
            ) {
                $response['otp_debug'] = (string) $otp;
            }

            return $this->respondCreated($response);
        }

        return $this->failServerError('Registration failed');
    }

    public function mobileConfig()
    {
        $settings = $this->getMobileAppSettings();
        $access = $this->resolveAccessDecision($settings);

        $enableLiveness = ($settings['enable_liveness_check'] ?? 'yes') === 'yes';
        $provider = strtolower((string) ($settings['liveness_provider'] ?? 'veriff'));
        $veriffConfigured = !empty($settings['veriff_api_key']) && !empty($settings['veriff_hmac_secret']);
        $relationshipModel = new \App\Models\RelationshipModel();
        $purposeModel = new \App\Models\PurposeModel();
        $relationshipOptions = $relationshipModel
            ->where('active', 'yes')
            ->orderBy('name', 'ASC')
            ->findColumn('name');
        $purposeOptions = $purposeModel
            ->where('active', 'yes')
            ->orderBy('name', 'ASC')
            ->findColumn('name');

        return $this->respond([
            'status' => 200,
            'data' => [
                'require_email_otp' => ($settings['require_email_otp'] ?? 'yes') === 'yes',
                'require_mobile_otp' => ($settings['require_mobile_otp'] ?? 'no') === 'yes',
                'enable_liveness_check' => $enableLiveness,
                'enable_sanction_screening' => ($settings['enable_sanction_screening'] ?? 'no') === 'yes',
                'lock_profile_after_verification' => ($settings['lock_profile_after_verification'] ?? 'yes') === 'yes',
                'allow_profile_edit_after_lock' => ($settings['allow_profile_edit_after_lock'] ?? 'no') === 'yes',
                'enable_google_sign_in' => ($settings['enable_google_sign_in'] ?? 'yes') === 'yes',
                'enable_apple_sign_in' => ($settings['enable_apple_sign_in'] ?? 'yes') === 'yes',
                'enable_in_app_ads' => ($settings['enable_in_app_ads'] ?? 'no') === 'yes',
                'enable_push_notifications' => ($settings['enable_push_notifications'] ?? 'yes') === 'yes',
                'enable_email_notifications' => ($settings['enable_email_notifications'] ?? 'yes') === 'yes',
                'enable_secure_message' => ($settings['enable_secure_message'] ?? 'yes') === 'yes',
                'send_exchange_rate_push' => ($settings['send_exchange_rate_push'] ?? 'no') === 'yes',
                'restrict_blacklisted_countries' => ($settings['restrict_blacklisted_countries'] ?? 'no') === 'yes',
                'require_new_device_verification' => ($settings['require_new_device_verification'] ?? 'no') === 'yes',
                'password_rotation_days' => $this->passwordRotationDays($settings),
                'support_email' => trim((string) ($settings['support_email'] ?? '')),
                'trust_wallet_label' => trim((string) ($settings['trust_wallet_label'] ?? 'LinkForex Trust Wallet')),
                'trust_wallet_network' => trim((string) ($settings['trust_wallet_network'] ?? '')),
                'trust_wallet_address' => trim((string) ($settings['trust_wallet_address'] ?? '')),
                'trust_wallet_instructions' => trim((string) ($settings['trust_wallet_instructions'] ?? '')),
                'trust_wallet_enabled' => trim((string) ($settings['trust_wallet_address'] ?? '')) !== '',
                'liveness_provider' => in_array($provider, ['none', 'veriff'], true) ? $provider : 'veriff',
                'veriff_configured' => $veriffConfigured,
                'liveness_enabled' => $enableLiveness && $provider === 'veriff' && $veriffConfigured,
                'blacklisted_countries' => $this->parseListSetting((string) ($settings['blacklisted_countries'] ?? '')),
                'relationship_options' => $relationshipOptions ?? [],
                'purpose_options' => $purposeOptions ?? [],
                'id_type_options' => $this->mobileIdTypeOptions(),
                'access_allowed' => $access['allowed'],
                'access_message' => $access['message'],
                'access_country' => $access['country'],
                'access_country_code' => $access['country_code'],
                'onboarding_ads' => $this->getActiveMobileAds('onboarding'),
                'home_carousel_ads' => $this->getActiveMobileAds('home_carousel'),
            ],
        ]);
    }

    public function mobileExchangeRates()
    {
        $model = new \App\Models\MobileExchangeRateModel();
        $model->syncPayoutEnabledRows();
        $rows = $model->resolvedRows(true);

        return $this->respond($rows);
    }

    public function startTrustPaymentsSession()
    {
        $email = trim((string) $this->requestInput('email'));
        $amount = (float) $this->requestInput('amount', 0);
        $currency = strtoupper(trim((string) $this->requestInput('currency', 'GBP')));
        $reference = trim((string) $this->requestInput('reference', ''));
        $transferId = (int) $this->requestInput('transfer_id', 0);

        if ($email === '' || $amount <= 0) {
            return $this->fail([
                'email' => 'Email is required.',
                'amount' => 'Amount must be greater than zero.',
            ], 422);
        }

        if ($currency === '') {
            $currency = 'GBP';
        }

        // Basic safety: only allow GBP for now (matches existing app/backend limits).
        if ($currency !== 'GBP') {
            return $this->fail(['currency' => 'Only GBP is supported for card payments currently.'], 422);
        }

        $siteReference = trim((string) (getenv('TRUST_PAYMENTS_SITE_REFERENCE') ?: ''));
        $siteSecurityPassword = (string) (getenv('TRUST_PAYMENTS_SITE_SECURITY_PASSWORD') ?: '');
        $paymentPagesUrl = trim((string) (getenv('TRUST_PAYMENTS_PAYMENT_PAGES_URL') ?: 'https://payments.securetrading.net/process/payments/details'));
        $successRedirectUrl = trim((string) (getenv('TRUST_PAYMENTS_SUCCESS_REDIRECT_URL') ?: ''));
        $declinedRedirectUrl = trim((string) (getenv('TRUST_PAYMENTS_DECLINED_REDIRECT_URL') ?: ''));
        $successNotifyUrl = trim((string) (getenv('TRUST_PAYMENTS_SUCCESS_NOTIFY_URL') ?: ''));
        $declinedNotifyUrl = trim((string) (getenv('TRUST_PAYMENTS_DECLINED_NOTIFY_URL') ?: ''));

        if ($siteReference === '' || trim($siteSecurityPassword) === '') {
            return $this->respond([
                'status' => 503,
                'message' => 'Card payments are not configured yet. Please contact support.',
                'configured' => false,
            ], 503);
        }

        $mainAmount = number_format((float) $amount, 2, '.', '');
        $ts = gmdate('Y-m-d H:i:s'); // must be UTC

        // Request site security (SHA-256) - prefix with "h" to enforce latest scheme.
        // Default field order: currencyiso3a, mainamount, sitereference, sitesecuritytimestamp, password.
        $hashInput = $currency . $mainAmount . $siteReference . $ts . $siteSecurityPassword;
        $siteSecurity = 'h' . strtolower(hash('sha256', $hashInput));

        $fields = [
            'sitereference' => $siteReference,
            'currencyiso3a' => $currency,
            'mainamount' => $mainAmount,
            'version' => '2',
            'stprofile' => 'default',
            'sitesecuritytimestamp' => $ts,
            'sitesecurity' => $siteSecurity,
        ];

        // Use orderreference for reconciliation (max 25 recommended).
        if ($reference !== '') {
            $fields['orderreference'] = substr($reference, 0, 25);
        } elseif ($transferId > 0) {
            $fields['orderreference'] = substr('LF-' . $transferId, 0, 25);
        }

        // Custom field to reliably map notifications back to our DB row.
        if ($transferId > 0) {
            $fields['transfer_id'] = (string) $transferId;
        }

        // Visa requirements: enforce name/email collection on checkout (still can be prefilled if desired).
        $fields['strequiredfields'] = [
            'billingfirstname',
            'billinglastname',
            'billingemail',
        ];

        // Optional redirects/notifications (require corresponding STR rules).
        // If you want declined redirects, your Trust Payments site must support STR-7.
        $ruleIds = [];
        if ($successRedirectUrl !== '') {
            $ruleIds[] = 'STR-6';
            $fields['successfulurlredirect'] = $successRedirectUrl;
        }
        if ($declinedRedirectUrl !== '') {
            $ruleIds[] = 'STR-7';
            $fields['declinedurlredirect'] = $declinedRedirectUrl;
        }
        if ($successNotifyUrl !== '') {
            $ruleIds[] = 'STR-8';
            $fields['successfulurlnotification'] = $successNotifyUrl;
        }
        if ($declinedNotifyUrl !== '') {
            $ruleIds[] = 'STR-9';
            $fields['declinedurlnotification'] = $declinedNotifyUrl;
        }
        if (!empty($ruleIds)) {
            $fields['ruleidentifier'] = $ruleIds;
        }

        $checkoutHtml = $this->trustPaymentsCheckoutHtml($paymentPagesUrl, $fields);

        return $this->respond([
            'status' => 200,
            'configured' => true,
            'payment_pages_url' => $paymentPagesUrl,
            'fields' => $fields,
            'checkout_html' => $checkoutHtml,
        ]);
    }

    private function trustPaymentsCheckoutHtml(string $actionUrl, array $fields): string
    {
        $safeAction = htmlspecialchars($actionUrl, ENT_QUOTES, 'UTF-8');
        $inputs = '';

        foreach ($fields as $name => $value) {
            $safeName = htmlspecialchars((string) $name, ENT_QUOTES, 'UTF-8');

            if (is_array($value)) {
                foreach ($value as $item) {
                    $safeValue = htmlspecialchars((string) $item, ENT_QUOTES, 'UTF-8');
                    $inputs .= "<input type=\"hidden\" name=\"{$safeName}\" value=\"{$safeValue}\" />\n";
                }
                continue;
            }

            $safeValue = htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
            $inputs .= "<input type=\"hidden\" name=\"{$safeName}\" value=\"{$safeValue}\" />\n";
        }

        // Auto-submit: mobile app can load this HTML into a WebView.
        return "<!doctype html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n<title>Redirecting…</title>\n</head>\n<body onload=\"document.forms[0].submit()\" style=\"font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px;\">\n<p>Redirecting to secure checkout…</p>\n<form method=\"POST\" action=\"{$safeAction}\">\n{$inputs}</form>\n</body>\n</html>";
    }

    // public function verifyEmail()
    // {
    //     $email = $this->request->getVar('email');
    //     $otp = $this->request->getVar('otp');

    //     if (!$email || !$otp) {
    //         return $this->fail('Email and OTP are required', 400);
    //     }

    //     $model = new \App\Models\RemitterModel();
    //     $user = $model->where('email', $email)
    //         ->where('verification_token', $otp)
    //         ->first();

    //     if (!$user) {
    //         return $this->failNotFound('Invalid Email or OTP');
    //     }

    //     $updateData = [
    //         'status' => 'active',
    //         'email_verified_at' => date('Y-m-d H:i:s'),
    //         'verification_token' => null
    //     ];

    //     if ($model->update($user['id'], $updateData)) {
    //         return $this->respond([
    //             'status' => 200,
    //             'message' => 'Email verified successfully. You can now login.'
    //         ]);
    //     }

    //     return $this->failServerError('Verification failed');
    // }


    public function verifyEmail()
    {
        $email = trim((string) $this->requestInput('email'));
        $otp = trim((string) $this->requestInput('otp'));

        if (empty($email) || empty($otp)) {
            return $this->fail('Email and OTP are required', 400);
        }

        $model = new \App\Models\RemitterModel();

        // DEBUG LOG (temporary)
        log_message('debug', "Verify OTP: Email={$email}, OTP={$otp}");

        $user = $model
            ->where('email', $email)
            ->where('verification_token', $otp)
            ->first();

        if (!$user) {
            return $this->failNotFound('Invalid Email or OTP');
        }

        $settings = $this->getMobileAppSettings();
        $requireMobileOtp = ($settings['require_mobile_otp'] ?? 'no') === 'yes';
        $mobileVerified = !empty($user['mobile_verified_at']);
        $needsMobileOtp = $requireMobileOtp && !$mobileVerified;

        $updateData = [
            'status' => $needsMobileOtp ? 'inactive' : 'active',
            'email_verified_at' => date('Y-m-d H:i:s'),
            'verification_token' => null,
        ];

        if ($model->update($user['id'], $updateData)) {
            return $this->respond([
                'status' => 200,
                'message' => $needsMobileOtp
                    ? 'Email verified successfully. Complete mobile OTP verification.'
                    : 'Email verified successfully. You can now login.',
                'requires_mobile_otp' => $needsMobileOtp,
            ]);
        }

        return $this->failServerError('Verification failed');
    }



    public function resendOtp()
    {
        $email = (string) $this->requestInput('email');
        log_message('info', "Resend OTP requested for: $email");

        if (!$email) {
            return $this->fail('Email is required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();

        if (!$user) {
            log_message('error', "Resend OTP: User not found for email: $email");
            return $this->failNotFound('User not found');
        }

        if ($user['status'] === 'active') {
            log_message('info', "Resend OTP: User already verified: $email");
            return $this->fail('Account is already verified', 400);
        }

        $otp = rand(100000, 999999);
        log_message('info', "Resend OTP: Generated OTP for $email");

        // Update user with new OTP
        $updateData = [
            'verification_token' => $otp
        ];

        if ($model->update($user['id'], $updateData)) {
            // Send Verification Email
            $emailSent = false;
            try {
                $emailService = new EmailService();
                $emailSent = $emailService->sendOtpEmail($user['email'], $otp);
            } catch (\Throwable $e) {
                log_message('error', 'Resend OTP email service error: ' . $e->getMessage());
                $emailSent = false;
            }

            if ($emailSent) {
                log_message('info', "Resend OTP: Email sent successfully for $email");
                return $this->respond([
                    'status' => 200,
                    'message' => 'OTP resent successfully. Please check your email.'
                ]);
            } else {
                log_message('error', "Resend OTP: Failed to send email for $email");
                $payload = [
                    'status' => 200,
                    'message' => 'OTP generated but email delivery failed.',
                ];
                if (ENVIRONMENT !== 'production' || trim((string) getenv('SMTP_USER')) === '') {
                    $payload['otp_debug'] = (string) $otp;
                }
                return $this->respond($payload);
            }
        }

        log_message('error', "Resend OTP: DB Update failed for $email. Errors: " . json_encode($model->errors()));
        return $this->failServerError('Failed to update OTP.');
    }

    private function signupMobileOtpCacheKey(string $phone): string
    {
        return 'mobile_signup_otp_' . sha1($phone);
    }

    private function saveSignupMobileOtp(string $phone, string $otp, string $expiresAt): void
    {
        cache()->save($this->signupMobileOtpCacheKey($phone), [
            'phone' => $phone,
            'otp' => $otp,
            'expires_at' => $expiresAt,
        ], 10 * 60);
    }

    private function getSignupMobileOtp(string $phone): ?array
    {
        $cached = cache()->get($this->signupMobileOtpCacheKey($phone));
        return is_array($cached) ? $cached : null;
    }

    private function clearSignupMobileOtp(string $phone): void
    {
        cache()->delete($this->signupMobileOtpCacheKey($phone));
    }

    public function requestMobileOtp()
    {
        $email = trim((string) $this->requestInput('email'));
        $phone = $this->normalizePhone((string) ($this->requestInput('phone', $this->requestInput('mobile', ''))));

        $settings = $this->getMobileAppSettings();
        $requireMobileOtp = ($settings['require_mobile_otp'] ?? 'no') === 'yes';
        if (!$requireMobileOtp) {
            return $this->respond([
                'status' => 200,
                'message' => 'Mobile OTP is disabled by admin settings.',
                'requires_mobile_otp' => false,
            ]);
        }

        $otp = random_int(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', time() + 10 * 60);

        if ($email === '') {
            if ($phone === '') {
                return $this->fail(['phone' => 'Mobile number is required.'], 400);
            }

            if (!$this->isAllowedSignupPhone($phone)) {
                return $this->fail(['phone' => 'Only United Kingdom (+44) and Sri Lanka (+94) mobile numbers can sign up for testing.'], 400);
            }

            $this->saveSignupMobileOtp($phone, (string) $otp, $expiresAt);

            $payload = [
                'status' => 200,
                'message' => 'Mobile OTP generated. Please verify your phone number.',
                'requires_mobile_otp' => true,
                'expires_at' => $expiresAt,
                'signup_phone' => $phone,
            ];

            if (ENVIRONMENT !== 'production') {
                $payload['otp_debug'] = (string) $otp;
            }

            return $this->respond($payload);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();
        if (!$user) {
            return $this->failNotFound('User not found');
        }

        $existingPhone = trim((string) ($user['phone'] ?? ''));
        if ($existingPhone === '' && $phone === '') {
            return $this->fail(['phone' => 'Mobile number is required.'], 400);
        }

        $effectivePhone = $phone !== '' ? $phone : $existingPhone;

        $update = [
            'phone' => $effectivePhone,
            'mobile_otp_code' => (string) $otp,
            'mobile_otp_expires_at' => $expiresAt,
            'mobile_verified_at' => null,
            'status' => 'inactive',
        ];

        if (!$model->update($user['id'], $update)) {
            return $this->fail($model->errors());
        }

        $payload = [
            'status' => 200,
            'message' => 'Mobile OTP generated. Please verify your phone number.',
            'requires_mobile_otp' => true,
            'expires_at' => $expiresAt,
        ];

        // For local/dev until Firebase SMS provider is wired.
        if (ENVIRONMENT !== 'production') {
            $payload['otp_debug'] = (string) $otp;
        }

        return $this->respond($payload);
    }

    public function verifyMobileOtp()
    {
        $email = trim((string) $this->requestInput('email'));
        $phone = $this->normalizePhone((string) ($this->requestInput('phone', $this->requestInput('mobile', ''))));
        $otp = trim((string) $this->requestInput('otp'));

        if ($otp === '' || ($email === '' && $phone === '')) {
            return $this->fail('Email or phone, and OTP are required', 400);
        }

        $settings = $this->getMobileAppSettings();
        $requireMobileOtp = ($settings['require_mobile_otp'] ?? 'no') === 'yes';
        if (!$requireMobileOtp) {
            return $this->respond([
                'status' => 200,
                'message' => 'Mobile OTP is disabled by admin settings.',
                'requires_mobile_otp' => false,
            ]);
        }

        if ($email === '') {
            $cached = $this->getSignupMobileOtp($phone);
            if (!$cached) {
                return $this->failNotFound('OTP request not found.');
            }

            $storedCode = trim((string) ($cached['otp'] ?? ''));
            $expiresAt = trim((string) ($cached['expires_at'] ?? ''));

            if ($storedCode === '' || $storedCode !== $otp) {
                return $this->fail('Invalid OTP', 400);
            }

            if ($expiresAt !== '' && strtotime($expiresAt) !== false && strtotime($expiresAt) < time()) {
                $this->clearSignupMobileOtp($phone);
                return $this->fail('OTP expired. Please request a new code.', 400);
            }

            $this->clearSignupMobileOtp($phone);

            return $this->respond([
                'status' => 200,
                'message' => 'Mobile number verified successfully.',
                'mobile_verified' => true,
                'phone' => $phone,
            ]);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();
        if (!$user) {
            return $this->failNotFound('User not found');
        }

        $storedCode = trim((string) ($user['mobile_otp_code'] ?? ''));
        $expiresAt = trim((string) ($user['mobile_otp_expires_at'] ?? ''));

        if ($storedCode === '' || $storedCode !== $otp) {
            return $this->fail('Invalid OTP', 400);
        }

        if ($expiresAt !== '' && strtotime($expiresAt) !== false && strtotime($expiresAt) < time()) {
            return $this->fail('OTP expired. Please request a new code.', 400);
        }

        $update = [
            'mobile_verified_at' => date('Y-m-d H:i:s'),
            'mobile_otp_code' => null,
            'mobile_otp_expires_at' => null,
            'status' => 'active',
        ];

        if (!$model->update($user['id'], $update)) {
            return $this->fail($model->errors());
        }

        return $this->respond([
            'status' => 200,
            'message' => 'Mobile number verified successfully.',
            'mobile_verified' => true,
        ]);
    }

    public function confirmFirebasePhone()
    {
        $email = trim((string) $this->requestInput('email'));
        $phone = $this->normalizePhone((string) ($this->requestInput('phone', $this->requestInput('mobile', ''))));

        if ($email === '' && $phone === '') {
            return $this->fail('Email or phone number is required', 400);
        }

        if ($email === '') {
            return $this->respond([
                'status' => 200,
                'message' => 'Phone number confirmed.',
                'mobile_verified' => true,
                'phone' => $phone,
            ]);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();
        if (!$user) {
            return $this->failNotFound('User not found');
        }

        $update = [
            'phone' => $phone !== '' ? $phone : ($user['phone'] ?? null),
            'mobile_verified_at' => date('Y-m-d H:i:s'),
            'mobile_otp_code' => null,
            'mobile_otp_expires_at' => null,
            'status' => 'active',
        ];

        if (!$model->update($user['id'], $update)) {
            return $this->fail($model->errors());
        }

        return $this->respond([
            'status' => 200,
            'message' => 'Mobile number confirmed.',
            'mobile_verified' => true,
        ]);
    }

    public function loginApp()
    {
        $identifier = trim((string) ($this->requestInput('identifier', $this->requestInput('email', ''))));
        $password = $this->requestInput('password');
        $deviceId = trim((string) $this->requestInput('device_id'));
        $deviceName = trim((string) $this->requestInput('device_name'));

        $settings = $this->getMobileAppSettings();
        $access = $this->resolveAccessDecision($settings);
        if (!$access['allowed']) {
            return $this->respond([
                'status' => 403,
                'message' => $access['message'] ?? 'Access is restricted from your current location.',
                'access_blocked' => true,
                'access_country' => $access['country'],
                'access_country_code' => $access['country_code'],
                'support_email' => $this->supportEmail($settings),
            ], 403);
        }

        if ($identifier === '' || !$password) {
            return $this->fail('Mobile number or email and password are required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $this->findRemitterByIdentifier($model, $identifier);

        if (!$user) {
            return $this->failNotFound('User not found');
        }

        // Verify Status
        if ($user['status'] !== 'active') {
            return $this->fail('Account is not active', 401);
        }

        // Verify Role - MUST be appuser
        if ($user['registration_source'] !== 'mobile_app') {
            return $this->fail('Unauthorized access. App Users only.', 401);
        }

        $requireMobileOtp = ($settings['require_mobile_otp'] ?? 'no') === 'yes';
        $mobileVerified = !empty($user['mobile_verified_at']);
        if ($requireMobileOtp && !$mobileVerified) {
            return $this->fail('Mobile number is not verified yet.', 401);
        }

        // Verify Password
        if (!password_verify($password, $user['password'])) {
            // Fallback for plain text (dev only)
            if ($password === $user['password']) {
                // allow
            } else {
                return $this->fail('Invalid password', 401);
            }
        }

        if ($this->isPasswordRotationRequired($user, $settings)) {
            return $this->respond([
                'status' => 403,
                'message' => 'Your password has expired. Please update it to continue.',
                'password_change_required' => true,
                'password_rotation_days' => $this->passwordRotationDays($settings),
                'support_email' => $this->supportEmail($settings),
                'email' => $user['email'] ?? null,
            ], 403);
        }

        if ($this->boolSetting($settings, 'require_new_device_verification')) {
            if ($deviceId === '') {
                return $this->respond([
                    'status' => 400,
                    'message' => 'Device verification is enabled, but this device could not be identified.',
                    'device_id_required' => true,
                ], 400);
            }

            $trustedDeviceId = trim((string) ($user['trusted_device_id'] ?? ''));
            if ($trustedDeviceId === '') {
                $model->update((int) $user['id'], [
                    'trusted_device_id' => $deviceId,
                    'device_email_verified_at' => date('Y-m-d H:i:s'),
                    'pending_device_id' => null,
                    'device_verification_code' => null,
                    'device_verification_expires_at' => null,
                ]);
            } elseif ($trustedDeviceId !== $deviceId) {
                $challenge = $this->issueDeviceVerification($user, $deviceId, $settings, $deviceName);
                $response = [
                    'status' => 403,
                    'message' => 'We sent a verification code to your email to confirm this new device.',
                    'requires_device_verification' => true,
                    'email' => $user['email'] ?? null,
                    'device_id' => $deviceId,
                    'device_verification_expires_at' => $challenge['expires_at'],
                    'support_email' => $this->supportEmail($settings),
                ];
                if (
                    !$challenge['email_sent']
                    && (ENVIRONMENT !== 'production' || trim((string) getenv('SMTP_USER')) === '')
                ) {
                    $response['device_verification_code_debug'] = $challenge['code'];
                }

                return $this->respond($response, 403);
            }
        }

        $model->update((int) $user['id'], [
            'last_login' => date('Y-m-d H:i:s'),
        ]);

        if ($deviceId !== '') {
            $this->upsertRemitterDeviceRecord(
                (int) $user['id'],
                $deviceId,
                $deviceName,
                (string) $this->requestInput('platform', ''),
                (string) $this->requestInput('fcm_token', '')
            );
        }
        $user = $model->find((int) $user['id']) ?? $user;

        unset($user['password']);

        return $this->respond([
            'status' => 200,
            'message' => 'App user login successful',
            'user' => $user,
            'password_change_required' => false,
            'profile_complete' => $this->isProfileComplete($user),
        ]);
    }


    public function registerPushToken()
    {
        $identifier = trim((string) ($this->requestInput('identifier', $this->requestInput('email', ''))));
        $deviceId = trim((string) $this->requestInput('device_id'));
        $deviceName = trim((string) $this->requestInput('device_name'));
        $platform = (string) $this->requestInput('platform', 'android');
        $fcmToken = trim((string) $this->requestInput('fcm_token'));

        if ($identifier === '' || $deviceId === '' || $fcmToken === '') {
            return $this->failValidationErrors([
                'identifier' => 'Identifier is required.',
                'device_id' => 'Device ID is required.',
                'fcm_token' => 'FCM token is required.',
            ]);
        }

        $model = new \App\Models\RemitterModel();
        $user = $this->findRemitterByIdentifier($model, $identifier);
        if (!$user) {
            return $this->failNotFound('User not found');
        }

        $this->upsertRemitterDeviceRecord((int) $user['id'], $deviceId, $deviceName, $platform, $fcmToken);

        return $this->respond([
            'status' => 200,
            'message' => 'Push token registered successfully.',
        ]);
    }

    public function removePushToken()
    {
        $identifier = trim((string) ($this->requestInput('identifier', $this->requestInput('email', ''))));
        $deviceId = trim((string) $this->requestInput('device_id'));
        $fcmToken = trim((string) $this->requestInput('fcm_token'));

        if ($identifier === '' || ($deviceId === '' && $fcmToken === '')) {
            return $this->failValidationErrors([
                'identifier' => 'Identifier is required.',
                'device' => 'Device ID or FCM token is required.',
            ]);
        }

        $model = new \App\Models\RemitterModel();
        $user = $this->findRemitterByIdentifier($model, $identifier);
        if (!$user) {
            return $this->respond([
                'status' => 200,
                'message' => 'Push token cleared.',
            ]);
        }

        $deviceModel = new \App\Models\RemitterDeviceModel();
        $query = $deviceModel->where('remitter_id', (int) $user['id']);
        if ($deviceId !== '') {
            $query->where('device_id', $deviceId);
        } elseif ($fcmToken !== '') {
            $query->where('fcm_token', $fcmToken);
        }

        $existing = $query->first();
        if ($existing) {
            $deviceModel->update((int) $existing['id'], [
                'fcm_token' => null,
                'last_seen_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return $this->respond([
            'status' => 200,
            'message' => 'Push token cleared.',
        ]);
    }

    public function getKycStatus()
    {
        $email = trim((string) $this->requestInput('email'));

        if ($email === '') {
            return $this->fail('Email is required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();

        if (!$user) {
            return $this->failNotFound('User not found');
        }

        $settings = $this->getMobileAppSettings();
        $requireMobileOtp = ($settings['require_mobile_otp'] ?? 'no') === 'yes';
        $mobileVerified = !empty($user['mobile_verified_at']);
        $sanctionEnabled = ($settings['enable_sanction_screening'] ?? 'yes') === 'yes';
        $sanctionStatus = (string) ($user['sanction_status'] ?? 'pending');
        $livenessEnabled = (($settings['enable_liveness_check'] ?? 'yes') === 'yes' && ($settings['liveness_provider'] ?? 'veriff') === 'veriff');
        $access = $this->resolveAccessDecision($settings);

        return $this->respond([
            'status' => 200,
            'message' => 'KYC Status retrieved successfully',
            'kyc_status' => $user['kyc_status'] ?? 'pending',
            'email_verified' => !empty($user['email_verified_at']),
            'requires_mobile_otp' => $requireMobileOtp,
            'mobile_verified' => $mobileVerified,
            'liveness_enabled' => $livenessEnabled,
            'sanction_enabled' => $sanctionEnabled,
            'sanction_status' => $sanctionStatus,
            'sanction_checked_at' => $user['sanction_checked_at'] ?? null,
            'veriff_status' => $user['veriff_status'] ?? null,
            'veriff_decision' => $user['veriff_decision'] ?? null,
            'veriff_checked_at' => $user['veriff_checked_at'] ?? null,
            'profile_complete' => $this->isProfileComplete($user),
            'password_change_required' => $this->isPasswordRotationRequired($user, $settings),
            'password_rotation_days' => $this->passwordRotationDays($settings),
            'require_new_device_verification' => $this->boolSetting($settings, 'require_new_device_verification'),
            'has_pending_device_verification' => !empty($user['pending_device_id']) && !empty($user['device_verification_code']),
            'support_email' => $this->supportEmail($settings),
            'access_allowed' => $access['allowed'],
            'access_message' => $access['message'],
        ]);
    }

    public function updateKycStatus()
    {
        $email = trim((string) $this->requestInput('email'));
        $kycStatus = trim((string) $this->requestInput('kyc_status'));

        if (empty($email) || empty($kycStatus)) {
            return $this->fail('Email and KYC status are required', 400);
        }

        $allowedStatuses = ['pending', 'submitted', 'verified', 'rejected'];

        if (!in_array($kycStatus, $allowedStatuses)) {
            return $this->fail([
                'kyc_status' => 'Invalid KYC status'
            ], 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();

        if (!$user) {
            return $this->failNotFound('User not found');
        }

        $updateData = [
            'kyc_status' => $kycStatus,
            'kyc_updated_at' => date('Y-m-d H:i:s')
        ];

        if ($model->update($user['id'], $updateData)) {
            return $this->respond([
                'status' => 200,
                'message' => 'KYC status updated successfully',
                'kyc_status' => $kycStatus
            ]);
        }

        return $this->failServerError('Failed to update KYC status');
    }

    public function screenSanction()
    {
        $email = trim((string) $this->requestInput('email'));
        if ($email === '') {
            return $this->fail('Email is required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();
        if (!$user) {
            return $this->failNotFound('User not found');
        }

        $settings = $this->getMobileAppSettings();
        $sanctionEnabled = ($settings['enable_sanction_screening'] ?? 'yes') === 'yes';

        if (!$sanctionEnabled) {
            $update = [
                'sanction_status' => 'clear',
                'sanction_checked_at' => date('Y-m-d H:i:s'),
                'sanction_reason' => 'Sanction screening disabled by admin settings.',
                'sanction_score' => 0,
                'sanction_reference' => 'DISABLED-' . date('YmdHis'),
                'sanction_raw_payload' => json_encode([
                    'engine' => 'disabled',
                    'status' => 'clear',
                ], JSON_UNESCAPED_SLASHES),
                'sanction_list_verified' => 'yes',
                'sender_aml_result' => 'PASS',
            ];

            $model->update($user['id'], $update);

            return $this->respond([
                'status' => 200,
                'message' => 'Sanction screening is disabled. Marked as clear.',
                'sanction_status' => 'clear',
            ]);
        }

        $screening = $this->evaluateSanctionResult($user);
        if ($screening['sanction_status'] === 'hit') {
            $screening['kyc_status'] = 'rejected';
            $screening['status'] = 'inactive';
        } elseif ($screening['sanction_status'] === 'clear') {
            $screening['kyc_status'] = $user['kyc_status'] === 'verified' ? 'verified' : $user['kyc_status'];
        } else {
            $screening['kyc_status'] = in_array((string) $user['kyc_status'], ['verified', 'rejected'], true)
                ? $user['kyc_status']
                : 'submitted';
        }

        if (!$model->update($user['id'], $screening)) {
            return $this->fail($model->errors());
        }

        $updated = $model->find($user['id']);
        return $this->respond([
            'status' => 200,
            'message' => 'Sanction screening completed.',
            'sanction_status' => $updated['sanction_status'] ?? 'pending',
            'sanction_reason' => $updated['sanction_reason'] ?? null,
            'sanction_score' => $updated['sanction_score'] ?? null,
            'kyc_status' => $updated['kyc_status'] ?? null,
        ]);
    }

    public function getRemitterByEmail()
    {
        $email = $this->requestInput('email');

        if (!$email) {
            return $this->fail('Email is required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();

        if (!$user) {
            return $this->failNotFound('User not found');
        }

        // Hide password hash
        unset($user['password']);
        helper('url');
        if (!empty($user['profile_photo'])) {
            $user['profile_photo_url'] = base_url($user['profile_photo']);
        }

        return $this->respond([
            'status' => 200,
            'message' => 'Remitter details retrieved successfully',
            'data' => $user
        ]);
    }

    public function updateRemitterProfile()
    {
        $email = trim((string) $this->requestInput('email'));
        if ($email === '') {
            return $this->fail('Email is required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();
        if (!$user) {
            return $this->failNotFound('User not found');
        }

        if (($user['registration_source'] ?? '') !== 'mobile_app') {
            return $this->fail('Only mobile app profiles can be updated here.', 400);
        }

        $settings = $this->getMobileAppSettings();
        $lockAfterVerification = ($settings['lock_profile_after_verification'] ?? 'yes') === 'yes';
        $allowEditAfterLock = ($settings['allow_profile_edit_after_lock'] ?? 'no') === 'yes';
        if (
            $lockAfterVerification
            && !$allowEditAfterLock
            && strtolower((string) ($user['kyc_status'] ?? '')) === 'verified'
        ) {
            return $this->fail('Profile is locked after verification.', 403);
        }

        $payload = $this->requestPayload();
        $allowedProfileFields = [
            'name',
            'phone',
            'dob',
            'place_of_birth',
            'occupation',
            'address_1',
            'address_2',
            'city',
            'postcode',
            'county',
            'country',
            'id_type',
            'id_number',
            'id_expiry',
            'other_info',
            'id_copy',
            'other_doc',
            'work_related_docs',
            'company_name',
            'company_type',
            'company_reg_no',
            'company',
            'use_in',
        ];

        $updateData = [];
        foreach ($allowedProfileFields as $field) {
            if (array_key_exists($field, $payload)) {
                $updateData[$field] = $payload[$field];
            }
        }

        if (array_key_exists('date_of_birth', $payload) && !array_key_exists('dob', $updateData)) {
            $updateData['dob'] = $payload['date_of_birth'];
        }
        if (array_key_exists('telephone', $payload) && !array_key_exists('phone', $updateData)) {
            $updateData['phone'] = $payload['telephone'];
        }

        if (empty($updateData)) {
            return $this->fail('No updatable profile fields were provided.', 400);
        }

        if (array_key_exists('name', $updateData)) {
            $name = trim((string) $updateData['name']);
            if ($name === '') {
                return $this->fail(['name' => 'Name cannot be empty.'], 400);
            }
            $updateData['name'] = $name;
            $updateData['sender_name'] = $name;
        }

        if (array_key_exists('dob', $updateData)) {
            $dob = trim((string) $updateData['dob']);
            if ($dob !== '' && strtotime($dob) === false) {
                return $this->fail(['dob' => 'Invalid date of birth.'], 400);
            }
            $updateData['dob'] = $dob === '' ? null : $dob;
        }

        if (array_key_exists('id_expiry', $updateData)) {
            $expiry = trim((string) $updateData['id_expiry']);
            if ($expiry !== '' && strtotime($expiry) === false) {
                return $this->fail(['id_expiry' => 'Invalid ID expiry date.'], 400);
            }
            $updateData['id_expiry'] = $expiry === '' ? null : $expiry;
        }

        $identityFields = ['name', 'dob', 'phone', 'address_1', 'city', 'country', 'id_type', 'id_number', 'id_expiry'];
        $identityChanged = false;
        foreach ($identityFields as $field) {
            if (array_key_exists($field, $updateData)) {
                $identityChanged = true;
                break;
            }
        }

        if ($identityChanged && ($settings['enable_sanction_screening'] ?? 'yes') === 'yes') {
            $updateData['sanction_status'] = 'pending';
            $updateData['sanction_checked_at'] = null;
            $updateData['sanction_reference'] = null;
            $updateData['sanction_reason'] = null;
            $updateData['sanction_score'] = null;
            $updateData['sanction_raw_payload'] = null;
            $updateData['sanction_list_verified'] = 'no';
            $updateData['sender_aml_result'] = null;
            if (($user['kyc_status'] ?? '') === 'verified') {
                $updateData['kyc_status'] = 'submitted';
            }
        }

        $updateData['updated_at'] = date('Y-m-d H:i:s');

        if (!$model->update($user['id'], $updateData)) {
            return $this->fail($model->errors());
        }

        $updated = $model->find($user['id']);
        unset($updated['password'], $updated['verification_token']);

        return $this->respond([
            'status' => 200,
            'message' => 'Profile updated successfully.',
            'data' => $updated,
        ]);
    }

    public function uploadProfilePhoto()
    {
        $email = trim((string) $this->requestInput('email'));
        if ($email === '') {
            return $this->fail('Email is required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();
        if (!$user) {
            return $this->failNotFound('User not found');
        }

        $file = $this->request->getFile('photo') ?? $this->request->getFile('image');
        if (!$file || !$file->isValid()) {
            return $this->fail('Profile photo file is required.', 400);
        }

        $uploadDir = FCPATH . 'uploads/remitters';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $ext = $file->getExtension() ?: 'jpg';
        $name = 'profile_' . ((int) $user['id']) . '_' . time() . '.' . $ext;
        $file->move($uploadDir, $name, true);

        $relativePath = 'uploads/remitters/' . $name;
        $model->update((int) $user['id'], [
            'profile_photo' => $relativePath,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        $updated = $model->find($user['id']);
        unset($updated['password'], $updated['verification_token']);
        helper('url');
        $updated['profile_photo_url'] = base_url($relativePath);

        return $this->respond([
            'status' => 200,
            'message' => 'Profile photo updated successfully.',
            'data' => $updated,
        ]);
    }

    public function listMobileBeneficiaries()
    {
        $email = trim((string) ($this->request->getGet('email') ?? $this->requestInput('email')));
        $resolved = $this->resolveMobileAppUser($email);
        if (!($resolved['ok'] ?? false)) {
            $status = (int) ($resolved['status'] ?? 400);
            if ($status === 404) {
                return $this->failNotFound((string) ($resolved['message'] ?? 'User not found'));
            }
            return $this->fail((string) ($resolved['message'] ?? 'Unable to load beneficiaries'), $status);
        }

        $user = $resolved['user'];
        $model = new \App\Models\BeneficiaryModel();
        $rows = $model
            ->where('customer_id', (int) $user['id'])
            ->orderBy('updated_at', 'DESC')
            ->orderBy('id', 'DESC')
            ->findAll();

        return $this->respond([
            'status' => 200,
            'data' => $rows,
        ]);
    }

    public function createMobileBeneficiary()
    {
        $email = trim((string) $this->requestInput('email'));
        $resolved = $this->resolveMobileAppUser($email);
        if (!($resolved['ok'] ?? false)) {
            $status = (int) ($resolved['status'] ?? 400);
            if ($status === 404) {
                return $this->failNotFound((string) ($resolved['message'] ?? 'User not found'));
            }
            return $this->fail((string) ($resolved['message'] ?? 'Unable to create beneficiary'), $status);
        }

        $user = $resolved['user'];
        $name = trim((string) $this->requestInput('name'));
        $bankName = trim((string) $this->requestInput('bank_name'));
        $accountNumber = trim((string) $this->requestInput('account_number'));
        $country = trim((string) $this->requestInput('country'));
        $address = trim((string) $this->requestInput('address'));
        $city = trim((string) $this->requestInput('city'));
        $dateOfBirth = trim((string) $this->requestInput('date_of_birth'));
        $placeOfBirth = trim((string) $this->requestInput('place_of_birth'));
        $branchName = trim((string) $this->requestInput('branch_name'));
        $paymentMode = trim((string) $this->requestInput('payment_mode'));
        $iban = trim((string) $this->requestInput('iban'));
        $branchCode = trim((string) $this->requestInput('branch_code'));
        $receiverIdType = trim((string) $this->requestInput('receiver_id_type'));
        $receiverIdNumber = trim((string) $this->requestInput('receiver_id_number'));
        $relation = trim((string) $this->requestInput('relation'));
        $mobileNumber = trim((string) $this->requestInput('mobile_number'));

        $payload = [
            'customer_id' => (int) $user['id'],
            'name' => $name,
            'country' => $country !== '' ? $country : null,
            'address' => $address !== '' ? $address : null,
            'city' => $city !== '' ? $city : null,
            'date_of_birth' => $dateOfBirth !== '' ? $dateOfBirth : null,
            'place_of_birth' => $placeOfBirth !== '' ? $placeOfBirth : null,
            'bank_name' => $bankName !== '' ? $bankName : null,
            'branch_name' => $branchName !== '' ? $branchName : null,
            'account_number' => $accountNumber !== '' ? $accountNumber : null,
            'payment_mode' => $paymentMode !== '' ? $paymentMode : null,
            'iban' => $iban !== '' ? $iban : null,
            'branch_code' => $branchCode !== '' ? $branchCode : null,
            'receiver_id_type' => $receiverIdType !== '' ? $receiverIdType : null,
            'receiver_id_number' => $receiverIdNumber !== '' ? $receiverIdNumber : null,
            'relation' => $relation !== '' ? $relation : 'Other',
            'mobile_number' => $mobileNumber !== '' ? $mobileNumber : null,
            'status' => 'active',
        ];

        if (($payload['iban'] ?? null) !== null && ($payload['account_number'] ?? null) === $payload['iban']) {
            $payload['account_number'] = null;
        }

        $errors = $this->validateMobileBeneficiaryData($payload);
        if (!empty($errors)) {
            return $this->fail($errors, 400);
        }

        $model = new \App\Models\BeneficiaryModel();

        if (!$id = $model->insert($payload)) {
            return $this->fail($model->errors());
        }

        $created = $model->find($id) ?? array_merge($payload, ['id' => $id]);
        return $this->respondCreated([
            'status' => 201,
            'message' => 'Beneficiary saved successfully.',
            'data' => $created,
        ]);
    }

    public function updateMobileBeneficiary($id = null)
    {
        $beneficiaryId = (int) $id;
        if ($beneficiaryId <= 0) {
            return $this->failValidationErrors(['beneficiary_id' => 'Invalid beneficiary ID.']);
        }

        $email = trim((string) ($this->requestInput('email') ?? $this->request->getGet('email')));
        $resolved = $this->resolveMobileAppUser($email);
        if (!($resolved['ok'] ?? false)) {
            $status = (int) ($resolved['status'] ?? 400);
            if ($status === 404) {
                return $this->failNotFound((string) ($resolved['message'] ?? 'User not found'));
            }
            return $this->fail((string) ($resolved['message'] ?? 'Unable to update beneficiary'), $status);
        }

        $user = $resolved['user'];
        $model = new \App\Models\BeneficiaryModel();
        $current = $model
            ->where('id', $beneficiaryId)
            ->where('customer_id', (int) $user['id'])
            ->first();

        if (!$current) {
            return $this->failNotFound('Beneficiary not found.');
        }

        $data = $this->request->getJSON(true);
        if (!$data) {
            $data = $this->request->getRawInput() ?? [];
        }

        $allowed = [
            'name',
            'country',
            'address',
            'city',
            'date_of_birth',
            'place_of_birth',
            'bank_name',
            'branch_name',
            'account_number',
            'payment_mode',
            'iban',
            'branch_code',
            'receiver_id_type',
            'receiver_id_number',
            'relation',
            'mobile_number',
            'status',
        ];

        $payload = array_intersect_key($data, array_flip($allowed));
        if (empty($payload)) {
            return $this->failValidationErrors(['payload' => 'No fields to update.']);
        }

        foreach ($payload as $key => $value) {
            if (is_string($value)) {
                $payload[$key] = trim($value);
                if ($payload[$key] === '') {
                    $payload[$key] = null;
                }
            }
        }

        if (
            array_key_exists('iban', $payload)
            && !empty($payload['iban'])
            && (($payload['account_number'] ?? ($current['account_number'] ?? null)) === $payload['iban'])
        ) {
            $payload['account_number'] = null;
        }

        if (isset($payload['status'])) {
            $statusValue = strtolower((string) ($payload['status'] ?? ''));
            if (!in_array($statusValue, ['active', 'inactive'], true)) {
                return $this->failValidationErrors(['status' => 'Status must be active or inactive.']);
            }
            $payload['status'] = $statusValue;
        }

        $paymentMode = (string) ($payload['payment_mode'] ?? ($current['payment_mode'] ?? ''));
        $modeKey = strtolower($paymentMode);
        $isCashPickup = $modeKey !== '' && (str_contains($modeKey, 'cash') || str_contains($modeKey, 'pickup'));
        $receiverIdType = (string) ($payload['receiver_id_type'] ?? ($current['receiver_id_type'] ?? ''));
        $receiverIdNumber = (string) ($payload['receiver_id_number'] ?? ($current['receiver_id_number'] ?? ''));

        $merged = array_merge($current, $payload, [
            'payment_mode' => $paymentMode,
            'receiver_id_type' => $receiverIdType,
            'receiver_id_number' => $receiverIdNumber,
        ]);

        $errors = $this->validateMobileBeneficiaryData($merged);
        if (!empty($errors)) {
            return $this->failValidationErrors($errors);
        }

        if (!$model->update($beneficiaryId, $payload)) {
            return $this->fail($model->errors());
        }

        $updated = $model->find($beneficiaryId) ?? array_merge($current, $payload);
        return $this->respond([
            'status' => 200,
            'message' => 'Beneficiary updated successfully.',
            'data' => $updated,
        ]);
    }

    public function deleteMobileBeneficiary($id = null)
    {
        $beneficiaryId = (int) $id;
        if ($beneficiaryId <= 0) {
            return $this->failValidationErrors(['beneficiary_id' => 'Invalid beneficiary ID.']);
        }

        $email = trim((string) ($this->requestInput('email') ?? $this->request->getGet('email')));
        $resolved = $this->resolveMobileAppUser($email);
        if (!($resolved['ok'] ?? false)) {
            $status = (int) ($resolved['status'] ?? 400);
            if ($status === 404) {
                return $this->failNotFound((string) ($resolved['message'] ?? 'User not found'));
            }
            return $this->fail((string) ($resolved['message'] ?? 'Unable to delete beneficiary'), $status);
        }

        $user = $resolved['user'];
        $model = new \App\Models\BeneficiaryModel();
        $current = $model
            ->where('id', $beneficiaryId)
            ->where('customer_id', (int) $user['id'])
            ->first();

        if (!$current) {
            return $this->failNotFound('Beneficiary not found.');
        }

        if (!$model->delete($beneficiaryId)) {
            return $this->fail('Failed to delete beneficiary.');
        }

        return $this->respondDeleted([
            'status' => 200,
            'message' => 'Beneficiary deleted successfully.',
            'data' => ['id' => $beneficiaryId],
        ]);
    }

    public function setMobileBeneficiaryStatus($id = null)
    {
        $beneficiaryId = (int) $id;
        if ($beneficiaryId <= 0) {
            return $this->failValidationErrors(['beneficiary_id' => 'Invalid beneficiary ID.']);
        }

        $email = trim((string) ($this->requestInput('email') ?? $this->request->getGet('email')));
        $resolved = $this->resolveMobileAppUser($email);
        if (!($resolved['ok'] ?? false)) {
            $status = (int) ($resolved['status'] ?? 400);
            if ($status === 404) {
                return $this->failNotFound((string) ($resolved['message'] ?? 'User not found'));
            }
            return $this->fail((string) ($resolved['message'] ?? 'Unable to update beneficiary status'), $status);
        }

        $user = $resolved['user'];
        $statusValue = strtolower(trim((string) $this->requestInput('status')));
        if (!in_array($statusValue, ['active', 'inactive'], true)) {
            return $this->failValidationErrors(['status' => 'Status must be active or inactive.']);
        }

        $model = new \App\Models\BeneficiaryModel();
        $current = $model
            ->where('id', $beneficiaryId)
            ->where('customer_id', (int) $user['id'])
            ->first();

        if (!$current) {
            return $this->failNotFound('Beneficiary not found.');
        }

        if (!$model->update($beneficiaryId, ['status' => $statusValue])) {
            return $this->fail($model->errors());
        }

        $updated = $model->find($beneficiaryId) ?? array_merge($current, ['status' => $statusValue]);
        return $this->respond([
            'status' => 200,
            'message' => 'Beneficiary status updated.',
            'data' => $updated,
        ]);
    }

    public function listMobileTransfers()
    {
        $email = trim((string) ($this->request->getGet('email') ?? $this->requestInput('email')));
        $resolved = $this->resolveMobileAppUser($email);
        if (!($resolved['ok'] ?? false)) {
            $status = (int) ($resolved['status'] ?? 400);
            if ($status === 404) {
                return $this->failNotFound((string) ($resolved['message'] ?? 'User not found'));
            }
            return $this->fail((string) ($resolved['message'] ?? 'Unable to load transfers'), $status);
        }

        $user = $resolved['user'];
        $settings = $this->getMobileAppSettings();
        $accessIssue = $this->mobileTransferAccessIssue($user, $settings);
        if ($accessIssue) {
            return $this->respond($accessIssue['payload'], (int) $accessIssue['status']);
        }

        $limit = (int) ($this->request->getGet('limit') ?? 50);
        if ($limit <= 0) {
            $limit = 50;
        }
        $limit = min($limit, 100);

        $statusFilter = strtolower(trim((string) ($this->request->getGet('status') ?? '')));
        $typeFilter = strtolower(trim((string) ($this->request->getGet('type') ?? 'mobile_app')));
        if ($typeFilter === '') {
            $typeFilter = 'mobile_app';
        }

        $model = new \App\Models\TransferModel();
        $model->where('remitter_id', (int) $user['id']);
        if ($typeFilter !== 'all') {
            $model->where('type', $typeFilter);
        }
        if ($statusFilter !== '') {
            $model->where('status', $statusFilter);
        }

        $rows = $model
            ->orderBy('created_at', 'DESC')
            ->orderBy('id', 'DESC')
            ->findAll($limit);

        return $this->respond([
            'status' => 200,
            'data' => $this->enrichMobileTransfers($rows),
        ]);
    }

    private function getTransactionLimit(string $channel, string $period, string $currency = 'GBP'): float
    {
        $channel = strtolower(trim($channel)) === 'app' ? 'app' : 'backend';
        $period = strtolower(trim($period)) === 'year' ? 'year' : 'month';
        $currency = strtoupper(trim($currency));
        if ($currency === '') {
            $currency = 'GBP';
        }

        $model = new \App\Models\TransactionSettingModel();
        $row = $model
            ->where('channel', $channel)
            ->where('period', $period)
            ->where('currency', $currency)
            ->where('active', 'yes')
            ->first();

        if (!$row) {
            return 0.0;
        }

        return (float) ($row['limit_amount'] ?? 0);
    }

    private function sumTransferAmountsForPeriod(int $remitterId, int $startTimestamp, ?string $typeFilter = null): float
    {
        if ($remitterId <= 0) {
            return 0.0;
        }

        $start = date('Y-m-d H:i:s', $startTimestamp);
        $builder = (new \App\Models\TransferModel())
            ->where('remitter_id', $remitterId)
            ->where('created_at >=', $start)
            ->whereNotIn('status', ['cancelled', 'rejected']);

        if ($typeFilter !== null) {
            $builder->where('type', $typeFilter);
        }

        $row = $builder->selectSum('source_amount', 'total')->first();
        $total = is_array($row) ? ($row['total'] ?? 0) : 0;
        return (float) $total;
    }

    private function enforceTransactionLimitsOrFail(string $channel, int $remitterId, float $nextAmount, ?string $typeFilter = null)
    {
        $nextAmount = round(max(0, $nextAmount), 2);
        if ($nextAmount <= 0) {
            return null;
        }

        $monthLimit = $this->getTransactionLimit($channel, 'month', 'GBP');
        $yearLimit = $this->getTransactionLimit($channel, 'year', 'GBP');

        if ($monthLimit <= 0 && $yearLimit <= 0) {
            return null;
        }

        $now = time();
        $monthStart = strtotime(date('Y-m-01 00:00:00', $now));
        $yearStart = strtotime(date('Y-01-01 00:00:00', $now));

        $usedMonth = $this->sumTransferAmountsForPeriod($remitterId, $monthStart, $typeFilter);
        $usedYear = $this->sumTransferAmountsForPeriod($remitterId, $yearStart, $typeFilter);

        if ($monthLimit > 0 && ($usedMonth + $nextAmount) > $monthLimit) {
            return [
                'status' => 422,
                'error' => 'limit_exceeded',
                'period' => 'month',
                'limit' => (float) $monthLimit,
                'used' => (float) $usedMonth,
                'remaining' => max(0, (float) $monthLimit - (float) $usedMonth),
                'message' => sprintf(
                    'Monthly limit reached (GBP). Limit: £%0.2f, Used: £%0.2f, Remaining: £%0.2f.',
                    $monthLimit,
                    $usedMonth,
                    max(0, $monthLimit - $usedMonth)
                ),
            ];
        }

        if ($yearLimit > 0 && ($usedYear + $nextAmount) > $yearLimit) {
            return [
                'status' => 422,
                'error' => 'limit_exceeded',
                'period' => 'year',
                'limit' => (float) $yearLimit,
                'used' => (float) $usedYear,
                'remaining' => max(0, (float) $yearLimit - (float) $usedYear),
                'message' => sprintf(
                    'Yearly limit reached (GBP). Limit: £%0.2f, Used: £%0.2f, Remaining: £%0.2f.',
                    $yearLimit,
                    $usedYear,
                    max(0, $yearLimit - $usedYear)
                ),
            ];
        }

        return null;
    }

    public function submitMobileTransferFunding($id = null)
    {
        $email = trim((string) $this->requestInput('email'));
        $resolved = $this->resolveMobileAppUser($email);
        if (!($resolved['ok'] ?? false)) {
            $status = (int) ($resolved['status'] ?? 400);
            if ($status === 404) {
                return $this->failNotFound((string) ($resolved['message'] ?? 'User not found'));
            }
            return $this->fail((string) ($resolved['message'] ?? 'Unable to update transfer'), $status);
        }

        $user = $resolved['user'];
        $settings = $this->getMobileAppSettings();
        $accessIssue = $this->mobileTransferAccessIssue($user, $settings);
        if ($accessIssue) {
            return $this->respond($accessIssue['payload'], (int) $accessIssue['status']);
        }

        $transferId = (int) $id;
        if ($transferId <= 0) {
            return $this->fail('Invalid transfer id.', 400);
        }

        $walletTxHash = trim((string) $this->requestInput('wallet_tx_hash'));
        $paymentReference = trim((string) $this->requestInput('payment_reference'));

        if ($walletTxHash === '' && $paymentReference === '') {
            return $this->fail([
                'wallet_tx_hash' => 'Wallet transaction hash or payment reference is required.',
            ], 422);
        }

        $model = new \App\Models\TransferModel();
        $transfer = $model
            ->where('id', $transferId)
            ->where('remitter_id', (int) ($user['id'] ?? 0))
            ->where('type', 'mobile_app')
            ->first();

        if (!$transfer) {
            return $this->failNotFound('Transfer not found.');
        }

        $paymentModeKey = strtolower(trim((string) ($transfer['payment_mode'] ?? '')));
        if ($this->isTrustWalletMode($paymentModeKey) && trim((string) ($settings['trust_wallet_address'] ?? '')) === '') {
            return $this->respond([
                'status' => 503,
                'message' => 'Wallet funding is not configured yet. Please contact support.',
                'support_email' => $this->supportEmail($settings),
            ], 503);
        }

        $currentStatus = strtolower(trim((string) ($transfer['status'] ?? 'awaiting_funds')));
        if (!in_array($currentStatus, ['awaiting_funds', 'funds_received'], true)) {
            return $this->fail('Transfer cannot be updated in its current state.', 409);
        }

        $meta = [];
        if (!empty($transfer['meta_json'])) {
            $decoded = json_decode((string) $transfer['meta_json'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $meta = $decoded;
            }
        }

        if ($walletTxHash !== '') {
            $meta['wallet_tx_hash'] = $walletTxHash;
        }
        if ($paymentReference !== '') {
            $meta['payment_reference'] = $paymentReference;
            $meta['transaction_id'] = $paymentReference;
        }

        $now = date('Y-m-d H:i:s');
        $history = is_array($meta['wallet_status_history'] ?? null) ? $meta['wallet_status_history'] : [];
        $history[] = [
            'status' => 'funds_received',
            'note' => 'User submitted wallet funding details.',
            'updated_at' => $now,
            'updated_by' => 'mobile_app',
        ];
        $meta['wallet_status_history'] = $history;
        $meta['wallet_received_at'] = $meta['wallet_received_at'] ?? $now;

        $update = [
            'status' => 'funds_received',
            'meta_json' => json_encode($meta, JSON_UNESCAPED_UNICODE),
        ];

        if (!$model->update($transferId, $update)) {
            return $this->fail($model->errors());
        }

        $updated = $model->find($transferId) ?? array_merge($transfer, $update);
        $enriched = $this->enrichMobileTransfers([$updated]);

        return $this->respond([
            'status' => 200,
            'message' => 'Funding details submitted.',
            'data' => $enriched[0] ?? $updated,
        ]);
    }

    public function createMobileTransfer()
    {
        $email = trim((string) $this->requestInput('email'));
        $resolved = $this->resolveMobileAppUser($email);
        if (!($resolved['ok'] ?? false)) {
            $status = (int) ($resolved['status'] ?? 400);
            if ($status === 404) {
                return $this->failNotFound((string) ($resolved['message'] ?? 'User not found'));
            }
            return $this->fail((string) ($resolved['message'] ?? 'Unable to create transfer'), $status);
        }

        $user = $resolved['user'];
        $settings = $this->getMobileAppSettings();
        $accessIssue = $this->mobileTransferAccessIssue($user, $settings);
        if ($accessIssue) {
            return $this->respond($accessIssue['payload'], (int) $accessIssue['status']);
        }

        $beneficiaryId = (int) $this->requestInput('beneficiary_id');
        $sourceAmount = (float) $this->requestInput('source_amount', 0);
        $rate = (float) $this->requestInput('rate', 0);
        $destAmount = (float) $this->requestInput('dest_amount', 0);
        $payoutCurrency = strtoupper(trim((string) $this->requestInput('payout_currency', '')));
        $purpose = trim((string) $this->requestInput('purpose', 'Family Support'));
        $sourceCurrency = strtoupper(trim((string) $this->requestInput('source_currency', 'GBP')));
        $paymentMode = trim((string) $this->requestInput('payment_mode', 'trust_wallet'));
        $collectionMethod = trim((string) $this->requestInput('collection_method', 'manual_settlement'));

        // Backwards/robustness: if the app sends "card" as a collection method (or similar),
        // treat it as a card payment even if payment_mode is missing/defaulted.
        $collectionKey = strtolower(trim($collectionMethod));
        if ($collectionKey !== '' && str_contains($collectionKey, 'card')) {
            $paymentMode = 'trust_payments';
        }
        $paymentReference = trim((string) $this->requestInput('payment_reference'));
        $walletTxHash = trim((string) $this->requestInput('wallet_tx_hash'));

        $beneficiaryModel = new \App\Models\BeneficiaryModel();
        $beneficiary = $beneficiaryModel
            ->where('id', $beneficiaryId)
            ->where('customer_id', (int) $user['id'])
            ->first();

        $errors = [];
        if ($beneficiaryId <= 0 || !$beneficiary) {
            $errors['beneficiary_id'] = 'Please select a valid beneficiary.';
        }
        if ($sourceAmount <= 0) {
            $errors['source_amount'] = 'Transfer amount must be greater than zero.';
        }
        if ($payoutCurrency === '') {
            $errors['payout_currency'] = 'Payout currency is required.';
        } elseif (!$this->isPayoutEnabledCurrency($payoutCurrency)) {
            $errors['payout_currency'] = 'Selected payout currency is not enabled in Countries.';
        }
        if (!empty($errors)) {
            return $this->fail($errors, 400);
        }

        if ($this->isTrustWalletMode($paymentMode) && trim((string) ($settings['trust_wallet_address'] ?? '')) === '') {
            return $this->respond([
                'status' => 503,
                'message' => 'Wallet funding is not configured yet. Please contact support.',
                'support_email' => $this->supportEmail($settings),
            ], 503);
        }

        $limitIssue = $this->enforceTransactionLimitsOrFail('app', (int) $user['id'], $sourceAmount, 'mobile_app');
        if ($limitIssue) {
            $status = (int) ($limitIssue['status'] ?? 422);
            return $this->respond($limitIssue, $status);
        }

        if ($rate <= 0) {
            $currencyModel = new \App\Models\Currency();
            $currency = $currencyModel
                ->where('code', $payoutCurrency)
                ->orderBy('updated_at', 'DESC')
                ->first();
            $rate = (float) ($currency['rate'] ?? 0);
        }
        if ($rate <= 0) {
            $rate = 1.0;
        }

        if ($destAmount <= 0) {
            $destAmount = round($sourceAmount * $rate, 2);
        }

        $code = $this->nextMobileTransferCode();
        $transferMeta = [
            'channel' => 'mobile_app',
            'source_currency' => $sourceCurrency !== '' ? $sourceCurrency : 'GBP',
            'payout_currency' => $payoutCurrency,
            'payment_reference' => $paymentReference !== '' ? $paymentReference : null,
            'transaction_id' => $paymentReference !== '' ? $paymentReference : $code,
            'wallet_tx_hash' => $walletTxHash !== '' ? $walletTxHash : null,
            'beneficiary_name' => $beneficiary['name'] ?? null,
            'beneficiary_bank_name' => $beneficiary['bank_name'] ?? null,
            'beneficiary_account_number' => $beneficiary['account_number'] ?? null,
            'beneficiary_mobile_number' => $beneficiary['mobile_number'] ?? null,
            'sender_name' => $user['name'] ?? null,
            'sender_phone' => $user['phone'] ?? null,
            'wallet_status_history' => [[
                'status' => 'awaiting_funds',
                'note' => 'Transfer request created from mobile app.',
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => 'mobile_app',
            ]],
        ];

        $model = new \App\Models\TransferModel();
        $payload = [
            'code' => $code,
            'remitter_id' => (int) $user['id'],
            'branch_id' => trim((string) ($user['branch'] ?? '')) !== '' ? trim((string) $user['branch']) : null,
            'created_by' => null,
            'beneficiary_id' => $beneficiaryId,
            'source_amount' => round($sourceAmount, 2),
            'dest_amount' => round($destAmount, 2),
            'rate' => $rate,
            'payment_mode' => $paymentMode !== '' ? $paymentMode : 'trust_wallet',
            'source_of_funds' => 'trust_wallet',
            'purpose' => $purpose !== '' ? $purpose : 'Family Support',
            'status' => 'awaiting_funds',
            'type' => 'mobile_app',
            'collection_method' => $collectionMethod !== '' ? $collectionMethod : 'manual_settlement',
            'meta_json' => json_encode($transferMeta, JSON_UNESCAPED_UNICODE),
        ];

        if (!$id = $model->insert($payload)) {
            return $this->fail($model->errors());
        }

        $created = $model->find($id) ?? array_merge($payload, ['id' => $id]);
        $enriched = $this->enrichMobileTransfers([$created]);

        return $this->respondCreated([
            'status' => 201,
            'message' => 'Transfer created successfully.',
            'data' => $enriched[0] ?? $created,
        ]);
    }

    public function forgotPassword()
    {
        $email = $this->requestInput('email');

        if (!$email) {
            return $this->fail('Email is required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();

        if (!$user) {
            // For security, we might want to return 200 even if user not found, 
            // but for this app's current pattern/UX, failNotFound is acceptable or just generic message.
            // Let's stick to failNotFound for now to match other endpoints.
            return $this->failNotFound('User not found');
        }

        $otp = rand(100000, 999999);

        // Update user with OTP
        // Note: verifyResetOtp will check this token.
        // Ideally we should also store expiry time in DB, but for now we rely on immediate usage.
        $model->update($user['id'], ['verification_token' => $otp]);

        // Send Email
        $emailSent = false;
        try {
            $emailService = new EmailService();
            $emailSent = $emailService->sendResetPasswordOtp($email, $otp);
        } catch (\Throwable $e) {
            log_message('error', 'Reset OTP email service error: ' . $e->getMessage());
            $emailSent = false;
        }

        if ($emailSent) {
            return $this->respond([
                'status' => 200,
                'message' => 'OTP sent to your email.'
            ]);
        } else {
            $payload = [
                'status' => 200,
                'message' => 'OTP generated but email delivery failed.',
            ];
            if (ENVIRONMENT !== 'production' || trim((string) getenv('SMTP_USER')) === '') {
                $payload['otp_debug'] = (string) $otp;
            }
            return $this->respond($payload);
        }
    }

    public function verifyResetOtp()
    {
        $email = $this->requestInput('email');
        $otp = $this->requestInput('otp');

        if (!$email || !$otp) {
            return $this->fail('Email and OTP are required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)
            ->where('verification_token', $otp)
            ->first();

        if ($user) {
            return $this->respond([
                'status' => 200,
                'message' => 'OTP Verified.',
                'userId' => $user['id'] // Optional: return ID or a temp token for next step
            ]);
        } else {
            return $this->fail('Invalid OTP', 400);
        }
    }

    public function resetPassword()
    {
        $email = $this->requestInput('email');
        $otp = $this->requestInput('otp');
        $newPassword = $this->requestInput('password');

        if (!$email || !$otp || !$newPassword) {
            return $this->fail('Email, OTP, and new password are required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)
            ->where('verification_token', $otp)
            ->first();

        if (!$user) {
            return $this->fail('Invalid Email or OTP', 400);
        }

        // Update password
        // RemitterModel handles hashing in beforeUpdate
        $updateData = [
            'password' => $newPassword,
            'verification_token' => null,
            'password_changed_at' => date('Y-m-d H:i:s'),
            'pending_device_id' => null,
            'device_verification_code' => null,
            'device_verification_expires_at' => null,
        ];

        if ($model->update($user['id'], $updateData)) {
            return $this->respond([
                'status' => 200,
                'message' => 'Password reset successfully. You can now login.'
            ]);
        } else {
            return $this->failServerError('Failed to reset password.');
        }
    }

    public function changePassword()
    {
        $email = trim((string) $this->requestInput('email'));
        $currentPassword = (string) $this->requestInput('current_password');
        $newPassword = (string) $this->requestInput('new_password');
        $confirmPassword = (string) $this->requestInput('confirm_password');

        if ($email === '' || $currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
            return $this->fail('Email, current password, and new password fields are required', 400);
        }

        if ($newPassword !== $confirmPassword) {
            return $this->fail(['confirm_password' => 'Passwords do not match.'], 400);
        }

        if (strlen($newPassword) < 8) {
            return $this->fail(['new_password' => 'Password must be at least 8 characters long.'], 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();
        if (!$user) {
            return $this->failNotFound('User not found');
        }

        if (!password_verify($currentPassword, $user['password']) && $currentPassword !== (string) $user['password']) {
            return $this->fail('Current password is incorrect.', 401);
        }

        $updateData = [
            'password' => $newPassword,
            'password_changed_at' => date('Y-m-d H:i:s'),
            'pending_device_id' => null,
            'device_verification_code' => null,
            'device_verification_expires_at' => null,
        ];

        if (!$model->update((int) $user['id'], $updateData)) {
            return $this->fail($model->errors());
        }

        return $this->respond([
            'status' => 200,
            'message' => 'Password updated successfully.',
        ]);
    }

    public function verifyDeviceLogin()
    {
        $email = trim((string) $this->requestInput('email'));
        $password = (string) $this->requestInput('password');
        $deviceId = trim((string) $this->requestInput('device_id'));
        $code = trim((string) $this->requestInput('code'));

        if ($email === '' || $password === '' || $deviceId === '' || $code === '') {
            return $this->fail('Email, password, device ID, and verification code are required', 400);
        }

        $settings = $this->getMobileAppSettings();
        $access = $this->resolveAccessDecision($settings);
        if (!$access['allowed']) {
            return $this->respond([
                'status' => 403,
                'message' => $access['message'] ?? 'Access is restricted from your current location.',
                'access_blocked' => true,
                'support_email' => $this->supportEmail($settings),
            ], 403);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();
        if (!$user) {
            return $this->failNotFound('User not found');
        }

        if (($user['registration_source'] ?? '') !== 'mobile_app') {
            return $this->fail('Unauthorized access. App users only.', 401);
        }

        if (($user['status'] ?? '') !== 'active') {
            return $this->fail('Account is not active', 401);
        }

        if ($this->boolSetting($settings, 'require_mobile_otp') && empty($user['mobile_verified_at'])) {
            return $this->fail('Mobile number is not verified yet.', 401);
        }

        if (!password_verify($password, $user['password']) && $password !== (string) $user['password']) {
            return $this->fail('Invalid password', 401);
        }

        $pendingDeviceId = trim((string) ($user['pending_device_id'] ?? ''));
        $storedCode = trim((string) ($user['device_verification_code'] ?? ''));
        $expiresAt = trim((string) ($user['device_verification_expires_at'] ?? ''));

        if ($pendingDeviceId === '' || $storedCode === '' || $pendingDeviceId !== $deviceId) {
            return $this->fail('No pending verification was found for this device.', 400);
        }

        if ($storedCode !== $code) {
            return $this->fail('Invalid verification code.', 400);
        }

        if ($expiresAt !== '' && strtotime($expiresAt) !== false && strtotime($expiresAt) < time()) {
            return $this->fail('Verification code expired. Please sign in again to request a new code.', 400);
        }

        if ($this->isPasswordRotationRequired($user, $settings)) {
            return $this->respond([
                'status' => 403,
                'message' => 'Your password has expired. Please update it to continue.',
                'password_change_required' => true,
                'password_rotation_days' => $this->passwordRotationDays($settings),
                'support_email' => $this->supportEmail($settings),
                'email' => $user['email'] ?? null,
            ], 403);
        }

        $model->update((int) $user['id'], [
            'trusted_device_id' => $deviceId,
            'pending_device_id' => null,
            'device_verification_code' => null,
            'device_verification_expires_at' => null,
            'device_email_verified_at' => date('Y-m-d H:i:s'),
            'last_login' => date('Y-m-d H:i:s'),
        ]);

        $updated = $model->find((int) $user['id']) ?? $user;
        unset($updated['password']);

        return $this->respond([
            'status' => 200,
            'message' => 'Device verified successfully.',
            'user' => $updated,
            'profile_complete' => $this->isProfileComplete($updated),
        ]);
    }

    public function deleteAccount()
    {
        $email = trim((string) $this->requestInput('email'));
        $password = (string) $this->requestInput('password');
        $reason = trim((string) $this->requestInput('reason'));

        if ($email === '' || $password === '') {
            return $this->fail('Email and password are required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $model->where('email', $email)->first();
        if (!$user) {
            return $this->failNotFound('User not found');
        }

        if (!password_verify($password, $user['password']) && $password !== (string) $user['password']) {
            return $this->fail('Invalid password', 401);
        }

        $update = [
            'status' => 'inactive',
            'delete_requested_at' => date('Y-m-d H:i:s'),
        ];
        if ($reason !== '') {
            $update['other_info'] = trim((string) ($user['other_info'] ?? '')) .
                ($user['other_info'] ? "\n" : '') .
                'Delete request: ' . $reason;
        }

        if (!$model->update((int) $user['id'], $update)) {
            return $this->fail($model->errors());
        }

        return $this->respond([
            'status' => 200,
            'message' => 'Your account deletion request has been recorded and your account is now inactive.',
        ]);
    }

    public function startLiveness()
    {
        $email = trim((string) $this->requestInput('email'));
        if ($email === '') {
            return $this->fail('Email is required', 400);
        }

        $remitterModel = new \App\Models\RemitterModel();
        $remitter = $remitterModel->where('email', $email)->first();
        if (!$remitter) {
            return $this->failNotFound('User not found');
        }

        $settings = $this->getMobileAppSettings();
        $livenessEnabled = ($settings['enable_liveness_check'] ?? 'yes') === 'yes';
        $provider = strtolower((string) ($settings['liveness_provider'] ?? 'veriff'));
        if (!$livenessEnabled || $provider !== 'veriff') {
            return $this->fail('Liveness check is disabled.', 400);
        }

        $requireMobileOtp = ($settings['require_mobile_otp'] ?? 'no') === 'yes';
        if ($requireMobileOtp && empty($remitter['mobile_verified_at'])) {
            return $this->fail('Mobile number must be verified before liveness check.', 400);
        }

        try {
            $session = $this->veriffService()->createSession($remitter, $settings);
        } catch (\RuntimeException $e) {
            $status = (int) $e->getCode();
            if ($status < 400 || $status > 599) {
                $status = 502;
            }
            return $this->fail($e->getMessage(), $status);
        }

        $sessionId = (string) ($session['session_id'] ?? '');
        $sessionUrl = (string) ($session['session_url'] ?? '');
        $sessionStatus = strtolower((string) ($session['session_status'] ?? 'created'));
        $payload = $session['payload'] ?? [];

        $updateData = [
            'veriff_session_id' => $sessionId !== '' ? $sessionId : null,
            'veriff_url' => $sessionUrl !== '' ? $sessionUrl : null,
            'veriff_status' => $sessionStatus,
            'veriff_decision' => null,
            'veriff_code' => null,
            'veriff_reason' => null,
            'veriff_checked_at' => date('Y-m-d H:i:s'),
            'veriff_raw_payload' => json_encode(['source' => 'session', 'payload' => $payload], JSON_UNESCAPED_SLASHES),
            'kyc_status' => 'submitted',
        ];

        $remitterModel->update($remitter['id'], $updateData);

        return $this->respond([
            'status' => 200,
            'message' => 'Liveness session created',
            'session_id' => $sessionId,
            'session_url' => $sessionUrl,
            'session_status' => $sessionStatus,
        ]);
    }

    public function syncLivenessDecision()
    {
        $email = trim((string) $this->requestInput('email'));
        $sessionIdInput = trim((string) $this->requestInput('session_id'));
        if ($email === '') {
            return $this->fail('Email is required', 400);
        }

        $remitterModel = new \App\Models\RemitterModel();
        $remitter = $remitterModel->where('email', $email)->first();
        if (!$remitter) {
            return $this->failNotFound('User not found');
        }

        $sessionId = $sessionIdInput !== '' ? $sessionIdInput : trim((string) ($remitter['veriff_session_id'] ?? ''));
        if ($sessionId === '') {
            return $this->fail('No liveness session found for this user.', 400);
        }

        $settings = $this->getMobileAppSettings();
        try {
            $json = $this->veriffService()->fetchDecision($sessionId, $settings);
        } catch (\RuntimeException $e) {
            $status = (int) $e->getCode();
            if ($status < 400 || $status > 599) {
                $status = 502;
            }
            return $this->fail($e->getMessage(), $status);
        }

        $update = $this->applyVeriffResult($remitter, $json, 'decision_sync');
        $remitterModel->update($remitter['id'], $update);
        $updated = $remitterModel->find($remitter['id']);

        return $this->respond([
            'status' => 200,
            'message' => 'Liveness decision synced.',
            'kyc_status' => $updated['kyc_status'] ?? 'pending',
            'veriff_status' => $updated['veriff_status'] ?? null,
            'veriff_decision' => $updated['veriff_decision'] ?? null,
            'veriff_checked_at' => $updated['veriff_checked_at'] ?? null,
        ]);
    }

    public function veriffWebhook()
    {
        $rawBody = (string) $this->request->getBody();
        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            return $this->fail('Invalid webhook payload', 400);
        }

        $settings = $this->getMobileAppSettings();
        $providedSignature = trim((string) ($this->request->getHeaderLine('X-HMAC-SIGNATURE')));
        if (!$this->veriffService()->verifyWebhookSignature($rawBody, $providedSignature, $settings)) {
            return $this->fail('Invalid webhook signature', 401);
        }

        $vendorData = (string) $this->pathValue($payload, [
            ['verification', 'vendorData'],
            ['vendorData'],
        ], '');
        $sessionId = (string) $this->pathValue($payload, [
            ['verification', 'id'],
            ['verification', 'sessionId'],
            ['sessionId'],
            ['session_id'],
        ], '');

        $remitterModel = new \App\Models\RemitterModel();
        $remitter = null;

        if ($vendorData !== '' && str_starts_with($vendorData, 'remitter:')) {
            $remitterId = (int) str_replace('remitter:', '', $vendorData);
            if ($remitterId > 0) {
                $remitter = $remitterModel->find($remitterId);
            }
        }

        if (!$remitter && $sessionId !== '') {
            $remitter = $remitterModel->where('veriff_session_id', $sessionId)->first();
        }

        if ($remitter) {
            $update = $this->applyVeriffResult($remitter, $payload, 'webhook');
            $remitterModel->update($remitter['id'], $update);
        }

        return $this->respond([
            'status' => 200,
            'message' => 'Webhook received',
        ]);
    }

    public function checkStatus()
    {
        $identifier = trim((string) ($this->requestInput('identifier', $this->requestInput('email', ''))));

        if ($identifier === '') {
            return $this->fail('Email or mobile number is required', 400);
        }

        $model = new \App\Models\RemitterModel();
        $user = $this->findRemitterByIdentifier($model, $identifier);

        if (!$user) {
            return $this->failNotFound('User not found');
        }

        $settings = $this->getMobileAppSettings();
        $requireEmailOtp = ($settings['require_email_otp'] ?? 'yes') === 'yes';
        $requireMobileOtp = ($settings['require_mobile_otp'] ?? 'no') === 'yes';
        $livenessEnabled = (($settings['enable_liveness_check'] ?? 'yes') === 'yes' && ($settings['liveness_provider'] ?? 'veriff') === 'veriff');
        $sanctionEnabled = ($settings['enable_sanction_screening'] ?? 'yes') === 'yes';
        $access = $this->resolveAccessDecision($settings);

        return $this->respond([
            'status' => 200,
            'message' => 'User status retrieved successfully',
            'data' => [
                'email' => $user['email'],
                'status' => $user['status'],
                'kyc_status' => $user['kyc_status'] ?? 'pending',
                'email_verified' => $user['email_verified_at'] ? true : false,
                'requires_email_otp' => $requireEmailOtp,
                'requires_mobile_otp' => $requireMobileOtp,
                'mobile_verified' => !empty($user['mobile_verified_at']),
                'mobile_verified_at' => $user['mobile_verified_at'] ?? null,
                'liveness_enabled' => $livenessEnabled,
                'sanction_enabled' => $sanctionEnabled,
                'sanction_status' => $user['sanction_status'] ?? 'pending',
                'sanction_checked_at' => $user['sanction_checked_at'] ?? null,
                'registration_source' => $user['registration_source'],
                'veriff_status' => $user['veriff_status'] ?? null,
                'veriff_decision' => $user['veriff_decision'] ?? null,
                'veriff_checked_at' => $user['veriff_checked_at'] ?? null,
                'profile_complete' => $this->isProfileComplete($user),
                'password_change_required' => $this->isPasswordRotationRequired($user, $settings),
                'password_rotation_days' => $this->passwordRotationDays($settings),
                'require_new_device_verification' => $this->boolSetting($settings, 'require_new_device_verification'),
                'has_pending_device_verification' => !empty($user['pending_device_id']) && !empty($user['device_verification_code']),
                'support_email' => $this->supportEmail($settings),
                'access_allowed' => $access['allowed'],
                'access_message' => $access['message'],
            ]
        ]);
    }
}
