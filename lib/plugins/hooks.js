/**
 * Plugin Hooks System - Lifecycle hooks for palace operations
 * Phase 4: Plugin System
 * 
 * Provides hooks for:
 * - onScan: Before/after file scanning
 * - onExport: Before/after export operations
 * - onRefresh: Before/after refresh operations
 */

/**
 * Hook types supported by the plugin system
 * @enum {string}
 */
export const HookTypes = {
  // Scan lifecycle
  BEFORE_SCAN: 'beforeScan',
  AFTER_SCAN: 'afterScan',
  ON_FILE_SCAN: 'onFileScan',
  
  // Export lifecycle
  BEFORE_EXPORT: 'beforeExport',
  AFTER_EXPORT: 'afterExport',
  ON_FILE_EXPORT: 'onFileExport',
  
  // Refresh lifecycle
  BEFORE_REFRESH: 'beforeRefresh',
  AFTER_REFRESH: 'afterRefresh',
  ON_FILE_REFRESH: 'onFileRefresh',
  
  // Config lifecycle
  BEFORE_CONFIG_CHANGE: 'beforeConfigChange',
  AFTER_CONFIG_CHANGE: 'afterConfigChange',
  
  // Pattern lifecycle
  ON_PATTERN_DETECTED: 'onPatternDetected',
  ON_PATTERN_REGISTERED: 'onPatternRegistered',
  
  // Flow lifecycle
  ON_FLOW_DETECTED: 'onFlowDetected',
  ON_FLOW_REGISTERED: 'onFlowRegistered',
  
  // Error handling
  ON_ERROR: 'onError',
  ON_WARNING: 'onWarning'
};

/**
 * Default hook priorities
 * Higher numbers execute first
 * @enum {number}
 */
export const HookPriorities = {
  HIGHEST: 1000,
  HIGH: 750,
  NORMAL: 500,
  LOW: 250,
  LOWEST: 100,
  DEFAULT: 500
};

/**
 * Hook context structure
 * @typedef {Object} HookContext
 * @property {string} hookType - Type of hook being executed
 * @property {Object} data - Data being processed
 * @property {Object} metadata - Additional metadata
 * @property {string[]} errors - Error messages
 * @property {string[]} warnings - Warning messages
 * @property {boolean} cancelled - Whether the operation was cancelled
 */

/**
 * Create a new hook context
 * @param {string} hookType - Type of hook
 * @param {Object} initialData - Initial data
 * @returns {HookContext}
 */
export function createHookContext(hookType, initialData = {}) {
  return {
    hookType,
    data: { ...initialData },
    metadata: {
      timestamp: new Date().toISOString(),
      hookType,
      pluginName: null
    },
    errors: [],
    warnings: [],
    cancelled: false,
    cancel() {
      this.cancelled = true;
    },
    addError(message) {
      this.errors.push(message);
    },
    addWarning(message) {
      this.warnings.push(message);
    }
  };
}

/**
 * Hook definition structure
 * @typedef {Object} HookDefinition
 * @property {string} event - Hook event type
 * @property {Function} handler - Handler function
 * @property {number} priority - Execution priority (higher = earlier)
 * @property {string} [pluginName] - Name of the plugin that registered this hook
 * @property {boolean} [async] - Whether the handler is async
 */

/**
 * Create a hook definition
 * @param {string} event - Hook event type
 * @param {Function} handler - Handler function
 * @param {Object} options - Hook options
 * @returns {HookDefinition}
 */
export function createHook(event, handler, options = {}) {
  const {
    priority = HookPriorities.DEFAULT,
    pluginName = 'anonymous',
    async = false
  } = options;
  
  if (!Object.values(HookTypes).includes(event)) {
    throw new Error(`Invalid hook type: ${event}`);
  }
  
  if (typeof handler !== 'function') {
    throw new Error('Hook handler must be a function');
  }
  
  return {
    event,
    handler,
    priority,
    pluginName,
    async
  };
}

/**
 * Hook registry for managing hooks
 */
export class HookRegistry {
  constructor() {
    this.hooks = new Map();
    
    // Initialize all hook types
    for (const type of Object.values(HookTypes)) {
      this.hooks.set(type, []);
    }
  }
  
  /**
   * Register a hook
   * @param {HookDefinition} hook - Hook to register
   * @returns {boolean} Whether registration succeeded
   */
  register(hook) {
    const hooks = this.hooks.get(hook.event);
    if (!hooks) {
      return false;
    }
    
    hooks.push(hook);
    hooks.sort((a, b) => b.priority - a.priority);
    
    return true;
  }
  
  /**
   * Unregister a hook
   * @param {string} event - Hook event type
   * @param {Function} handler - Handler to unregister
   * @returns {boolean} Whether unregistration succeeded
   */
  unregister(event, handler) {
    const hooks = this.hooks.get(event);
    if (!hooks) {
      return false;
    }
    
    const index = hooks.findIndex(h => h.handler === handler);
    if (index === -1) {
      return false;
    }
    
    hooks.splice(index, 1);
    return true;
  }
  
  /**
   * Unregister all hooks from a plugin
   * @param {string} pluginName - Plugin name
   * @returns {number} Number of hooks removed
   */
  unregisterPlugin(pluginName) {
    let removed = 0;
    
    for (const [event, hooks] of this.hooks) {
      const filtered = hooks.filter(h => h.pluginName !== pluginName);
      removed += hooks.length - filtered.length;
      this.hooks.set(event, filtered);
    }
    
    return removed;
  }
  
  /**
   * Get all hooks for an event
   * @param {string} event - Hook event type
   * @returns {HookDefinition[]} Hooks for the event
   */
  getHooks(event) {
    return this.hooks.get(event) || [];
  }
  
  /**
   * Execute all hooks for an event
   * @param {string} event - Hook event type
   * @param {HookContext} context - Hook context
   * @returns {Promise<HookContext>} Modified context
   */
  async execute(event, context) {
    const hooks = this.getHooks(event);
    
    for (const hook of hooks) {
      if (context.cancelled) {
        break;
      }
      
      try {
        context.metadata.pluginName = hook.pluginName;
        
        if (hook.async) {
          await hook.handler(context);
        } else {
          hook.handler(context);
        }
      } catch (error) {
        context.addError(`Hook error in ${hook.pluginName}: ${error.message}`);
      }
    }
    
    return context;
  }
  
  /**
   * Clear all hooks
   */
  clear() {
    for (const type of Object.values(HookTypes)) {
      this.hooks.set(type, []);
    }
  }
  
  /**
   * Get hook statistics
   * @returns {Object} Statistics about registered hooks
   */
  getStats() {
    const stats = {
      total: 0,
      byType: {},
      byPlugin: {}
    };
    
    for (const [event, hooks] of this.hooks) {
      stats.byType[event] = hooks.length;
      stats.total += hooks.length;
      
      for (const hook of hooks) {
        stats.byPlugin[hook.pluginName] = (stats.byPlugin[hook.pluginName] || 0) + 1;
      }
    }
    
    return stats;
  }
}

// Singleton registry
let registryInstance = null;

/**
 * Get the global hook registry
 * @returns {HookRegistry}
 */
export function getHookRegistry() {
  if (!registryInstance) {
    registryInstance = new HookRegistry();
  }
  return registryInstance;
}

/**
 * Reset the global hook registry
 */
export function resetHookRegistry() {
  if (registryInstance) {
    registryInstance.clear();
  }
  registryInstance = new HookRegistry();
}

export default {
  HookTypes,
  HookPriorities,
  createHookContext,
  createHook,
  HookRegistry,
  getHookRegistry,
  resetHookRegistry
};
