/**
 * GraphBuilder - Dependency graph construction with cycle detection
 *
 * Builds dependency graphs from parsed files, detects cycles using DFS,
 * performs topological sorting, and identifies orphan nodes.
 *
 * @module graph/graph-builder
 */
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
    nodes = new Map();
    edges = new Map();
    adjacencyList = new Map();
    reverseAdjacency = new Map();
    options;
    /**
     * Default graph build options
     */
    static DEFAULT_OPTIONS = {
        detectCycles: true,
        maxCycleLength: 50,
        includeExternal: false,
        analyzeDepth: 'full',
        nodeTypes: ['file', 'symbol', 'module', 'pattern'],
        edgeTypes: ['imports', 'calls', 'extends', 'implements', 'references'],
    };
    constructor(options = {}) {
        this.options = { ...GraphBuilder.DEFAULT_OPTIONS, ...options };
    }
    /**
     * Build dependency graph from parsed files
     */
    buildDependencyGraph(files, options) {
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
        const graph = {
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values()),
            cycles: cycles.map(c => ({
                nodes: c,
                length: c.length,
                severity: c.length > 10 ? 'error' : 'warning',
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
    buildNodesAndEdges(files) {
        for (const file of files) {
            // Determine file type and create appropriate node
            const nodeType = this.determineNodeType(file);
            const node = {
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
                const edge = {
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
    determineNodeType(file) {
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
    generateNodeId(file) {
        // Use file path as base, normalize slashes
        return file.path.replace(/\\/g, '/').replace(/[^a-zA-Z0-9/_-]/g, '_');
    }
    /**
     * Get node name from file
     */
    getNodeName(file) {
        const parts = file.path.split(/[/\\]/);
        return parts[parts.length - 1] || file.path;
    }
    /**
     * Extract dependencies from parsed file
     */
    extractDependencies(file) {
        const dependencies = [];
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
                }
                else {
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
    resolveImportPath(importPath, _currentPath) {
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
    isExternalDependency(path) {
        return path.startsWith('node_modules/') ||
            !path.startsWith('.') &&
                !path.startsWith('/') &&
                !path.includes('/');
    }
    /**
     * Map dependency type to edge type
     */
    mapDependencyTypeToEdgeType(type) {
        const typeMap = {
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
    generateEdgeId(from, to, type) {
        return `${from}->${to}:${type}`;
    }
    /**
     * Update dependents for all nodes
     */
    updateDependents() {
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
    buildAdjacencyLists() {
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
    detectCycles(maxLength = 50) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];
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
    dfsForCycles(nodeId, visited, recursionStack, path, cycles, maxLength) {
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
                }
                else if (recursionStack.has(neighbor)) {
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
    deduplicateCycles(cycles) {
        const seen = new Set();
        const unique = [];
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
    normalizeCycle(cycle) {
        if (cycle.length <= 1)
            return cycle;
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
        if (!minElement)
            return cycle;
        // Rotate to start from smallest
        const rotated = [
            ...cycle.slice(minIndex, -1),
            ...cycle.slice(0, minIndex),
            minElement,
        ];
        return rotated.filter((s) => s !== undefined);
    }
    /**
     * Find orphan nodes (no dependencies and no dependents)
     */
    findOrphanNodes() {
        const orphans = [];
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
    findEntryPoints() {
        const entryPoints = [];
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
    topologicalSort() {
        const inDegree = new Map();
        const sorted = [];
        const queue = [];
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
            const nodeId = queue.shift();
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
    calculateStatistics(cycles, orphans) {
        const nodeTypeDistribution = {};
        const edgeTypeDistribution = {};
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
    getNode(id) {
        return this.nodes.get(id);
    }
    /**
     * Get all nodes
     */
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    /**
     * Get all edges
     */
    getAllEdges() {
        return Array.from(this.edges.values());
    }
    /**
     * Get dependencies of a node
     */
    getDependencies(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node)
            return [];
        return node.dependencies
            .map(depId => this.nodes.get(depId))
            .filter((n) => n !== undefined);
    }
    /**
     * Get dependents of a node
     */
    getDependents(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node)
            return [];
        return node.dependents
            .map(depId => this.nodes.get(depId))
            .filter((n) => n !== undefined);
    }
    /**
     * Check if graph has cycles
     */
    hasCycles() {
        return this.detectCycles().length > 0;
    }
    /**
     * Get shortest path between two nodes
     */
    getShortestPath(from, to) {
        if (!this.nodes.has(from) || !this.nodes.has(to)) {
            return null;
        }
        const visited = new Set();
        const queue = [{ node: from, path: [from] }];
        while (queue.length > 0) {
            const { node, path } = queue.shift();
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
    toDot() {
        const lines = ['digraph DependencyGraph {'];
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
    getNodeColor(type) {
        const colors = {
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
    getEdgeStyle(type) {
        const styles = {
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
    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.adjacencyList.clear();
        this.reverseAdjacency.clear();
    }
}
export default GraphBuilder;
//# sourceMappingURL=graph-builder.js.map