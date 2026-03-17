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
import type { Language, Symbol, SymbolType, Dependency, FileAnalysis, FileMetrics } from '../types.js';
/**
 * Parsed symbol information
 */
export interface ParsedSymbol {
    name: string;
    type: SymbolType;
    line: number;
    endLine?: number;
    signature?: string;
    documentation?: string;
    exported: boolean;
    async: boolean;
}
/**
 * Parsed import information
 */
export interface ParsedImport {
    source: string;
    specifiers: string[];
    isDefault: boolean;
    isNamespace: boolean;
    line: number;
}
/**
 * Parsed export information
 */
export interface ParsedExport {
    name: string;
    type: SymbolType;
    isDefault: boolean;
    line: number;
}
/**
 * Parsed class information
 */
export interface ParsedClass {
    name: string;
    extends?: string;
    implements: string[];
    methods: ParsedMethod[];
    properties: ParsedProperty[];
    line: number;
    endLine: number;
    exported: boolean;
}
/**
 * Parsed method information
 */
export interface ParsedMethod {
    name: string;
    params: string[];
    returnType?: string;
    async: boolean;
    static: boolean;
    private: boolean;
    line: number;
}
/**
 * Parsed property information
 */
export interface ParsedProperty {
    name: string;
    type?: string;
    static: boolean;
    private: boolean;
    readonly: boolean;
    line: number;
}
/**
 * Parsed function information
 */
export interface ParsedFunction {
    name: string;
    params: string[];
    returnType?: string;
    async: boolean;
    arrow: boolean;
    exported: boolean;
    line: number;
    endLine: number;
}
/**
 * Complete AST parse result
 */
export interface ASTParseResult {
    success: boolean;
    language: Language;
    symbols: ParsedSymbol[];
    imports: ParsedImport[];
    exports: ParsedExport[];
    classes: ParsedClass[];
    functions: ParsedFunction[];
    errors: ParseError[];
    metrics: FileMetrics;
    raw?: any;
}
/**
 * Parse error
 */
export interface ParseError {
    message: string;
    line?: number;
    column?: number;
    code: string;
}
/**
 * Parser options
 */
export interface ParserOptions {
    sourceType?: 'module' | 'script' | 'unambiguous';
    plugins?: parser.ParserPlugin[];
    allowAwaitOutsideFunction?: boolean;
    allowReturnOutsideFunction?: boolean;
    allowSuperOutsideMethod?: boolean;
    strictMode?: boolean;
}
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
export declare class ASTParser {
    private plugins;
    private sourceType;
    constructor(options?: ParserOptions);
    /**
     * Parse code content
     *
     * @param content - Code content to parse
     * @param language - Programming language
     * @returns Parse result with symbols, imports, exports
     */
    parse(content: string, language: Language): ASTParseResult;
    /**
     * Parse and return FileAnalysis format
     *
     * @param content - Code content
     * @param filePath - File path
     * @param language - Programming language
     * @returns File analysis result
     */
    parseForAnalysis(content: string, filePath: string, language: Language): FileAnalysis;
    /**
     * Extract symbols from code
     *
     * @param content - Code content
     * @param language - Programming language
     * @returns Array of symbols
     */
    extractSymbols(content: string, language: Language): Symbol[];
    /**
     * Extract dependencies from code
     *
     * @param content - Code content
     * @param language - Programming language
     * @returns Array of dependencies
     */
    extractDependencies(content: string, language: Language, filePath: string): Dependency[];
    /**
     * Get supported languages
     */
    getSupportedLanguages(): Language[];
    /**
     * Get plugins for specific language
     * @private
     */
    private getPluginsForLanguage;
    /**
     * Extract all information from AST
     * @private
     */
    private extractFromAST;
    /**
     * Get symbol type from AST node type
     * @private
     */
    private getSymbolType;
    /**
     * Get function signature
     * @private
     */
    private getFunctionSignature;
    /**
     * Compute file metrics
     * @private
     */
    private computeMetrics;
    /**
     * Estimate cyclomatic complexity
     * @private
     */
    private estimateComplexity;
    /**
     * Convert parsed symbols to Symbol array
     * @private
     */
    private convertSymbols;
    /**
     * Convert imports to dependencies
     * @private
     */
    private convertDependencies;
    /**
     * Detect patterns in parsed code
     * @private
     */
    private detectPatterns;
    /**
     * Create result for unsupported language
     * @private
     */
    private createUnsupportedResult;
    /**
     * Create error result
     * @private
     */
    private createErrorResult;
}
export default ASTParser;
//# sourceMappingURL=ast-parser.d.ts.map