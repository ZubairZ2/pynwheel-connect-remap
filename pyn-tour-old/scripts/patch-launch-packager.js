#!/usr/bin/env node
/**
 * Patches react-native/scripts/launchPackager.command to use the project's
 * Node version (from .nvmrc) when starting Metro. This avoids ERR_OSSL_EVP_UNSUPPORTED
 * when the packager is launched by Xcode or double-click (which don't run nvm use).
 */
const fs = require('fs');
const path = require('path');

const launchPackagerPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'scripts',
  'launchPackager.command'
);

const nvmBlock = `
# Use project Node version (e.g. from .nvmrc) to avoid OpenSSL errors on Node 17+
PROJECT_ROOT="$THIS_DIR/../../.."
if [ -s "$HOME/.nvm/nvm.sh" ] && [ -f "$PROJECT_ROOT/.nvmrc" ]; then
  . "$HOME/.nvm/nvm.sh"
  cd "$PROJECT_ROOT" && nvm use
fi

`;

if (!fs.existsSync(launchPackagerPath)) {
  console.log('patch-launch-packager: launchPackager.command not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(launchPackagerPath, 'utf8');

// Already patched
if (content.includes('Use project Node version (e.g. from .nvmrc)')) {
  console.log('patch-launch-packager: launchPackager.command already patched');
  process.exit(0);
}

// Insert nvm block after THIS_DIR=... and before the packager.sh source
const marker = '# shellcheck source=/dev/null\n. "$THIS_DIR/packager.sh"';
const insert =
  nvmBlock.trim() +
  '\n\n# shellcheck source=/dev/null\n. "$THIS_DIR/packager.sh"';
if (!content.includes(marker)) {
  console.warn('patch-launch-packager: could not find insertion point');
  process.exit(1);
}
content = content.replace(marker, insert);

fs.writeFileSync(launchPackagerPath, content);
console.log('patch-launch-packager: patched launchPackager.command to use .nvmrc Node version');
