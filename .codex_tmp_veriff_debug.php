<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json');

function envMap(string $path): array {
    $env = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        [$k, $v] = array_pad(explode('=', $line, 2), 2, '');
        $env[trim($k)] = trim(trim($v), "\"'");
    }
    return $env;
}

$email = $_GET['email'] ?? 'lf4018@example.com';
$mode = $_GET['mode'] ?? 'single';
$root = __DIR__;
$env = envMap($root . '/.env');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli(
    $env['database.default.hostname'] ?? '127.0.0.1',
    $env['database.default.username'] ?? '',
    $env['database.default.password'] ?? '',
    $env['database.default.database'] ?? '',
    (int) ($env['database.default.port'] ?? 3306)
);
$db->set_charset('utf8mb4');

$settings = $db->query("SELECT enable_liveness_check,liveness_provider,enable_sanction_screening,veriff_base_url,veriff_callback_url,CASE WHEN COALESCE(veriff_api_key,'')='' THEN 0 ELSE 1 END AS has_veriff_key,CASE WHEN COALESCE(veriff_hmac_secret,'')='' THEN 0 ELSE 1 END AS has_veriff_secret FROM mobile_app_settings ORDER BY id DESC LIMIT 1")->fetch_assoc();
if ($mode === 'list_mobile') {
    $rows = [];
    $res = $db->query("SELECT id,email,name,registration_source,status,kyc_status,veriff_session_id,veriff_status,veriff_decision,sanction_status,updated_at FROM remitters WHERE registration_source='mobile_app' ORDER BY id DESC LIMIT 20");
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }
    echo json_encode(['settings' => $settings, 'users' => $rows], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$stmt = $db->prepare("SELECT id,email,name,registration_source,status,kyc_status,veriff_session_id,veriff_status,veriff_decision,veriff_checked_at,sanction_status,sanction_checked_at,veriff_raw_payload FROM remitters WHERE email=? LIMIT 1");
$stmt->bind_param('s', $email);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();

echo json_encode([
    'email' => $email,
    'settings' => $settings,
    'user' => $user,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
