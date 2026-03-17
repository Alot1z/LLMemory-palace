/**
 * Plugin Manager - Extensible plugin system
 * Phase 4: Plugin System
 * 
 * Enhanced with:
 * - onScan, onExport, onRefresh hooks
 * - Integration with PluginLoader for ~/.palace/plugins/
 * - Plugin manifest support
 */

import {
  HookTypes,
  HookPriorities,
  createHook,
  createHookContext,
  HookRegistry,
  getHookRegistry
} from './hooks.js';

import {
  PluginLoader,
  PluginDirectories,
  ManifestValidator,
  getPluginLoader
} from './loader.js';

/**
 * @typedef {Object} Plugin
 * @property {string} name - Plugin name
 * @property {string} version - Plugin version
 * @property {string} description - Plugin description
 * @property {string} author - Plugin author
 * @property {string[]} dependencies - Plugin dependencies
 * @property {HookDefinition[]} hooks - Registered hooks
 * @property {Object} config - Plugin configuration
 * @property {Function} [onScan] - Scan hook handler
 * @property {Function} [onExport] - Export hook handler
 * @property {Function} [onRefresh] - Refresh hook handler
 */

export class PluginManager {
  constructor(options = {}) {
    this.plugins = new Map();
    this.loaded = new Set();
    this.order = [];
    this.context = {
      data: null,
      metadata: {},
      errors: [],
      warnings: []
    };
    
    // Enhanced features
    this.hookRegistry = getHookRegistry();
    this.loader = options.loader || getPluginLoader({
      projectPath: options.projectPath,
      enableGlobal: options.enableGlobal !== false,
      enableLocal: options.enableLocal !== false,
      hotReload: options.hotReload || false
    });
    
    this.options = options;
  }
  
  /**
   * Register a plugin
   * @param {Plugin} plugin - Plugin to register
   * @returns {boolean} Whether registration succeeded
   */
  register(plugin) {
    if (this.plugins.has(plugin.name)) {
      return false;
    }
    
    this.plugins.set(plugin.name, plugin);
    
    // Register lifecycle hooks
    this._registerLifecycleHooks(plugin);
    
    this.order.push(plugin.name);
    return true;
  }
  
  /**
   * Register lifecycle hooks for a plugin
   * @private
   */
  _registerLifecycleHooks(plugin) {
    // onScan hook
    if (plugin.onScan) {
      const hook = createHook(HookTypes.AFTER_SCAN, plugin.onScan, {
        priority: plugin.scanPriority || HookPriorities.NORMAL,
        pluginName: plugin.name
      });
      this.hookRegistry.register(hook);
    }
    
    // onExport hook
    if (plugin.onExport) {
      const hook = createHook(HookTypes.AFTER_EXPORT, plugin.onExport, {
        priority: plugin.exportPriority || HookPriorities.NORMAL,
        pluginName: plugin.name
      });
      this.hookRegistry.register(hook);
    }
    
    // onRefresh hook
    if (plugin.onRefresh) {
      const hook = createHook(HookTypes.AFTER_REFRESH, plugin.onRefresh, {
        priority: plugin.refreshPriority || HookPriorities.NORMAL,
        pluginName: plugin.name
      });
      this.hookRegistry.register(hook);
    }
    
    // Register custom hooks
    if (plugin.hooks && Array.isArray(plugin.hooks)) {
      for (const hookDef of plugin.hooks) {
        const hook = createHook(hookDef.event, hookDef.handler, {
          priority: hookDef.priority || HookPriorities.NORMAL,
          pluginName: plugin.name
        });
        this.hookRegistry.register(hook);
      }
    }
  }
  
  /**
   * Unregister a plugin
   * @param {string} name - Plugin name
   * @returns {boolean} Whether unregistration succeeded
   */
  unregister(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }
    
    this.plugins.delete(name);
    this.loaded.delete(name);
    this.order = this.order.filter(n => n !== name);
    
    // Unregister hooks
    this.hookRegistry.unregisterPlugin(name);
    
