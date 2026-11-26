// Copia a dist/ los archivos de los clientes que tsc no emite (html, css).
import { cpSync } from 'node:fs';
import path from 'node:path';

const raiz = path.join(import.meta.dirname, '..');
const CLIENTES = ['visor', 'panel'];

for (const cliente of CLIENTES) {
  cpSync(path.join(raiz, 'src', cliente), path.join(raiz, 'dist', cliente), {
    recursive: true,
    filter: (origen) => !origen.endsWith('.ts') && path.basename(origen) !== 'tsconfig.json',
  });
}
