// Reduce la foto del celular a un JPEG liviano antes de subirla como comprobante.
const LIMITE_BYTES = 1.8 * 1024 * 1024;

export async function prepararFoto(file) {
  if (!file || !String(file.type).startsWith('image/')) throw new Error('Elige una foto o captura de pantalla.');
  try {
    const bmp = await createImageBitmap(file);
    const lado = Math.max(bmp.width, bmp.height);
    const k = lado > 1400 ? 1400 / lado : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bmp.width * k));
    canvas.height = Math.max(1, Math.round(bmp.height * k));
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    for (const calidad of [0.82, 0.65, 0.5]) {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', calidad));
      if (blob && blob.size <= LIMITE_BYTES) return blob;
    }
  } catch {
    // cae al envío directo
  }
  if (file.size <= LIMITE_BYTES && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  throw new Error('No se pudo preparar la foto. Prueba con una captura de pantalla.');
}
