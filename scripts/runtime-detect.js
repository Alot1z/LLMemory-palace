#!/usr/bin/env node

/**
 * Runtime Detection Script
 * Auto-detects Bun vs Node and provides optimal runtime selection
 * 
 * Usage:
 *   node runtime-detect.js              # Print detected runtime
 *   node runtime-detect.js <script>    # Execute script with detected runtime
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { platform } from 'os';

// Detect available runtimes
function detectRuntime() {
  const bunAvailable = checkBun();
  const nodeVersion = process.versions.node;
  
  if (bunAvailable) {
    return {
      runtime: 'bun',
      command: 'bun',
      version: getBunVersion(),
      nodeVersion: nodeVersion,
      reason: 'Bun detected - faster startup and execution'
    };
  }
  
  return {
    runtime: 'node',
    command: 'node',
    version: nodeVersion,
    nodeVersion: nodeVersion,
    reason: 'Bun not available, using Node.js'
  };
}

function checkBun() {
  try {
    const result = spawnSync(platform === 'win32' ? 'bun.cmd' : 'bun', ['--version'], {
      encoding: 'utf8',
      timeout: 5000
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function getBunVersion() {
  try {
    const result = execSync(platform === 'win32' ? 'bun.cmd --version' : 'bun --version', {
      encoding: 'utf8',
      timeout: 5000
    });
    return result.trim();
  } catch {
    return 'unknown';
  }
}

// Get script to execute from args
const scriptArg = process.argv[2];
const scriptArgs = process.argv.slice(3);

// Print detected runtime info
const detected = detectRuntime();

if (!scriptArg) {
  console.log('═'.repeat(60));
  console.log('  LLMemory-Palace Runtime Detection');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`  Detected: ${detected.runtime.toUpperCase()} ${detected.version}`);
  console.log(`  Reason:  ${detected.reason}`);
  console.log('');
  console.log('  Recommended commands:');
  console.log(`    ${detected.command} run build       # Build with ${detected.runtime}`);
  console.log(`    ${detected.command} run test        # Test with ${detected.runtime}`);
  console.log(`    ${detected.command} run start       # Start with ${detected.runtime}`);
  console.log('');
  console.log('═'.repeat(60));
  process.exit(0);
}

// Handle postinstall
if (scriptArg === 'postinstall') {
  console.log('');
  console.log('[INFO] LLMemory-Palace installed successfully');
  console.log(`[INFO] Detected runtime: ${detected.runtime.toUpperCase()} ${detected.version}`);
  
  if (detected.runtime === 'bun') {
    console.log('');
    console.log('[TIP] You have Bun! Use these faster commands:');
    console.log('  bun run build    # Build with Bun');
    console.log('  bun run start    # Start CLI with Bun');
    console.log('  bun test          # Run tests with Bun (faster)');
  } else {
    console.log('');
    console.log('[TIP] Consider installing Bun for faster execution:');
    console.log('  npm install -g bun   # Install Bun globally');
    console.log('');
    console.log('[INFO] Using Node.js commands:');
    console.log('  npm run build');
    console.log('  npm run start');
    console.log('  npm test');
  }
  console.log('');
  process.exit(0);
}

// Execute the requested script with detected runtime
const scripts = {
  'start': `${detected.command} bin/cli.js`,
  'dev': `${detected.command} bin/cli.js`,
  'build': `${detected.command} scripts/build.js`,
  'test': `${detected.command} tests/security.test.mjs && ${detected.command} tests/unit/exporters.test.mjs`,
  'test:security': `${detected.command} tests/security.test.mjs`,
  'test:unit': `${detected.command} tests/unit/exporters.test.mjs`,
  'test:integration': `${detected.command} tests/integration/full-workflow.test.mjs`,
  'test:benchmark': `${detected.command} tests/benchmark/scanner-parallel.bench.mjs`,
  'test:all': `npm run test && npm run test:security && npm run test:cli && npm run test:integration`,
  'lint': `eslint lib/**/*.js bin/**/*.js`,
  'lint:fix': `eslint lib/**/*.js bin/**/*.js --fix`,
  'prepublishOnly': `${detected.command} scripts/build.js && ${detected.command} tests/security.test.mjs`,
  'mcp': `${detected.command} mcp-server/index.js`,
  'web': `${detected.command} bin/palace-web.js`,
};

if (!scripts[scriptArg]) {
  console.error(`[ERROR] Unknown script: ${scriptArg}`);
  console.error(`Available: ${Object.keys(scripts).join(', ')}`);
  process.exit(1);
}

const fullCommand = scripts[scriptArg] + (scriptArgs.length > 0 ? ' ' + scriptArgs.join(' ') : '');
console.log(`[RUN] ${fullCommand}`);

try {
  execSync(fullCommand, { stdio: 'inherit' });
} catch (error) {
  console.error(`[ERROR] Script failed: ${error.message}`);
  process.exit(1);
}
