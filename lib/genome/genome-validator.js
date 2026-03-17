/**
 * LLMemory-Palace v3.0 - Genome Validator (Security Layer)
 *
 * Provides safe parsing and validation of genome data.
 * Adapted from genome-safe.js for TypeScript with enhanced security.
 *
 * @module genome/genome-validator
 * @version 3.0.0
 */
// ============================================================================
// SECURITY PATTERNS
// ============================================================================
/**
 * Dangerous patterns that should never appear in genome data
 */
const DANGEROUS_PATTERNS = [
    // Code execution
    {
        pattern: /\beval\s*\(/gi,
        description: 'Dynamic code execution via eval',
        category: 'code_execution',
        severity: 'critical',
    },
    {
        pattern: /\bFunction\s*\(/gi,
        description: 'Dynamic function creation',
        category: 'code_execution',
        severity: 'critical',
    },
    {
        pattern: /\bnew\s+Function\s*\(/gi,
        description: 'Dynamic function creation via constructor',
        category: 'code_execution',
        severity: 'critical',
    },
    // Module loading
    {
        pattern: /\brequire\s*\(\s*['"`]/gi,
        description: 'Dynamic module loading',
        category: 'module_loading',
        severity: 'high',
    },
    {
        pattern: /\bimport\s*\(/gi,
        description: 'Dynamic import',
        category: 'module_loading',
        severity: 'high',
    },
    // System access
    {
        pattern: /\bprocess\s*\.\s*env/gi,
        description: 'Environment variable access',
        category: 'system_access',
        severity: 'medium',
    },
    {
        pattern: /\bprocess\s*\.\s*(?:exit|kill|abort)/gi,
        description: 'Process control',
        category: 'system_access',
        severity: 'high',
    },
    {
        pattern: /\bchild_process/gi,
        description: 'Child process module reference',
        category: 'system_access',
        severity: 'critical',
    },
    // Prototype pollution
    {
        pattern: /__proto__/gi,
        description: 'Prototype chain manipulation',
        category: 'prototype_pollution',
        severity: 'critical',
    },
    {
        pattern: /\bconstructor\s*\.\s*prototype/gi,
        description: 'Prototype manipulation via constructor',
        category: 'prototype_pollution',
        severity: 'critical',
    },
    {
        pattern: /\bObject\s*\.\s*(?:setPrototypeOf|assign)\s*\(/gi,
        description: 'Potential prototype pollution',
        category: 'prototype_pollution',
        severity: 'high',
    },
    // File system
    {
        pattern: /\bfs\s*\.\s*(?:readFile|writeFile|unlink|rmdir)/gi,
        description: 'File system operations',
        category: 'file_system',
        severity: 'medium',
    },
    {
        pattern: /\brequire\s*\(\s*['"`]fs['"`]\s*\)/gi,
        description: 'File system module import',
        category: 'file_system',
        severity: 'medium',
    },
    // Network
    {
        pattern: /\b(?:fetch|axios|http|https|net)\s*\(/gi,
        description: 'Network request',
        category: 'network',
        severity: 'medium',
    },
    // Injection patterns
    {
        pattern: /<\s*script/gi,
        description: 'Script tag injection',
        category: 'injection',
        severity: 'high',
    },
    {
        pattern: /javascript\s*:/gi,
        description: 'JavaScript protocol handler',
        category: 'injection',
        severity: 'high',
    },
    // Obfuscation indicators
    {
        pattern: /\\x[0-9a-f]{2}/gi,
        description: 'Hex escape sequences',
        category: 'obfuscation',
        severity: 'low',
    },
    {
        pattern: /\\u[0-9a-f]{4}/gi,
        description: 'Unicode escape sequences',
        category: 'obfuscation',
        severity: 'low',
    },
];
/**
 * Allowed genome header versions
 */
const ALLOWED_VERSIONS = ['v11', 'v12', 'v13', 'v21', 'v25', 'v26', 'v30'];
/**
 * Maximum allowed genome size (50MB)
 */
const MAX_GENOME_SIZE = 50 * 1024 * 1024;
/**
 * Maximum allowed string length for individual fields
 */
const MAX_FIELD_LENGTH = 1024 * 1024; // 1MB
// ============================================================================
// GENOME VALIDATOR CLASS
// ============================================================================
/**
 * Security-focused genome validator
 */
export class GenomeValidator {
    customPatterns = [];
    strictMode = true;
    maxDepth = 10;
    constructor(options) {
        if (options?.strictMode !== undefined) {
            this.strictMode = options.strictMode;
        }
        if (options?.maxDepth !== undefined) {
            this.maxDepth = options.maxDepth;
        }
    }
    /**
     * Scan content for security issues
     */
    scan(content) {
        const issues = [];
        const summary = {};
        // Initialize summary for all categories
        for (const pattern of DANGEROUS_PATTERNS) {
            if (!summary[pattern.category]) {
                summary[pattern.category] = 0;
            }
        }
        // Check all patterns
        for (const pattern of DANGEROUS_PATTERNS) {
            const matches = content.matchAll(pattern.pattern);
            for (const match of matches) {
                issues.push({
                    category: pattern.category,
                    severity: pattern.severity,
                    pattern: pattern.pattern.source,
                    description: pattern.description,
                    match: match[0],
                    position: match.index ?? 0,
                });
                summary[pattern.category] = (summary[pattern.category] ?? 0) + 1;
            }
        }
        // Check custom patterns
        for (const pattern of this.customPatterns) {
            const matches = content.matchAll(pattern.pattern);
            for (const match of matches) {
                issues.push({
                    category: pattern.category,
                    severity: pattern.severity,
                    pattern: pattern.pattern.source,
                    description: pattern.description,
                    match: match[0],
                    position: match.index ?? 0,
                });
                summary[pattern.category] = (summary[pattern.category] ?? 0) + 1;
            }
        }
        return {
            passed: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
            issues,
            summary,
        };
    }
    /**
     * Validate genome header
     */
    validateHeader(header) {
        const errors = [];
        const warnings = [];
        if (!header || typeof header !== 'object') {
            errors.push({
                field: 'header',
                message: 'Header must be an object',
                code: 'INVALID_HEADER_TYPE',
                value: header,
            });
            return { valid: false, errors, warnings };
        }
        const h = header;
        // Validate version
        if (typeof h.version !== 'string') {
            errors.push({
                field: 'header.version',
                message: 'Version must be a string',
                code: 'INVALID_VERSION_TYPE',
                value: h.version,
            });
        }
        else if (!ALLOWED_VERSIONS.includes(h.version)) {
            errors.push({
                field: 'header.version',
                message: `Invalid version: ${h.version}. Allowed: ${ALLOWED_VERSIONS.join(', ')}`,
                code: 'INVALID_VERSION',
                value: h.version,
            });
        }
        // Validate timestamp
        if (typeof h.timestamp !== 'string') {
            errors.push({
                field: 'header.timestamp',
                message: 'Timestamp must be a string',
                code: 'INVALID_TIMESTAMP_TYPE',
                value: h.timestamp,
            });
        }
        else if (!this.isValidISODate(h.timestamp)) {
            warnings.push({
                field: 'header.timestamp',
                message: 'Timestamp is not in ISO 8601 format',
                suggestion: 'Use format: YYYY-MM-DDTHH:mm:ss.sssZ',
            });
        }
        // Validate compressionLevel
        if (h.compressionLevel !== undefined) {
            if (typeof h.compressionLevel !== 'number' || ![1, 2, 3, 4].includes(h.compressionLevel)) {
                errors.push({
                    field: 'header.compressionLevel',
                    message: 'Compression level must be 1, 2, 3, or 4',
                    code: 'INVALID_COMPRESSION_LEVEL',
                    value: h.compressionLevel,
                });
            }
        }
        // Validate checksum
        if (typeof h.checksum !== 'string') {
            errors.push({
                field: 'header.checksum',
                message: 'Checksum must be a string',
                code: 'INVALID_CHECKSUM_TYPE',
                value: h.checksum,
            });
        }
        else if (!/^[a-f0-9]{64}$/i.test(h.checksum)) {
            warnings.push({
                field: 'header.checksum',
                message: 'Checksum should be a SHA-256 hash (64 hex characters)',
                suggestion: 'Generate using SHA-256 algorithm',
            });
        }
        // Validate metadata if present
        if (h.metadata !== undefined) {
            if (typeof h.metadata !== 'object' || Array.isArray(h.metadata)) {
                errors.push({
                    field: 'header.metadata',
                    message: 'Metadata must be an object',
                    code: 'INVALID_METADATA_TYPE',
                    value: h.metadata,
                });
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Validate genome chunk
     */
    validateChunk(chunk) {
        const errors = [];
        const warnings = [];
        if (!chunk || typeof chunk !== 'object') {
            errors.push({
                field: 'chunk',
                message: 'Chunk must be an object',
                code: 'INVALID_CHUNK_TYPE',
                value: chunk,
            });
            return { valid: false, errors, warnings };
        }
        const c = chunk;
        // Validate id
        if (typeof c.id !== 'string' || c.id.length === 0) {
            errors.push({
                field: 'chunk.id',
                message: 'Chunk ID must be a non-empty string',
                code: 'INVALID_CHUNK_ID',
                value: c.id,
            });
        }
        // Validate type
        const validTypes = ['header', 'patterns', 'flows', 'entities', 'config', 'footer'];
        if (!validTypes.includes(c.type)) {
            errors.push({
                field: 'chunk.type',
                message: `Invalid chunk type: ${c.type}. Allowed: ${validTypes.join(', ')}`,
                code: 'INVALID_CHUNK_TYPE_VALUE',
                value: c.type,
            });
        }
        // Validate data
        if (c.data === undefined) {
            errors.push({
                field: 'chunk.data',
                message: 'Chunk data is required',
                code: 'MISSING_CHUNK_DATA',
            });
        }
        // Validate checksum
        if (typeof c.checksum !== 'string') {
            errors.push({
                field: 'chunk.checksum',
                message: 'Chunk checksum must be a string',
                code: 'INVALID_CHUNK_CHECKSUM',
                value: c.checksum,
            });
        }
        // Validate order
        if (typeof c.order !== 'number' || c.order < 0) {
            errors.push({
                field: 'chunk.order',
                message: 'Chunk order must be a non-negative number',
                code: 'INVALID_CHUNK_ORDER',
                value: c.order,
            });
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Validate hash table
     */
    validateHashTable(table) {
        const errors = [];
        const warnings = [];
        if (!table || typeof table !== 'object' || Array.isArray(table)) {
            errors.push({
                field: 'hashTable',
                message: 'Hash table must be a plain object',
                code: 'INVALID_HASH_TABLE_TYPE',
                value: table,
            });
            return { valid: false, errors, warnings };
        }
        const t = table;
        for (const [key, value] of Object.entries(t)) {
            // Validate key
            if (key.length > MAX_FIELD_LENGTH) {
                errors.push({
                    field: `hashTable.${key.substring(0, 50)}...`,
                    message: 'Hash table key exceeds maximum length',
                    code: 'HASH_KEY_TOO_LONG',
                });
                continue;
            }
            // Validate value
            if (typeof value !== 'string') {
                errors.push({
                    field: `hashTable.${key}`,
                    message: 'Hash value must be a string',
                    code: 'INVALID_HASH_VALUE_TYPE',
                    value,
                });
                continue;
            }
            // Hash should be 8-character hex
            if (!/^[a-f0-9]{8}$/i.test(value)) {
                warnings.push({
                    field: `hashTable.${key}`,
                    message: 'Hash value should be 8-character hex',
                    suggestion: 'Use semantic hash function to generate consistent hashes',
                });
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Validate patterns object
     */
    validatePatterns(patterns) {
        const errors = [];
        const warnings = [];
        if (!patterns || typeof patterns !== 'object' || Array.isArray(patterns)) {
            errors.push({
                field: 'patterns',
                message: 'Patterns must be a plain object',
                code: 'INVALID_PATTERNS_TYPE',
                value: patterns,
            });
            return { valid: false, errors, warnings };
        }
        const p = patterns;
        for (const [patternName, instances] of Object.entries(p)) {
            if (!Array.isArray(instances)) {
                errors.push({
                    field: `patterns.${patternName}`,
                    message: 'Pattern instances must be an array',
                    code: 'INVALID_PATTERN_INSTANCES',
                    value: instances,
                });
                continue;
            }
            for (let i = 0; i < instances.length; i++) {
                const instance = instances[i];
                if (!instance || typeof instance !== 'object') {
                    errors.push({
                        field: `patterns.${patternName}[${i}]`,
                        message: 'Pattern instance must be an object',
                        code: 'INVALID_PATTERN_INSTANCE',
                        value: instance,
                    });
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Validate flows object
     */
    validateFlows(flows) {
        const errors = [];
        const warnings = [];
        if (!flows || typeof flows !== 'object' || Array.isArray(flows)) {
            errors.push({
                field: 'flows',
                message: 'Flows must be a plain object',
                code: 'INVALID_FLOWS_TYPE',
                value: flows,
            });
            return { valid: false, errors, warnings };
        }
        const f = flows;
        for (const [flowName, steps] of Object.entries(f)) {
            if (!Array.isArray(steps)) {
                errors.push({
                    field: `flows.${flowName}`,
                    message: 'Flow steps must be an array',
                    code: 'INVALID_FLOW_STEPS',
                    value: steps,
                });
                continue;
            }
            for (let i = 0; i < steps.length; i++) {
                if (typeof steps[i] !== 'string') {
                    errors.push({
                        field: `flows.${flowName}[${i}]`,
                        message: 'Flow step must be a string',
                        code: 'INVALID_FLOW_STEP',
                        value: steps[i],
                    });
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Validate entities array
     */
    validateEntities(entities) {
        const errors = [];
        const warnings = [];
        if (!Array.isArray(entities)) {
            errors.push({
                field: 'entities',
                message: 'Entities must be an array',
                code: 'INVALID_ENTITIES_TYPE',
                value: entities,
            });
            return { valid: false, errors, warnings };
        }
        for (let i = 0; i < entities.length; i++) {
            if (typeof entities[i] !== 'string') {
                errors.push({
                    field: `entities[${i}]`,
                    message: 'Entity must be a string',
                    code: 'INVALID_ENTITY',
                    value: entities[i],
                });
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Validate config object
     */
    validateConfig(config) {
        const errors = [];
        const warnings = [];
        if (!config || typeof config !== 'object' || Array.isArray(config)) {
            errors.push({
                field: 'config',
                message: 'Config must be a plain object',
                code: 'INVALID_CONFIG_TYPE',
                value: config,
            });
            return { valid: false, errors, warnings };
        }
        // Config can have any string values, just validate structure
        const c = config;
        for (const key of Object.keys(c)) {
            if (c[key] !== undefined && typeof c[key] !== 'string' && typeof c[key] !== 'undefined') {
                warnings.push({
                    field: `config.${key}`,
                    message: 'Config values should typically be strings',
                    suggestion: 'Consider converting to string for consistency',
                });
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Validate complete parsed genome
     */
    validateGenome(genome) {
        const allErrors = [];
        const allWarnings = [];
        if (!genome || typeof genome !== 'object') {
            return {
                valid: false,
                errors: [{
                        field: 'genome',
                        message: 'Genome must be an object',
                        code: 'INVALID_GENOME_TYPE',
                        value: genome,
                    }],
                warnings: [],
            };
        }
        const g = genome;
        // Validate header
        const headerResult = this.validateHeader(g.header);
        allErrors.push(...headerResult.errors);
        allWarnings.push(...headerResult.warnings);
        // Validate patterns
        const patternsResult = this.validatePatterns(g.patterns);
        allErrors.push(...patternsResult.errors);
        allWarnings.push(...patternsResult.warnings);
        // Validate flows
        const flowsResult = this.validateFlows(g.flows);
        allErrors.push(...flowsResult.errors);
        allWarnings.push(...flowsResult.warnings);
        // Validate entities
        const entitiesResult = this.validateEntities(g.entities);
        allErrors.push(...entitiesResult.errors);
        allWarnings.push(...entitiesResult.warnings);
        // Validate config
        const configResult = this.validateConfig(g.config);
        allErrors.push(...configResult.errors);
        allWarnings.push(...configResult.warnings);
        // Validate hashTable
        const hashTableResult = this.validateHashTable(g.hashTable);
        allErrors.push(...hashTableResult.errors);
        allWarnings.push(...hashTableResult.warnings);
        return {
            valid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings,
        };
    }
    /**
     * Validate raw genome string before parsing
     */
    validateRawGenome(content) {
        const errors = [];
        const warnings = [];
        // Check size
        if (content.length > MAX_GENOME_SIZE) {
            errors.push({
                field: 'content',
                message: `Genome exceeds maximum size of ${MAX_GENOME_SIZE} bytes`,
                code: 'GENOME_TOO_LARGE',
                value: `${content.length} bytes`,
            });
        }
        // Security scan
        const securityResult = this.scan(content);
        for (const issue of securityResult.issues) {
            if (issue.severity === 'critical' || issue.severity === 'high') {
                errors.push({
                    field: 'content',
                    message: `Security issue: ${issue.description}`,
                    code: 'SECURITY_VIOLATION',
                    value: issue.match,
                });
            }
            else {
                warnings.push({
                    field: 'content',
                    message: `Potential security concern: ${issue.description}`,
                    suggestion: 'Review and ensure this is expected',
                });
            }
        }
        // Check for valid JSON structure
        if (!this.strictMode) {
            // In non-strict mode, just check basic structure
            if (!content.trim().startsWith('{') || !content.trim().endsWith('}')) {
                errors.push({
                    field: 'content',
                    message: 'Genome must be a JSON object',
                    code: 'INVALID_JSON_STRUCTURE',
                });
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Safe parse genome with validation
     */
    safeParse(content) {
        // Validate raw content first
        const rawValidation = this.validateRawGenome(content);
        if (!rawValidation.valid) {
            return { genome: null, validation: rawValidation };
        }
        // Parse JSON
        let parsed;
        try {
            parsed = JSON.parse(content);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            return {
                genome: null,
                validation: {
                    valid: false,
                    errors: [{
                            field: 'content',
                            message: `JSON parse error: ${errorMessage}`,
                            code: 'JSON_PARSE_ERROR',
                        }],
                    warnings: rawValidation.warnings,
                },
            };
        }
        // Validate parsed structure
        const structureValidation = this.validateGenome(parsed);
        if (!structureValidation.valid) {
            return { genome: null, validation: structureValidation };
        }
        return {
            genome: parsed,
            validation: {
                valid: true,
                errors: [],
                warnings: [...rawValidation.warnings, ...structureValidation.warnings],
            },
        };
    }
    /**
     * Add custom security pattern
     */
    addSecurityPattern(pattern) {
        this.customPatterns.push(pattern);
    }
    /**
     * Remove custom security pattern
     */
    removeSecurityPattern(patternRegex) {
        const index = this.customPatterns.findIndex(p => p.pattern.source === patternRegex);
        if (index >= 0) {
            this.customPatterns.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Check if ISO date string is valid
     */
    isValidISODate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && dateString.includes('T');
    }
    /**
     * Deep validate object for circular references
     */
    detectCircularRefs(obj, path = [], seen = new WeakMap()) {
        if (obj === null || typeof obj !== 'object') {
            return null;
        }
        const currentPath = [...path, ''];
        if (seen.has(obj)) {
            return seen.get(obj) ?? null;
        }
        seen.set(obj, currentPath);
        if (path.length > this.maxDepth) {
            return [...path, 'MAX_DEPTH_EXCEEDED'];
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const result = this.detectCircularRefs(obj[i], [...path, `[${i}]`], seen);
                if (result)
                    return result;
            }
        }
        else {
            for (const [key, value] of Object.entries(obj)) {
                const result = this.detectCircularRefs(value, [...path, `.${key}`], seen);
                if (result)
                    return result;
            }
        }
        return null;
    }
}
// ============================================================================
// FACTORY FUNCTION
// ============================================================================
/**
 * Create a genome validator instance
 */
export function createGenomeValidator(options) {
    return new GenomeValidator(options);
}
// ============================================================================
// EXPORTS
// ============================================================================
export default GenomeValidator;
//# sourceMappingURL=genome-validator.js.map