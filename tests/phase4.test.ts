/**
 * Phase 4 Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SourceReconstructor } from '../src/reconstruction/source-reconstructor.js';
import { TemplateEngine } from '../src/reconstruction/template-engine.js';
import { FileWriter } from '../src/reconstruction/file-writer.js';
import { PluginManager } from '../src/plugins/plugin-manager.js';
import { BinaryFormat, ChunkType } from '../src/binary/binary-format.js';
import type { CodeIndex, SymbolInfo } from '../src/types.js';

describe('Phase 4: Reconstruction Layer', () => {
  let testIndex: CodeIndex;

  beforeEach(() => {
    testIndex = {
      files: new Map([
        ['test.ts', {
          path: 'test.ts',
          hash: 'abc123',
          symbols: [
            { name: 'foo', kind: 'function', hash: 'f1', signature: '(): void', location: { line: 1, column: 0 } },
            { name: 'Bar', kind: 'class', hash: 'c1', signature: '', location: { line: 5, column: 0 } }
          ] as SymbolInfo[],
          imports: ['fs', 'path'],
          exports: ['foo', 'Bar'],
          dependencies: []
        }]
      ]),
      patterns: [
        { name: 'singleton', hash: 'p1', template: 'class {{name}} {}', occurrences: [] }
      ],
      behaviors: [],
      metadata: { version: '3.0.0' }
    };
  });

  describe('SourceReconstructor', () => {
    it('should reconstruct source from genome', async () => {
      const reconstructor = new SourceReconstructor();
      const genome = `### FILE:test.ts
HASH:abc123
SYM:foo|function|f1|(): void
SYM:Bar|class|c1|
IMP:fs
EXP:foo
EXP:Bar`;

      const result = await reconstructor.reconstruct(genome);
      
      expect(result.files.size).toBe(1);
      expect(result.files.has('test.ts')).toBe(true);
      expect(result.metadata.totalFiles).toBe(1);
    });

    it('should support streaming reconstruction', async () => {
      const reconstructor = new SourceReconstructor();
      const genome = '### FILE:stream.ts\nHASH:xyz\n';
      
      const files = [];
      for await (const file of reconstructor.reconstructStream(genome)) {
        files.push(file);
      }
      
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('TemplateEngine', () => {
    it('should compile templates', () => {
      const engine = new TemplateEngine();
      const context = {
        symbol: { name: 'testFunc', kind: 'function', hash: 'h1', location: { line: 0, column: 0 } },
        imports: [],
        exports: [],
        options: { params: 'a: number', returnType: ': number', body: 'return a * 2;' }
      };

      const result = engine.compile('ts-function', context);
      
      expect(result).toContain('testFunc');
    });

    it('should generate boilerplate', () => {
      const engine = new TemplateEngine();
      
      const moduleCode = engine.generateBoilerplate('module', 'MyModule');
      expect(moduleCode).toContain('MyModule');
      expect(moduleCode).toContain('export');
    });

    it('should support multiple languages', () => {
      const engine = new TemplateEngine({ language: 'javascript' });
      expect(engine).toBeDefined();
    });
  });

  describe('FileWriter', () => {
    it('should queue files for writing', () => {
      const writer = new FileWriter({ dryRun: true });
      writer.queue('test.ts', 'console.log("test");');
      
      expect(writer).toBeDefined();
    });

    it('should analyze directory structure', () => {
      const writer = new FileWriter();
      const structure = writer.analyzeStructure(testIndex);
      
      expect(structure.type).toBe('directory');
    });

    it('should support dry run mode', async () => {
      const writer = new FileWriter({ dryRun: true, outputDir: '/tmp/test' });
      writer.queue('test.ts', 'content');
      
      const results = await writer.writeAll();
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('PluginManager', () => {
    it('should register plugins', () => {
      const manager = new PluginManager();
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        author: 'Test',
        hooks: [],
        dependencies: []
      };

      expect(manager.register(plugin)).toBe(true);
      expect(manager.hasPlugin('test-plugin')).toBe(true);
    });

    it('should load plugins', async () => {
      const manager = new PluginManager();
      manager.register({
        name: 'test',
        version: '1.0.0',
        description: '',
        author: '',
        hooks: [],
        dependencies: []
      });

      const loaded = await manager.load('test');
      expect(loaded).toBe(true);
      expect(manager.isLoaded('test')).toBe(true);
    });

    it('should execute hooks', async () => {
      const manager = new PluginManager();
      let executed = false;

      manager.register({
        name: 'hook-test',
        version: '1.0.0',
        description: '',
        author: '',
        hooks: [{
          event: 'pre-encode',
          handler: async (ctx) => {
            executed = true;
            return ctx;
          },
          priority: 1
        }],
        dependencies: []
      });

      await manager.load('hook-test');
      await manager.executeHook('pre-encode', { data: null, metadata: {}, errors: [], warnings: [] });

      expect(executed).toBe(true);
    });

    it('should create compression plugins', () => {
      const manager = new PluginManager();
      const plugin = manager.createCompressionPlugin({
        name: 'custom-compress',
        compressFn: async (data) => data,
        decompressFn: async (data) => data
      });

      expect(plugin.name).toBe('custom-compress');
      expect(typeof plugin.compress).toBe('function');
    });
  });

  describe('BinaryFormat', () => {
    it('should encode to binary', async () => {
      const format = new BinaryFormat();
      const buffer = await format.encode(testIndex);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should decode from binary', async () => {
      const format = new BinaryFormat();
      const encoded = await format.encode(testIndex);
      const decoded = await format.decode(encoded);

      expect(decoded).toBeDefined();
      expect(decoded.files.size).toBeGreaterThan(0);
    });

    it('should estimate size', () => {
      const format = new BinaryFormat();
      const size = format.estimateSize(testIndex);

      expect(size).toBeGreaterThan(0);
    });

    it('should provide format info', () => {
      const format = new BinaryFormat();
      const info = format.getFormatInfo();

      expect(info.version).toBe(3);
      expect(Array.isArray(info.features)).toBe(true);
    });

    it('should reject invalid magic number', async () => {
      const format = new BinaryFormat();
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);

      await expect(format.decode(invalidBuffer)).rejects.toThrow('Invalid binary format');
    });
  });
});
