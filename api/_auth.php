<?php
// Sesión basada en Google Sign-In, sin base de datos de sesiones (mismo
// patrón que el sitio principal): la cookie guarda {email, role, exp}
// firmado con HMAC-SHA256 (SESSION_SECRET).
// role: 'cliente' (cualquier cuenta de Google, sin acceso a pedidos) |
// 'admin' (correo en usuarios_receptor.json, ve Pedidos/Historial) |
// 'superadmin' (ADMIN_EMAIL fijo, ve también Usuarios).

const SESSION_COOKIE = 'receptor_session';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 días
const SUPREME_ADMIN_EMAIL = 'angelvillota4@gmail.com';
const ROLE_LEVEL = ['cliente' => 1, 'admin' => 2, 'superadmin' => 3];

function sessionSecret() {
    return getenv('SESSION_SECRET') ?: 'receptor-dev-secret-cambia-esto-en-easypanel';
}

function issueSession($email, $role) {
    $payload = json_encode(['email' => $email, 'role' => $role, 'exp' => time() + SESSION_TTL]);
    $b64 = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
    $sig = hash_hmac('sha256', $b64, sessionSecret());
    setcookie(SESSION_COOKIE, $b64 . '.' . $sig, [
        'expires' => time() + SESSION_TTL,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']),
    ]);
}

function clearSession() {
    setcookie(SESSION_COOKIE, '', ['expires' => time() - 3600, 'path' => '/']);
}

function readSession() {
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if (!$token || strpos($token, '.') === false) return null;
    [$b64, $sig] = explode('.', $token, 2);
    if (!hash_equals(hash_hmac('sha256', $b64, sessionSecret()), $sig)) return null;
    $payload = json_decode(base64_decode(strtr($b64, '-_', '+/')), true);
    if (!$payload || ($payload['exp'] ?? 0) < time()) return null;
    return $payload;
}

function requireRole($minRole) {
    $session = readSession();
    if (!$session || (ROLE_LEVEL[$session['role']] ?? 0) < ROLE_LEVEL[$minRole]) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'No autorizado.']);
        exit;
    }
    return $session;
}

function verifyGoogleIdToken($idToken) {
    $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    $resp = curl_exec($ch);
    curl_close($ch);
    if (!$resp) return null;
    $info = json_decode($resp, true);
    $clientId = getenv('GOOGLE_CLIENT_ID');
    if (!$info || !$clientId || ($info['aud'] ?? '') !== $clientId) return null;
    if (($info['email_verified'] ?? 'false') !== 'true' || empty($info['email'])) return null;
    return $info;
}

function cargarUsuariosReceptor() {
    $file = dirname(__DIR__) . '/data/usuarios_receptor.json';
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function resolveRole($email) {
    if (strtolower($email) === SUPREME_ADMIN_EMAIL) return 'superadmin';
    foreach (cargarUsuariosReceptor() as $u) {
        if (strtolower($u['email'] ?? '') === strtolower($email)) return 'admin';
    }
    return 'cliente';
}
