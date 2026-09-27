<?php
// Client ID de Google -- no es secreto, se necesita en el navegador para
// iniciar el login (por eso viaja público, a diferencia de SESSION_SECRET).
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

echo json_encode(['googleClientId' => getenv('GOOGLE_CLIENT_ID') ?: '']);
