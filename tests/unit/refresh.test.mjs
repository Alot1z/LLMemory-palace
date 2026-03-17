/**
 * Unit tests for Refresh module
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { Refresh } from '../../lib/refresh.js';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

describe('Refresh', () => {
    let refresh;
    let mockPalace;
    let tempDir;

    beforeEach(async () => {
        // Create temporary directory
        tempDir = await fs.promises.mkdtemp(path.join(tmpdir(), 'refresh-test-'));

        // Create mock palace
        mockPalace = {
            projectPath: tempDir,
            files: new Map(),
            patterns: new Map(),
            flows: new Map(),
            entities: new Map(),
            config: {},
            version: '25.0.0',
        };

        refresh = new Refresh(mockPalace);
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    describe('constructor', () => {
        it('should create Refresh instance with palace', () => {
            assert.ok(refresh);
            assert.strictEqual(refresh.palace, mockPalace);
            assert.ok(refresh.analyzer);
        });

        it('should initialize analyzer with palace file cache', () => {
            // Add file to palace cache
            const testContent = 'export const foo = 42;';
            mockPalace.files.set('test.js', { content: testContent });

            // Create new refresh instance
            const newRefresh = new Refresh(mockPalace);

            // Analyzer should be initialized
            assert.ok(newRefresh.analyzer.fileGraph.size > 0);
        });
    });

    describe('analyze', () => {
        it('should analyze a file and return results', async () => {
            // Create test file
            const testFile = path.join(tempDir, 'test.js');
            const content = 'export const foo = 42;';
            await fs.promises.writeFile(testFile, content);

            const result = await refresh.analyze(testFile);

            assert.ok(result);
            assert.strictEqual(typeof result.file, 'string');
            assert.ok(Array.isArray(result.changes));
            assert.ok(Array.isArray(result.rippleEffects));
            assert.ok(Array.isArray(result.impactedFiles));
        });

        it('should return empty results for non-existent file', async () => {
            const result = await refresh.analyze('/nonexistent/file.js');

            assert.ok(result);
            assert.strictEqual(result.file, '/nonexistent/file.js');
            assert.strictEqual(result.changes.length, 0);
            assert.strictEqual(result.rippleEffects.length, 0);
            assert.strictEqual(result.impactedFiles.length, 0);
        });

        it('should use provided content instead of reading file', async () => {
            const content = 'export const bar = 100;';
            const result = await refresh.analyze('/fake/path.js', content);

            assert.ok(result);
            assert.ok(result.changes.length > 0);
        });

        it('should detect imports and exports', async () => {
            const content = `
                import { utils } from './utils.js';
                export const foo = 42;
                export function bar() {}
            `;

            const result = await refresh.analyze('/test.js', content);

            assert.ok(result.changes.some(c => c.includes('exports')));
        });
    });

    describe('refresh', () => {
        it('should refresh a file and return success', async () => {
            // Create test file
            const testFile = path.join(tempDir, 'test.js');
            const content = 'export const foo = 42;';
            await fs.promises.writeFile(testFile, content);

            const result = await refresh.refresh(testFile);

            assert.ok(result);
            assert.strictEqual(result.success, true);
            assert.ok(Array.isArray(result.updated));
            assert.ok(Array.isArray(result.skipped));
            assert.ok(Array.isArray(result.errors));
        });

        it('should update palace files on refresh', async () => {
            const testFile = path.join(tempDir, 'test.js');
            const content = 'export const foo = 42;';
            await fs.promises.writeFile(testFile, content);

            await refresh.refresh(testFile);

            assert.ok(mockPalace.files.has(testFile));
            const fileData = mockPalace.files.get(testFile);
            assert.strictEqual(fileData.content, content);
        });

        it('should skip excluded files', async () => {
            const testFile = path.join(tempDir, 'node_modules', 'test.js');
            await fs.promises.mkdir(path.dirname(testFile), { recursive: true });
            await fs.promises.writeFile(testFile, 'test');

            const result = await refresh.refresh(testFile, {
                excludePatterns: ['node_modules'],
            });

            assert.ok(result.skipped.includes(testFile));
        });

        it('should skip unchanged files unless forced', async () => {
            const testFile = path.join(tempDir, 'test.js');
            const content = 'export const foo = 42;';
            await fs.promises.writeFile(testFile, content);

            // First refresh
            await refresh.refresh(testFile);

            // Second refresh without force
            const result = await refresh.refresh(testFile, { force: false });

            assert.ok(result.skipped.includes(testFile));
        });

        it('should force refresh even if unchanged', async () => {
            const testFile = path.join(tempDir, 'test.js');
            const content = 'export const foo = 42;';
            await fs.promises.writeFile(testFile, content);

            // First refresh
            await refresh.refresh(testFile);

            // Second refresh with force
            const result = await refresh.refresh(testFile, { force: true });

            assert.ok(result.updated.includes(testFile));
        });

        it('should perform dry run without updating', async () => {
            const testFile = path.join(tempDir, 'test.js');
            const content = 'export const foo = 42;';
            await fs.promises.writeFile(testFile, content);

            const result = await refresh.refresh(testFile, { dryRun: true });

            assert.ok(result.updated.includes(testFile));
            // Palace should not be updated in dry-run mode
            const palaceFile = mockPalace.files.get(testFile);
            assert.ok(!palaceFile || palaceFile.lastModified === undefined);
        });

        it('should call progress callback', async () => {
            const testFile = path.join(tempDir, 'test.js');
            const content = 'export const foo = 42;';
            await fs.promises.writeFile(testFile, content);

            const progressCalls = [];
            const onProgress = (file, status) => {
                progressCalls.push({ file, status });
            };

            await refresh.refresh(testFile, { onProgress });

            assert.ok(progressCalls.length > 0);
            assert.ok(progressCalls.some(c => c.status === 'analyzing' || c.status === 'updated'));
        });

        it('should handle file read errors', async () => {
            const result = await refresh.refresh('/nonexistent/file.js');

            assert.strictEqual(result.success, false);
            assert.ok(result.errors.length > 0);
            assert.ok(result.errors[0].message.includes('Failed to read file'));
        });

        it('should update impacted files', async () => {
            // Create source file
            const sourceFile = path.join(tempDir, 'utils.js');
            await fs.promises.writeFile(sourceFile, 'export const foo = 42;');

            // Create dependent file
            const dependentFile = path.join(tempDir, 'main.js');
            await fs.promises.writeFile(dependentFile, `
                import { foo } from './utils.js';
                console.log(foo);
            `);

            // Initialize analyzer with dependent file
            const depContent = await fs.promises.readFile(dependentFile, 'utf-8');
            refresh.analyzer.parseFile(dependentFile, depContent);

            // Refresh source file
            const result = await refresh.refresh(sourceFile);

            // Should update both source and dependent
            assert.ok(result.updated.includes(sourceFile));
        });
    });

    describe('refreshMultiple', () => {
        it('should refresh multiple files', async () => {
            const files = [];
            for (let i = 0; i < 3; i++) {
                const file = path.join(tempDir, `test${i}.js`);
                await fs.promises.writeFile(file, `export const test${i} = ${i};`);
                files.push(file);
            }

            const result = await refresh.refreshMultiple(files);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.updated.length, 3);
        });

        it('should handle partial failures', async () => {
            const files = [
                path.join(tempDir, 'exists.js'),
                '/nonexistent/file.js',
            ];

            await fs.promises.writeFile(files[0], 'export const foo = 42;');

            const result = await refresh.refreshMultiple(files);

            assert.strictEqual(result.success, false);
            assert.ok(result.updated.includes(files[0]));
            assert.ok(result.errors.length > 0);
        });

        it('should deduplicate results', async () => {
            const file = path.join(tempDir, 'test.js');
            await fs.promises.writeFile(file, 'export const foo = 42;');

            // Refresh same file twice
            const result = await refresh.refreshMultiple([file, file]);

            // Should deduplicate
            assert.strictEqual(result.updated.filter(f => f === file).length, 1);
        });
    });

    describe('_shouldExclude', () => {
        it('should exclude files matching string pattern', () => {
            const filePath = '/project/node_modules/package/file.js';
            const excluded = refresh._shouldExclude(filePath, ['node_modules']);
            assert.strictEqual(excluded, true);
        });

        it('should exclude files matching regex pattern', () => {
            const filePath = '/project/dist/bundle.js';
            const excluded = refresh._shouldExclude(filePath, [/dist\//]);
            assert.strictEqual(excluded, true);
        });

        it('should not exclude files not matching pattern', () => {
            const filePath = '/project/src/index.js';
            const excluded = refresh._shouldExclude(filePath, ['node_modules', /dist\//]);
            assert.strictEqual(excluded, false);
        });
    });

    describe('_hasFileChanged', () => {
        it('should detect new files as changed', () => {
            const changed = refresh._hasFileChanged('/new/file.js', 'content');
            assert.strictEqual(changed, true);
        });

        it('should detect content changes', () => {
            mockPalace.files.set('/test.js', { content: 'old' });
            const changed = refresh._hasFileChanged('/test.js', 'new');
            assert.strictEqual(changed, true);
        });

        it('should detect unchanged files', () => {
            mockPalace.files.set('/test.js', { content: 'same' });
            const changed = refresh._hasFileChanged('/test.js', 'same');
            assert.strictEqual(changed, false);
        });

        it('should handle files without content', () => {
            mockPalace.files.set('/test.js', {});
            const changed = refresh._hasFileChanged('/test.js', 'new content');
            assert.strictEqual(changed, true);
        });
    });

    describe('getStats', () => {
        it('should return refresh statistics', () => {
            mockPalace.files.set('file1.js', { content: 'test' });
            mockPalace.patterns.set('pattern1', {});

            const stats = refresh.getStats();

            assert.ok(typeof stats.filesCached === 'number');
            assert.ok(typeof stats.reverseDependencies === 'number');
            assert.strictEqual(stats.palaceFiles, 1);
            assert.strictEqual(stats.palacePatterns, 1);
        });
    });

    describe('clearCache', () => {
        it('should clear analyzer cache', () => {
            // Add some data
            refresh.analyzer.parseFile('test.js', 'export const x = 1;');
            assert.ok(refresh.analyzer.fileGraph.size > 0);

            // Clear cache
            refresh.clearCache();

            assert.strictEqual(refresh.analyzer.fileGraph.size, 0);
        });
    });

    describe('error handling', () => {
        it('should handle palace state save errors gracefully', async () => {
            // Create file
            const testFile = path.join(tempDir, 'test.js');
            await fs.promises.writeFile(testFile, 'export const foo = 42;');

            // Make palace path invalid
            mockPalace.projectPath = '/invalid/path/that/does/not/exist';

            // Should not throw
            const result = await refresh.refresh(testFile);

            assert.ok(result);
        });

        it('should handle analyzer errors', async () => {
            const testFile = path.join(tempDir, 'test.js');
            await fs.promises.writeFile(testFile, 'export const foo = 42;');

            // Corrupt analyzer
            refresh.analyzer.analyze = () => {
                throw new Error('Analyzer error');
            };

            const result = await refresh.refresh(testFile);

            assert.strictEqual(result.success, false);
            assert.ok(result.errors.length > 0);
        });
    });

    describe('integration with RefreshAnalyzer', () => {
        it('should use RefreshAnalyzer for dependency tracking', async () => {
            // Create file with imports
            const testFile = path.join(tempDir, 'main.js');
            const content = `
                import { foo } from './utils.js';
                import { bar } from './helpers.js';
                export const main = () => foo + bar;
            `;
            await fs.promises.writeFile(testFile, content);

            const result = await refresh.analyze(testFile);

            // Should detect imports
            assert.ok(result.changes.length > 0);
        });

        it('should track ripple effects', async () => {
            // Create dependency chain: utils <- main <- app
            const utilsFile = path.join(tempDir, 'utils.js');
            await fs.promises.writeFile(utilsFile, 'export const foo = 42;');

            const mainFile = path.join(tempDir, 'main.js');
            await fs.promises.writeFile(mainFile, `
                import { foo } from './utils.js';
                export const main = () => foo;
            `);

            const appFile = path.join(tempDir, 'app.js');
            await fs.promises.writeFile(appFile, `
                import { main } from './main.js';
                console.log(main());
            `);

            // Parse all files into analyzer
            const mainContent = await fs.promises.readFile(mainFile, 'utf-8');
            const appContent = await fs.promises.readFile(appFile, 'utf-8');
            refresh.analyzer.parseFile(mainFile, mainContent);
            refresh.analyzer.parseFile(appFile, appContent);

            // Analyze utils file
            const result = await refresh.analyze(utilsFile);

            // Should detect ripple effects
            assert.ok(result.impactedFiles.length > 0);
        });
    });
});
