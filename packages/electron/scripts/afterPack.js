// electron-builder afterPack hook (macOS only).
//
// We don't have a paid Apple Developer ID certificate, so without this hook
// the mac build ships completely unsigned - not even ad-hoc signed. macOS
// requires every arm64 binary to carry at least *some* valid signature to
// run at all, so a fully unsigned app that's been downloaded (and therefore
// quarantined by the OS) is rejected outright as "is damaged and can't be
// opened", rather than the milder "unidentified developer" prompt a
// legitimate-but-unsigned app gets.
//
// `codesign --sign -` applies an ad-hoc signature - no certificate needed -
// which is enough to turn that hard failure into the normal experience for
// an app from an indie/unsigned developer (right-click > Open, or "Open
// Anyway" in Privacy & Security). Getting rid of that prompt entirely still
// requires a real Developer ID certificate and notarization; this hook does
// not attempt that.
//
// This has to be an "afterPack" hook, not "afterSign": electron-builder only
// runs "afterSign" when *its own* signing (with a real certificate) actually
// happened, and skips it entirely otherwise - logging a warning suggesting
// "afterPack" instead, which is exactly what this is.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`afterPack: ad-hoc signing ${appPath} (no Developer ID certificate configured)`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
};
