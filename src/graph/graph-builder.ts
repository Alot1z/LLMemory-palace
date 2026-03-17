/**
 * GraphBuilder - Dependency graph construction with cycle detection
 * 
 * Builds dependency graphs from parsed files, detects cycles using DFS,
 * performs topological sorting, and identifies orphan nodes.
 * 
 * @module graph/graph-builder
 */

import type {
  GraphNode,
  GraphEdge,
  DependencyGraph,
  Dependency,
  GraphBuildOptions,
  GraphBuildResult,
  GraphStatistics,
  ParsedFile,
  FileAnalysis,
} from '../types.js';

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
export class GraphBuilder {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacency: Map<string, Set<string>> = new Map();
  private options: Required<GraphBuildOptions>;

  /**
   * Default graph build options
   */
  private static readonly DEFAULT_OPTIONS: Required<GraphBuildOptions> = {
    detectCycles: true,
    maxCycleLength: 50,
    includeExternal: false,
    analyzeDepth: 'full',
    nodeTypes: ['file', 'symbol', 'module', 'pattern'],
    edgeTypes: ['imports', 'calls', 'extends', 'implements', 'references'],
  };

  constructor(options: GraphBuildOptions = {}) {
    this.options = { ...GraphBuilder.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Build dependency graph from parsed files
   */
  public buildDependencyGraph(
    files: ParsedFile[] | FileAnalysis[],
    options?: Partial<GraphBuildOptions>
  ): GraphBuildResult {
    const buildOptions = { ...this.options, ...options };
    
    // Reset internal state
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.reverseAdjacency.clear();

    // Build nodes and edges from files
    this.buildNodesAndEdges(files);

    // Build adjacency lists for graph traversal
    this.buildAdjacencyLists();

    // Detect cycles if enabled
    const cycles = buildOptions.detectCycles ? this.detectCycles(buildOptions.maxCycleLength) : [];

    // Find orphan nodes
    const orphans = this.findOrphanNodes();

    // Find entry points (nodes with no dependents)
    const entryPoints = this.findEntryPoints();

    // Calculate statistics
    const statistics = this.calculateStatistics(cycles, orphans);

    // Build result
    const graph: DependencyGraph = {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      cycles: cycles.map(c => ({
        nodes: c,
        length: c.length,
        severity: c.length > 10 ? 'error' : 'warning' as const,
      })),
      orphans,
      entryPoints,
    };

    return {
      graph,
      statistics,
      topologicalOrder: this.topologicalSort(),
    };
  }

  /**
   * Build nodes and edges from parsed files
   */
  private buildNodesAndEdges(files: ParsedFile[] | FileAnalysis[]): void {
    for (const file of files) {
      // Determine file type and create appropriate node
      const nodeType = this.determineNodeType(file);
      
      const node: GraphNode = {
        id: this.generateNodeId(file),
        type: nodeType,
        name: this.getNodeName(file),
        path: file.path,
        dependencies: [],
        dependents: [],
      };

      // Extract dependencies
      const dependencies = this.extractDependencies(file);
      node.dependencies = dependencies.map(d => d.to);

      // Add node to graph
      this.nodes.set(node.id, node);

      // Create edges for dependencies
      for (const dep of dependencies) {
        const edgeId = this.generateEdgeId(node.id, dep.to, dep.type);
        const edge: GraphEdge = {
          from: node.id,
          to: dep.to,
          type: this.mapDependencyTypeToEdgeType(dep.type),
          weight: dep.line !== undefined ? 1 : 0.5,
        };
        this.edges.set(edgeId, edge);
      }
    }

    // Update dependents after all nodes are processed
    this.updateDependents();
  }

  /**
   * Determine node type from file
   */
  private determineNodeType(file: ParsedFile | FileAnalysis): GraphNode['type'] {
    // Check if file has exports to determine if it's a module
    if ('exports' in file && file.exports && file.exports.length > 0) {
      return 'module';
    }
    
    // Check for pattern indicators
    if (file.path.includes('/patterns/') || file.path.includes('.pattern.')) {
      return 'pattern';
    }

    // Default to file type
    return 'file';
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(file: ParsedFile | FileAnalysis): string {
    // Use file path as base, normalize slashes
    return file.path.replace(/\\/g, '/').replace(/[^a-zA-Z0-9/_-]/g, '_');
  }

  /**
   * Get node name from file
   */
  private getNodeName(file: ParsedFile | FileAnalysis): string {
    const parts = file.path.split(/[/\\]/);
    return parts[parts.length - 1] || file.path;
  }

  /**
   * Extract dependencies from parsed file
   */
  private extractDependencies(file: ParsedFile | FileAnalysis): Dependency[] {
    const dependencies: Dependency[] = [];

    // Handle ParsedFile (from AST parser)
    if ('imports' in file && file.imports) {
      for (const imp of file.imports) {
        dependencies.push({
          from: file.path,
          to: this.resolveImportPath(imp.source, file.path),
          type: 'import',
          line: imp.line,
        });
      }
    }

    // Handle FileAnalysis (from scanner)
    if ('dependencies' in file && Array.isArray(file.dependencies)) {
      for (const dep of file.dependencies) {
        if (typeof dep === 'string') {
          dependencies.push({
            from: file.path,
            to: dep,
            type: 'reference',
          });
        } else {
          dependencies.push({
            from: file.path,
            to: dep.to || dep.from,
            type: dep.type || 'reference',
            line: dep.line,
          });
        }
      }
    }

    // Filter out external dependencies if not included
    if (!this.options.includeExternal) {
      return dependencies.filter(dep => !this.isExternalDependency(dep.to));
    }

    return dependencies;
  }

  /**
   * Resolve import path relative to current file
   */
  private resolveImportPath(importPath: string, _currentPath: string): string {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Normalize the path
      return importPath.replace(/\\/g, '/');
    }
    
    // Handle absolute imports (node_modules)
    return `node_modules/${importPath}`;
  }

  /**
   * Check if dependency is external
   */
  private isExternalDependency(path: string): boolean {
    return path.startsWith('node_modules/') || 
           !path.startsWith('.') && 
           !path.startsWith('/') &&
           !path.includes('/');
  }

  /**
   * Map dependency type to edge type
   */
  private mapDependencyTypeToEdgeType(type: string): GraphEdge['type'] {
    const typeMap: Record<string, GraphEdge['type']> = {
      'import': 'imports',
      'require': 'imports',
      'reference': 'references',
      'extends': 'extends',
      'implements': 'implements',
      'call': 'calls',
    };
    return typeMap[type] || 'references';
  }

  /**
   * Generate unique edge ID
   */
  private generateEdgeId(from: string, to: string, type: string): string {
    return `${from}->${to}:${type}`;
  }

  /**
   * Update dependents for all nodes
   */
  private updateDependents(): void {
    for (const node of this.nodes.values()) {
      for (const depId of node.dependencies) {
        const depNode = this.nodes.get(depId);
        if (depNode && !depNode.dependents.includes(node.id)) {
          depNode.dependents.push(node.id);
        }
      }
    }
  }

  /**
   * Build adjacency lists for graph traversal
   */
  private buildAdjacencyLists(): void {
    // Forward adjacency list (dependencies)
    for (const node of this.nodes.values()) {
      this.adjacencyList.set(node.id, new Set(node.dependencies));
    }

    // Reverse adjacency list (dependents)
    for (const node of this.nodes.values()) {
      this.reverseAdjacency.set(node.id, new Set(node.dependents));
    }
  }

  /**
   * Detect cycles using DFS algorithm
   */
  public detectCycles(maxLength: number = 50): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    // DFS from each unvisited node
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        this.dfsForCycles(nodeId, visited, recursionStack, path, cycles, maxLength);
      }
    }

