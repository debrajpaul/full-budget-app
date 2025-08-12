import { build, context } from 'esbuild';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';
import tsconfigPaths from 'esbuild-ts-paths';

const isWatch = process.argv.includes('--watch');
const external = ['aws-sdk']; // AWS Lambda already includes this

function getDirectories(srcPath) {
  return readdirSync(srcPath)
    .map(name => join(srcPath, name))
    .filter(source => statSync(source).isDirectory());
}

// ------------------------------
// Build all packages/*
// ------------------------------
async function buildPackages() {
  const packages = getDirectories('./packages');

  for (const pkg of packages) {
    console.log(`📦 Building package: ${pkg}`);

    const options = {
      entryPoints: [join(pkg, 'src/index.ts')],
      outdir: join(pkg, 'dist'),
      bundle: false, // Keep as-is for publishing / tree-shaking
      platform: 'node',
      target: 'node20',
      sourcemap: true,
      format: 'cjs',
      logLevel: 'info',
      plugins: [tsconfigPaths()],
    };

    if (isWatch) {
      const ctx = await context(options);
      await ctx.watch();
    } else {
      await build(options);
    }
  }
}

// ------------------------------
// Build all apps/*
// ------------------------------
async function buildApps() {
  const apps = getDirectories('./apps');

  for (const app of apps) {
    console.log(`🚀 Building app: ${app}`);

    const options = {
      entryPoints: [join(app, 'src/index.ts')],
      outfile: join(app, 'dist/index.js'),
      bundle: true,
      platform: 'node',
      target: 'node20',
      sourcemap: true,
      minify: false,
      format: 'cjs',
      external,
      logLevel: 'info',
      plugins: [tsconfigPaths()],
    };

    if (isWatch) {
      const ctx = await context(options);
      await ctx.watch();
    } else {
      await build(options);
    }
  }
}

// ------------------------------
// Run builds
// ------------------------------
async function run() {
  await buildPackages();
  await buildApps();

  if (isWatch) {
    console.log('👀 Watching for file changes...');
  }
}

run().catch(err => {
  console.error(`Failed to build ${appName}`, err);
  process.exit(1);
});