/**
 * @fileoverview ScannerParallel Performance Benchmark
 * @version 1.0.0
 * @description Compares sequential vs parallel scanning performance
 */

import { ScannerParallel } from '../../lib/scanner-parallel.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Benchmark configuration
const FILE_COUNT = 150;
const WARMUP_RUNS = 2;
const BENCHMARK_RUNS = 5;

/**
 * Generate test files for benchmarking
 */
function generateTestFiles(dir, count) {
  const srcDir = path.join(dir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  for (let i = 0; i < count; i++) {
    const fileName = `module-${String(i).padStart(3, '0')}.js`;
    const filePath = path.join(srcDir, fileName);
    
    // Generate realistic JavaScript content
    const content = `/**
 * Module ${i}
 * Auto-generated for benchmarking
 */

import { utils } from './utils.js';

export class Module${i} {
  constructor(config) {
    this.id = ${i};
    this.config = config || {};
    this.data = [];
  }

  async initialize() {
    // Simulate async initialization
    await this.loadData();
    return this;
  }

  async loadData() {
    for (let j = 0; j < 100; j++) {
      this.data.push({
        index: j,
        value: Math.random() * 1000,
        timestamp: Date.now()
      });
    }
  }

  process(input) {
    return this.data.map(item => ({
      ...item,
      processed: item.value * input.multiplier
    }));
  }

  validate(data) {
    if (!data) return false;
    if (typeof data !== 'object') return false;
    return true;
  }

  serialize() {
    return JSON.stringify({
      id: this.id,
      config: this.config,
      dataCount: this.data.length
    });
  }

  static fromJSON(json) {
    const parsed = JSON.parse(json);
    const instance = new Module${i}(parsed.config);
    instance.id = parsed.id;
    return instance;
  }
}

export async function createModule${i}(config) {
  const module = new Module${i}(config);
  await module.initialize();
  return module;
}

export default Module${i};
`;
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  // Add some TypeScript files
  const tsDir = path.join(dir, 'types');
  fs.mkdirSync(tsDir, { recursive: true });

  for (let i = 0; i < 20; i++) {
    const fileName = `type-${String(i).padStart(2, '0')}.ts`;
    const filePath = path.join(tsDir, fileName);
    
    const content = `export interface Type${i} {
  id: number;
  name: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export class Type${i}Handler {
  private data: Type${i}[] = [];

  add(item: Type${i}): void {
    this.data.push(item);
  }

  get(id: number): Type${i} | undefined {
    return this.data.find(item => item.id === id);
  }

  getAll(): Type${i}[] {
    return [...this.data];
  }
}
`;
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  // Add package.json
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'benchmark-project',
      version: '1.0.0',
      main: 'src/module-000.js'
    }, null, 2)
  );

  return count + 20 + 1; // Total files created
}

/**
 * Collect all files recursively
 */
function collectFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Measure execution time
 */
async function measureTime(fn, label) {
  const start = process.hrtime.bigint();
  await fn();
  const end = process.hrtime.bigint();
  const ns = Number(end - start);
  const ms = ns / 1_000_000;
  return { label, ms, ns };
}

/**
 * Calculate statistics
 */
function calculateStats(times) {
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  return { avg, min, max, median };
}

/**
 * Format milliseconds
 */
