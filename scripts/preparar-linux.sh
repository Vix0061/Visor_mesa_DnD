#!/usr/bin/env bash
# Prepara el proyecto en Linux tras clonarlo (desarrollo). Uso: bash scripts/preparar-linux.sh
# Se puede repetir sin problema: solo hace lo que falte.
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. Node 26 (el de apt suele ser antiguo).
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 26 ]; then
  echo "Hace falta Node 26 o superior (tienes: $(node --version 2>/dev/null || echo ninguno))."
  echo "Instálalo con nvm y vuelve a ejecutar este script:"
  echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
  echo "  source ~/.bashrc && nvm install 26"
  exit 1
fi

# 2. Dependencias y binario de Electron (Electron 45 lo descarga aparte, no en npm install).
npm install
node node_modules/electron/install.js

# 3. Sandbox de Electron: sin el bit SUID de root, Ubuntu (24.04+) no deja arrancar la app.
#    El paquete final (AppImage, fase 8) no necesita esto.
sandbox=node_modules/electron/dist/chrome-sandbox
if [ -f "$sandbox" ] && ! { [ -u "$sandbox" ] && [ "$(stat -c %U "$sandbox")" = root ]; }; then
  echo "Ajustando permisos de chrome-sandbox (pide la contraseña de sudo)..."
  sudo chown root:root "$sandbox"
  sudo chmod 4755 "$sandbox"
fi

# 4. Compilar y pasar los tests.
npm test

echo
echo "Listo. Para arrancar: npm start   (para actualizar: git pull && npm start)"
