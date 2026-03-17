/**
 * LLMemory-Palace v25.0 - Prompt Templates
 *
 * Generates LLM-ready context strings from palace data.
 * Supports multiple LLM formats: Claude, GPT, Ollama.
 *
 * @module ai/prompt-templates
 * @version 25.0.0
 */

/**
 * PromptTemplates generates context strings for LLM consumption.
 *
 * @example
 * ```javascript
 * const templates = new PromptTemplates();
 *
 * // Generate prompt for a query
 * const prompt = templates.generatePrompt(palace, 'How does authentication work?');
 *
 * // Generate system prompt
 * const system = templates.generateSystemPrompt(palace);
 *
 * // Format for specific LLM
 * const claudeFormat = templates.formatForLLM(palace, 'claude');
 * ```
 */
export class PromptTemplates {
  constructor() {
    this.maxContextLength = 100000;
    this.includePatterns = true;
    this.includeFlows = true;
    this.includeFiles = true;
  }

  /**
   * Generate LLM-ready context string from palace data
   *
   * @param {Object} palace - Palace instance or pack data
   * @param {string} query - User query to focus the context
   * @param {Object} options - Generation options
   * @returns {string} LLM-ready context string
   */
  generatePrompt(palace, query, options = {}) {
    const {
      maxTokens = 4000,
      includeStructure = true,
      includePatterns = true,
      includeFlows = true,
      focusArea = null
    } = options;

    const pack = this._normalizePalaceData(palace);
    const relevantFiles = this._findRelevantFiles(pack, query, focusArea);
    const relevantPatterns = this._findRelevantPatterns(pack, query);
    const relevantFlows = this._findRelevantFlows(pack, query);

    let prompt = '';

    // Add project overview
    prompt += this._generateProjectOverview(pack);

    // Add relevant patterns
    if (includePatterns && relevantPatterns.length > 0) {
      prompt += '\n\n## Relevant Patterns\n\n';
      prompt += this._formatPatterns(relevantPatterns);
    }

    // Add relevant flows
    if (includeFlows && relevantFlows.length > 0) {
      prompt += '\n\n## Relevant Flows\n\n';
      prompt += this._formatFlows(relevantFlows);
    }

    // Add file structure if requested
    if (includeStructure) {
      prompt += '\n\n## Project Structure\n\n';
      prompt += this._formatFileStructure(pack);
    }

    // Add relevant file contents
    if (relevantFiles.length > 0) {
      prompt += '\n\n## Relevant Code\n\n';
      prompt += this._formatFileContents(relevantFiles, maxTokens);
    }

    // Add query context
    prompt += `\n\n## Query\n\n${query}\n`;

    return prompt;
  }

  /**
   * Generate full system prompt for palace context
   *
   * @param {Object} palace - Palace instance or pack data
   * @param {Object} options - Generation options
   * @returns {string} Full system prompt
   */
  generateSystemPrompt(palace, options = {}) {
    const {
      role = 'code-assistant',
      expertise = 'full-stack development',
      constraints = []
    } = options;

    const pack = this._normalizePalaceData(palace);

    let systemPrompt = '';

    // Role definition
    systemPrompt += this._generateRoleDefinition(role, expertise);

    // Project context
    systemPrompt += '\n\n## Project Context\n\n';
    systemPrompt += this._generateProjectOverview(pack);

    // Pattern library reference
    if (pack.patterns && pack.patterns.length > 0) {
      systemPrompt += '\n\n## Pattern Library\n\n';
      systemPrompt += 'This project uses the following code patterns:\n\n';
      systemPrompt += this._formatPatternLibrary(pack.patterns);
    }

    // Behavior flows reference
    if (pack.flows && pack.flows.length > 0) {
      systemPrompt += '\n\n## Behavior Flows\n\n';
      systemPrompt += 'The following logic flows are implemented:\n\n';
      systemPrompt += this._formatFlowLibrary(pack.flows);
    }

    // Configuration
    if (pack.config) {
      systemPrompt += '\n\n## Project Configuration\n\n';
      systemPrompt += this._formatConfig(pack.config);
    }

    // Constraints
    if (constraints.length > 0) {
      systemPrompt += '\n\n## Constraints\n\n';
      constraints.forEach((c, i) => {
        systemPrompt += `${i + 1}. ${c}\n`;
      });
    }

    // Instructions
    systemPrompt += '\n\n## Instructions\n\n';
    systemPrompt += this._generateInstructions();

    return systemPrompt;
  }

