<?php
// Elimina del Historial un pedido de HOY o de AYER (cancelado o con error) en el
// sitio del restaurante, usando la API Key del lado del servidor. El sitio vuelve
// a comprobar el plazo (hoy/ayer) y deja el registro de quién lo eliminó.
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once __DIR__ . '/_auth.php';
requirePostSameOrigin();
$session = requireRole('admin');

$baseUrl = getenv('RESTAURANTE_API_URL');
$apiKey = getenv('RESTAURANTE_API_KEY');
if (!$baseUrl || !$apiKey) {
    echo json_encode(['success' => false, 'error' => 'no_configurado']);
    exit;
}

$cuerpo = json_decode(file_get_contents('php://input'), true);
if (!is_array($cuerpo) || !isset($cuerpo['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Falta el id del pedido']);
    exit;
}
// Quién lo elimina sale de la sesión del servidor, no de lo que mande el navegador.
$input = json_encode(['id' => $cuerpo['id'], 'eliminadoPor' => $session['email'] ?? '']);

[$respuesta, $error, $httpStatus] = llamarSitio('/api/anular-pedido.php', $apiKey, $input, 10);

if ($respuesta === false) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'No se pudo conectar con el sitio: ' . $error]);
    exit;
}
if (json_decode($respuesta, true) === null) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => "El sitio respondió algo inesperado (código $httpStatus). Verifica que el sitio tenga desplegada la última versión."]);
    exit;
}
echo $respuesta;
