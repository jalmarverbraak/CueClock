// Bundles the CueClock server into one self-contained CJS file (no node_modules
// needed at runtime) and copies the built web app, so electron-builder can ship
// them as plain files inside the app without fighting npm-workspace symlinks.
const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const vendorDir = path.join(root, 'vendor');

fs.rmSync(vendorDir, { recursive: true, force: true });
fs.mkdirSync(vendorDir, { recursive: true });

esbuild.buildSync({
  entryPoints: [path.resolve(root, '../server/src/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.join(vendorDir, 'server-bundle.js'),
});

const webDist = path.resolve(root, '../web/dist');
if (!fs.existsSync(webDist)) {
  throw new Error(`Web app not built yet - run "npm run build -w packages/web" first (looked in ${webDist})`);
}
fs.cpSync(webDist, path.join(vendorDir, 'web'), { recursive: true });

console.log('Vendor assets ready:', vendorDir);
