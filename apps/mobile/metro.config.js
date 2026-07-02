// Metro config for an Expo app inside a pnpm monorepo.
// - watchFolders: monorepo root so changes in packages/* are picked up.
// - nodeModulesPaths: app-local first, then monorepo root.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// pnpm uses symlinks; make sure Metro follows them.
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = false;

// ── React'ni yagona nusxaga majburlash ──────────────────────────────────────
// Monorepo'da frontend (Next.js) react@18.3.1, mobil esa react@19.1.0 ishlatadi.
// pnpm root orqali Metro ba'zan 18.3.1'ni olib qoladi → "Invalid hook call" /
// "Cannot read property 'useState' of null". Quyidagi paketlarni HAR DOIM
// mobil ilovaning o'z nusxasiga bog'laymiz.
// Faqat React oilasi — react-native'ni TEGMAYMIZ (uning ichki haste/platform
// resolveriga aralashmaslik uchun). Dublikat aynan react'da edi.
const FORCE_SINGLE = ['react', 'react-dom', 'scheduler', 'react-is'];
const forced = {};
for (const name of FORCE_SINGLE) {
  try {
    forced[name] = path.dirname(require.resolve(`${name}/package.json`, { paths: [projectRoot] }));
  } catch {
    // paket bu ilovada bo'lmasligi mumkin (masalan react-dom) — o'tkazib yuboramiz
  }
}

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // 'react' yoki 'react/jsx-runtime' kabi subpath'larni ham ushlaymiz
  for (const name of FORCE_SINGLE) {
    if (forced[name] && (moduleName === name || moduleName.startsWith(`${name}/`))) {
      const sub = moduleName.slice(name.length); // '' yoki '/jsx-runtime'
      return context.resolveRequest(context, forced[name] + sub, platform);
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