  /**
   * Format palace data for specific LLM provider
   *
   * @param {Object} palace - Palace instance or pack data
   * @param {string} llm - LLM provider: 'claude', 'gpt', 'ollama'
   * @param {Object} options - Format options
   * @returns {Object} LLM-specific formatted data
   */
  formatForLLM(palace, llm, options = {}) {
    const pack = this._normalizePalaceData(palace);
    const {
      query = null,
      maxTokens = 4000,
      stream = false
    } = options;

    switch (llm.toLowerCase()) {
      case 'claude':
        return this._formatForClaude(pack, query, maxTokens, stream);
      case 'gpt':
        return this._formatForGPT(pack, query, maxTokens, stream);
      case 'ollama':
        return this._formatForOllama(pack, query, maxTokens, stream);
      default:
        throw new Error(`Unsupported LLM provider: ${llm}`);
    }
  }

  // ==================== Private Methods ====================

  /**
   * Normalize palace data to pack format
   * @private
   */
  _normalizePalaceData(palace) {
    // If it's already a pack object
    if (palace.files && Array.isArray(palace.files)) {
      return palace;
    }

    // If it's a Palace instance with createPack method
    if (typeof palace.createPack === 'function') {
      // Return async wrapper
      throw new Error('Palace instance must be resolved to pack first. Call await palace.createPack()');
    }

    // If it has the expected properties directly
    if (palace.files instanceof Map || palace.files instanceof Object) {
      return {
        files: Array.from(palace.files?.values?.() || []),
        patterns: Array.from(palace.patterns?.values?.() || []),
        flows: Array.from(palace.flows?.values?.() || []),
        config: palace.config || {},
        stats: palace.stats || {},
        name: palace.name || 'Unknown Project'
      };
    }

    return palace;
  }

  /**
   * Generate project overview section
   * @private
   */
  _generateProjectOverview(pack) {
    let overview = `# Project: ${pack.name || 'Codebase'}\n\n`;

    if (pack.stats) {
      overview += `**Statistics:**\n`;
      overview += `- Files: ${pack.stats.files || 'N/A'}\n`;
      overview += `- Lines: ${pack.stats.lines?.toLocaleString() || 'N/A'}\n`;
      overview += `- Size: ${this._formatSize(pack.stats.size) || 'N/A'}\n`;
      overview += '\n';
    }

    if (pack.config) {
      if (pack.config.framework) {
        overview += `**Framework:** ${pack.config.framework}\n`;
      }
      if (pack.config.languages && pack.config.languages.length > 0) {
        overview += `**Languages:** ${pack.config.languages.join(', ')}\n`;
      }
    }

    return overview;
  }

  /**
   * Generate role definition for system prompt
   * @private
   */
  _generateRoleDefinition(role, expertise) {
    return `You are an expert ${role} with deep expertise in ${expertise}.

Your role is to assist with understanding, modifying, and extending the codebase while maintaining consistency with existing patterns and architecture.`;
  }

  /**
   * Generate instructions section
   * @private
   */
  _generateInstructions() {
    return `When responding to queries:

1. **Analyze** the codebase context provided
2. **Reference** relevant patterns and flows when applicable
3. **Maintain** consistency with existing code style
4. **Explain** your reasoning and approach
5. **Provide** actionable, specific recommendations

Always consider:
- Existing patterns in the pattern library
- Active flows and their steps
- Project configuration and constraints
- Code quality and maintainability`;
  }

