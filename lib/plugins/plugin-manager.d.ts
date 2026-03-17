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
    validate: (index: CodeIndex) => Promise<{
        valid: boolean;
        errors: string[];
    }>;
    severity: 'error' | 'warning' | 'info';
}
export declare class PluginManager {
    private plugins;
    private hooks;
    private loaded;
    private order;
    private context;
    constructor();
    register(plugin: Plugin): boolean;
    unregister(name: string): boolean;
    load(name: string): Promise<boolean>;
    unload(name: string): Promise<boolean>;
    executeHook(event: PluginHook['event'], context: PluginContext): Promise<PluginResult>;
    getPlugin(name: string): Plugin | undefined;
    getPlugins(): Plugin[];
    getLoadedPlugins(): Plugin[];
    getHooks(event: PluginHook['event']): PluginHook[];
    hasPlugin(name: string): boolean;
    isLoaded(name: string): boolean;
    createCompressionPlugin(config: {
        name: string;
        compressFn: (data: Buffer, level: number) => Promise<Buffer>;
        decompressFn: (data: Buffer) => Promise<Buffer>;
    }): CompressionPlugin;
    createPatternPlugin(config: {
        name: string;
        languages: string[];
        extractFn: (source: string) => Promise<PatternInfo[]>;
        applyFn: (pattern: PatternInfo, context: PluginContext) => Promise<string>;
    }): PatternPlugin;
    createValidatorPlugin(config: {
        name: string;
        validateFn: (index: CodeIndex) => Promise<{
            valid: boolean;
            errors: string[];
        }>;
        severity: 'error' | 'warning' | 'info';
    }): ValidatorPlugin;
    loadAll(): Promise<{
        loaded: string[];
        failed: string[];
    }>;
    unloadAll(): Promise<void>;
    clear(): void;
    exportConfig(): {
        plugins: Plugin[];
        order: string[];
    };
    importConfig(config: {
        plugins: Plugin[];
        order: string[];
    }): void;
}
export declare function getPluginManager(): PluginManager;
export declare function createPluginManager(): PluginManager;
//# sourceMappingURL=plugin-manager.d.ts.map