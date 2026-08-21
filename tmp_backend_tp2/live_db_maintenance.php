<?php

declare(strict_types=1);

header('Content-Type: application/json');

$token = $_GET['token'] ?? '';
$expectedToken = 'lfx_cleanup_20260703_9d7c2f4a';

if (!hash_equals($expectedToken, (string) $token)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

$host = 'ds78.inlcpj.com';
$database = 'topnotch_linkforex';
$username = 'topnotch_linkforex';
$password = 'XFSv8a-QWTmpVj:';
$port = 3306;

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function tableExists(mysqli $db, string $table): bool
{
    $escaped = $db->real_escape_string($table);
    $result = $db->query("SHOW TABLES LIKE '{$escaped}'");
    return (bool) $result->fetch_row();
}

function fetchSingleCount(mysqli $db, string $table): ?int
{
    if (!tableExists($db, $table)) {
        return null;
    }

    $result = $db->query("SELECT COUNT(*) AS c FROM `{$table}`");
    $row = $result->fetch_assoc();
    return isset($row['c']) ? (int) $row['c'] : null;
}

function sqlLiteral(mysqli $db, mixed $value): string
{
    if ($value === null) {
        return 'NULL';
    }

    if (is_bool($value)) {
        return $value ? '1' : '0';
    }

    if (is_int($value) || is_float($value)) {
        return (string) $value;
    }

    return "'" . $db->real_escape_string((string) $value) . "'";
}

function dumpDatabase(mysqli $db, string $outputPath): array
{
    $tables = [];
    $result = $db->query('SHOW TABLES');
    while ($row = $result->fetch_row()) {
        $tables[] = $row[0];
    }

    $sql = [];
    $sql[] = '-- LinkForex live cleanup backup';
    $sql[] = '-- Generated at ' . date('c');
    $sql[] = 'SET FOREIGN_KEY_CHECKS=0;';
    $sql[] = '';

    foreach ($tables as $table) {
        $createResult = $db->query("SHOW CREATE TABLE `{$table}`");
        $createRow = $createResult->fetch_assoc();
        $createSql = $createRow['Create Table'] ?? array_values($createRow)[1] ?? null;
        if ($createSql === null) {
            continue;
        }

        $sql[] = "-- Table structure for `{$table}`";
        $sql[] = "DROP TABLE IF EXISTS `{$table}`;";
        $sql[] = $createSql . ';';
        $sql[] = '';

        $rowsResult = $db->query("SELECT * FROM `{$table}`");
        $fieldNames = [];
        while ($field = $rowsResult->fetch_field()) {
            $fieldNames[] = '`' . $field->name . '`';
        }

        if ($rowsResult->num_rows > 0) {
            $sql[] = "-- Data for `{$table}`";
            while ($row = $rowsResult->fetch_assoc()) {
                $values = [];
                foreach ($row as $value) {
                    $values[] = sqlLiteral($db, $value);
                }
                $sql[] = "INSERT INTO `{$table}` (" . implode(', ', $fieldNames) . ") VALUES (" . implode(', ', $values) . ');';
            }
            $sql[] = '';
        }
    }

    $sql[] = 'SET FOREIGN_KEY_CHECKS=1;';
    file_put_contents($outputPath, implode("\n", $sql));

    return [
        'tables' => count($tables),
        'bytes' => filesize($outputPath) ?: 0,
        'path' => $outputPath,
    ];
}

$action = $_GET['action'] ?? 'inspect';

$preserveTables = [
    'users',
    'roles',
    'permission_groups',
    'branches',
    'countries',
    'currencies',
    'banks',
    'relationships',
    'purposes',
    'branch_currency_rates',
    'mobile_app_settings',
    'transaction_settings',
    'api_token_settings',
    'mobile_exchange_rates',
    'mobile_flow_settings',
    'mobile_rate_settings',
    'mobile_rate_overrides',
];

$flushTables = [
    'support_messages',
    'support_tickets',
    'audit_logs',
    'user_logs',
    'branch_access_requests',
    'mobile_campaign_deliveries',
    'mobile_campaigns',
    'mobile_ads',
    'mobile_push_tokens',
    'transfers',
    'directors',
    'beneficiaries',
    'remitters',
];

try {
    $db = new mysqli($host, $username, $password, $database, $port);
    $db->set_charset('utf8mb4');
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'db_connect_failed',
        'message' => $e->getMessage(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($action === 'inspect') {
    $tablesToCount = array_values(array_unique(array_merge($preserveTables, $flushTables)));
    $counts = [];
    foreach ($tablesToCount as $table) {
        $counts[$table] = fetchSingleCount($db, $table);
    }

    $users = [];
    if (tableExists($db, 'users')) {
        $result = $db->query('SELECT id, name, username, email, role, system_defined, status FROM users ORDER BY id');
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
    }

    echo json_encode([
        'ok' => true,
        'action' => 'inspect',
        'counts' => $counts,
        'users' => $users,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($action === 'flush') {
    $backupDir = __DIR__ . '/scratch';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0775, true);
    }

    $backupFile = $backupDir . '/cleanup_backup_' . date('Ymd_His') . '.sql';
    $backup = dumpDatabase($db, $backupFile);

    $systemAdminIds = [];
    if (tableExists($db, 'users')) {
        $result = $db->query("SELECT id FROM users WHERE LOWER(COALESCE(system_defined, '')) = 'yes' OR LOWER(COALESCE(role, '')) = 'admin' OR LOWER(COALESCE(username, '')) = 'admin' OR LOWER(COALESCE(email, '')) = 'admin@linkforex.com'");
        while ($row = $result->fetch_assoc()) {
            $systemAdminIds[] = (int) $row['id'];
        }
        $systemAdminIds = array_values(array_unique($systemAdminIds));
    }

    $db->begin_transaction();
    try {
        foreach ($flushTables as $table) {
            if (tableExists($db, $table)) {
                $db->query("DELETE FROM `{$table}`");
            }
        }

        if (tableExists($db, 'users')) {
            if ($systemAdminIds) {
                $idList = implode(',', array_map('intval', $systemAdminIds));
                $db->query("DELETE FROM `users` WHERE id NOT IN ({$idList})");
            } else {
                throw new RuntimeException('No system admin user found to preserve.');
            }
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollback();
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'action' => 'flush',
            'error' => $e->getMessage(),
            'backup' => $backup,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $postCounts = [];
    foreach (array_values(array_unique(array_merge($preserveTables, $flushTables))) as $table) {
        $postCounts[$table] = fetchSingleCount($db, $table);
    }

    echo json_encode([
        'ok' => true,
        'action' => 'flush',
        'backup' => $backup,
        'preserved_admin_ids' => $systemAdminIds,
        'counts' => $postCounts,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'unknown_action']);
