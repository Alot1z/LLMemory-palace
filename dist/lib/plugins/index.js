/**
 * Plugin System - Main entry point
 * Phase 4: Plugin System
 * 
 * Exports:
 * - PluginManager - Main plugin management class
 * - HookTypes, HookPriorities - Hook constants
 * - createHook, createHookContext - Hook utilities
 * - PluginLoader, PluginDirectories, ManifestValidator - Loading utilities
 */

// Main manager
export {
  PluginManager,
  getPluginManager,
  createPluginManager,
  HookTypes,
  HookPriorities,
  createHook,
  createHookContext
} from './plugin-manager.js';

// Hook system
export {
  HookRegistry,
  getHookRegistry,
  resetHookRegistry
} from './hooks.js';

// Loader system
export {
  PluginLoader,
  PluginDirectories,
  ManifestValidator,
  getPluginLoader,
  createPluginLoader
} from './loader.js';

// Default export
export { PluginManager as default } from './plugin-manager.js';
