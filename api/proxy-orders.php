<?php
// Trae los pedidos del sitio del restaurante (RESTAURANTE_API_URL) usando la
// API Key del lado del servidor -- el navegador nunca ve esa llave.
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$baseUrl = getenv('RESTAURANTE_API_URL');
$apiKey = getenv('RESTAURANTE_API_KEY');

if (!$baseUrl || !$apiKey) {
    echo json_encode(['success' => false, 'error' => 'no_configurado']);
    exit;
}

$ch = curl_init(rtrim($baseUrl, '/') . '/api/get-orders.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $apiKey]);
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

// El sitio pudo responder un 404/500 en HTML (ej. si todavía no se desplegó
// la última versión con este endpoint) -- reenviar eso tal cual rompería el
// JSON.parse del navegador con un error confuso ("No se pudo conectar").
if (json_decode($respuesta, true) === null) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => "El sitio respondió algo inesperado (código $httpStatus). Verifica que el sitio tenga desplegada la última versión."]);
    exit;
}

echo $respuesta;