    return true;
  }
  
  /**
   * Load a plugin by name from plugin directories
   * @param {string} name - Plugin name
   * @returns {Promise<Plugin|null>}
   */
  async load(name) {
    // Check if already loaded
    if (this.loaded.has(name)) {
      return this.plugins.get(name);
    }
    
    // Try to load from loader
    try {
      const plugin = await this.loader.load(name);
      
      if (plugin) {
        // Register the loaded plugin
        this.register(plugin);
        this.loaded.add(name);
        return plugin;
      }
    } catch (error) {
      // Fall back to manual registration
      const existingPlugin = this.plugins.get(name);
      if (existingPlugin) {
        // Check dependencies
        for (const dep of existingPlugin.dependencies || []) {
          if (!this.loaded.has(dep)) {
            throw new Error(`Missing dependency: ${dep} for plugin ${name}`);
          }
        }
        this.loaded.add(name);
        return existingPlugin;
      }
      
      throw error;
    }
    
    return null;
  }
  
  /**
   * Load all plugins from plugin directories
   * @returns {Promise<{loaded: string[], failed: Object[]}>}
   */
  async loadAll() {
    // Load from loader first
    const loaderResult = await this.loader.loadAll();
    
    // Also load any manually registered plugins
    for (const name of this.order) {
      if (!this.loaded.has(name)) {
        try {
          await this.load(name);
        } catch (error) {
          if (!loaderResult.failed.find(f => f.name === name)) {
            loaderResult.failed.push({ name, error: error.message });
          }
        }
      }
    }
    
    return loaderResult;
  }
  
  /**
   * Unload a plugin
   * @param {string} name - Plugin name
   * @returns {Promise<boolean>}
   */
  async unload(name) {
    if (!this.loaded.has(name)) {
      return false;
    }
    
    // Check if other plugins depend on this one
    for (const [pluginName, plugin] of this.plugins) {
      if (plugin.dependencies?.includes(name) && this.loaded.has(pluginName)) {
        throw new Error(`Cannot unload ${name}: ${pluginName} depends on it`);
      }
    }
    
    // Unload from loader
    try {
      await this.loader.unload(name);
    } catch (error) {
      // Ignore loader errors for manually registered plugins
    }
    
    this.loaded.delete(name);
    return true;
  }
  
  /**
   * Unload all plugins
   */
  async unloadAll() {
    const order = [...this.loaded].reverse();
    
    for (const name of order) {
      try {
        await this.unload(name);
      } catch (error) {
        console.error(`Failed to unload ${name}: ${error.message}`);
      }
    }
  }
  
  // ============================================
  // HOOK EXECUTION METHODS
  // ============================================
  
  /**
   * Execute onScan hooks
   * @param {Object} scanResult - Scan result data
   * @returns {Promise<Object>} Modified scan result
   */
  async executeOnScan(scanResult) {
    const context = createHookContext(HookTypes.AFTER_SCAN, {
      files: scanResult.files,
      lines: scanResult.lines,
      size: scanResult.size,
      languages: scanResult.languages,
      patterns: scanResult.patterns,
      flows: scanResult.flows,
      rawResult: scanResult
    });
    
    const result = await this.hookRegistry.execute(HookTypes.AFTER_SCAN, context);
    
    return {
      ...scanResult,
      data: result.data,
      errors: result.errors,
      warnings: result.warnings,
      modifiedBy: result.modifiedBy
    };
  }
  
  /**
   * Execute onExport hooks
   * @param {Object} exportData - Export data
   * @returns {Promise<Object>} Modified export data
   */
  async executeOnExport(exportData) {
    const context = createHookContext(HookTypes.AFTER_EXPORT, {
      format: exportData.format,
      content: exportData.content,
      level: exportData.level,
      compressed: exportData.compressed,
      rawData: exportData
    });
    
    const result = await this.hookRegistry.execute(HookTypes.AFTER_EXPORT, context);
    
    return {
      ...exportData,
      data: result.data,
      errors: result.errors,
      warnings: result.warnings,
      modifiedBy: result.modifiedBy
    };
  }
  
  /**
   * Execute onRefresh hooks
   * @param {Object} refreshResult - Refresh result data
   * @returns {Promise<Object>} Modified refresh result
   */
  async executeOnRefresh(refreshResult) {
    const context = createHookContext(HookTypes.AFTER_REFRESH, {
      target: refreshResult.target,
      updated: refreshResult.updated,
      skipped: refreshResult.skipped,
      affected: refreshResult.affected,
      changes: refreshResult.changes,
      rawResult: refreshResult
    });
    
    const result = await this.hookRegistry.execute(HookTypes.AFTER_REFRESH, context);
    
    return {
      ...refreshResult,
      data: result.data,
      errors: result.errors,
      warnings: result.warnings,
      modifiedBy: result.modifiedBy
    };
  }
  
  /**
   * Execute a custom hook
   * @param {string} event - Hook event type
   * @param {Object} context - Hook context
   * @returns {Promise<Object>}
   */
  async executeHook(event, context) {
    const hookContext = createHookContext(event, context);
    const result = await this.hookRegistry.execute(event, hookContext);
    
    return {
      success: result.errors.length === 0,
      data: result.data,
      errors: result.errors,
      warnings: result.warnings,
      modifiedBy: result.modifiedBy
    };
  }
  
  // ============================================
  // PLUGIN FACTORY METHODS
  // ============================================
  
  /**
   * Create a compression plugin
   * @param {Object} config - Plugin configuration
   * @returns {Plugin}
   */
  createCompressionPlugin(config) {
    return {
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description || 'Custom compression plugin',
      author: config.author || 'system',
      hooks: [],
      dependencies: config.dependencies || [],
      compress: config.compressFn,
      decompress: config.decompressFn,
      getName: () => config.name,
      getRatio: () => config.ratio || 0.5
    };
  }
  
  /**
   * Create a pattern plugin
   * @param {Object} config - Plugin configuration
   * @returns {Plugin}
   */
  createPatternPlugin(config) {
    return {
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description || 'Custom pattern plugin',
      author: config.author || 'system',
      hooks: [],
      dependencies: config.dependencies || [],
      extract: config.extractFn,
      apply: config.applyFn,
      supportedLanguages: config.languages || []
    };
  }
  
  /**
   * Create a validator plugin
   * @param {Object} config - Plugin configuration
   * @returns {Plugin}
   */
  createValidatorPlugin(config) {
    return {
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description || 'Custom validator plugin',
      author: config.author || 'system',
      hooks: [],
      dependencies: config.dependencies || [],
      validate: config.validateFn,
      severity: config.severity || 'error'
    };
  }
  
  /**
   * Create a scan hook plugin
   * @param {Object} config - Plugin configuration
   * @returns {Plugin}
   */
  createScanPlugin(config) {
    return {
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description || 'Scan hook plugin',
      author: config.author || 'system',
      hooks: [],
      dependencies: config.dependencies || [],
      onScan: config.onScan,
      scanPriority: config.priority || HookPriorities.NORMAL
    };
  }
  
  /**
   * Create an export hook plugin
   * @param {Object} config - Plugin configuration
   * @returns {Plugin}
   */
  createExportPlugin(config) {
    return {
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description || 'Export hook plugin',
      author: config.author || 'system',
      hooks: [],
      dependencies: config.dependencies || [],
      onExport: config.onExport,
      exportPriority: config.priority || HookPriorities.NORMAL
    };
  }
  
  /**
   * Create a refresh hook plugin
   * @param {Object} config - Plugin configuration
   * @returns {Plugin}
   */
  createRefreshPlugin(config) {
    return {
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description || 'Refresh hook plugin',
      author: config.author || 'system',
      hooks: [],
      dependencies: config.dependencies || [],
      onRefresh: config.onRefresh,
      refreshPriority: config.priority || HookPriorities.NORMAL
    };
  }
  
  // ============================================
  // UTILITY METHODS
  // ============================================
  
  /**
   * Get a plugin by name
   * @param {string} name - Plugin name
   * @returns {Plugin|undefined}
   */
  getPlugin(name) {
    return this.plugins.get(name);
  }
  
  /**
   * Get all registered plugins
   * @returns {Plugin[]}
   */
  getPlugins() {
    return this.order.map(name => this.plugins.get(name)).filter(Boolean);
  }
  
  /**
   * Get all loaded plugins
   * @returns {Plugin[]}
   */
  getLoadedPlugins() {
    return this.order
      .filter(name => this.loaded.has(name))
      .map(name => this.plugins.get(name))
      .filter(Boolean);
  }
  
  /**
   * Get hooks for an event
   * @param {string} event - Hook event type
   * @returns {HookDefinition[]}
   */
  getHooks(event) {
    return this.hookRegistry.getHooks(event);
  }
  
  /**
   * Check if a plugin is registered
   * @param {string} name - Plugin name
   * @returns {boolean}
   */
  hasPlugin(name) {
    return this.plugins.has(name);
  }
  
  /**
   * Check if a plugin is loaded
   * @param {string} name - Plugin name
   * @returns {boolean}
   */
  isLoaded(name) {
    return this.loaded.has(name);
  }
  
  /**
   * Discover available plugins
   * @returns {Object[]} Discovered plugins
   */
  discover() {
    return this.loader.discover();
  }
  
  /**
   * Clear all plugins
   */
  clear() {
    this.plugins.clear();
    this.loaded.clear();
    this.order = [];
    this.hookRegistry.clear();
  }
  
  /**
   * Export plugin configuration
   * @returns {Object}
   */
  exportConfig() {
    return {
      plugins: this.getPlugins().map(p => ({
        name: p.name,
        version: p.version,
        dependencies: p.dependencies
      })),
      order: [...this.order]
    };
  }
  
  /**
   * Import plugin configuration
   * @param {Object} config - Configuration to import
   */
  importConfig(config) {
    this.clear();
    for (const plugin of config.plugins) {
      this.register(plugin);
    }
    this.order = config.order;
  }
  
  /**
   * Get statistics about the plugin system
   * @returns {Object}
   */
  getStats() {
    return {
      registered: this.plugins.size,
      loaded: this.loaded.size,
      order: [...this.order],
      hooks: this.hookRegistry.getStats(),
      loader: this.loader.getStats()
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get the global plugin manager
 * @param {Object} options - Manager options
 * @returns {PluginManager}
 */
export function getPluginManager(options = {}) {
  if (!instance) {
    instance = new PluginManager(options);
  }
  return instance;
}

/**
 * Create a new plugin manager
 * @param {Object} options - Manager options
 * @returns {PluginManager}
 */
export function createPluginManager(options = {}) {
  return new PluginManager(options);
}

// Re-export types and utilities
export { HookTypes, HookPriorities, createHook, createHookContext };
export { PluginLoader, PluginDirectories, ManifestValidator };

export default PluginManager;
