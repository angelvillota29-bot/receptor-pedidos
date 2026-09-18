<?php
// Crear/listar/eliminar los usuarios PROPIOS de este Receptor de Pedidos.
// Solo el admin fijo puede hacerlo -- esta app no tiene sesión de servidor,
// así que la contraseña del admin viaja en cada llamada (ya vive en claro en
// script.js de todas formas: es una herramienta interna, no algo público).
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

const ADMIN_EMAIL = 'angelvillota4@gmail.com';
const ADMIN_PASSWORD = '1234';

$file = __DIR__ . '/../data/usuarios_receptor.json';

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

if (($input['adminPassword'] ?? '') !== ADMIN_PASSWORD) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

$accion = $input['accion'] ?? 'listar';
$usuarios = cargarUsuarios($file);

if ($accion === 'listar') {
    echo json_encode(['success' => true, 'usuarios' => array_map(fn($u) => ['email' => $u['email']], $usuarios)]);
    exit;
}

if ($accion === 'crear') {
    $email = trim(strtolower($input['email'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    if ($email === '' || $password === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Falta correo o contraseña']);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Correo inválido']);
        exit;
    }
    if ($email === strtolower(ADMIN_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Ese correo ya es el del admin']);
        exit;
    }
    $usuarios = array_values(array_filter($usuarios, fn($u) => strtolower($u['email'] ?? '') !== $email));
    $usuarios[] = ['email' => $email, 'password' => $password];
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
