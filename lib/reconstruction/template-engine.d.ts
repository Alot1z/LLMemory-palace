/**
 * Template Engine - Template-based code generation
 * Phase 4: Reconstruction Layer
 */
import type { SymbolInfo, PatternInfo } from '../types.js';
export interface TemplateConfig {
    language: string;
    framework: string;
    style: 'standard' | 'minimal' | 'verbose';
    indentSize: number;
    useTabs: boolean;
    semicolons: boolean;
    quotes: 'single' | 'double' | 'backtick';
}
export interface CompiledTemplate {
    id: string;
    pattern: RegExp;
    template: string;
    variables: string[];
    defaults: Record<string, string>;
}
export interface TemplateContext {
    symbol: SymbolInfo;
    pattern?: PatternInfo;
    imports: string[];
    exports: string[];
    options: Record<string, unknown>;
}
export declare class TemplateEngine {
    private config;
    private templates;
    private cache;
    constructor(config?: Partial<TemplateConfig>);
    private initializeTemplates;
    registerTemplate(name: string, template: CompiledTemplate): void;
    compile(templateName: string, context: TemplateContext): string;
    private resolveVariable;
    private formatOutput;
    generateFromSymbol(symbol: SymbolInfo, pattern?: PatternInfo): string;
    private detectTemplate;
    generateBoilerplate(type: 'module' | 'class' | 'component', name: string): string;
    clearCache(): void;
}
export declare function createTemplateEngine(config?: Partial<TemplateConfig>): TemplateEngine;
//# sourceMappingURL=template-engine.d.ts.map