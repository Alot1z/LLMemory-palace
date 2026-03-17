/**
 * Plugin Manager - Extensible plugin system
 * Phase 4: Plugin System
 */

import type { CodeIndex, PatternInfo, SymbolInfo } from '../types.js';

export interface Plugin {
  name: string;
  version: string;
  description: string;
  author: string;
  hooks: PluginHook[];
  dependencies: string[];
}

export interface PluginHook {
  event: 'pre-encode' | 'post-encode' | 'pre-decode' | 'post-decode' | 'pre-compress' | 'post-compress' | 'pre-reconstruct' | 'post-reconstruct';
  handler: HookHandler;
  priority: number;
}

export type HookHandler = (context: PluginContext) => Promise<PluginContext>;

export interface PluginContext {
  data: unknown;
  metadata: Record<string, unknown>;
  index?: CodeIndex;
  patterns?: PatternInfo[];
  symbols?: SymbolInfo[];
  errors: string[];
  warnings: string[];
}

export interface PluginResult {
  success: boolean;
  data?: unknown;
  errors: string[];
  warnings: string[];
  modifiedBy: string[];
}

export interface CompressionPlugin extends Plugin {
  compress: (data: Buffer, level: number) => Promise<Buffer>;
  decompress: (data: Buffer) => Promise<Buffer>;
  getName: () => string;
  getRatio: () => number;
}

export interface PatternPlugin extends Plugin {
  extract: (source: string) => Promise<PatternInfo[]>;
  apply: (pattern: PatternInfo, context: PluginContext) => Promise<string>;
  supportedLanguages: string[];
}

export interface ValidatorPlugin extends Plugin {
  validate: (index: CodeIndex) => Promise<{ valid: boolean; errors: string[] }>;
  severity: 'error' | 'warning' | 'info';
}

export class PluginManager {
  private plugins: Map<string, Plugin>;
  private hooks: Map<string, PluginHook[]>;
  private loaded: Set<string>;
  private order: string[];
  private context: PluginContext;

  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.loaded = new Set();
    this.order = [];
    this.context = {
      data: null,
      metadata: {},
      errors: [],
      warnings: []
    };
  }

  register(plugin: Plugin): boolean {
    if (this.plugins.has(plugin.name)) {
      return false;
    }

    this.plugins.set(plugin.name, plugin);
    
    for (const hook of plugin.hooks) {
      const hooks = this.hooks.get(hook.event) || [];
      hooks.push(hook);
      hooks.sort((a, b) => b.priority - a.priority);
      this.hooks.set(hook.event, hooks);
    }

    this.order.push(plugin.name);
    return true;
  }

  unregister(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    this.plugins.delete(name);
    this.loaded.delete(name);
    this.order = this.order.filter(n => n !== name);

    for (const hook of plugin.hooks) {
      const hooks = this.hooks.get(hook.event) || [];
      const filtered = hooks.filter(h => h.handler !== hook.handler);
      this.hooks.set(hook.event, filtered);
    }

    return true;
  }

  async load(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    // Check dependencies
    for (const dep of plugin.dependencies) {
      if (!this.loaded.has(dep)) {
        throw new Error(`Missing dependency: ${dep} for plugin ${name}`);
      }
    }

    this.loaded.add(name);
    return true;
  }

  async unload(name: string): Promise<boolean> {
    if (!this.loaded.has(name)) return false;
    this.loaded.delete(name);
    return true;
  }

  async executeHook(event: PluginHook['event'], context: PluginContext): Promise<PluginResult> {
    const hooks = this.hooks.get(event) || [];
    const modifiedBy: string[] = [];
    let currentContext = { ...context };

    for (const hook of hooks) {
      try {
        const before = JSON.stringify(currentContext);
        currentContext = await hook.handler(currentContext);
        const after = JSON.stringify(currentContext);
        
        if (before !== after) {
          modifiedBy.push(hook.handler.name || 'anonymous');
        }
      } catch (error) {
        currentContext.errors.push(
          `Hook error in ${event}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      success: currentContext.errors.length === 0,
      data: currentContext.data,
      errors: currentContext.errors,
      warnings: currentContext.warnings,
      modifiedBy
    };
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getPlugins(): Plugin[] {
    return this.order.map(name => this.plugins.get(name)!).filter(Boolean);
  }

  getLoadedPlugins(): Plugin[] {
    return this.order
      .filter(name => this.loaded.has(name))
      .map(name => this.plugins.get(name)!)
      .filter(Boolean);
  }

  getHooks(event: PluginHook['event']): PluginHook[] {
    return this.hooks.get(event) || [];
  }

  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  isLoaded(name: string): boolean {
    return this.loaded.has(name);
  }

  // Plugin factory methods
  createCompressionPlugin(config: {
    name: string;
    compressFn: (data: Buffer, level: number) => Promise<Buffer>;
    decompressFn: (data: Buffer) => Promise<Buffer>;
  }): CompressionPlugin {
    return {
      name: config.name,
      version: '1.0.0',
      description: 'Custom compression plugin',
      author: 'system',
      hooks: [],
      dependencies: [],
      compress: config.compressFn,
      decompress: config.decompressFn,
      getName: () => config.name,
      getRatio: () => 0.5
    };
  }

  createPatternPlugin(config: {
    name: string;
    languages: string[];
    extractFn: (source: string) => Promise<PatternInfo[]>;
    applyFn: (pattern: PatternInfo, context: PluginContext) => Promise<string>;
  }): PatternPlugin {
    return {
      name: config.name,
      version: '1.0.0',
      description: 'Custom pattern plugin',
      author: 'system',
      hooks: [],
      dependencies: [],
      extract: config.extractFn,
      apply: config.applyFn,
      supportedLanguages: config.languages
    };
  }

  createValidatorPlugin(config: {
    name: string;
    validateFn: (index: CodeIndex) => Promise<{ valid: boolean; errors: string[] }>;
    severity: 'error' | 'warning' | 'info';
  }): ValidatorPlugin {
    return {
      name: config.name,
      version: '1.0.0',
      description: 'Custom validator plugin',
      author: 'system',
      hooks: [],
      dependencies: [],
      validate: config.validateFn,
      severity: config.severity
    };
  }

  // Batch operations
  async loadAll(): Promise<{ loaded: string[]; failed: string[] }> {
    const loaded: string[] = [];
    const failed: string[] = [];

    for (const name of this.order) {
      try {
        await this.load(name);
        loaded.push(name);
      } catch {
        failed.push(name);
      }
    }

    return { loaded, failed };
  }

  async unloadAll(): Promise<void> {
    for (const name of [...this.loaded]) {
      await this.unload(name);
    }
  }

  clear(): void {
    this.plugins.clear();
    this.hooks.clear();
    this.loaded.clear();
    this.order = [];
  }

  // Export/Import plugin configurations
  exportConfig(): { plugins: Plugin[]; order: string[] } {
    return {
      plugins: this.getPlugins(),
      order: [...this.order]
    };
  }

  importConfig(config: { plugins: Plugin[]; order: string[] }): void {
    this.clear();
    for (const plugin of config.plugins) {
      this.register(plugin);
    }
    this.order = config.order;
  }
}

// Singleton instance
let instance: PluginManager | null = null;

export function getPluginManager(): PluginManager {
  if (!instance) {
    instance = new PluginManager();
  }
  return instance;
}

export function createPluginManager(): PluginManager {
  return new PluginManager();
}
