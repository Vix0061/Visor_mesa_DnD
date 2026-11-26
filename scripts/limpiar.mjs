// Borra la carpeta de salida. Se usa un script de Node para no depender de
// comandos propios de un sistema operativo (rm, rmdir, del).
import { rmSync } from 'node:fs';
import path from 'node:path';

const raiz = path.join(import.meta.dirname, '..');
rmSync(path.join(raiz, 'dist'), { recursive: true, force: true });
