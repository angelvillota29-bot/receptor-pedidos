<?php
// La caja adjunta el comprobante de pago de un pedido (por ejemplo el que el
// cliente mandó por WhatsApp). Se reenvía al sitio con la API Key del lado del
// servidor y se anota quién lo subió (el correo de la sesión, no lo que mande
// el navegador). Un comprobante guardado no se puede borrar ni reemplazar.
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

$orderId = (string) ($_POST['orderId'] ?? '');
$f = $_FILES['comprobante'] ?? null;
if (!preg_match('/^\d{10,16}$/', $orderId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Falta el pedido']);
    exit;
}
if (!is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || ($f['size'] ?? 0) <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No llegó ninguna foto (si es muy pesada, prueba con una captura de pantalla)']);
    exit;
}

$campos = [
    'orderId' => $orderId,
    'subidoPor' => substr((string) ($session['email'] ?? ''), 0, 120),
    'comprobante' => curl_file_create($f['tmp_name'], (string) ($f['type'] ?? 'image/jpeg'), 'comprobante'),
];
$url = rtrim($baseUrl, '/') . '/api/subir-comprobante.php';
if (isset($GLOBALS['__sitio_raw']) && is_callable($GLOBALS['__sitio_raw'])) {
    [$respuesta, , $status] = $GLOBALS['__sitio_raw']($url, $apiKey, $campos);
    $error = '';
} else {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $campos);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $apiKey]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    $respuesta = curl_exec($ch);
    $error = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
}

if ($respuesta === false) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'No se pudo conectar con el sitio: ' . $error]);
    exit;
}
if (json_decode($respuesta, true) === null) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => "El sitio respondió algo inesperado (código $status). Verifica que el sitio tenga desplegada la última versión."]);
    exit;
}
http_response_code($status >= 400 ? $status : 200);
echo $respuesta;
