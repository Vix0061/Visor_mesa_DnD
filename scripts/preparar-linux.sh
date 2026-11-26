#!/usr/bin/env bash
# Prepara el proyecto en Linux tras clonarlo (desarrollo). Uso: bash scripts/preparar-linux.sh
# Instala lo que falte (curl, nvm, Node 26, dependencias de npm, Electron) y nada más:
# se puede repetir sin problema.
set -euo pipefail
cd "$(dirname "$0")/.."

# Con sudo, nvm y Node acabarían en /root y tu usuario no los vería. sudo se pide solo donde hace falta.
if [ "$(id -u)" -eq 0 ]; then
  echo "No ejecutes este script con sudo: usa  bash scripts/preparar-linux.sh"
  exit 1
fi

# 1. Node 26 con nvm (el de apt suele ser antiguo). nvm se instala en ~/.nvm, sin sudo.
node_valido() {
  command -v node >/dev/null && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 26 ]
}
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
set +eu # nvm no es compatible con set -eu
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
if ! node_valido; then
  if ! command -v nvm >/dev/null; then
    if ! command -v curl >/dev/null; then
      echo "Instalando curl (pide la contraseña de sudo)..."
      sudo apt-get update && sudo apt-get install -y curl
    fi
    echo "Instalando nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    source "$NVM_DIR/nvm.sh"
  fi
  echo "Instalando Node 26..."
  nvm install 26
  nvm alias default 26
  nodo_nuevo=1
fi
set -eu
if ! node_valido; then
  echo "No se pudo instalar Node 26. Revisa los mensajes de arriba."
  exit 1
fi
echo "Node $(node --version)"

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
if [ -n "${nodo_nuevo:-}" ]; then
  # El script no puede cambiar el PATH de la terminal que lo llamó.
  echo "Node se acaba de instalar: abre una terminal nueva (o ejecuta: source ~/.bashrc) antes de seguir."
fi
echo "Listo. Para arrancar: npm start   (para actualizar: git pull && npm start)"
