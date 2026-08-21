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

$baseRoles = [
    'Admin',
    'ENDUSER - RECEIVER',
    'ENDUSER - SENDER',
    'STAFF',
    'SUPER - RECEIVER',
    'SUPER - SENDER',
    'Supervisor',
    'Test - Super',
];

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

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

$action = strtolower(trim((string) ($_GET['action'] ?? 'inspect')));

function fetchRoles(mysqli $db): array
{
    $roles = [];
    $result = $db->query("SELECT id, name, description, system_defined FROM `roles` ORDER BY id");
    while ($row = $result->fetch_assoc()) {
        $roles[] = $row;
    }
    return $roles;
}

function fetchPermissionCounts(mysqli $db): array
{
    $counts = [
        'total' => 0,
        'by_role' => [],
    ];

    $result = $db->query("SELECT COUNT(*) AS c FROM `permission_groups`");
    $counts['total'] = (int) ($result->fetch_assoc()['c'] ?? 0);

    $sql = "SELECT role_id, role_name, COUNT(*) AS c FROM `permission_groups` GROUP BY role_id, role_name ORDER BY role_name";
    $result = $db->query($sql);
    while ($row = $result->fetch_assoc()) {
        $counts['by_role'][] = $row;
    }

    return $counts;
}

if ($action === 'inspect') {
    echo json_encode([
        'ok' => true,
        'action' => 'inspect',
        'base_roles' => $baseRoles,
        'roles' => fetchRoles($db),
        'permission_groups' => fetchPermissionCounts($db),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($action !== 'prune') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'unknown_action']);
    exit;
}

$quotedNames = array_map(
    static fn(string $name): string => "'" . $name . "'",
    array_map([$db, 'real_escape_string'], $baseRoles)
);

$backupDir = __DIR__ . '/scratch';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0775, true);
}

$backupFile = $backupDir . '/roles_backup_' . date('Ymd_His') . '.json';
$before = [
    'roles' => fetchRoles($db),
    'permission_groups' => fetchPermissionCounts($db),
];
file_put_contents($backupFile, json_encode($before, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

$db->begin_transaction();

try {
    $roleIdsToDelete = [];
    $result = $db->query("SELECT id FROM `roles` WHERE `name` NOT IN (" . implode(', ', $quotedNames) . ")");
    while ($row = $result->fetch_assoc()) {
        $roleIdsToDelete[] = (int) $row['id'];
    }

    if ($roleIdsToDelete) {
        $idList = implode(',', $roleIdsToDelete);
        $db->query("DELETE FROM `permission_groups` WHERE `role_id` IN ({$idList}) OR `role_name` NOT IN (" . implode(', ', $quotedNames) . ")");
        $db->query("DELETE FROM `roles` WHERE `id` IN ({$idList})");
    } else {
        $db->query("DELETE FROM `permission_groups` WHERE `role_name` NOT IN (" . implode(', ', $quotedNames) . ")");
    }

    $db->commit();

    echo json_encode([
        'ok' => true,
        'action' => 'prune',
        'backup' => $backupFile,
        'base_roles' => $baseRoles,
        'roles' => fetchRoles($db),
        'permission_groups' => fetchPermissionCounts($db),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    $db->rollback();
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'prune_failed',
        'message' => $e->getMessage(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}
