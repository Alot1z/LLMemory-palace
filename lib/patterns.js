/**
 * LLMemory-Palace v25.0 - Pattern Library
 * Stores and expands code patterns for compression
 */

import { createHash } from 'crypto';

export class PatternLibrary {
  constructor() {
    this.patterns = new Map();
    this._loadBuiltInPatterns();
  }

  /**
   * Load built-in patterns for common code constructs
   */
  _loadBuiltInPatterns() {
    // CRUD Pattern (v11)
    this.register('CRUD_ENTITY', {
      template: `async function {action}{entity}(id) {
  return db.{entity}.{method}({id});
}`,
      instances: []
    });

    // Express Route Pattern (v12)
    this.register('EXPRESS_ROUTE', {
      template: `app.{method}("{path}", async (req, res) => {
  {logic}
});`,
      instances: []
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
      instances: []
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
      instances: []
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
      instances: []
    });

    // Middleware Pattern
    this.register('MIDDLEWARE', {
      template: `function {name}Middleware(req, res, next) {
  // {description}
  next();
}`,
      instances: []
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
      instances: []
    });

    // Type Definition Pattern
    this.register('TYPEDEF', {
      template: `interface {name} {
  {fields}
}`,
      instances: []
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
      instances: []
    });

    // Validation Pattern
    this.register('VALIDATOR', {
      template: `function validate{name}(data) {
  const errors = [];
  {validations}
  return { valid: errors.length === 0, errors };
}`,
      instances: []
    });
  }

  /**
   * Register a new pattern
   */
  register(name, pattern) {
    this.patterns.set(name, {
      name,
      template: pattern.template,
      instances: pattern.instances || [],
      hash: this._hash(pattern.template)
    });
  }

  /**
   * Get a pattern by name
   */
  get(name) {
    return this.patterns.get(name);
  }

  /**
   * Get all patterns
   */
  getAll() {
    return this.patterns.entries();
  }

  /**
   * Add an instance to a pattern
   */
  addInstance(patternName, instance) {
    const pattern = this.patterns.get(patternName);
    if (pattern) {
      pattern.instances.push(instance);
    }
  }

  /**
   * Extract patterns from code content
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
        type: 'function',
        name: match[1],
        pattern: 'ARROW_FUNCTION'
      });
    }

    // Extract Express routes
    const routeRegex = /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = routeRegex.exec(content)) !== null) {
      patterns.push({
        type: 'route',
        method: match[1].toUpperCase(),
        path: match[2],
        pattern: 'EXPRESS_ROUTE'
      });
    }

    // Extract imports
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    while ((match = importRegex.exec(content)) !== null) {
      patterns.push({
        type: 'import',
        module: match[1],
        pattern: 'IMPORT'
      });
    }

    return patterns;
  }

  /**
   * Expand a pattern with given parameters
   */
  expand(patternName, params) {
    const pattern = this.patterns.get(patternName);
    if (!pattern) return null;

    let result = pattern.template;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return result;
  }

  /**
   * Compress content by replacing patterns
   */
  compress(content, language) {
    let compressed = content;

    // Try to match and replace known patterns
    for (const [name, pattern] of this.patterns) {
      const instances = this._findPatternInstances(content, pattern.template);
      
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
   */
  _findPatternInstances(content, template) {
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
          params
        });
      }
    } catch (e) {
      // Invalid regex, skip
    }
    
    return instances;
  }

  /**
   * Find patterns suitable for a module
   */
  findForModule(moduleName) {
    const patterns = [];
    
    for (const [name, pattern] of this.patterns) {
      // Check if pattern is relevant to module
      if (pattern.instances.some(i => 
        i.entity?.toLowerCase() === moduleName.toLowerCase() ||
        i.name?.toLowerCase() === moduleName.toLowerCase()
      )) {
        patterns.push({ name, ...pattern });
      }
    }
    
    return patterns;
  }

  /**
   * List all patterns
   */
  list() {
    const list = [];
    for (const [name, pattern] of this.patterns) {
      list.push({
        name,
        instances: pattern.instances.length,
        template: pattern.template.substring(0, 60) + '...'
      });
    }
    return list;
  }

  /**
   * Generate hash for a template
   */
  _hash(template) {
    return createHash('sha256')
      .update(template)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
  }
}
