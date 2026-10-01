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

// Antes no revisaba si la escritura realmente funcionó -- si fallaba (p.ej.
// permisos, disco lleno, el volumen de datos sin montar bien), el endpoint
// igual respondía {success:true} y el usuario agregado parecía guardado
// hasta que, al recargar, nunca estuvo ahí de verdad. Ahora se detecta y se
// avisa en vez de fingir que se guardó.
function guardarUsuarios($file, $usuarios) {
    $dir = dirname($file);
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    if (!is_dir($dir)) {
        return "No existe ni se pudo crear la carpeta $dir";
    }
    if (file_exists($file) ? !is_writable($file) : !is_writable($dir)) {
        $dueno = function_exists('posix_getpwuid') ? (posix_getpwuid(fileowner($dir))['name'] ?? fileowner($dir)) : fileowner($dir);
        $proceso = function_exists('posix_getpwuid') ? (posix_getpwuid(posix_geteuid())['name'] ?? posix_geteuid()) : posix_geteuid();
        return "Sin permiso de escritura en $dir (dueño actual: $dueno, proceso PHP corre como: $proceso)";
    }
    if (file_put_contents($file, json_encode($usuarios)) === false) {
        $err = error_get_last();
        return 'No se pudo escribir el archivo: ' . ($err['message'] ?? 'error desconocido');
    }
    // Releer para confirmar que lo que quedó en disco es realmente lo que se
    // acaba de guardar -- si no coincide, algo más (otro proceso, un volumen
    // que no persiste) se lo llevó por delante justo después de escribirlo.
    $relectura = json_decode(@file_get_contents($file), true);
    if (!is_array($relectura) || count($relectura) !== count($usuarios)) {
        return 'Se escribió el archivo pero al releerlo no coincide -- el volumen de datos podría no estar persistiendo bien.';
    }
    return null;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$accion = $input['accion'] ?? 'listar';
$usuarios = cargarUsuarios($file);

if ($accion === 'listar') {
    echo json_encode(['success' => true, 'usuarios' => array_map(fn($u) => ['email' => $u['email'], 'protegido' => esAdminProtegido($u['email'])], $usuarios)]);
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
    $errorGuardado = guardarUsuarios($file, $usuarios);
    if ($errorGuardado) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $errorGuardado]);
        exit;
    }
    echo json_encode(['success' => true]);
    exit;
}

if ($accion === 'eliminar') {
    $email = trim(strtolower($input['email'] ?? ''));
    if (esAdminProtegido($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Este administrador está protegido y no se puede eliminar']);
        exit;
    }
    $usuarios = array_values(array_filter($usuarios, fn($u) => strtolower($u['email'] ?? '') !== $email));
    $errorGuardado = guardarUsuarios($file, $usuarios);
    if ($errorGuardado) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $errorGuardado]);
        exit;
    }
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Acción desconocida']);
