// Builds the whole app for Vercel using the Build Output API (https://vercel.com/docs/build-output-api):
//
//   .vercel/output/static/        the React app (client/dist)
//   .vercel/output/functions/api.func/   one Node.js function running the Express API for every /api/* request
//   .vercel/output/config.json    routing: /api/* -> function, assets from static, everything else -> index.html
//
// It also applies pending database migrations (prisma migrate deploy) when a database URL is available.
// Run with `npm run vercel-build` (Vercel runs it automatically, see vercel.json).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, '.vercel', 'output');
const fn = path.join(output, 'functions', 'api.func');

/** Node runtime for the API function. Update when Vercel retires a version. */
const NODE_RUNTIME = 'nodejs22.x';

/**
 * Packages left out of the bundle and copied next to it instead: Prisma loads its generated client and
 * query engine from disk, and bcrypt loads a precompiled native binary.
 */
const COPIED_PACKAGES = ['@prisma/client', '.prisma/client', 'bcrypt', 'node-gyp-build'];

function run(command, options = {}) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit', cwd: root, ...options });
}

rmSync(output, { recursive: true, force: true });

// 1. Database client (+ Linux query engine) and migrations.
run('npx prisma generate', { cwd: path.join(root, 'server') });

// Neon (via Vercel) provides a pooled DATABASE_URL and a direct DATABASE_URL_UNPOOLED; migrations need the direct one.
const migrationUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (process.env.SKIP_MIGRATIONS === 'true') {
  console.log('\nSKIP_MIGRATIONS=true: not running prisma migrate deploy');
} else if (migrationUrl) {
  run('npx prisma migrate deploy', { cwd: path.join(root, 'server'), env: { ...process.env, DATABASE_URL: migrationUrl } });
} else {
  console.log('\nNo DATABASE_URL set: skipping prisma migrate deploy');
}

// 2. Website.
run('npm run build --workspace client');
cpSync(path.join(root, 'client', 'dist'), path.join(output, 'static'), { recursive: true });

// 3. API function.
mkdirSync(fn, { recursive: true });
await build({
  entryPoints: [path.join(root, 'server', 'src', 'vercel.ts')],
  outfile: path.join(fn, 'index.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: 'linked',
  external: COPIED_PACKAGES,
  // Vercel's Node launcher calls module.exports; the entry file's default export is the Express app.
  footer: { js: 'module.exports = module.exports.default;' },
  logLevel: 'info',
});

for (const pkg of COPIED_PACKAGES) {
  const source = path.join(root, 'node_modules', pkg);
  if (!existsSync(source)) throw new Error(`Expected ${source} to exist. Did npm install and prisma generate run?`);
  cpSync(source, path.join(fn, 'node_modules', pkg), {
    recursive: true,
    // Leftover temp files from engine downloads on Windows.
    filter: (file) => !/\.tmp\d+$/.test(file),
  });
}

writeFileSync(
  path.join(fn, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: NODE_RUNTIME,
      handler: 'index.cjs',
      launcherType: 'Nodejs',
      // Express parses request bodies itself.
      shouldAddHelpers: false,
      maxDuration: 30,
    },
    null,
    2,
  ),
);

// 4. Routing.
writeFileSync(
  path.join(output, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Vite fingerprints asset filenames, so they can be cached forever.
        { src: '^/assets/(.*)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
        // The API. Express still sees the original path (e.g. /api/items).
        { src: '^/api(/.*)?$', dest: '/api' },
        { handle: 'filesystem' },
        // Client-side routes (/cart, /admin/orders/123, ...) all load the single-page app.
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('\nVercel build output ready in .vercel/output');
