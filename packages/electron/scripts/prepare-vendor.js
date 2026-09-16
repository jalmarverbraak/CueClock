// Bundles the CueClock server into one self-contained CJS file (no node_modules
// needed at runtime) and copies the built web app, so electron-builder can ship
// them as plain files inside the app without fighting npm-workspace symlinks.
//
// main.ts itself is bundled the same way (see bundleMain below): it now pulls in
// real npm dependencies (electron-updater and its own dependency tree), and the
// packaged app's "files" list only ships dist/**, vendor/** and package.json -
// no node_modules - so anything main.ts needs at runtime has to be inlined here
// rather than left as a bare `require(...)` that resolves only in local dev.
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

function bundleMain() {
  const distDir = path.join(root, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  esbuild.buildSync({
    entryPoints: [path.join(root, 'src/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    // "electron" is provided by the Electron runtime itself, and the two
    // server-bundle/vendor requires below are loaded from disk at runtime
    // (they're not real npm packages), so none of the three should be inlined.
    external: ['electron'],
    outfile: path.join(distDir, 'main.js'),
  });
  console.log('Bundled electron entrypoint:', path.join(distDir, 'main.js'));
}

bundleMain();