  /**
   * Find files relevant to a query
   * @private
   */
  _findRelevantFiles(pack, query, focusArea) {
    if (!pack.files || pack.files.length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    // Score each file by relevance
    const scoredFiles = pack.files.map(file => {
      let score = 0;

      // Check path relevance
      const pathLower = file.path.toLowerCase();
      queryTerms.forEach(term => {
        if (pathLower.includes(term)) {
          score += 10;
        }
      });

      // Check content relevance (if available)
      if (file.content) {
        const contentLower = file.content.toLowerCase();
        queryTerms.forEach(term => {
          const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
          score += matches;
        });
      }

      // Check focus area
      if (focusArea && pathLower.includes(focusArea.toLowerCase())) {
        score += 20;
      }

      return { file, score };
    });

    // Sort by score and return relevant files
    return scoredFiles
      .filter(sf => sf.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(sf => sf.file)
      .slice(0, 10); // Limit to top 10 files
  }

  /**
   * Find patterns relevant to a query
   * @private
   */
  _findRelevantPatterns(pack, query) {
    if (!pack.patterns || pack.patterns.length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    return pack.patterns.filter(pattern => {
      const nameLower = (pattern.name || '').toLowerCase();
      const descLower = (pattern.description || '').toLowerCase();

      return queryTerms.some(term =>
        nameLower.includes(term) || descLower.includes(term)
      );
    }).slice(0, 5);
  }

  /**
   * Find flows relevant to a query
   * @private
   */
  _findRelevantFlows(pack, query) {
    if (!pack.flows || pack.flows.length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    return pack.flows.filter(flow => {
      const nameLower = (flow.name || '').toLowerCase();
      const descLower = (flow.description || '').toLowerCase();
      const stepsLower = (flow.steps || []).join(' ').toLowerCase();

      return queryTerms.some(term =>
        nameLower.includes(term) ||
        descLower.includes(term) ||
        stepsLower.includes(term)
      );
    }).slice(0, 5);
  }

  /**
   * Format patterns for prompt
   * @private
   */
  _formatPatterns(patterns) {
    return patterns.map(p => {
      let output = `### ${p.name}\n\n`;
      if (p.description) {
        output += `${p.description}\n\n`;
      }
      output += '```javascript\n';
      output += p.template || '';
      output += '\n```\n';
      return output;
    }).join('\n');
  }

  /**
   * Format flows for prompt
   * @private
   */
  _formatFlows(flows) {
    return flows.map(f => {
      let output = `### ${f.name}\n\n`;
      if (f.description) {
        output += `${f.description}\n\n`;
      }
      output += `**Steps:**\n`;
      (f.steps || []).forEach((step, i) => {
        const stepName = typeof step === 'string' ? step : step.name;
        output += `${i + 1}. ${stepName}\n`;
      });
      output += `\n**Returns:** ${f.returns || 'unknown'}\n`;
      return output;
    }).join('\n');
  }

  /**
   * Format file structure
   * @private
   */
  _formatFileStructure(pack) {
    if (!pack.files || pack.files.length === 0) {
      return 'No files available.';
    }

    const structure = {};
    pack.files.forEach(file => {
      const parts = file.path.split('/');
      let current = structure;
      parts.forEach((part, i) => {
        if (i === parts.length - 1) {
          current[part] = file.language || 'unknown';
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    });

    return '```\n' + this._renderTree(structure, '', true) + '```\n';
  }

  /**
   * Render tree structure
   * @private
   */
  _renderTree(obj, prefix, isLast) {
    const keys = Object.keys(obj);
    let result = '';

    keys.forEach((key, i) => {
      const isLastKey = i === keys.length - 1;
      const value = obj[key];

      result += prefix + (isLastKey ? '└── ' : '├── ') + key + '\n';

      if (typeof value === 'object') {
        const newPrefix = prefix + (isLastKey ? '    ' : '│   ');
        result += this._renderTree(value, newPrefix, isLastKey);
      }
    });

    return result;
  }

  /**
   * Format file contents
   * @private
   */
  _formatFileContents(files, maxTokens) {
    const approxCharsPerToken = 4;
    const maxChars = maxTokens * approxCharsPerToken;
    let currentChars = 0;
    let output = '';

    for (const file of files) {
      if (!file.content) continue;

      const header = `### ${file.path}\n\n`;
      const lang = this._getLanguageTag(file.language);
      const content = file.content;
      const section = `${header}\`\`\`${lang}\n${content}\n\`\`\`\n\n`;

      if (currentChars + section.length > maxChars) {
        // Truncate if needed
        const remaining = maxChars - currentChars - header.length - 20;
        if (remaining > 100) {
          output += header + '```' + lang + '\n' + content.substring(0, remaining) + '\n... (truncated)\n```\n\n';
        }
        break;
      }

      output += section;
      currentChars += section.length;
    }

    return output;
  }

  /**
   * Format pattern library
   * @private
   */
  _formatPatternLibrary(patterns) {
    return patterns.map(p => {
      let output = `- **${p.name}**`;
      if (p.description) {
        output += `: ${p.description}`;
      }
      return output;
    }).join('\n');
  }

  /**
   * Format flow library
   * @private
   */
  _formatFlowLibrary(flows) {
    return flows.map(f => {
      let output = `- **${f.name}**`;
      if (f.description) {
        output += `: ${f.description}`;
      }
      output += ` (${(f.steps || []).length} steps)`;
      return output;
    }).join('\n');
  }

  /**
   * Format configuration
   * @private
   */
  _formatConfig(config) {
    let output = '';
    for (const [key, value] of Object.entries(config)) {
      if (value !== null && value !== undefined) {
        output += `- **${key}:** ${JSON.stringify(value)}\n`;
      }
    }
    return output || 'No configuration available.';
  }

  /**
   * Get language tag for code blocks
   * @private
   */
  _getLanguageTag(language) {
    const langMap = {
      'JavaScript': 'javascript',
      'TypeScript': 'typescript',
      'Python': 'python',
      'Go': 'go',
      'Rust': 'rust',
      'Java': 'java',
      'Ruby': 'ruby',
      'PHP': 'php',
      'C': 'c',
      'C++': 'cpp',
      'C#': 'csharp',
      'Swift': 'swift',
      'JSON': 'json',
      'YAML': 'yaml',
      'SQL': 'sql',
      'Shell': 'bash'
    };
    return langMap[language] || 'text';
  }

  /**
   * Format size in human-readable format
   * @private
   */
  _formatSize(bytes) {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ==================== LLM-Specific Formatters ====================

  /**
   * Format for Claude (Anthropic)
   * @private
   */
  _formatForClaude(pack, query, maxTokens, stream) {
    const systemPrompt = this.generateSystemPrompt(pack);

    const result = {
      model: 'claude-3-opus-20240229',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: []
    };

    if (query) {
      result.messages.push({
        role: 'user',
        content: query
      });
    }

    if (stream) {
      result.stream = true;
    }

    return result;
  }

  /**
   * Format for GPT (OpenAI)
   * @private
   */
  _formatForGPT(pack, query, maxTokens, stream) {
    const systemPrompt = this.generateSystemPrompt(pack);

    const result = {
      model: 'gpt-4-turbo-preview',
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ]
    };

    if (query) {
      result.messages.push({
        role: 'user',
        content: query
      });
    }

    if (stream) {
      result.stream = true;
    }

    return result;
  }

  /**
   * Format for Ollama
   * @private
   */
  _formatForOllama(pack, query, maxTokens, stream) {
    const systemPrompt = this.generateSystemPrompt(pack);

    const result = {
      model: 'codellama',
      options: {
        num_predict: maxTokens
      },
      system: systemPrompt,
      prompt: query || ''
    };

    if (stream) {
      result.stream = true;
    }

    return result;
  }
}

export default PromptTemplates;
