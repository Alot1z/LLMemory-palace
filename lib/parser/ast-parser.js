/**
 * LLMemory-Palace v3.0 - AST Parser
 *
 * Code parsing using @babel/parser for JavaScript/TypeScript.
 * Extracts symbols, imports, exports, and dependencies.
 *
 * @module parser/ast-parser
 * @version 3.0.0
 */
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
/**
 * Default parser plugins
 */
const DEFAULT_PLUGINS = [
    'jsx',
    'typescript',
    'decorators-legacy',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'dynamicImport',
    'nullishCoalescingOperator',
    'optionalChaining',
    'objectRestSpread',
    'numericSeparator',
    'optionalCatchBinding',
    'asyncGenerators',
    'bigInt',
    'importMeta',
    'topLevelAwait'
];
/**
 * ASTParser - Parse JavaScript/TypeScript code
 *
 * @example
 * ```typescript
 * const astParser = new ASTParser();
 *
 * const result = astParser.parse(`
 *   import { User } from './user';
 *
 *   export class UserService {
 *     async getUser(id: string): Promise<User> {
 *       return db.users.find(id);
 *     }
 *   }
 * `, 'typescript');
 *
 * console.log(result.classes);    // [{ name: 'UserService', ... }]
 * console.log(result.imports);    // [{ source: './user', specifiers: ['User'] }]
 * console.log(result.exports);   // [{ name: 'UserService', type: 'class' }]
 * ```
 */
