/**
 * LLMemory-Palace v3.0 - Pattern Library
 *
 * Stores and expands code patterns for compression.
 * Direct port from v2.6.0 with TypeScript interfaces.
 *
 * @module patterns/pattern-library
 * @version 3.0.0
 */
import { createHash } from 'crypto';
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
export class PatternLibrary {
    patterns;
    constructor() {
        this.patterns = new Map();
        this.loadBuiltInPatterns();
    }
    /**
     * Load built-in patterns for common code constructs
     * @private
     */
    loadBuiltInPatterns() {
        // CRUD Pattern (v11)
        this.register('CRUD_ENTITY', {
            template: `async function {action}{entity}(id) {
  return db.{entity}.{method}({id});
}`,
            instances: [],
            version: 'v11',
            description: 'CRUD operation pattern for database entities',
            parameters: ['action', 'entity', 'method', 'id']
        });
        // Express Route Pattern (v12)
        this.register('EXPRESS_ROUTE', {
            template: `app.{method}("{path}", async (req, res) => {
  {logic}
});`,
            instances: [],
            version: 'v12',
            description: 'Express.js route handler pattern',
            parameters: ['method', 'path', 'logic']
        });
        // Repository Pattern
        this.register('REPOSITORY', {
            template: `class {name}Repository {
  async findById(id) { return this.db.{table}.findUnique({ where: { id } }); }
  async findAll() { return this.db.{table}.findMany(); }
  async create(data) { return this.db.{table}.create({ data }); }
  async update(id, data) { return this.db.{table}.update({ where: { id }, data }); }
  async delete(id) { return this.db.{table}.delete({ where: { id } }); }
}`,
            instances: [],
            version: 'v12',
            description: 'Repository pattern for data access layer',
            parameters: ['name', 'table']
        });
        // Service Pattern
        this.register('SERVICE', {
            template: `class {name}Service {
  constructor(repository) {
    this.repository = repository;
  }
  
  async {method}(...args) {
    // Business logic here
    return this.repository.{repoMethod}(...args);
  }
}`,
            instances: [],
            version: 'v12',
            description: 'Service layer pattern for business logic',
            parameters: ['name', 'method', 'repoMethod']
        });
        // Controller Pattern
        this.register('CONTROLLER', {
            template: `class {name}Controller {
  constructor(service) {
    this.service = service;
  }
  
  async {method}(req, res) {
    const result = await this.service.{serviceMethod}(req.body);
    res.json(result);
  }
}`,
            instances: [],
            version: 'v12',
            description: 'Controller pattern for HTTP request handling',
            parameters: ['name', 'method', 'serviceMethod']
        });
        // Middleware Pattern
        this.register('MIDDLEWARE', {
            template: `function {name}Middleware(req, res, next) {
  // {description}
  next();
}`,
            instances: [],
            version: 'v12',
            description: 'Express middleware pattern',
            parameters: ['name', 'description']
        });
        // Test Pattern
        this.register('TEST', {
            template: `describe('{name}', () => {
  it('should {behavior}', async () => {
    // Arrange
    // Act
    // Assert
    expect(result).toBeDefined();
  });
});`,
            instances: [],
            version: 'v12',
            description: 'Test pattern with Jest/Mocha style',
            parameters: ['name', 'behavior']
        });
        // Type Definition Pattern
        this.register('TYPEDEF', {
            template: `interface {name} {
  {fields}
}`,
            instances: [],
            version: 'v12',
            description: 'TypeScript interface pattern',
            parameters: ['name', 'fields']
        });
        // Error Handler Pattern
        this.register('ERROR_HANDLER', {
            template: `class {name}Error extends Error {
  constructor(message, code = '{code}') {
    super(message);
    this.code = code;
    this.name = '{name}Error';
  }
}`,
            instances: [],
            version: 'v12',
            description: 'Custom error class pattern',
            parameters: ['name', 'code']
        });
        // Validation Pattern
        this.register('VALIDATOR', {
            template: `function validate{name}(data) {
  const errors = [];
  {validations}
  return { valid: errors.length === 0, errors };
}`,
            instances: [],
            version: 'v12',
            description: 'Validation function pattern',
            parameters: ['name', 'validations']
        });
    }
    /**
     * Register a new pattern
     *
     * @param name - Unique pattern name
     * @param options - Pattern registration options
     */
    register(name, options) {
        const pattern = {
            name,
            template: options.template,
            instances: options.instances || [],
            hash: this.hashTemplate(options.template),
            version: options.version,
            description: options.description,
            parameters: options.parameters
        };
        this.patterns.set(name, pattern);
    }
    /**
     * Get a pattern by name
     *
     * @param name - Pattern name
     * @returns Pattern definition or undefined
     */
    get(name) {
        return this.patterns.get(name);
    }
    /**
     * Check if a pattern exists
     *
     * @param name - Pattern name
     * @returns True if pattern exists
     */
    has(name) {
        return this.patterns.has(name);
    }
    /**
     * Get all patterns as entries
     *
     * @returns Iterable of pattern entries
     */
    getAll() {
        return this.patterns.entries();
    }
    /**
     * Add an instance to a pattern
     *
     * @param patternName - Pattern name
     * @param instance - Instance parameters
     */
    addInstance(patternName, instance) {
        const pattern = this.patterns.get(patternName);
        if (pattern) {
            pattern.instances.push(instance);
        }
    }
    /**
     * Extract patterns from code content
     *
     * @param content - Code content to analyze
     * @param language - Programming language
     * @returns Array of extracted patterns
     */
    extractPatterns(content, language) {
        const patterns = [];
        // Extract class definitions
        const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g;
        let match;
        while ((match = classRegex.exec(content)) !== null) {
            patterns.push({
                type: 'class',
                name: match[1],
                extends: match[2] || null,
                pattern: 'CLASS'
            });
        }
        // Extract function definitions
        const funcRegex = /(?:async\s+)?function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*(?:async\s+)?\(?/g;
        while ((match = funcRegex.exec(content)) !== null) {
            const name = match[1] || match[2];
            if (name && !name.startsWith('_')) {
                patterns.push({
                    type: 'function',
                    name,
                    pattern: 'FUNCTION'
                });
            }
        }
        // Extract arrow functions
        const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
        while ((match = arrowRegex.exec(content)) !== null) {
            patterns.push({
                type: 'arrow_function',
                name: match[1],
                pattern: 'ARROW_FUNCTION'
            });
        }
        // Extract Express routes
        const routeRegex = /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
        while ((match = routeRegex.exec(content)) !== null) {
            const method = (match[1] ?? '').toUpperCase();
            const path = match[2] ?? '/unknown';
            patterns.push({
                type: 'route',
                name: `route_${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
                method: method,
                path: path,
                pattern: 'EXPRESS_ROUTE'
            });
        }
        // Extract imports
        const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
        while ((match = importRegex.exec(content)) !== null) {
            const moduleName = match[1] ?? 'unknown';
            patterns.push({
                type: 'import',
                name: `import_${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}`,
                module: moduleName,
                pattern: 'IMPORT'
            });
        }
        return patterns;
    }
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
    expand(patternName, params) {
        const pattern = this.patterns.get(patternName);
        if (!pattern)
            return null;
        let result = pattern.template;
        for (const [key, value] of Object.entries(params)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
        return result;
    }
    /**
     * Compress content by replacing patterns
     *
     * @param content - Content to compress
     * @param language - Programming language
     * @returns Compressed content with pattern references
     */
    compress(content, language) {
        let compressed = content;
        // Try to match and replace known patterns
        for (const [name, pattern] of this.patterns) {
            const instances = this.findPatternInstances(content, pattern.template);
            for (const instance of instances) {
                // Replace with pattern reference
                const ref = `@PATTERN:${name}:${JSON.stringify(instance.params)}`;
                compressed = compressed.replace(instance.match, ref);
            }
        }
        return compressed;
    }
    /**
     * Find instances of a pattern in content
     *
     * @param content - Content to search
     * @param template - Pattern template
     * @returns Array of found instances
     */
    findPatternInstances(content, template) {
        const instances = [];
        // Convert template to regex pattern
        const regexStr = template
            .replace(/\{(\w+)\}/g, '(.+?)')
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
            const regex = new RegExp(regexStr, 'g');
            let match;
            while ((match = regex.exec(content)) !== null) {
                // Extract parameters from match groups
                const params = {};
                const paramNames = template.match(/\{(\w+)\}/g) || [];
                paramNames.forEach((name, i) => {
                    params[name.slice(1, -1)] = match[i + 1];
                });
                instances.push({
                    match: match[0],
                    params,
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        }
        catch {
            // Invalid regex, skip
        }
        return instances;
    }
    /**
     * Find patterns suitable for a module
     *
     * @param moduleName - Module name to search for
     * @returns Array of matching patterns
     */
    findForModule(moduleName) {
        const patterns = [];
        for (const [name, pattern] of this.patterns) {
            // Check if pattern is relevant to module
            if (pattern.instances.some(i => i.entity?.toLowerCase() === moduleName.toLowerCase() ||
                i.name?.toLowerCase() === moduleName.toLowerCase())) {
                patterns.push({ name, ...pattern });
            }
        }
        return patterns;
    }
    /**
     * List all patterns with summary info
     *
     * @returns Array of pattern list items
     */
    list() {
        const list = [];
        for (const [name, pattern] of this.patterns) {
            list.push({
                name,
                instances: pattern.instances.length,
                template: pattern.template.length > 60
                    ? pattern.template.substring(0, 60) + '...'
                    : pattern.template
            });
        }
        return list;
    }
    /**
     * Get all pattern names
     *
     * @returns Array of pattern names
     */
    names() {
        return Array.from(this.patterns.keys());
    }
    /**
     * Get the number of patterns
     *
     * @returns Pattern count
     */
    get size() {
        return this.patterns.size;
    }
    /**
     * Remove a pattern
     *
     * @param name - Pattern name to remove
     * @returns True if pattern was removed
     */
    delete(name) {
        return this.patterns.delete(name);
    }
    /**
     * Find a pattern by its template hash
     *
     * @param hash - The hash to search for
     * @returns Pattern if found, or undefined otherwise
     */
    findByHash(hash) {
        for (const pattern of this.patterns.values()) {
            if (pattern.hash === hash) {
                return pattern;
            }
        }
        return undefined;
    }
    /**
     * Clear all patterns
     */
    clear() {
        this.patterns.clear();
    }
    /**
     * Generate hash for a template
     * @private
     */
    hashTemplate(template) {
        return createHash('sha256')
            .update(template)
            .digest('hex')
            .substring(0, 8)
            .toUpperCase();
    }
    /**
     * Export patterns for serialization
     *
     * @returns Object containing all patterns
     */
    export() {
        const result = {};
        for (const [name, pattern] of this.patterns) {
            result[name] = pattern;
        }
        return result;
    }
    /**
     * Import patterns from a previous export
     *
     * @param data - Exported patterns data
     */
    import(data) {
        for (const [name, pattern] of Object.entries(data)) {
            this.patterns.set(name, pattern);
        }
    }
}
export default PatternLibrary;
//# sourceMappingURL=pattern-library.js.map