/**
 * Template Engine - Template-based code generation
 * Phase 4: Reconstruction Layer
 */
const DEFAULT_CONFIG = {
    language: 'typescript',
    framework: 'none',
    style: 'standard',
    indentSize: 2,
    useTabs: false,
    semicolons: true,
    quotes: 'single'
};
export class TemplateEngine {
    config;
    templates;
    cache;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.templates = new Map();
        this.cache = new Map();
        this.initializeTemplates();
    }
    initializeTemplates() {
        // TypeScript templates
        this.registerTemplate('ts-function', {
            id: 'ts-function',
            pattern: /^function\s+(\w+)/,
            template: `{{visibility}}function {{name}}({{params}}){{returnType}} {
{{body}}
}`,
            variables: ['visibility', 'name', 'params', 'returnType', 'body'],
            defaults: { visibility: '', returnType: '', params: '' }
        });
        this.registerTemplate('ts-class', {
            id: 'ts-class',
            pattern: /^class\s+(\w+)/,
            template: `{{visibility}}class {{name}}{{extends}}{{implements}} {
{{members}}
}`,
            variables: ['visibility', 'name', 'extends', 'implements', 'members'],
            defaults: { visibility: '', extends: '', implements: '' }
        });
        this.registerTemplate('ts-interface', {
            id: 'ts-interface',
            pattern: /^interface\s+(\w+)/,
            template: `interface {{name}}{{extends}} {
{{members}}
}`,
            variables: ['name', 'extends', 'members'],
            defaults: { extends: '' }
        });
        this.registerTemplate('ts-type', {
            id: 'ts-type',
            pattern: /^type\s+(\w+)/,
            template: `type {{name}} = {{definition}};`,
            variables: ['name', 'definition'],
            defaults: {}
        });
        this.registerTemplate('ts-const', {
            id: 'ts-const',
            pattern: /^const\s+(\w+)/,
            template: `const {{name}}: {{type}} = {{value}};`,
            variables: ['name', 'type', 'value'],
            defaults: { type: 'any' }
        });
        // React templates
        this.registerTemplate('react-component', {
            id: 'react-component',
            pattern: /^(function|const)\s+(\w+)\s*(\(|=)/,
            template: `{{visibility}}function {{name}}(props: {{propsType}}) {
{{body}}
  return (
    <div>
      {{jsx}}
    </div>
  );
}`,
            variables: ['visibility', 'name', 'propsType', 'body', 'jsx'],
            defaults: { visibility: '', propsType: 'Props' }
        });
        // Express templates
        this.registerTemplate('express-route', {
            id: 'express-route',
            pattern: /^(app|router)\.(get|post|put|delete)/,
            template: `{{router}}.{{method}}('{{path}}', async (req, res) => {
{{handler}}
});`,
            variables: ['router', 'method', 'path', 'handler'],
            defaults: { router: 'app' }
        });
    }
    registerTemplate(name, template) {
        this.templates.set(name, template);
    }
    compile(templateName, context) {
        const template = this.templates.get(templateName);
        if (!template) {
            throw new Error(`Template not found: ${templateName}`);
        }
        const cacheKey = `${templateName}:${context.symbol.hash}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        let output = template.template;
        for (const variable of template.variables) {
            const value = this.resolveVariable(variable, context, template.defaults);
            output = output.replace(new RegExp(`{{${variable}}}`, 'g'), value);
        }
        output = this.formatOutput(output);
        this.cache.set(cacheKey, output);
        return output;
    }
    resolveVariable(name, context, defaults) {
        // Try context options first
        if (context.options[name] !== undefined) {
            return String(context.options[name]);
        }
        // Try symbol properties
        const symbolProps = {
            name: context.symbol.name,
            signature: context.symbol.signature || '',
            kind: context.symbol.kind
        };
        if (symbolProps[name] !== undefined) {
            return symbolProps[name];
        }
        // Try pattern properties
        if (context.pattern) {
            const patternProps = {
                template: context.pattern.template || '',
                description: context.pattern.description || ''
            };
            if (patternProps[name] !== undefined) {
                return patternProps[name];
            }
        }
        // Use default
        return defaults[name] || '';
    }
    formatOutput(output) {
        const indent = this.config.useTabs ? '\t' : ' '.repeat(this.config.indentSize);
        // Normalize indentation
        const lines = output.split('\n');
        let depth = 0;
        return lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed)
                return '';
            // Decrease depth for closing braces
            if (trimmed.startsWith('}')) {
                depth = Math.max(0, depth - 1);
            }
            const indented = indent.repeat(depth) + trimmed;
            // Increase depth for opening braces
            const opens = (trimmed.match(/{/g) || []).length;
            const closes = (trimmed.match(/}/g) || []).length;
            depth += opens - closes;
            return indented;
        }).join('\n');
    }
    generateFromSymbol(symbol, pattern) {
        const templateName = this.detectTemplate(symbol);
        const context = {
            symbol,
            pattern,
            imports: [],
            exports: [],
            options: {}
        };
        return this.compile(templateName, context);
    }
    detectTemplate(symbol) {
        const key = `${this.config.language}-${symbol.kind}`;
        const mapping = {
            'typescript-function': 'ts-function',
            'typescript-class': 'ts-class',
            'typescript-interface': 'ts-interface',
            'typescript-type': 'ts-type',
            'typescript-constant': 'ts-const',
            'typescript-method': 'ts-function',
            'javascript-function': 'ts-function',
            'javascript-class': 'ts-class'
        };
        return mapping[key] || 'ts-function';
    }
    generateBoilerplate(type, name) {
        const boilerplates = {
            module: `/**
 * ${name} Module
 */

export interface ${name}Config {
  // Configuration options
}

export function create${name}(config: ${name}Config) {
  return {
    // Module implementation
  };
}

export default create${name};
`,
            class: `/**
 * ${name} Class
 */

export class ${name} {
  constructor() {
    // Initialize
  }

  // Methods
}

export default ${name};
`,
            component: `/**
 * ${name} Component
 */

import React from 'react';

interface ${name}Props {
  // Props definition
}

export const ${name}: React.FC<${name}Props> = (props) => {
  return (
    <div className="${name.toLowerCase()}">
      {/* Component content */}
    </div>
  );
};

export default ${name};
`
        };
        return boilerplates[type] || '';
    }
    clearCache() {
        this.cache.clear();
    }
}
export function createTemplateEngine(config) {
    return new TemplateEngine(config);
}
//# sourceMappingURL=template-engine.js.map