function formatMs(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Main benchmark function
 */
async function runBenchmark() {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 ScannerParallel Performance Benchmark');
  console.log('═'.repeat(70) + '\n');

  // Create temporary directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-bench-'));
  console.log(`📁 Creating ${FILE_COUNT} test files...`);
  
  const totalFiles = generateTestFiles(tempDir, FILE_COUNT);
  console.log(`✅ Created ${totalFiles} files in ${tempDir}\n`);

  // Collect files for scanning
  const files = collectFiles(tempDir);
  console.log(`📂 Collected ${files.length} files for scanning\n`);

  // Warmup runs
  console.log('🔥 Warmup runs...');
  for (let i = 0; i < WARMUP_RUNS; i++) {
    const scanner = new ScannerParallel({ useWorkers: false });
    await scanner.scanFiles(files, tempDir);
    
    const scannerParallel = new ScannerParallel({ useWorkers: true });
    await scannerParallel.scanFiles(files, tempDir);
  }
  console.log('✅ Warmup complete\n');

  // Benchmark sequential scanning
  console.log('📊 Benchmarking SEQUENTIAL scanning...');
  const sequentialTimes = [];
  
  for (let i = 0; i < BENCHMARK_RUNS; i++) {
    const scanner = new ScannerParallel({ useWorkers: false });
    const result = await measureTime(
      () => scanner.scanFiles(files, tempDir),
      `Sequential run ${i + 1}`
    );
    sequentialTimes.push(result.ms);
    console.log(`   Run ${i + 1}: ${formatMs(result.ms)}`);
    await scanner.destroy();
  }

  const seqStats = calculateStats(sequentialTimes);
  console.log(`\n   Sequential Stats:`);
  console.log(`   - Average: ${formatMs(seqStats.avg)}`);
  console.log(`   - Median:  ${formatMs(seqStats.median)}`);
  console.log(`   - Min:     ${formatMs(seqStats.min)}`);
  console.log(`   - Max:     ${formatMs(seqStats.max)}\n`);

  // Benchmark parallel scanning
  console.log('📊 Benchmarking PARALLEL scanning...');
  const parallelTimes = [];
  
  for (let i = 0; i < BENCHMARK_RUNS; i++) {
    const scanner = new ScannerParallel({ useWorkers: true });
    const result = await measureTime(
      () => scanner.scanFiles(files, tempDir),
      `Parallel run ${i + 1}`
    );
    parallelTimes.push(result.ms);
    console.log(`   Run ${i + 1}: ${formatMs(result.ms)}`);
    await scanner.destroy();
  }

  const parStats = calculateStats(parallelTimes);
  console.log(`\n   Parallel Stats:`);
  console.log(`   - Average: ${formatMs(parStats.avg)}`);
  console.log(`   - Median:  ${formatMs(parStats.median)}`);
  console.log(`   - Min:     ${formatMs(parStats.min)}`);
  console.log(`   - Max:     ${formatMs(parStats.max)}\n`);

  // Calculate speedup
  const speedupAvg = seqStats.avg / parStats.avg;
  const speedupMedian = seqStats.median / parStats.median;
  const speedupMin = seqStats.min / parStats.min;

  console.log('═'.repeat(70));
  console.log('📈 BENCHMARK RESULTS');
  console.log('═'.repeat(70));
  console.log(`\n   Files scanned:    ${files.length}`);
  console.log(`   Benchmark runs:   ${BENCHMARK_RUNS}`);
  console.log(`   CPU cores:        ${os.cpus().length}`);
  console.log('\n   ┌─────────────────────────────────────────────────────┐');
  console.log(`   │ SPEEDUP (Average):  ${speedupAvg.toFixed(2)}x faster              │`);
  console.log(`   │ SPEEDUP (Median):   ${speedupMedian.toFixed(2)}x faster              │`);
  console.log(`   │ SPEEDUP (Best):     ${speedupMin.toFixed(2)}x faster              │`);
  console.log('   └─────────────────────────────────────────────────────┘\n');

  if (speedupAvg < 1) {
    console.log('   ⚠️  Parallel scanning is SLOWER than sequential.');
    console.log('      This may be due to worker thread overhead on small files.\n');
  } else if (speedupAvg < 1.5) {
    console.log('   ℹ️  Parallel scanning shows modest improvement.\n');
  } else if (speedupAvg < 3) {
    console.log('   ✅ Parallel scanning shows good improvement.\n');
  } else {
    console.log('   🚀 Parallel scanning shows EXCELLENT improvement!\n');
  }

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('🧹 Cleaned up test directory\n');

  // Summary for CI
  console.log('═'.repeat(70));
  console.log('📊 CI Summary (JSON)');
  console.log('═'.repeat(70));
  console.log(JSON.stringify({
    files: files.length,
    runs: BENCHMARK_RUNS,
    cores: os.cpus().length,
    sequential: {
      avg: Math.round(seqStats.avg * 100) / 100,
      median: Math.round(seqStats.median * 100) / 100,
      min: Math.round(seqStats.min * 100) / 100,
      max: Math.round(seqStats.max * 100) / 100
    },
    parallel: {
      avg: Math.round(parStats.avg * 100) / 100,
      median: Math.round(parStats.median * 100) / 100,
      min: Math.round(parStats.min * 100) / 100,
      max: Math.round(parStats.max * 100) / 100
    },
    speedup: {
      avg: Math.round(speedupAvg * 100) / 100,
      median: Math.round(speedupMedian * 100) / 100,
      best: Math.round(speedupMin * 100) / 100
    }
  }, null, 2));

  console.log('\n═'.repeat(70));
  console.log('✅ Benchmark complete');
  console.log('═'.repeat(70) + '\n');
}

runBenchmark().catch(console.error);
