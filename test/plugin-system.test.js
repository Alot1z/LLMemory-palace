/**
 * Plugin System Tests
 * Tests for hooks, loader, and plugin manager
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  HookTypes,
  HookPriorities,
  createHook,
  createHookContext,
  HookRegistry,
  getHookRegistry,
  resetHookRegistry
} from '../lib/plugins/hooks.js';

import {
  PluginLoader,
  PluginDirectories,
  ManifestValidator,
  createPluginLoader
} from '../lib/plugins/loader.js';

import {
  PluginManager,
  getPluginManager,
  createPluginManager
} from '../lib/plugins/plugin-manager.js';

describe('Plugin Hooks System', () => {
  let registry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  describe('HookTypes', () => {
    it('should define all hook types', () => {
      expect(HookTypes).to.have.property('BEFORE_SCAN');
      expect(HookTypes).to.have.property('AFTER_SCAN');
      expect(HookTypes).to.have.property('BEFORE_EXPORT');
      expect(HookTypes).to.have.property('AFTER_EXPORT');
      expect(HookTypes).to.have.property('BEFORE_REFRESH');
      expect(HookTypes).to.have.property('AFTER_REFRESH');
    });

    it('should have consistent hook type values', () => {
      expect(HookTypes.BEFORE_SCAN).to.equal('beforeScan');
      expect(HookTypes.AFTER_SCAN).to.equal('afterScan');
      expect(HookTypes.ON_FILE_SCAN).to.equal('onFileScan');
    });
  });

  describe('HookPriorities', () => {
    it('should define priority levels', () => {
      expect(HookPriorities.HIGHEST).to.equal(1000);
      expect(HookPriorities.HIGH).to.equal(750);
      expect(HookPriorities.NORMAL).to.equal(500);
      expect(HookPriorities.LOW).to.equal(250);
      expect(HookPriorities.LOWEST).to.equal(100);
    });
  });

  describe('createHookContext', () => {
    it('should create a hook context with default values', () => {
      const context = createHookContext('afterScan', { files: 10 });
      
      expect(context.hookType).to.equal('afterScan');
      expect(context.data.files).to.equal(10);
      expect(context.errors).to.be.an('array');
      expect(context.warnings).to.be.an('array');
      expect(context.cancelled).to.be.false;
    });

    it('should support cancel method', () => {
      const context = createHookContext('afterScan', {});
      
      context.cancel();
      expect(context.cancelled).to.be.true;
    });

    it('should support addError method', () => {
      const context = createHookContext('afterScan', {});
      
      context.addError('Test error');
      expect(context.errors).to.include('Test error');
    });

    it('should support addWarning method', () => {
      const context = createHookContext('afterScan', {});
      
      context.addWarning('Test warning');
      expect(context.warnings).to.include('Test warning');
    });
  });

  describe('createHook', () => {
    it('should create a valid hook definition', () => {
      const handler = () => {};
      const hook = createHook(HookTypes.AFTER_SCAN, handler);
      
      expect(hook.event).to.equal('afterScan');
      expect(hook.handler).to.equal(handler);
      expect(hook.priority).to.equal(HookPriorities.DEFAULT);
    });

    it('should accept custom options', () => {
      const handler = () => {};
      const hook = createHook(HookTypes.AFTER_SCAN, handler, {
        priority: HookPriorities.HIGH,
        pluginName: 'test-plugin',
        async: true
      });
      
      expect(hook.priority).to.equal(HookPriorities.HIGH);
      expect(hook.pluginName).to.equal('test-plugin');
      expect(hook.async).to.be.true;
    });

    it('should throw on invalid hook type', () => {
      expect(() => {
        createHook('invalid-hook', () => {});
      }).to.throw('Invalid hook type');
    });

    it('should throw on non-function handler', () => {
      expect(() => {
        createHook(HookTypes.AFTER_SCAN, 'not-a-function');
      }).to.throw('must be a function');
    });
  });

  describe('HookRegistry', () => {
    it('should register hooks', () => {
      const hook = createHook(HookTypes.AFTER_SCAN, () => {});
      registry.register(hook);
      
      const hooks = registry.getHooks(HookTypes.AFTER_SCAN);
      expect(hooks).to.have.lengthOf(1);
    });

    it('should sort hooks by priority', () => {
      const hook1 = createHook(HookTypes.AFTER_SCAN, () => {}, { priority: HookPriorities.LOW });
      const hook2 = createHook(HookTypes.AFTER_SCAN, () => {}, { priority: HookPriorities.HIGH });
      
      registry.register(hook1);
      registry.register(hook2);
      
      const hooks = registry.getHooks(HookTypes.AFTER_SCAN);
      expect(hooks[0].priority).to.equal(HookPriorities.HIGH);
      expect(hooks[1].priority).to.equal(HookPriorities.LOW);
    });

    it('should unregister hooks', () => {
      const handler = () => {};
      const hook = createHook(HookTypes.AFTER_SCAN, handler);
      
      registry.register(hook);
      expect(registry.getHooks(HookTypes.AFTER_SCAN)).to.have.lengthOf(1);
      
      registry.unregister(HookTypes.AFTER_SCAN, handler);
      expect(registry.getHooks(HookTypes.AFTER_SCAN)).to.have.lengthOf(0);
    });

    it('should execute hooks', async () => {
      const handler = (ctx) => {
        ctx.data.modified = true;
      };
      const hook = createHook(HookTypes.AFTER_SCAN, handler);
      
      registry.register(hook);
      
      const context = createHookContext(HookTypes.AFTER_SCAN, { files: 10 });
      const result = await registry.execute(HookTypes.AFTER_SCAN, context);
      
      expect(result.data.modified).to.be.true;
    });

    it('should handle async hooks', async () => {
      const handler = async (ctx) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        ctx.data.asyncDone = true;
      };
      const hook = createHook(HookTypes.AFTER_SCAN, handler, { async: true });
      
      registry.register(hook);
      
      const context = createHookContext(HookTypes.AFTER_SCAN, {});
      const result = await registry.execute(HookTypes.AFTER_SCAN, context);
      
      expect(result.data.asyncDone).to.be.true;
    });

    it('should stop execution when cancelled', async () => {
      let secondHandlerCalled = false;
      
      registry.register(createHook(HookTypes.AFTER_SCAN, (ctx) => ctx.cancel()));
      registry.register(createHook(HookTypes.AFTER_SCAN, () => { secondHandlerCalled = true; }));
      
      const context = createHookContext(HookTypes.AFTER_SCAN, {});
      await registry.execute(HookTypes.AFTER_SCAN, context);
      
      expect(secondHandlerCalled).to.be.false;
    });

    it('should provide statistics', () => {
      registry.register(createHook(HookTypes.AFTER_SCAN, () => {}));
      registry.register(createHook(HookTypes.AFTER_SCAN, () => {}, { pluginName: 'test' }));
      registry.register(createHook(HookTypes.AFTER_EXPORT, () => {}, { pluginName: 'test' }));
      
      const stats = registry.getStats();
      
      expect(stats.total).to.equal(3);
      expect(stats.byType.afterScan).to.equal(2);
      expect(stats.byType.afterExport).to.equal(1);
      expect(stats.byPlugin.test).to.equal(2);
    });
  });
});

describe('Plugin Loader', () => {
  let tempDir;
  let loader;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'palace-plugins-'));
    loader = createPluginLoader({ projectPath: tempDir });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('ManifestValidator', () => {
    it('should validate a correct manifest', () => {
      const manifest = {
        name: 'test-plugin',
        version: '1.0.0'
      };
      
      const result = ManifestValidator.validate(manifest);
      expect(result.valid).to.be.true;
      expect(result.errors).to.have.lengthOf(0);
    });

    it('should reject missing required fields', () => {
      const manifest = {};
      
      const result = ManifestValidator.validate(manifest);
      expect(result.valid).to.be.false;
      expect(result.errors).to.include('Missing required field: name');
      expect(result.errors).to.include('Missing required field: version');
    });

    it('should reject invalid plugin names', () => {
      const manifest = {
        name: 'Invalid_Name',
        version: '1.0.0'
      };
      
      const result = ManifestValidator.validate(manifest);
      expect(result.valid).to.be.false;
      expect(result.errors.some(e => e.includes('Invalid plugin name'))).to.be.true;
    });

    it('should reject invalid versions', () => {
      const manifest = {
        name: 'test-plugin',
        version: 'not-semver'
      };
      
      const result = ManifestValidator.validate(manifest);
      expect(result.valid).to.be.false;
      expect(result.errors.some(e => e.includes('Invalid version'))).to.be.true;
    });
  });

  describe('PluginDirectories', () => {
    it('should return global plugin directory', () => {
      const globalDir = PluginDirectories.getGlobal();
      expect(globalDir).to.include('.palace');
      expect(globalDir).to.include('plugins');
    });

    it('should return local plugin directory', () => {
      const localDir = PluginDirectories.getLocal('/project');
      expect(localDir).to.equal('/project/.palace/plugins');
    });
  });

  describe('PluginLoader', () => {
    it('should discover plugins', () => {
      // Create a test plugin
      const pluginDir = path.join(tempDir, '.palace', 'plugins', 'test-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      
      fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify({
        name: 'test-plugin',
        version: '1.0.0'
      }));
      
      const discovered = loader.discover();
      expect(discovered.some(p => p.name === 'test-plugin')).to.be.true;
    });

    it('should detect invalid manifests', () => {
      const pluginDir = path.join(tempDir, '.palace', 'plugins', 'bad-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      
      fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify({
        name: 'Bad_Name',
        version: '1.0.0'
      }));
      
      const discovered = loader.discover();
      const badPlugin = discovered.find(p => p.name === 'bad-plugin');
      
      expect(badPlugin).to.exist;
      expect(badPlugin.valid).to.be.false;
    });

    it('should provide statistics', () => {
      const stats = loader.getStats();
      
      expect(stats).to.have.property('loaded');
      expect(stats).to.have.property('order');
      expect(stats).to.have.property('hooks');
    });
  });
});

describe('PluginManager', () => {
  let manager;

  beforeEach(() => {
    manager = createPluginManager();
  });

  afterEach(() => {
    manager.clear();
  });

  describe('Plugin Registration', () => {
    it('should register a plugin', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        hooks: []
      };
      
      const result = manager.register(plugin);
      expect(result).to.be.true;
      expect(manager.hasPlugin('test-plugin')).to.be.true;
    });

    it('should not register duplicate plugins', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        hooks: []
      };
      
      manager.register(plugin);
      const result = manager.register(plugin);
      
      expect(result).to.be.false;
    });

    it('should unregister a plugin', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        hooks: []
      };
      
      manager.register(plugin);
      const result = manager.unregister('test-plugin');
      
      expect(result).to.be.true;
      expect(manager.hasPlugin('test-plugin')).to.be.false;
    });
  });

  describe('Plugin Loading', () => {
    it('should load a registered plugin', async () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        hooks: [],
        dependencies: []
      };
      
      manager.register(plugin);
      await manager.load('test-plugin');
      
      expect(manager.isLoaded('test-plugin')).to.be.true;
    });

    it('should check dependencies', async () => {
      const plugin1 = {
        name: 'plugin-1',
        version: '1.0.0',
        hooks: [],
        dependencies: []
      };
      
      const plugin2 = {
        name: 'plugin-2',
        version: '1.0.0',
        hooks: [],
        dependencies: ['plugin-1']
      };
      
      manager.register(plugin1);
      manager.register(plugin2);
      
      // Try to load plugin2 without plugin1
      try {
        await manager.load('plugin-2');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Missing dependency');
      }
    });

    it('should unload a plugin', async () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        hooks: [],
        dependencies: []
      };
      
      manager.register(plugin);
      await manager.load('test-plugin');
      
      await manager.unload('test-plugin');
      expect(manager.isLoaded('test-plugin')).to.be.false;
    });
  });

  describe('Hook Execution', () => {
    it('should execute onScan hooks', async () => {
      let scanCalled = false;
      
      const plugin = {
        name: 'scan-plugin',
        version: '1.0.0',
        hooks: [],
        onScan: async (context) => {
          scanCalled = true;
          return context;
        }
      };
      
      manager.register(plugin);
      await manager.load('scan-plugin');
      
      await manager.executeOnScan({ files: 10, lines: 100 });
      
      expect(scanCalled).to.be.true;
    });

    it('should execute onExport hooks', async () => {
      let exportCalled = false;
      
      const plugin = {
        name: 'export-plugin',
        version: '1.0.0',
        hooks: [],
        onExport: async (context) => {
          exportCalled = true;
          return context;
        }
      };
      
      manager.register(plugin);
      await manager.load('export-plugin');
      
      await manager.executeOnExport({ format: 'cxml', content: '' });
      
      expect(exportCalled).to.be.true;
    });

    it('should execute onRefresh hooks', async () => {
      let refreshCalled = false;
      
      const plugin = {
        name: 'refresh-plugin',
        version: '1.0.0',
        hooks: [],
        onRefresh: async (context) => {
          refreshCalled = true;
          return context;
        }
      };
      
      manager.register(plugin);
      await manager.load('refresh-plugin');
      
      await manager.executeOnRefresh({ target: 'test.js', updated: [] });
      
      expect(refreshCalled).to.be.true;
    });

    it('should pass data through hooks', async () => {
      const plugin = {
        name: 'modify-plugin',
        version: '1.0.0',
        hooks: [],
        onScan: async (context) => {
          context.data.customField = 'modified';
          return context;
        }
      };
      
      manager.register(plugin);
      await manager.load('modify-plugin');
      
      const result = await manager.executeOnScan({ files: 10 });
      
      expect(result.data.customField).to.equal('modified');
    });
  });

  describe('Plugin Factories', () => {
    it('should create a scan plugin', () => {
      const plugin = manager.createScanPlugin({
        name: 'custom-scan',
        onScan: async (ctx) => ctx
      });
      
      expect(plugin.name).to.equal('custom-scan');
      expect(plugin.onScan).to.be.a('function');
    });

    it('should create an export plugin', () => {
      const plugin = manager.createExportPlugin({
        name: 'custom-export',
        onExport: async (ctx) => ctx
      });
      
      expect(plugin.name).to.equal('custom-export');
      expect(plugin.onExport).to.be.a('function');
    });

    it('should create a refresh plugin', () => {
      const plugin = manager.createRefreshPlugin({
        name: 'custom-refresh',
        onRefresh: async (ctx) => ctx
      });
      
      expect(plugin.name).to.equal('custom-refresh');
      expect(plugin.onRefresh).to.be.a('function');
    });
  });

  describe('Statistics', () => {
    it('should provide stats', async () => {
      const plugin = {
        name: 'stats-plugin',
        version: '1.0.0',
        hooks: [],
        onScan: async (ctx) => ctx
      };
      
      manager.register(plugin);
      await manager.load('stats-plugin');
      
      const stats = manager.getStats();
      
      expect(stats.registered).to.equal(1);
      expect(stats.loaded).to.equal(1);
      expect(stats.order).to.include('stats-plugin');
    });
  });
});