    // Remove duplicate cycles
    return this.deduplicateCycles(cycles);
  }

  /**
   * DFS helper for cycle detection
   */
  private dfsForCycles(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[],
    cycles: string[][],
    maxLength: number
  ): void {
    // Check path length limit
    if (path.length >= maxLength) {
      return;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    // Get neighbors
    const neighbors = this.adjacencyList.get(nodeId);
    if (neighbors) {
      for (const neighbor of neighbors) {
        // Check if neighbor exists in graph
        if (!this.nodes.has(neighbor)) {
          continue;
        }

        if (!visited.has(neighbor)) {
          // Continue DFS
          this.dfsForCycles(neighbor, visited, recursionStack, path, cycles, maxLength);
        } else if (recursionStack.has(neighbor)) {
          // Found cycle - extract it
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            const cycle = [...path.slice(cycleStart), neighbor];
            cycles.push(cycle);
          }
        }
      }
    }

    // Backtrack
    path.pop();
    recursionStack.delete(nodeId);
  }

  /**
   * Remove duplicate cycles
   */
  private deduplicateCycles(cycles: string[][]): string[][] {
    const seen = new Set<string>();
    const unique: string[][] = [];

    for (const cycle of cycles) {
      // Normalize cycle for comparison (start from smallest element)
      const normalized = this.normalizeCycle(cycle);
      const key = normalized.join('->');

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cycle);
      }
    }

    return unique;
  }

  /**
   * Normalize cycle for comparison
   */
  private normalizeCycle(cycle: string[]): string[] {
    if (cycle.length <= 1) return cycle;

    // Find the smallest element
    let minIndex = 0;
    for (let i = 1; i < cycle.length - 1; i++) {
      const current = cycle[i];
      const min = cycle[minIndex];
      if (current !== undefined && min !== undefined && current < min) {
        minIndex = i;
      }
    }

    const minElement = cycle[minIndex];
    if (!minElement) return cycle;

    // Rotate to start from smallest
    const rotated: string[] = [
      ...cycle.slice(minIndex, -1),
      ...cycle.slice(0, minIndex),
      minElement,
    ];

    return rotated.filter((s): s is string => s !== undefined);
  }

  /**
   * Find orphan nodes (no dependencies and no dependents)
   */
  public findOrphanNodes(): GraphNode[] {
    const orphans: GraphNode[] = [];

    for (const node of this.nodes.values()) {
      if (node.dependencies.length === 0 && node.dependents.length === 0) {
        orphans.push(node);
      }
    }

    return orphans;
  }

  /**
   * Find entry points (nodes with no dependents)
   */
  private findEntryPoints(): GraphNode[] {
    const entryPoints: GraphNode[] = [];

    for (const node of this.nodes.values()) {
      if (node.dependents.length === 0 && node.dependencies.length > 0) {
        entryPoints.push(node);
      }
    }

    return entryPoints;
  }

  /**
   * Perform topological sort (Kahn's algorithm)
   */
  public topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    const sorted: string[] = [];
    const queue: string[] = [];

    // Initialize in-degrees
    for (const nodeId of this.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    // Calculate in-degrees
    for (const node of this.nodes.values()) {
      for (const dep of node.dependencies) {
        if (this.nodes.has(dep)) {
          inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
        }
      }
    }

    // Start with nodes that have no dependencies
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeId);

      // Update in-degrees
      const neighbors = this.adjacencyList.get(nodeId);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (this.nodes.has(neighbor)) {
            const newDegree = (inDegree.get(neighbor) || 0) - 1;
            inDegree.set(neighbor, newDegree);
            if (newDegree === 0) {
              queue.push(neighbor);
            }
          }
        }
      }
    }

    return sorted;
  }

  /**
   * Calculate graph statistics
   */
  private calculateStatistics(cycles: string[][], orphans: GraphNode[]): GraphStatistics {
    const nodeTypeDistribution: Record<string, number> = {};
    const edgeTypeDistribution: Record<string, number> = {};

    // Count node types
    for (const node of this.nodes.values()) {
      nodeTypeDistribution[node.type] = (nodeTypeDistribution[node.type] || 0) + 1;
    }

    // Count edge types
    for (const edge of this.edges.values()) {
      edgeTypeDistribution[edge.type] = (edgeTypeDistribution[edge.type] || 0) + 1;
    }

    // Calculate average dependencies
    let totalDeps = 0;
    let maxDeps = 0;
    let maxDepsNode = '';

    for (const node of this.nodes.values()) {
      const depCount = node.dependencies.length;
      totalDeps += depCount;
      if (depCount > maxDeps) {
        maxDeps = depCount;
        maxDepsNode = node.id;
      }
    }

    const avgDeps = this.nodes.size > 0 ? totalDeps / this.nodes.size : 0;

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      cycleCount: cycles.length,
      orphanCount: orphans.length,
      averageDependencies: Math.round(avgDeps * 100) / 100,
      maxDependencies: maxDeps,
      maxDependenciesNode: maxDepsNode,
      nodeTypeDistribution,
      edgeTypeDistribution,
    };
  }

  /**
   * Get node by ID
   */
  public getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  public getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   */
  public getAllEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get dependencies of a node
   */
  public getDependencies(nodeId: string): GraphNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    return node.dependencies
      .map(depId => this.nodes.get(depId))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * Get dependents of a node
   */
  public getDependents(nodeId: string): GraphNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    return node.dependents
      .map(depId => this.nodes.get(depId))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * Check if graph has cycles
   */
  public hasCycles(): boolean {
    return this.detectCycles().length > 0;
  }

  /**
   * Get shortest path between two nodes
   */
  public getShortestPath(from: string, to: string): string[] | null {
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      return null;
    }

    const visited = new Set<string>();
    const queue: { node: string; path: string[] }[] = [{ node: from, path: [from] }];

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      if (node === to) {
        return path;
      }

      if (visited.has(node)) {
        continue;
      }

      visited.add(node);

      const neighbors = this.adjacencyList.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push({ node: neighbor, path: [...path, neighbor] });
          }
        }
      }
    }

    return null;
  }

  /**
   * Export graph to DOT format for visualization
   */
  public toDot(): string {
    const lines: string[] = ['digraph DependencyGraph {'];
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box];');

    // Add nodes
    for (const node of this.nodes.values()) {
      const label = node.name.replace(/"/g, '\\"');
      const color = this.getNodeColor(node.type);
      lines.push(`  "${node.id}" [label="${label}", fillcolor="${color}", style=filled];`);
    }

    // Add edges
    for (const edge of this.edges.values()) {
      const style = this.getEdgeStyle(edge.type);
      lines.push(`  "${edge.from}" -> "${edge.to}" [${style}];`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Get node color for DOT visualization
   */
  private getNodeColor(type: GraphNode['type']): string {
    const colors: Record<GraphNode['type'], string> = {
      'file': 'lightblue',
      'symbol': 'lightgreen',
      'module': 'lightyellow',
      'pattern': 'lightpink',
    };
    return colors[type] || 'white';
  }

  /**
   * Get edge style for DOT visualization
   */
  private getEdgeStyle(type: GraphEdge['type']): string {
    const styles: Record<GraphEdge['type'], string> = {
      'imports': 'color=blue',
      'calls': 'color=green,style=dashed',
      'extends': 'color=red,style=bold',
      'implements': 'color=purple,style=bold',
      'references': 'color=gray,style=dotted',
    };
    return styles[type] || 'color=black';
  }

  /**
   * Clear graph state
   */
  public clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.reverseAdjacency.clear();
  }
}

export default GraphBuilder;
