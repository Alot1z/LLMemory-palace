/**
 * Plugin Loader - Dynamic plugin loading from ~/.palace/plugins/
 * Phase 4: Plugin System
 * 
 * Features:
 * - Load plugins from local and global directories
 * - Plugin manifest validation
 * - Dependency resolution
 * - Hot reloading support
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import { getHookRegistry, createHook, HookTypes, HookPriorities } from './hooks.js';

/**
 * Plugin manifest schema
 * @typedef {Object} PluginManifest
 * @property {string} name - Plugin name (required, alphanumeric with dashes)
 * @property {string} version - Semver version (required)
 * @property {string} description - Plugin description
 * @property {string} author - Plugin author
 * @property {string} main - Entry point file (default: index.js)
 * @property {string[]} dependencies - Other plugin dependencies
 * @property {string[]} hooks - Supported hook types
 * @property {Object} config - Default configuration
 * @property {string} license - License identifier
 */

/**
 * Validated plugin structure
 * @typedef {Object} Plugin
 * @property {string} name - Plugin name
 * @property {string} version - Plugin version
 * @property {string} description - Plugin description
 * @property {string} author - Plugin author
 * @property {string[]} dependencies - Plugin dependencies
 * @property {HookDefinition[]} hooks - Registered hooks
 * @property {Object} config - Plugin configuration
 * @property {Function} [onLoad] - Called when plugin is loaded
 * @property {Function} [onUnload] - Called when plugin is unloaded
 * @property {Function} [onError] - Called on plugin errors
 */

/**
 * Default plugin directories
 */
export const PluginDirectories = {
  getGlobal() {
    return path.join(os.homedir(), '.palace', 'plugins');
  },
  
  getLocal(projectPath) {
    return path.join(projectPath, '.palace', 'plugins');
  }
};

/**
 * Plugin manifest validator
 */
export class ManifestValidator {
  static REQUIRED_FIELDS = ['name', 'version'];
  
  static VALID_NAME_PATTERN = /^[a-z0-9-]+$/;
  
