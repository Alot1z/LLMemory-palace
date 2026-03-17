/**
 * LLMemory-Palace v3.0 - Pattern Library
 *
 * Stores and expands code patterns for compression.
 * Direct port from v2.6.0 with TypeScript interfaces.
 *
 * @module patterns/pattern-library
 * @version 3.0.0
 */
import type { Pattern, PatternInstance, PatternRegistrationOptions, PatternListItem, ExtractedPattern, FoundPatternInstance, Language } from '../types.js';
/**
 * PatternLibrary manages code patterns for compression and generation.
 *
 * @example
 * ```typescript
 * const library = new PatternLibrary();
 *
 * // Expand a pattern
 * const code = library.expand('CRUD_ENTITY', {
 *   action: 'get',
 *   entity: 'User',
 *   method: 'findUnique',
 *   id: 'id'
 * });
 *
 * // Register custom pattern
 * library.register('MY_PATTERN', {
 *   template: 'function {name}() { return {value}; }',
 *   instances: []
 * });
 * ```
 */
export declare class PatternLibrary {
    private patterns;
    constructor();
    /**
     * Load built-in patterns for common code constructs
     * @private
     */
    private loadBuiltInPatterns;
    /**
     * Register a new pattern
     *
     * @param name - Unique pattern name
     * @param options - Pattern registration options
     */
    register(name: string, options: PatternRegistrationOptions): void;
    /**
     * Get a pattern by name
     *
     * @param name - Pattern name
     * @returns Pattern definition or undefined
     */
    get(name: string): Pattern | undefined;
    /**
     * Check if a pattern exists
     *
     * @param name - Pattern name
     * @returns True if pattern exists
     */
    has(name: string): boolean;
    /**
     * Get all patterns as entries
     *
     * @returns Iterable of pattern entries
     */
    getAll(): IterableIterator<[string, Pattern]>;
    /**
     * Add an instance to a pattern
     *
     * @param patternName - Pattern name
     * @param instance - Instance parameters
     */
    addInstance(patternName: string, instance: PatternInstance): void;
    /**
     * Extract patterns from code content
     *
     * @param content - Code content to analyze
     * @param language - Programming language
     * @returns Array of extracted patterns
     */
    extractPatterns(content: string, language: Language): ExtractedPattern[];
    /**
     * Expand a pattern with given parameters
     *
     * @param patternName - Name of the pattern to expand
     * @param params - Parameters to substitute
     * @returns Expanded code or null if pattern not found
     *
     * @example
     * ```typescript
     * const code = library.expand('CRUD_ENTITY', {
     *   action: 'get',
     *   entity: 'User',
     *   method: 'findUnique',
     *   id: 'id'
     * });
     * ```
     */
    expand(patternName: string, params: PatternInstance): string | null;
    /**
     * Compress content by replacing patterns
     *
     * @param content - Content to compress
     * @param language - Programming language
     * @returns Compressed content with pattern references
     */
    compress(content: string, language: Language): string;
    /**
     * Find instances of a pattern in content
     *
     * @param content - Content to search
     * @param template - Pattern template
     * @returns Array of found instances
     */
    findPatternInstances(content: string, template: string): FoundPatternInstance[];
    /**
     * Find patterns suitable for a module
     *
     * @param moduleName - Module name to search for
     * @returns Array of matching patterns
     */
    findForModule(moduleName: string): (Pattern & {
        name: string;
    })[];
    /**
     * List all patterns with summary info
     *
     * @returns Array of pattern list items
     */
    list(): PatternListItem[];
    /**
     * Get all pattern names
     *
     * @returns Array of pattern names
     */
    names(): string[];
    /**
     * Get the number of patterns
     *
     * @returns Pattern count
     */
    get size(): number;
    /**
     * Remove a pattern
     *
     * @param name - Pattern name to remove
     * @returns True if pattern was removed
     */
    delete(name: string): boolean;
    /**
     * Find a pattern by its template hash
     *
     * @param hash - The hash to search for
     * @returns Pattern if found, or undefined otherwise
     */
    findByHash(hash: string): Pattern | undefined;
    /**
     * Clear all patterns
     */
    clear(): void;
    /**
     * Generate hash for a template
     * @private
     */
    private hashTemplate;
    /**
     * Export patterns for serialization
     *
     * @returns Object containing all patterns
     */
    export(): Record<string, Pattern>;
    /**
     * Import patterns from a previous export
     *
     * @param data - Exported patterns data
     */
    import(data: Record<string, Pattern>): void;
}
export default PatternLibrary;
//# sourceMappingURL=pattern-library.d.ts.map