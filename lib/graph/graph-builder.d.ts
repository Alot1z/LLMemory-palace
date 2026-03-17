/**
 * GraphBuilder - Dependency graph construction with cycle detection
 *
 * Builds dependency graphs from parsed files, detects cycles using DFS,
 * performs topological sorting, and identifies orphan nodes.
 *
 * @module graph/graph-builder
 */
import type { GraphNode, GraphEdge, GraphBuildOptions, GraphBuildResult, ParsedFile, FileAnalysis } from '../types.js';
/**
 * GraphBuilder - Constructs and analyzes dependency graphs
 *
 * Features:
 * - Build dependency graph from parsed files
 * - Cycle detection using DFS algorithm
 * - Topological sorting for load order
 * - Orphan node identification
 * - Graph statistics and metrics
 */
export declare class GraphBuilder {
    private nodes;
    private edges;
    private adjacencyList;
    private reverseAdjacency;
    private options;
    /**
     * Default graph build options
     */
    private static readonly DEFAULT_OPTIONS;
    constructor(options?: GraphBuildOptions);
    /**
     * Build dependency graph from parsed files
     */
    buildDependencyGraph(files: ParsedFile[] | FileAnalysis[], options?: Partial<GraphBuildOptions>): GraphBuildResult;
    /**
     * Build nodes and edges from parsed files
     */
    private buildNodesAndEdges;
    /**
     * Determine node type from file
     */
    private determineNodeType;
    /**
     * Generate unique node ID
     */
    private generateNodeId;
    /**
     * Get node name from file
     */
    private getNodeName;
    /**
     * Extract dependencies from parsed file
     */
    private extractDependencies;
    /**
     * Resolve import path relative to current file
     */
    private resolveImportPath;
    /**
     * Check if dependency is external
     */
    private isExternalDependency;
    /**
     * Map dependency type to edge type
     */
    private mapDependencyTypeToEdgeType;
    /**
     * Generate unique edge ID
     */
    private generateEdgeId;
    /**
     * Update dependents for all nodes
     */
    private updateDependents;
    /**
     * Build adjacency lists for graph traversal
     */
    private buildAdjacencyLists;
    /**
     * Detect cycles using DFS algorithm
     */
    detectCycles(maxLength?: number): string[][];
    /**
     * DFS helper for cycle detection
     */
    private dfsForCycles;
    /**
     * Remove duplicate cycles
     */
    private deduplicateCycles;
    /**
     * Normalize cycle for comparison
     */
    private normalizeCycle;
    /**
     * Find orphan nodes (no dependencies and no dependents)
     */
    findOrphanNodes(): GraphNode[];
    /**
     * Find entry points (nodes with no dependents)
     */
    private findEntryPoints;
    /**
     * Perform topological sort (Kahn's algorithm)
     */
    topologicalSort(): string[];
    /**
     * Calculate graph statistics
     */
    private calculateStatistics;
    /**
     * Get node by ID
     */
    getNode(id: string): GraphNode | undefined;
    /**
     * Get all nodes
     */
    getAllNodes(): GraphNode[];
    /**
     * Get all edges
     */
    getAllEdges(): GraphEdge[];
    /**
     * Get dependencies of a node
     */
    getDependencies(nodeId: string): GraphNode[];
    /**
     * Get dependents of a node
     */
    getDependents(nodeId: string): GraphNode[];
    /**
     * Check if graph has cycles
     */
    hasCycles(): boolean;
    /**
     * Get shortest path between two nodes
     */
    getShortestPath(from: string, to: string): string[] | null;
    /**
     * Export graph to DOT format for visualization
     */
    toDot(): string;
    /**
     * Get node color for DOT visualization
     */
    private getNodeColor;
    /**
     * Get edge style for DOT visualization
     */
    private getEdgeStyle;
    /**
     * Clear graph state
     */
    clear(): void;
}
export default GraphBuilder;
//# sourceMappingURL=graph-builder.d.ts.map