<?php
// Marca un pedido como "pago confirmado" en el sitio del restaurante
// (RESTAURANTE_API_URL) usando la API Key del lado del servidor -- el
// navegador nunca ve esa llave. Solo así el pedido pasa a contar como venta
// en el Historial y las Analíticas.
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

// Se agrega quién confirmó (el correo con el que inició sesión), tomado de la
// sesión del servidor y no de lo que mande el navegador.
$cuerpo = json_decode(file_get_contents('php://input'), true) ?: [];
$cuerpo['confirmadoPor'] = $session['email'] ?? '';
$input = json_encode($cuerpo);

$ch = curl_init(rtrim($baseUrl, '/') . '/api/confirm-payment.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$respuesta = curl_exec($ch);
$error = curl_error($ch);
$httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($respuesta === false) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'No se pudo conectar con el sitio: ' . $error]);
    exit;
}

// Si el sitio todavía no tiene desplegado este endpoint responde un 404 en
// HTML -- reenviarlo tal cual rompería el JSON.parse del navegador.
if (json_decode($respuesta, true) === null) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => "El sitio respondió algo inesperado (código $httpStatus). Verifica que el sitio tenga desplegada la última versión."]);
    exit;
}

echo $respuesta;
