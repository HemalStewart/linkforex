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

$db->begin_transaction();

try {
    $db->query("DELETE FROM `users` WHERE NOT (LOWER(COALESCE(system_defined, '')) = 'yes' OR LOWER(COALESCE(username, '')) = 'admin' OR LOWER(COALESCE(email, '')) = 'admin@linkforex.com')");
    $db->commit();

    $users = [];
    $result = $db->query("SELECT id, name, username, email, role, system_defined, status FROM `users` ORDER BY id");
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }

    echo json_encode([
        'ok' => true,
        'action' => 'prune-users',
        'users' => $users,
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
