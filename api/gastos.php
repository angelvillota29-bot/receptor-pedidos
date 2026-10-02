<?php
// Registro de gastos/compras del día (insumos, ingredientes, etc.) para que
// el Historial pueda calcular la ganancia real (ventas - gastos), no solo
// las ventas. Vive en este panel -- solo lo usa el personal del restaurante
// -- con el mismo patrón de acción/archivo plano que usuarios.php.
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once __DIR__ . '/_auth.php';
requirePostSameOrigin();
requireRole('admin');

$file = dirname(__DIR__) . '/data/gastos.json';

function cargarGastos($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function guardarGastos($file, $gastos) {
    if (!is_dir(dirname($file))) mkdir(dirname($file), 0775, true);
    file_put_contents($file, json_encode($gastos), LOCK_EX);
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$accion = $input['accion'] ?? 'listar';
$gastos = cargarGastos($file);

if ($accion === 'listar') {
    echo json_encode(['success' => true, 'gastos' => $gastos]);
    exit;
}

if ($accion === 'crear') {
    $descripcion = trim($input['descripcion'] ?? '');
    $monto = (int) preg_replace('/\D/', '', (string) ($input['monto'] ?? '0'));
    $fecha = trim($input['fecha'] ?? '');
    if ($descripcion === '' || $monto <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Faltan datos (descripción, monto o fecha inválida)']);
        exit;
    }
    $gastos[] = [
        'id' => uniqid('g_', true),
        'fecha' => $fecha,
        'descripcion' => $descripcion,
        'monto' => $monto,
        'creadoEn' => (int) round(microtime(true) * 1000),
    ];
    guardarGastos($file, $gastos);
    echo json_encode(['success' => true]);
    exit;
}

if ($accion === 'eliminar') {
    $id = $input['id'] ?? '';
    $gastos = array_values(array_filter($gastos, fn($g) => ($g['id'] ?? '') !== $id));
    guardarGastos($file, $gastos);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Acción desconocida']);