  /**
   * Validate a plugin manifest
   * @param {Object} manifest - Manifest to validate
   * @returns {{valid: boolean, errors: string[]}}
   */
  static validate(manifest) {
    const errors = [];
    
    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!manifest[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate name
    if (manifest.name && !this.VALID_NAME_PATTERN.test(manifest.name)) {
      errors.push(`Invalid plugin name: ${manifest.name} (must be lowercase alphanumeric with dashes)`);
    }
    
    // Validate version (basic semver check)
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push(`Invalid version: ${manifest.version} (must be semver format)`);
    }
    
    // Validate hooks
    if (manifest.hooks) {
      const validHooks = Object.values(HookTypes);
      for (const hook of manifest.hooks) {
        if (!validHooks.includes(hook)) {
          errors.push(`Invalid hook type: ${hook}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Plugin Loader class
 */
export class PluginLoader {
  /**
   * Create a plugin loader
   * @param {Object} options - Loader options
   * @param {string} [options.projectPath] - Project path for local plugins
   * @param {boolean} [options.enableGlobal] - Enable global plugin loading
   * @param {boolean} [options.enableLocal] - Enable local plugin loading
   * @param {boolean} [options.hotReload] - Enable hot reloading
   */
  constructor(options = {}) {
    this.options = {
      projectPath: process.cwd(),
      enableGlobal: true,
      enableLocal: true,
      hotReload: false,
      ...options
    };
    
    this.loadedPlugins = new Map();
    this.pluginPaths = new Map();
    this.hookRegistry = getHookRegistry();
    this.loadOrder = [];
    this.watchers = new Map();
  }
  
  /**
   * Discover all available plugins
   * @returns {Object[]} Array of discovered plugin manifests
   */
  discover() {
    const discovered = [];
    
    // Discover global plugins
    if (this.options.enableGlobal) {
      const globalDir = PluginDirectories.getGlobal();
      const globalPlugins = this._discoverInDir(globalDir);
      for (const plugin of globalPlugins) {
        plugin.source = 'global';
      }
      discovered.push(...globalPlugins);
    }
    
    // Discover local plugins
    if (this.options.enableLocal && this.options.projectPath) {
      const localDir = PluginDirectories.getLocal(this.options.projectPath);
      const localPlugins = this._discoverInDir(localDir);
      for (const plugin of localPlugins) {
        plugin.source = 'local';
      }
      discovered.push(...localPlugins);
    }
    
    return discovered;
  }
  
  /**
   * Discover plugins in a directory
   * @private
   */
  _discoverInDir(dir) {
    const plugins = [];
    
    if (!fs.existsSync(dir)) {
      return plugins;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      
      const pluginDir = path.join(dir, entry.name);
      const manifestPath = path.join(pluginDir, 'manifest.json');
      
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          const validation = ManifestValidator.validate(manifest);
          
          plugins.push({
            name: manifest.name,
            version: manifest.version,
            path: pluginDir,
            manifest,
            valid: validation.valid,
            errors: validation.errors
          });
        } catch (error) {
          plugins.push({
            name: entry.name,
            path: pluginDir,
            valid: false,
            errors: [`Failed to parse manifest: ${error.message}`]
          });
        }
      }
    }
    
    return plugins;
  }
  
  /**
   * Load a plugin by name
   * @param {string} name - Plugin name
   * @returns {Promise<Plugin|null>} Loaded plugin or null
   */
  async load(name) {
    // Check if already loaded
    if (this.loadedPlugins.has(name)) {
      return this.loadedPlugins.get(name);
    }
    
    // Find plugin
    const discovered = this.discover();
    const pluginInfo = discovered.find(p => p.name === name);
    
    if (!pluginInfo) {
      throw new Error(`Plugin not found: ${name}`);
    }
    
    if (!pluginInfo.valid) {
      throw new Error(`Invalid plugin manifest: ${pluginInfo.errors.join(', ')}`);
    }
    
    // Check dependencies
    await this._resolveDependencies(pluginInfo.manifest.dependencies || []);
    
    // Load plugin module
    const plugin = await this._loadPluginModule(pluginInfo);
    
    if (!plugin) {
      throw new Error(`Failed to load plugin module: ${name}`);
    }
    
    // Register hooks
    if (plugin.hooks) {
      for (const hookDef of plugin.hooks) {
        const hook = createHook(hookDef.event, hookDef.handler, {
          priority: hookDef.priority || HookPriorities.DEFAULT,
          pluginName: plugin.name,
          async: hookDef.async || false
        });
        this.hookRegistry.register(hook);
      }
    }
    
    // Call onLoad
    if (plugin.onLoad) {
      try {
        await plugin.onLoad();
      } catch (error) {
        console.error(`Plugin ${name} onLoad error: ${error.message}`);
      }
    }
    
    // Store plugin
    this.loadedPlugins.set(name, plugin);
    this.pluginPaths.set(name, pluginInfo.path);
    this.loadOrder.push(name);
    
    // Setup hot reload watcher
    if (this.options.hotReload) {
      this._setupWatcher(name, pluginInfo.path);
    }
    
    return plugin;
  }
  
  /**
   * Load all discovered plugins
   * @returns {Promise<{loaded: string[], failed: Object[]}>}
   */
  async loadAll() {
    const discovered = this.discover();
    const loaded = [];
    const failed = [];
    
    // Sort by dependencies (simple topological sort)
    const sorted = this._sortByDependencies(discovered);
    
    for (const pluginInfo of sorted) {
      try {
        await this.load(pluginInfo.name);
        loaded.push(pluginInfo.name);
      } catch (error) {
        failed.push({
          name: pluginInfo.name,
          error: error.message
        });
      }
    }
    
    return { loaded, failed };
  }
  
  /**
   * Unload a plugin
   * @param {string} name - Plugin name
   * @returns {Promise<boolean>} Whether unloading succeeded
   */
  async unload(name) {
    const plugin = this.loadedPlugins.get(name);
    
    if (!plugin) {
      return false;
    }
    
    // Check if other plugins depend on this one
    for (const [pluginName, loadedPlugin] of this.loadedPlugins) {
      if (loadedPlugin.dependencies?.includes(name)) {
        throw new Error(`Cannot unload ${name}: ${pluginName} depends on it`);
      }
    }
    
    // Call onUnload
    if (plugin.onUnload) {
      try {
        await plugin.onUnload();
      } catch (error) {
        console.error(`Plugin ${name} onUnload error: ${error.message}`);
      }
    }
    
    // Unregister hooks
    this.hookRegistry.unregisterPlugin(name);
    
    // Remove from loaded plugins
    this.loadedPlugins.delete(name);
    this.pluginPaths.delete(name);
    this.loadOrder = this.loadOrder.filter(n => n !== name);
    
    // Stop watcher
    if (this.watchers.has(name)) {
      this.watchers.get(name).close();
      this.watchers.delete(name);
    }
    
    return true;
  }
  
  /**
   * Unload all plugins
   */
  async unloadAll() {
    // Unload in reverse order
    const order = [...this.loadOrder].reverse();
    
    for (const name of order) {
      try {
        await this.unload(name);
      } catch (error) {
        console.error(`Failed to unload ${name}: ${error.message}`);
      }
    }
  }
  
  /**
   * Reload a plugin
   * @param {string} name - Plugin name
   * @returns {Promise<Plugin|null>}
   */
  async reload(name) {
    await this.unload(name);
    return this.load(name);
  }
  
  /**
   * Get a loaded plugin
   * @param {string} name - Plugin name
   * @returns {Plugin|undefined}
   */
  getPlugin(name) {
    return this.loadedPlugins.get(name);
  }
  
  /**
   * Get all loaded plugins
   * @returns {Plugin[]}
   */
  getLoadedPlugins() {
    return this.loadOrder.map(name => this.loadedPlugins.get(name)).filter(Boolean);
  }
  
  /**
   * Check if a plugin is loaded
   * @param {string} name - Plugin name
   * @returns {boolean}
   */
  isLoaded(name) {
    return this.loadedPlugins.has(name);
  }
  
  /**
   * Resolve plugin dependencies
   * @private
   */
  async _resolveDependencies(dependencies) {
    for (const dep of dependencies) {
      if (!this.loadedPlugins.has(dep)) {
        await this.load(dep);
      }
    }
  }
  
  /**
   * Load a plugin module
   * @private
   */
  async _loadPluginModule(pluginInfo) {
    const mainFile = pluginInfo.manifest.main || 'index.js';
    const mainPath = path.join(pluginInfo.path, mainFile);
    
    if (!fs.existsSync(mainPath)) {
      throw new Error(`Plugin entry point not found: ${mainPath}`);
    }
    
    try {
      // Dynamic import for ES modules
      const moduleUrl = `file://${mainPath}`;
      const module = await import(moduleUrl);
      
      const plugin = module.default || module;
      
      // Apply manifest defaults
      return {
        name: pluginInfo.manifest.name,
        version: pluginInfo.manifest.version,
        description: pluginInfo.manifest.description || '',
        author: pluginInfo.manifest.author || 'unknown',
        dependencies: pluginInfo.manifest.dependencies || [],
        config: pluginInfo.manifest.config || {},
        ...plugin
      };
    } catch (error) {
      throw new Error(`Failed to import plugin: ${error.message}`);
    }
  }
  
  /**
   * Sort plugins by dependencies
   * @private
   */
  _sortByDependencies(plugins) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (plugin) => {
      if (visited.has(plugin.name)) {
        return;
      }
      
      if (visiting.has(plugin.name)) {
        console.warn(`Circular dependency detected: ${plugin.name}`);
        return;
      }
      
      visiting.add(plugin.name);
      
      const deps = plugin.manifest.dependencies || [];
      for (const dep of deps) {
        const depPlugin = plugins.find(p => p.name === dep);
        if (depPlugin) {
          visit(depPlugin);
        }
      }
      
      visiting.delete(plugin.name);
      visited.add(plugin.name);
      sorted.push(plugin);
    };
    
    for (const plugin of plugins) {
      visit(plugin);
    }
    
    return sorted;
  }
  
  /**
   * Setup file watcher for hot reload
   * @private
   */
  _setupWatcher(name, pluginPath) {
    if (this.watchers.has(name)) {
      return;
    }
    
    try {
      const watcher = fs.watch(pluginPath, { recursive: true }, async (event, filename) => {
        if (filename.endsWith('.js') || filename.endsWith('.json')) {
          console.log(`Plugin ${name} changed, reloading...`);
          await this.reload(name);
        }
      });
      
      this.watchers.set(name, watcher);
    } catch (error) {
      console.warn(`Failed to setup watcher for ${name}: ${error.message}`);
    }
  }
  
  /**
   * Get loader statistics
   * @returns {Object}
   */
  getStats() {
    return {
      loaded: this.loadedPlugins.size,
      order: [...this.loadOrder],
      paths: Object.fromEntries(this.pluginPaths),
      hooks: this.hookRegistry.getStats()
    };
  }
}

// Singleton instance
let loaderInstance = null;

/**
 * Get the global plugin loader
 * @param {Object} options - Loader options
 * @returns {PluginLoader}
 */
export function getPluginLoader(options = {}) {
  if (!loaderInstance) {
    loaderInstance = new PluginLoader(options);
  }
  return loaderInstance;
}

/**
 * Create a new plugin loader
 * @param {Object} options - Loader options
 * @returns {PluginLoader}
 */
export function createPluginLoader(options = {}) {
  return new PluginLoader(options);
}

export default {
  PluginDirectories,
  ManifestValidator,
  PluginLoader,
  getPluginLoader,
  createPluginLoader
};
