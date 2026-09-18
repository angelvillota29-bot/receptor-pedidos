<?php
// Login contra los usuarios PROPIOS de este Receptor de Pedidos (creados
// desde la pestaña Usuarios por el admin) -- independiente del sitio, no
// depende de que esté arriba ni de su API Key. El admin fijo (ver
// ADMIN_EMAIL/ADMIN_PASSWORD en script.js) se valida aparte, en el navegador.
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$file = __DIR__ . '/../data/usuarios_receptor.json';
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$email = trim(strtolower($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');

$usuarios = file_exists($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];
if (!is_array($usuarios)) $usuarios = [];

foreach ($usuarios as $u) {
    if (strtolower($u['email'] ?? '') === $email && ($u['password'] ?? '') === $password) {
        echo json_encode(['success' => true]);
        exit;
    }
}

echo json_encode(['success' => false, 'error' => 'Correo o contraseña incorrectos']);
