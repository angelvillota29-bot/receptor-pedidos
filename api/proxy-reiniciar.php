<?php
// REINICIO TOTAL de los datos de operación (pedidos, historial, eliminados y
// gastos) para empezar la producción real en limpio. SOLO el administrador total
// y solo si escribe la palabra REINICIAR. El sitio guarda antes una copia de
// seguridad completa; aquí se guarda también una de los gastos.
// No borra el menú, usuarios ni configuraciones.
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once __DIR__ . '/_auth.php';
requirePostSameOrigin();
$session = requireRole('superadmin');

$cuerpo = json_decode(file_get_contents('php://input'), true);
if (!is_array($cuerpo) || ($cuerpo['confirmacion'] ?? '') !== 'REINICIAR') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Escribe la palabra REINICIAR para confirmar.']);
    exit;
}

$baseUrl = getenv('RESTAURANTE_API_URL');
$apiKey = getenv('RESTAURANTE_API_KEY');
if (!$baseUrl || !$apiKey) {
    echo json_encode(['success' => false, 'error' => 'no_configurado']);
    exit;
}

[$respuesta, $error, $httpStatus] = llamarSitio('/api/reset-datos.php', $apiKey, json_encode(['confirmacion' => 'REINICIAR', 'reiniciadoPor' => $session['email'] ?? '']), 20);

if ($respuesta === false) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'No se pudo conectar con el sitio: ' . $error]);
    exit;
}
$sitio = json_decode($respuesta, true);
if ($sitio === null) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => "El sitio respondió algo inesperado (código $httpStatus). Verifica que el sitio tenga desplegada la última versión."]);
    exit;
}
if (empty($sitio['success'])) {
    // El sitio no borró nada: tampoco se tocan los gastos.
    echo $respuesta;
    exit;
}

// Gastos de este panel: copia de seguridad y luego se vacían.
$dir = dirname(__DIR__) . '/data';
$archivo = $dir . '/gastos.json';
$gastos = is_file($archivo) ? json_decode((string) file_get_contents($archivo), true) : [];
$cantidad = is_array($gastos) ? count($gastos) : 0;
if ($cantidad > 0) {
    @file_put_contents($dir . '/respaldo-gastos-' . date('Ymd-His') . '.json', json_encode($gastos));
    $viejos = glob($dir . '/respaldo-gastos-*.json') ?: [];
    sort($viejos);
    foreach (array_slice($viejos, 0, max(0, count($viejos) - 5)) as $f) @unlink($f);
}
@file_put_contents($archivo, '[]', LOCK_EX);

$borrado = $sitio['borrado'] ?? [];
$borrado['gastos'] = $cantidad;
echo json_encode(['success' => true, 'borrado' => $borrado]);
