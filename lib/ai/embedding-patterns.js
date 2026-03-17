/**
 * LLMemory-Palace v25.0 - Embedding Patterns
 *
 * Generates patterns array for embeddings from palace data.
 * Optimizes for semantic search and similarity matching.
 *
 * @module ai/embedding-patterns
 * @version 25.0.0
 */

/**
 * EmbeddingPatterns generates embedding-ready patterns from palace data.
 *
 * @example
 * ```javascript
 * const embeddings = new EmbeddingPatterns();
 *
 * // Get patterns for embeddings
 * const patterns = embeddings.getEmbeddingPatterns(palace);
 *
 * // Get semantic chunks
 * const chunks = embeddings.getSemanticChunks(palace, { maxChunkSize: 500 });
 *
 * // Get searchable index
 * const index = embeddings.buildSearchIndex(palace);
 * ```
 */
export class EmbeddingPatterns {
  constructor() {
    this.maxPatternLength = 500;
    this.minPatternLength = 20;
    this.includeMetadata = true;
  }

  /**
   * Get patterns array optimized for embeddings
   *
   * @param {Object} palace - Palace instance or pack data
   * @param {Object} options - Pattern generation options
   * @returns {Array} Array of embedding-ready patterns
   */
  getEmbeddingPatterns(palace, options = {}) {
    const {
      includeCodePatterns = true,
      includeFlowPatterns = true,
      includeStructuralPatterns = true,
      includeSemanticPatterns = true,
      maxPatterns = 100
    } = options;

    const pack = this._normalizePalaceData(palace);
    const patterns = [];

    // Code patterns from pattern library
    if (includeCodePatterns) {
      patterns.push(...this._extractCodePatterns(pack));
    }

    // Flow patterns from behavior graph
    if (includeFlowPatterns) {
      patterns.push(...this._extractFlowPatterns(pack));
    }

    // Structural patterns from file organization
    if (includeStructuralPatterns) {
      patterns.push(...this._extractStructuralPatterns(pack));
    }

    // Semantic patterns from content analysis
    if (includeSemanticPatterns) {
      patterns.push(...this._extractSemanticPatterns(pack));
    }

    // Deduplicate and rank patterns
    const uniquePatterns = this._deduplicatePatterns(patterns);

    // Sort by relevance score and limit
    return uniquePatterns
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, maxPatterns);
  }

  /**
   * Get semantic chunks for embedding
   *
   * @param {Object} palace - Palace instance or pack data
   * @param {Object} options - Chunking options
   * @returns {Array} Array of semantic chunks
   */
  getSemanticChunks(palace, options = {}) {
    const {
      maxChunkSize = 500,
      minChunkSize = 50,
      overlapSize = 50,
      chunkBy = 'function' // 'function', 'class', 'file', 'paragraph'
    } = options;

    const pack = this._normalizePalaceData(palace);
    const chunks = [];

    for (const file of pack.files || []) {
      if (!file.content) continue;

      const fileChunks = this._chunkContent(file.content, file, {
        maxChunkSize,
        minChunkSize,
        overlapSize,
        chunkBy
      });

      chunks.push(...fileChunks);
    }

    return chunks;
  }

  /**
   * Build searchable index for embeddings
   *
   * @param {Object} palace - Palace instance or pack data
   * @param {Object} options - Index building options
   * @returns {Object} Searchable index structure
   */
  buildSearchIndex(palace, options = {}) {
    const {
      includePatterns = true,
      includeFlows = true,
      includeFiles = true,
      includeSymbols = true
    } = options;

    const pack = this._normalizePalaceData(palace);
    const index = {
      patterns: [],
      flows: [],
      files: [],
      symbols: [],
      metadata: {
        projectName: pack.name || 'Unknown',
        createdAt: new Date().toISOString(),
        totalItems: 0
      }
    };

    // Index patterns
    if (includePatterns && pack.patterns) {
      index.patterns = pack.patterns.map(p => ({
        id: `pattern:${p.name}`,
        name: p.name,
        description: p.description || '',
        template: p.template || '',
        searchableText: this._createSearchableText([
          p.name,
          p.description,
          p.template
        ]),
        metadata: {
          version: p.version,
          parameters: p.parameters || []
        }
      }));
    }

    // Index flows
    if (includeFlows && pack.flows) {
      index.flows = pack.flows.map(f => ({
        id: `flow:${f.name}`,
        name: f.name,
        description: f.description || '',
        steps: f.steps || [],
        searchableText: this._createSearchableText([
          f.name,
          f.description,
          ...(f.steps || [])
        ]),
        metadata: {
          returns: f.returns,
          errors: f.errors
        }
      }));
    }

    // Index files
    if (includeFiles && pack.files) {
      index.files = pack.files.map(f => ({
        id: `file:${f.path}`,
        path: f.path,
        language: f.language,
        lines: f.lines,
        searchableText: this._createSearchableText([
          f.path,
          f.language
        ]),
        metadata: {
          hash: f.hash,
          size: f.size
        }
      }));
    }

    // Index symbols
    if (includeSymbols && pack.files) {
      for (const file of pack.files) {
        if (file.patterns) {
          for (const symbol of file.patterns) {
            index.symbols.push({
              id: `symbol:${file.path}:${symbol.name}`,
              name: symbol.name,
              type: symbol.type,
              file: file.path,
              searchableText: this._createSearchableText([
                symbol.name,
                symbol.type,
                file.path
              ])
            });
          }
        }
      }
    }

    index.metadata.totalItems =
      index.patterns.length +
      index.flows.length +
      index.files.length +
      index.symbols.length;

    return index;
  }

  /**
   * Generate embedding vectors for patterns
   * (Returns text ready for embedding, actual embedding happens externally)
   *
   * @param {Object} palace - Palace instance or pack data
   * @param {Object} options - Generation options
   * @returns {Array} Array of texts ready for embedding
   */
  generateEmbeddingTexts(palace, options = {}) {
    const patterns = this.getEmbeddingPatterns(palace, options);

    return patterns.map(p => ({
      id: p.id,
      text: p.searchableText || p.content,
      metadata: {
        type: p.type,
        source: p.source,
        name: p.name
      }
    }));
  }

  // ==================== Private Methods ====================

  /**
   * Normalize palace data to pack format
   * @private
   */
  _normalizePalaceData(palace) {
    if (palace.files && Array.isArray(palace.files)) {
      return palace;
    }

    if (typeof palace.createPack === 'function') {
      throw new Error('Palace instance must be resolved to pack first. Call await palace.createPack()');
    }

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
   * Extract code patterns for embeddings
   * @private
   */
  _extractCodePatterns(pack) {
    const patterns = [];

    if (!pack.patterns) return patterns;

    for (const pattern of pack.patterns) {
      patterns.push({
        id: `code-pattern:${pattern.name}`,
        type: 'code-pattern',
        name: pattern.name,
        content: pattern.template || '',
        description: pattern.description || '',
        searchableText: this._createSearchableText([
          pattern.name,
          pattern.description,
          pattern.template
        ]),
        source: 'pattern-library',
        score: this._calculatePatternScore(pattern),
        metadata: {
          version: pattern.version,
          parameters: pattern.parameters,
          instances: pattern.instances?.length || 0
        }
      });
    }

    return patterns;
  }

  /**
   * Extract flow patterns for embeddings
   * @private
   */
  _extractFlowPatterns(pack) {
    const patterns = [];

    if (!pack.flows) return patterns;

    for (const flow of pack.flows) {
      const stepText = (flow.steps || [])
        .map(s => typeof s === 'string' ? s : s.name)
        .join(' -> ');

      patterns.push({
        id: `flow-pattern:${flow.name}`,
        type: 'flow-pattern',
        name: flow.name,
        content: stepText,
        description: flow.description || '',
        searchableText: this._createSearchableText([
          flow.name,
          flow.description,
          stepText
        ]),
        source: 'behavior-graph',
        score: this._calculateFlowScore(flow),
        metadata: {
          returns: flow.returns,
          stepCount: (flow.steps || []).length,
          hasErrors: !!(flow.errors && Object.keys(flow.errors).length > 0)
        }
      });
    }

    return patterns;
  }

  /**
   * Extract structural patterns for embeddings
   * @private
   */
  _extractStructuralPatterns(pack) {
    const patterns = [];

    if (!pack.files) return patterns;

    // Group files by directory
    const dirMap = new Map();

    for (const file of pack.files) {
      const dir = file.path.split('/').slice(0, -1).join('/');
      if (!dirMap.has(dir)) {
        dirMap.set(dir, []);
      }
      dirMap.get(dir).push(file);
    }

    // Create structural patterns from directories
    for (const [dir, files] of dirMap) {
      if (files.length < 2) continue;

      const languages = [...new Set(files.map(f => f.language))];
      const avgLines = files.reduce((sum, f) => sum + (f.lines || 0), 0) / files.length;

      patterns.push({
        id: `structural:${dir || 'root'}`,
        type: 'structural-pattern',
        name: dir || 'root',
        content: `Directory with ${files.length} files (${languages.join(', ')})`,
        searchableText: this._createSearchableText([
          dir,
          ...languages,
          `files: ${files.length}`
        ]),
        source: 'file-structure',
        score: files.length * 2 + languages.length,
        metadata: {
          fileCount: files.length,
          languages,
          averageLines: Math.round(avgLines)
        }
      });
    }

    return patterns;
  }

  /**
   * Extract semantic patterns for embeddings
   * @private
   */
  _extractSemanticPatterns(pack) {
    const patterns = [];

    if (!pack.files) return patterns;

    for (const file of pack.files) {
      if (!file.patterns) continue;

      for (const symbol of file.patterns) {
        patterns.push({
          id: `semantic:${file.path}:${symbol.name}`,
          type: 'semantic-pattern',
          name: symbol.name,
          content: `${symbol.type} ${symbol.name}`,
          searchableText: this._createSearchableText([
            symbol.name,
            symbol.type,
            file.path,
            symbol.pattern
          ]),
          source: 'symbol-extraction',
          score: this._calculateSymbolScore(symbol),
          metadata: {
            symbolType: symbol.type,
            filePath: file.path,
            language: file.language
          }
        });
      }
    }

    return patterns;
  }

  /**
   * Calculate pattern relevance score
   * @private
   */
  _calculatePatternScore(pattern) {
    let score = 10; // Base score

    // More instances = higher relevance
    score += (pattern.instances?.length || 0) * 5;

    // Has description
    if (pattern.description) score += 5;

    // Has parameters
    if (pattern.parameters?.length > 0) score += 3;

    // Known version
    if (pattern.version) score += 2;

    return score;
  }

  /**
   * Calculate flow relevance score
   * @private
   */
  _calculateFlowScore(flow) {
    let score = 8; // Base score

    // More steps = more complex = higher value
    score += (flow.steps?.length || 0) * 2;

    // Has description
    if (flow.description) score += 5;

    // Has error handling
    if (flow.errors && Object.keys(flow.errors).length > 0) score += 4;

    // Known version
    if (flow.version) score += 2;

    return score;
  }

  /**
   * Calculate symbol relevance score
   * @private
   */
  _calculateSymbolScore(symbol) {
    let score = 5; // Base score

    // Type-based scoring
    const typeScores = {
      'class': 10,
      'function': 8,
      'arrow_function': 6,
      'route': 7,
      'import': 2
    };

    score += typeScores[symbol.type] || 3;

    return score;
  }

  /**
   * Create searchable text from multiple parts
   * @private
   */
  _createSearchableText(parts) {
    return parts
      .filter(p => p !== null && p !== undefined && p !== '')
      .map(p => String(p).trim())
      .join(' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .substring(0, 1000); // Limit length
  }

  /**
   * Deduplicate patterns by ID and content similarity
   * @private
   */
  _deduplicatePatterns(patterns) {
    const seen = new Set();
    const unique = [];

    for (const pattern of patterns) {
      if (seen.has(pattern.id)) continue;

      seen.add(pattern.id);
      unique.push(pattern);
    }

    return unique;
  }

  /**
   * Chunk content for embedding
   * @private
   */
  _chunkContent(content, file, options) {
    const { maxChunkSize, minChunkSize, overlapSize, chunkBy } = options;
    const chunks = [];

    switch (chunkBy) {
      case 'function':
        chunks.push(...this._chunkByFunction(content, file, maxChunkSize, minChunkSize));
        break;
      case 'class':
        chunks.push(...this._chunkByClass(content, file, maxChunkSize, minChunkSize));
        break;
      case 'file':
        chunks.push(...this._chunkByFile(content, file, maxChunkSize, overlapSize));
        break;
      case 'paragraph':
        chunks.push(...this._chunkByParagraph(content, file, maxChunkSize, minChunkSize));
        break;
      default:
        chunks.push(...this._chunkByFunction(content, file, maxChunkSize, minChunkSize));
    }

    return chunks;
  }

  /**
   * Chunk by function boundaries
   * @private
   */
  _chunkByFunction(content, file, maxSize, minSize) {
    const chunks = [];
    const functionRegex = /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
    const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{[\s\S]*?\n\}/g;

    let match;
    let lastIndex = 0;

    // Extract functions
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1];
      const funcContent = match[0];

      if (funcContent.length >= minSize) {
        chunks.push({
          id: `chunk:${file.path}:${name}`,
          type: 'function',
          name,
          content: funcContent.substring(0, maxSize),
          filePath: file.path,
          language: file.language,
          startLine: content.substring(0, match.index).split('\n').length,
          metadata: {
            size: funcContent.length
          }
        });
      }

      lastIndex = match.index + funcContent.length;
    }

    // Extract arrow functions
    while ((match = arrowRegex.exec(content)) !== null) {
      const name = match[1];
      const funcContent = match[0];

      if (funcContent.length >= minSize) {
        chunks.push({
          id: `chunk:${file.path}:${name}`,
          type: 'arrow_function',
          name,
          content: funcContent.substring(0, maxSize),
          filePath: file.path,
          language: file.language,
          startLine: content.substring(0, match.index).split('\n').length,
          metadata: {
            size: funcContent.length
          }
        });
      }
    }

    return chunks;
  }

  /**
   * Chunk by class boundaries
   * @private
   */
  _chunkByClass(content, file, maxSize, minSize) {
    const chunks = [];
    const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{[\s\S]*?\n\}/g;

    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const name = match[1];
      const classContent = match[0];

      if (classContent.length >= minSize) {
        chunks.push({
          id: `chunk:${file.path}:${name}`,
          type: 'class',
          name,
          content: classContent.substring(0, maxSize),
          filePath: file.path,
          language: file.language,
          startLine: content.substring(0, match.index).split('\n').length,
          metadata: {
            size: classContent.length
          }
        });
      }
    }

    return chunks;
  }

  /**
   * Chunk by file with overlap
   * @private
   */
  _chunkByFile(content, file, maxSize, overlapSize) {
    const chunks = [];
    let remaining = content;
    let chunkIndex = 0;
    let totalOffset = 0;

    while (remaining.length > 0) {
      // Get chunk content, respecting maxSize
      let chunkContent = remaining.substring(0, maxSize);
      
      // Try to break at a newline if possible
      const lastNewline = chunkContent.lastIndexOf('\n');
      if (lastNewline > maxSize * 0.5) {
        chunkContent = chunkContent.substring(0, lastNewline + 1);
      }

      const startLine = content.substring(0, totalOffset).split('\n').length;
      const endLine = startLine + chunkContent.split('\n').length - 1;

      chunks.push({
        id: `chunk:${file.path}:${chunkIndex}`,
        type: 'file-chunk',
        name: `${file.path} (lines ${startLine}-${endLine})`,
        content: chunkContent,
        filePath: file.path,
        language: file.language,
        startLine,
        endLine,
        metadata: {
          chunkIndex,
          charCount: chunkContent.length
        }
      });

      // Move forward, accounting for overlap
      const advanceAmount = Math.max(1, chunkContent.length - overlapSize);
      remaining = remaining.substring(advanceAmount);
      totalOffset += advanceAmount;
      chunkIndex++;

    }

    return chunks;
  }

  /**
   * Chunk by paragraph/comment blocks
   * @private
   */
  _chunkByParagraph(content, file, maxSize, minSize) {
    const chunks = [];
    const paragraphs = content.split(/\n\n+/);

    let currentChunk = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > maxSize) {
        if (currentChunk.length >= minSize) {
          chunks.push({
            id: `chunk:${file.path}:para:${chunkIndex}`,
            type: 'paragraph',
            name: `${file.path} (paragraph ${chunkIndex + 1})`,
            content: currentChunk,
            filePath: file.path,
            language: file.language,
            metadata: {
              chunkIndex
            }
          });
          chunkIndex++;
        }
        currentChunk = para;
      } else {
        currentChunk += '\n\n' + para;
      }
    }

    // Add remaining chunk
    if (currentChunk.length >= minSize) {
      chunks.push({
        id: `chunk:${file.path}:para:${chunkIndex}`,
        type: 'paragraph',
        name: `${file.path} (paragraph ${chunkIndex + 1})`,
        content: currentChunk,
        filePath: file.path,
        language: file.language,
        metadata: {
          chunkIndex
        }
      });
    }

    return chunks;
  }
}

export default EmbeddingPatterns;
