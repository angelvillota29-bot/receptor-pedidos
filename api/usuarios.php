<?php
// Crear/listar/eliminar los correos con acceso a este Receptor de Pedidos --
// ahora protegido por la sesión de superadmin (antes viajaba una contraseña
// fija en cada llamada).
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once __DIR__ . '/_auth.php';
requireRole('superadmin');

$file = dirname(__DIR__) . '/data/usuarios_receptor.json';

function cargarUsuarios($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function guardarUsuarios($file, $usuarios) {
    if (!is_dir(dirname($file))) mkdir(dirname($file), 0775, true);
    file_put_contents($file, json_encode($usuarios));
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$accion = $input['accion'] ?? 'listar';
$usuarios = cargarUsuarios($file);

if ($accion === 'listar') {
    echo json_encode(['success' => true, 'usuarios' => array_map(fn($u) => ['email' => $u['email']], $usuarios)]);
    exit;
}

if ($accion === 'crear') {
    $email = trim(strtolower($input['email'] ?? ''));
    if ($email === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Falta el correo']);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Correo inválido']);
        exit;
    }
    if ($email === SUPREME_ADMIN_EMAIL) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Ese correo ya es el del admin']);
        exit;
    }
    $usuarios = array_values(array_filter($usuarios, fn($u) => strtolower($u['email'] ?? '') !== $email));
    $usuarios[] = ['email' => $email];
    guardarUsuarios($file, $usuarios);
    echo json_encode(['success' => true]);
    exit;
}

if ($accion === 'eliminar') {
    $email = trim(strtolower($input['email'] ?? ''));
    $usuarios = array_values(array_filter($usuarios, fn($u) => strtolower($u['email'] ?? '') !== $email));
    guardarUsuarios($file, $usuarios);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Acción desconocida']);
