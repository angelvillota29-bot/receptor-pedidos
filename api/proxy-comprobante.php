<?php
// Muestra la imagen de un comprobante de pago guardado en el sitio del
// restaurante. El navegador pide ESTE archivo (con su sesión) y aquí se trae la
// imagen del sitio con la API Key, que el navegador nunca ve.
// GET ?id=<pedido>&n=<número del comprobante, desde 0>
require_once __DIR__ . '/_auth.php';
requireRole('admin');

function comprobanteError($codigo, $mensaje) {
    http_response_code($codigo);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => $mensaje]);
    exit;
}

$baseUrl = getenv('RESTAURANTE_API_URL');
$apiKey = getenv('RESTAURANTE_API_KEY');
if (!$baseUrl || !$apiKey) comprobanteError(503, 'no_configurado');

$id = (string) ($_GET['id'] ?? '');
$n = (string) ($_GET['n'] ?? '0');
if (!preg_match('/^\d{10,16}$/', $id) || !ctype_digit($n) || (int) $n > 9) comprobanteError(400, 'Comprobante no válido');

$url = rtrim($baseUrl, '/') . '/api/ver-comprobante.php?id=' . $id . '&n=' . (int) $n;
if (isset($GLOBALS['__sitio_raw']) && is_callable($GLOBALS['__sitio_raw'])) {
    [$cuerpo, $tipo, $status] = $GLOBALS['__sitio_raw']($url, $apiKey, null);
} else {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $apiKey]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $cuerpo = curl_exec($ch);
    $tipo = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
}

if ($cuerpo === false || $status !== 200 || !preg_match('#^image/(jpeg|png|webp)#', (string) $tipo)) {
    comprobanteError($status === 404 ? 404 : 502, $status === 404 ? 'Comprobante no encontrado' : 'No se pudo traer el comprobante del sitio');
}

header('Content-Type: ' . strtok($tipo, ';'));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, max-age=300');
echo $cuerpo;
