/**
 * LLMemory-Palace v3.0 - Behavior Graph
 *
 * Represents logic flows and their relationships.
 * Direct port from v2.6.0 with TypeScript interfaces.
 *
 * @module flows/behavior-graph
 * @version 3.0.0
 */
import type { Flow, FlowRegistrationOptions, FlowListItem, ExtractedFlow, Language } from '../types.js';
/**
 * BehaviorGraph manages code flows for compression and generation.
 *
 * @example
 * ```typescript
 * const graph = new BehaviorGraph();
 *
 * // Get flow info
 * const flow = graph.get('AUTH_LOGIN');
 *
 * // Generate ASCII diagram
 * const diagram = graph.diagram('AUTH_LOGIN');
 *
 * // Register custom flow
 * graph.register('MY_FLOW', {
 *   steps: ['step1', 'step2', 'step3'],
 *   returns: 'result'
 * });
 * ```
 */
export declare class BehaviorGraph {
    private flows;
    constructor();
    /**
     * Load built-in flows for common patterns
     * @private
     */
    private loadBuiltInFlows;
    /**
     * Register a new flow
     *
     * @param name - Unique flow name
     * @param options - Flow registration options
     */
    register(name: string, options: FlowRegistrationOptions): void;
    /**
     * Get a flow by name
     *
     * @param name - Flow name
     * @returns Flow definition or undefined
     */
    get(name: string): Flow | undefined;
    /**
     * Check if a flow exists
     *
     * @param name - Flow name
     * @returns True if flow exists
     */
    has(name: string): boolean;
    /**
     * Get all flows as entries
     *
     * @returns Iterable of flow entries
     */
    getAll(): IterableIterator<[string, Flow]>;
    /**
     * Trace a flow and return detailed information
     *
     * @param flowName - Flow name to trace
     * @returns Human-readable flow trace
     */
    trace(flowName: string): string;
    /**
     * Extract flows from code content
     *
     * @param content - Code content to analyze
     * @param language - Programming language
     * @returns Array of extracted flows
     */
    extractFlows(content: string, _language: Language): ExtractedFlow[];
    /**
     * Find flows relevant to a module
     *
     * @param moduleName - Module name to search for
     * @returns Array of matching flows
     */
    findForModule(moduleName: string): (Flow & {
        name: string;
    })[];
    /**
     * List all flows with summary info
     *
     * @returns Array of flow list items
     */
    list(): FlowListItem[];
    /**
     * Get all flow names
     *
     * @returns Array of flow names
     */
    names(): string[];
    /**
     * Get the number of flows
     *
     * @returns Flow count
     */
    get size(): number;
    /**
     * Remove a flow
     *
     * @param name - Flow name to remove
     * @returns True if flow was removed
     */
    delete(name: string): boolean;
    /**
     * Clear all flows
     */
    clear(): void;
    /**
     * Generate flow diagram (ASCII)
     *
     * @param flowName - Flow name to diagram
     * @returns ASCII diagram or null if flow not found
     *
     * @example
     * ```typescript
     * console.log(graph.diagram('AUTH_LOGIN'));
     * // AUTH_LOGIN
     * // ↓
     * // ┌─────────────────┐
     * // │ validate_input  │
     * // └────────┬────────┘
     * //          ↓
     * // ┌─────────────────┐
     * // │ hash_password   │
     * // └────────┬────────┘
     * // ...
     * // → token
     * ```
     */
    diagram(flowName: string): string | null;
    /**
     * Generate code from a flow
     *
     * @param flowName - Flow name
     * @param context - Context for code generation
     * @returns Generated code or null if flow not found
     */
    generateCode(flowName: string, _context?: Record<string, string>): string | null;
    /**
     * Export flows for serialization
     *
     * @returns Object containing all flows
     */
    export(): Record<string, Flow>;
    /**
     * Import flows from a previous export
     *
     * @param data - Exported flows data
     */
    import(data: Record<string, Flow>): void;
    /**
     * Normalize steps to FlowStep array
     * @private
     */
    private normalizeSteps;
    /**
     * Generate hash for flow
     * @private
     */
    private hashFlow;
}
export default BehaviorGraph;
//# sourceMappingURL=behavior-graph.d.ts.map