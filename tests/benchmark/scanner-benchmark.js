/**
 * Scanner Performance Benchmark
 * 
 * Demonstrates 2x+ speedup with caching enabled.
 * 
 * Usage: node tests/benchmark/scanner-benchmark.js [project-path]
 */

import { Scanner } from '../../lib/scanner/scanner.js';
import * as path from 'path';

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function formatDuration(ms) {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function formatSpeedup(ratio) {
    const color = ratio >= 2 ? COLORS.green : COLORS.yellow;
    return `${color}${ratio.toFixed(2)}x${COLORS.reset}`;
}

async function runBenchmark(projectPath, iterations = 3) {
    console.log(`\n${COLORS.bold}Scanner Performance Benchmark${COLORS.reset}`);
    console.log('='.repeat(50));
    console.log(`Project: ${projectPath}`);
    console.log(`Iterations: ${iterations}\n`);
    
    // Create scanner with cache disabled
    const scannerNoCache = new Scanner({
        projectPath,
        cacheEnabled: false
    });
    
    // Create scanner with cache enabled
    const scannerWithCache = new Scanner({
        projectPath,
        cacheEnabled: true
    });
    
    // Warm-up run
    console.log(`${COLORS.cyan}Warming up...${COLORS.reset}`);
    await scannerNoCache.scan();
    
    // Benchmark without cache
    console.log(`\n${COLORS.bold}Without Cache:${COLORS.reset}`);
    const noCacheTimes = [];
    
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const result = await scannerNoCache.scan();
        const duration = performance.now() - start;
        noCacheTimes.push(duration);
        
        console.log(`  Run ${i + 1}: ${formatDuration(duration)} (${result.files.length} files)`);
    }
    
    const avgNoCache = noCacheTimes.reduce((a, b) => a + b, 0) / iterations;
    console.log(`  ${COLORS.bold}Average: ${formatDuration(avgNoCache)}${COLORS.reset}`);
    
    // Benchmark with cache (first run - cold cache)
    console.log(`\n${COLORS.bold}With Cache (cold start):${COLORS.reset}`);
    const coldCacheStart = performance.now();
    const coldResult = await scannerWithCache.scan();
    const coldCacheDuration = performance.now() - coldCacheStart;
    console.log(`  Run 1: ${formatDuration(coldCacheDuration)} (${coldResult.files.length} files)`);
    
    // Benchmark with cache (subsequent runs - warm cache)
    console.log(`\n${COLORS.bold}With Cache (warm):${COLORS.reset}`);
    const cacheTimes = [];
    
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const result = await scannerWithCache.scan();
        const duration = performance.now() - start;
        cacheTimes.push(duration);
        
        console.log(`  Run ${i + 1}: ${formatDuration(duration)} (from cache: ${result.stats.fromCache || false})`);
    }
    
    const avgCache = cacheTimes.reduce((a, b) => a + b, 0) / iterations;
    console.log(`  ${COLORS.bold}Average: ${formatDuration(avgCache)}${COLORS.reset}`);
    
    // Calculate speedup
    const coldSpeedup = avgNoCache / coldCacheDuration;
    const warmSpeedup = avgNoCache / avgCache;
    
    // Results summary
    console.log(`\n${COLORS.bold}Results Summary:${COLORS.reset}`);
    console.log('='.repeat(50));
    console.log(`  Files scanned: ${coldResult.files.length}`);
    console.log(`  Without cache: ${formatDuration(avgNoCache)}`);
    console.log(`  With cache (cold): ${formatDuration(coldCacheDuration)} (${formatSpeedup(coldSpeedup)} speedup)`);
    console.log(`  With cache (warm): ${formatDuration(avgCache)} (${formatSpeedup(warmSpeedup)} speedup)`);
    
    // Cache statistics
    const cacheStats = scannerWithCache.getCacheStats();
    console.log(`\n${COLORS.bold}Cache Statistics:${COLORS.reset}`);
    console.log(`  Hits: ${cacheStats.hits}`);
    console.log(`  Misses: ${cacheStats.misses}`);
    console.log(`  Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
    console.log(`  Evictions: ${cacheStats.evictions}`);
    
    // Pass/fail
    const passed = warmSpeedup >= 2;
    const status = passed 
        ? `${COLORS.green}PASS${COLORS.reset}` 
        : `${COLORS.yellow}PARTIAL${COLORS.reset}`;
    
    console.log(`\n${COLORS.bold}Benchmark Status: ${status}${COLORS.reset}`);
    if (!passed) {
        console.log(`  Note: Warm cache speedup was ${warmSpeedup.toFixed(2)}x (target: 2x)`);
        console.log(`  This may vary based on project size and file system.`);
    }
    
    return {
        passed,
        avgNoCache,
        avgCache,
        speedup: warmSpeedup,
        filesScanned: coldResult.files.length,
        cacheStats
    };
}

// Run benchmark
const projectPath = process.argv[2] || process.cwd();
runBenchmark(projectPath)
    .then(results => {
        process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
        console.error('Benchmark failed:', error);
        process.exit(1);
    });