export class ASTParser {
    plugins;
    sourceType;
    constructor(options = {}) {
        this.plugins = options.plugins || DEFAULT_PLUGINS;
        this.sourceType = options.sourceType || 'module';
    }
    /**
     * Parse code content
     *
     * @param content - Code content to parse
     * @param language - Programming language
     * @returns Parse result with symbols, imports, exports
     */
    parse(content, language) {
        // Only JS/TS supported for now
        if (language !== 'javascript' && language !== 'typescript') {
            return this.createUnsupportedResult(language);
        }
        try {
            const ast = parser.parse(content, {
                sourceType: this.sourceType,
                plugins: this.getPluginsForLanguage(language),
                errorRecovery: true,
                allowAwaitOutsideFunction: true,
                allowReturnOutsideFunction: false,
                allowSuperOutsideMethod: true,
                strictMode: false
            });
            return this.extractFromAST(ast, content, language);
        }
        catch (error) {
            return this.createErrorResult(error, language);
        }
    }
    /**
     * Parse and return FileAnalysis format
     *
     * @param content - Code content
     * @param filePath - File path
     * @param language - Programming language
     * @returns File analysis result
     */
    parseForAnalysis(content, filePath, language) {
        const result = this.parse(content, language);
        return {
            path: filePath,
            language,
            symbols: this.convertSymbols(result),
            dependencies: this.convertDependencies(result, filePath),
            patterns: this.detectPatterns(result),
            flows: [], // Flows detected separately
            metrics: result.metrics,
            exports: [] // Added: exports
        };
    }
    /**
     * Extract symbols from code
     *
     * @param content - Code content
     * @param language - Programming language
     * @returns Array of symbols
     */
    extractSymbols(content, language) {
        const result = this.parse(content, language);
        return this.convertSymbols(result);
    }
    /**
     * Extract dependencies from code
     *
     * @param content - Code content
     * @param language - Programming language
     * @returns Array of dependencies
     */
    extractDependencies(content, language, filePath) {
        const result = this.parse(content, language);
        return this.convertDependencies(result, filePath);
    }
    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        return ['javascript', 'typescript'];
    }
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    /**
     * Get plugins for specific language
     * @private
     */
    getPluginsForLanguage(language) {
        const plugins = [...this.plugins];
        if (language === 'typescript') {
            // TypeScript plugin is already included in defaults
        }
        else {
            // JavaScript - remove typescript plugin
            const tsIndex = plugins.indexOf('typescript');
            if (tsIndex >= 0) {
                plugins.splice(tsIndex, 1);
            }
        }
        return plugins;
    }
    /**
     * Extract all information from AST
     * @private
     */
    extractFromAST(ast, content, language) {
        const symbols = [];
        const imports = [];
        const exports = [];
        const classes = [];
        const functions = [];
        const errors = [];
        // Track exported names
        const exportedNames = new Set();
        let hasDefaultExport = false;
        try {
            traverse(ast, {
                // Import declarations
                ImportDeclaration: (path) => {
                    const node = path.node;
                    const specifiers = [];
                    let isNamespace = false;
                    let isDefault = false;
                    for (const spec of node.specifiers) {
                        if (spec.type === 'ImportDefaultSpecifier') {
                            specifiers.push(spec.local.name);
                            isDefault = true;
                        }
                        else if (spec.type === 'ImportNamespaceSpecifier') {
                            specifiers.push(spec.local.name);
                            isNamespace = true;
                        }
                        else if (spec.type === 'ImportSpecifier') {
                            specifiers.push(spec.local.name);
                        }
                    }
                    imports.push({
                        source: node.source.value,
                        specifiers,
                        isDefault,
                        isNamespace,
                        line: node.loc?.start?.line || 0
                    });
                },
                // Export named declarations
                ExportNamedDeclaration: (path) => {
                    const node = path.node;
                    if (node.declaration) {
                        if (node.declaration.id) {
                            exportedNames.add(node.declaration.id.name);
                            exports.push({
                                name: node.declaration.id.name,
                                type: this.getSymbolType(node.declaration.type),
                                isDefault: false,
                                line: node.loc?.start?.line || 0
                            });
                        }
                    }
                    else if (node.specifiers) {
                        for (const spec of node.specifiers) {
                            exportedNames.add(spec.exported.name);
                            exports.push({
                                name: spec.exported.name,
                                type: 'variable',
                                isDefault: false,
                                line: node.loc?.start?.line || 0
                            });
                        }
                    }
                },
                // Export default declarations
                ExportDefaultDeclaration: (path) => {
                    const node = path.node;
                    hasDefaultExport = true;
                    const name = node.declaration?.id?.name || 'default';
                    exports.push({
                        name,
                        type: this.getSymbolType(node.declaration?.type),
                        isDefault: true,
                        line: node.loc?.start?.line || 0
                    });
                },
                // Class declarations
                ClassDeclaration: (path) => {
                    const node = path.node;
                    if (!node.id)
                        return;
                    const methods = [];
                    const properties = [];
                    for (const member of node.body.body) {
                        if (member.type === 'ClassMethod') {
                            methods.push({
                                name: member.key.name,
                                params: member.params.map((p) => p.name || '?'),
                                returnType: member.returnType?.typeAnnotation?.type,
                                async: member.async,
                                static: member.static,
                                private: member.key.name.startsWith('#'),
                                line: member.loc?.start?.line || 0
                            });
                        }
                        else if (member.type === 'ClassProperty') {
                            properties.push({
                                name: member.key.name,
                                type: member.typeAnnotation?.typeAnnotation?.type,
                                static: member.static,
                                private: member.key.name.startsWith('#'),
                                readonly: member.readonly,
                                line: member.loc?.start?.line || 0
                            });
                        }
                    }
                    classes.push({
                        name: node.id.name,
                        extends: node.superClass?.name,
                        implements: node.implements?.map((i) => i.expression?.name) || [],
                        methods,
                        properties,
                        line: node.loc?.start?.line || 0,
                        endLine: node.loc?.end?.line || 0,
                        exported: exportedNames.has(node.id.name)
                    });
                    symbols.push({
                        name: node.id.name,
                        type: 'class',
                        line: node.loc?.start?.line || 0,
                        endLine: node.loc?.end?.line || 0,
                        exported: exportedNames.has(node.id.name),
                        async: false
                    });
                },
                // Function declarations
                FunctionDeclaration: (path) => {
                    const node = path.node;
                    if (!node.id)
                        return;
                    functions.push({
                        name: node.id.name,
                        params: node.params.map((p) => p.name || '?'),
                        returnType: node.returnType?.typeAnnotation?.type,
                        async: node.async,
                        arrow: false,
                        exported: exportedNames.has(node.id.name),
                        line: node.loc?.start?.line || 0,
                        endLine: node.loc?.end?.line || 0
                    });
                    symbols.push({
                        name: node.id.name,
                        type: 'function',
                        line: node.loc?.start?.line || 0,
                        endLine: node.loc?.end?.line || 0,
                        signature: this.getFunctionSignature(node),
                        exported: exportedNames.has(node.id.name),
                        async: node.async
                    });
                },
                // Arrow functions (variable declarations)
                VariableDeclaration: (path) => {
                    const node = path.node;
                    for (const decl of node.declarations) {
                        if (decl.id.type === 'Identifier') {
                            const isArrow = decl.init?.type === 'ArrowFunctionExpression';
                            if (isArrow) {
                                functions.push({
                                    name: decl.id.name,
                                    params: decl.init.params?.map((p) => p.name || '?') || [],
                                    returnType: decl.init.returnType?.typeAnnotation?.type,
                                    async: decl.init.async,
                                    arrow: true,
                                    exported: exportedNames.has(decl.id.name),
                                    line: node.loc?.start?.line || 0,
                                    endLine: node.loc?.end?.line || 0
                                });
                                symbols.push({
                                    name: decl.id.name,
                                    type: 'function',
                                    line: node.loc?.start?.line || 0,
                                    endLine: node.loc?.end?.line || 0,
                                    exported: exportedNames.has(decl.id.name),
                                    async: decl.init.async
                                });
                            }
                            else {
                                symbols.push({
                                    name: decl.id.name,
                                    type: 'variable',
                                    line: node.loc?.start?.line || 0,
                                    exported: exportedNames.has(decl.id.name),
                                    async: false
                                });
                            }
                        }
                    }
                },
                // Interface declarations (TypeScript)
                TSInterfaceDeclaration: (path) => {
                    const node = path.node;
                    symbols.push({
                        name: node.id.name,
                        type: 'interface',
                        line: node.loc?.start?.line || 0,
                        endLine: node.loc?.end?.line || 0,
                        exported: exportedNames.has(node.id.name),
                        async: false
                    });
                },
                // Type declarations (TypeScript)
                TSTypeAliasDeclaration: (path) => {
                    const node = path.node;
                    symbols.push({
                        name: node.id.name,
                        type: 'type',
                        line: node.loc?.start?.line || 0,
                        endLine: node.loc?.end?.line || 0,
                        exported: exportedNames.has(node.id.name),
                        async: false
                    });
                },
                // Enum declarations (TypeScript)
                TSEnumDeclaration: (path) => {
                    const node = path.node;
                    symbols.push({
                        name: node.id.name,
                        type: 'enum',
                        line: node.loc?.start?.line || 0,
                        endLine: node.loc?.end?.line || 0,
                        exported: exportedNames.has(node.id.name),
                        async: false
                    });
                }
            });
        }
        catch (error) {
            errors.push({
                message: error.message,
                line: error.loc?.line,
                column: error.loc?.column,
                code: 'TRAVERSE_ERROR'
            });
        }
        const metrics = this.computeMetrics(content, symbols, classes, functions);
        return {
            success: errors.length === 0,
            language,
            symbols,
            imports,
            exports,
            classes,
            functions,
            errors,
            metrics,
            raw: ast
        };
    }
    /**
     * Get symbol type from AST node type
     * @private
     */
    getSymbolType(nodeType) {
        const typeMap = {
            'ClassDeclaration': 'class',
            'FunctionDeclaration': 'function',
            'VariableDeclaration': 'variable',
            'TSInterfaceDeclaration': 'interface',
            'TSTypeAliasDeclaration': 'type',
            'TSEnumDeclaration': 'enum'
        };
        return typeMap[nodeType] || 'variable';
    }
    /**
     * Get function signature
     * @private
     */
    getFunctionSignature(node) {
        const params = node.params.map((p) => p.name || '?').join(', ');
        return `${node.id.name}(${params})`;
    }
    /**
     * Compute file metrics
     * @private
     */
    computeMetrics(content, symbols, classes, functions) {
        const lines = content.split('\n');
        return {
            lines: lines.length,
            characters: content.length,
            functions: functions.length,
            classes: classes.length,
            complexity: this.estimateComplexity(content)
        };
    }
    /**
     * Estimate cyclomatic complexity
     * @private
     */
    estimateComplexity(content) {
        const complexityKeywords = [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bswitch\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /\?\s*:/g, // ternary
            /&&/g,
            /\|\|/g
        ];
        let complexity = 1;
        for (const pattern of complexityKeywords) {
            const matches = content.match(pattern);
            if (matches)
                complexity += matches.length;
        }
        return complexity;
    }
    /**
     * Convert parsed symbols to Symbol array
     * @private
     */
    convertSymbols(result) {
        return result.symbols.map(s => ({
            name: s.name,
            type: s.type,
            path: '', // Will be filled by caller
            line: s.line,
            endLine: s.endLine,
            signature: s.signature,
            documentation: s.documentation
        }));
    }
    /**
     * Convert imports to dependencies
     * @private
     */
    convertDependencies(result, filePath) {
        return result.imports.map(imp => ({
            from: filePath,
            to: imp.source,
            type: 'import',
            line: imp.line
        }));
    }
    /**
     * Detect patterns in parsed code
     * @private
     */
    detectPatterns(result) {
        const patterns = [];
        // Detect class patterns
        for (const cls of result.classes) {
            patterns.push({
                type: 'class',
                name: cls.name,
                pattern: cls.extends ? 'EXTENDS' : 'CLASS'
            });
        }
        // Detect function patterns
        for (const fn of result.functions) {
            patterns.push({
                type: 'function',
                name: fn.name,
                pattern: fn.arrow ? 'ARROW_FUNCTION' : 'FUNCTION'
            });
        }
        return patterns;
    }
    /**
     * Create result for unsupported language
     * @private
     */
    createUnsupportedResult(language) {
        return {
            success: false,
            language,
            symbols: [],
            imports: [],
            exports: [],
            classes: [],
            functions: [],
            errors: [{
                    message: `Unsupported language: ${language}`,
                    code: 'UNSUPPORTED_LANGUAGE'
                }],
            metrics: { lines: 0, characters: 0, functions: 0, classes: 0 }
        };
    }
    /**
     * Create error result
     * @private
     */
    createErrorResult(error, language) {
        return {
            success: false,
            language,
            symbols: [],
            imports: [],
            exports: [],
            classes: [],
            functions: [],
            errors: [{
                    message: error.message,
                    line: error.loc?.line,
                    column: error.loc?.column,
                    code: 'PARSE_ERROR'
                }],
            metrics: { lines: 0, characters: 0, functions: 0, classes: 0 }
        };
    }
}
export default ASTParser;
//# sourceMappingURL=ast-parser.js.map