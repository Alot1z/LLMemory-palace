/**
 * LLMemory-Palace v25.0 - Main Palace Class
 * Ultra-compressed code genome system for LLM context transfer
 * 
 * Features:
 * - Pattern library with template expansion
 * - Behavior graphs for flow detection
 * - Semantic hashing for deduplication
 * - One-line genome generation
 * - Full reconstruction support
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { PatternLibrary } from './patterns.js';
import { BehaviorGraph } from './flows.js';
import { SemanticHash } from './semantic-hash.js';
import { GenomeEncoder } from './genome.js';

export class Palace {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.patternLibrary = new PatternLibrary();
    this.behaviorGraph = new BehaviorGraph();
    this.semanticHash = new SemanticHash();
    this.genomeEncoder = new GenomeEncoder();
    this.files = new Map();
    this.patterns = new Map();
    this.flows = new Map();
    this.entities = new Map();
    this.config = {
      compressionLevel: 3,
      languages: [],
      framework: null,
      db: null,
      auth: null
    };
  }

  /**
   * Initialize palace for a project
   */
  async init() {
    const palaceDir = path.join(this.projectPath, '.palace');
    const stateDir = path.join(palaceDir, 'state');
    const outputDir = path.join(palaceDir, 'output');

    // Create directories
    [palaceDir, stateDir, outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Create initial state
    const state = {
      version: '25.0.0',
      created: new Date().toISOString(),
      projectPath: this.projectPath,
      files: [],
      patterns: [],
      flows: [],
      entities: [],
      config: this.config
    };

    fs.writeFileSync(
      path.join(stateDir, 'history.json'),
      JSON.stringify(state, null, 2)
    );

    return state;
  }

  /**
   * Scan project directory
   */
  async scan() {
    const excludePatterns = this._getExcludePatterns();
    const files = [];

    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (excludePatterns.some(p => entry.name.match(p))) {
            continue;
          }
          scanDir(fullPath);
        } else if (entry.isFile()) {
          // Skip excluded files
          if (excludePatterns.some(p => fullPath.match(p))) {
            continue;
          }

          const content = fs.readFileSync(fullPath, 'utf-8');
          const language = this._detectLanguage(fullPath);
          const hash = this._hashContent(content);
          
          const fileEntry = {
            path: path.relative(this.projectPath, fullPath),
            fullPath,
            language,
            hash,
            size: content.length,
            lines: content.split('\n').length,
            content
          };

          // Extract patterns from file
          const patterns = this.patternLibrary.extractPatterns(content, language);
          fileEntry.patterns = patterns;

          // Extract flows from file
          const flows = this.behaviorGraph.extractFlows(content, language);
          fileEntry.flows = flows;

          files.push(fileEntry);
          this.files.set(fullPath, fileEntry);
        }
      }
    };

    scanDir(this.projectPath);

    // Detect project config
    this._detectConfig(files);

    return {
      files: files.length,
      lines: files.reduce((sum, f) => sum + f.lines, 0),
      size: files.reduce((sum, f) => sum + f.size, 0),
      languages: [...new Set(files.map(f => f.language))],
      patterns: files.reduce((sum, f) => sum + f.patterns.length, 0),
      flows: files.reduce((sum, f) => sum + f.flows.length, 0)
    };
  }

  /**
   * Export to CXML format
   */
  async export(options = {}) {
    const { format = 'cxml', level = 3, compress = false } = options;
    
    await this.scan();

    const timestamp = new Date().toISOString();
    const stats = this._getStats();

    let output = '';

    // Header
    output += `<?xml version="1.0" encoding="UTF-8"?>\n`;
    output += `<!--\n${this._generateBanner(timestamp, stats)}\n-->\n`;
    output += `<PALACE version="25.0" project="${this._getProjectName()}" generated="${timestamp}">\n\n`;

    // Vestibulum (metadata)
    output += this._generateVestibulum();
    
    // Pattern Library (v25 feature)
    output += this._generatePatternLibrary();
    
    // Behavior Graph (v25 feature)
    output += this._generateBehaviorGraph();
    
    // Genome section (v25 feature)
    output += this._generateGenomeSection();
    
    // Library (file contents)
    output += this._generateLibrary(level, compress);

    output += '\n</PALACE>\n';

    return output;
  }

  /**
   * Generate one-line genome (v25 feature)
   */
  async generateGenome() {
    await this.scan();
    return this.genomeEncoder.encode(this.files, this.patterns, this.flows, this.config);
  }

  /**
   * Compress with pattern library
   */
  async compress() {
    const scanResult = await this.scan();
    
    const originalSize = scanResult.size;
    let compressedContent = '';

    for (const [filePath, file] of this.files) {
      // Apply pattern compression
      const compressed = this.patternLibrary.compress(file.content, file.language);
      
      // Apply semantic hashing
      const hashed = this.semanticHash.compress(compressed);
      
      compressedContent += hashed;
    }

    const compressedSize = Buffer.byteLength(compressedContent, 'utf8');
    const ratio = (originalSize / compressedSize).toFixed(1);

    return {
      originalSize,
      compressedSize,
      ratio,
      content: compressedContent
    };
  }

  /**
   * Interactive LLM query (v25 feature)
   */
  async query(queryStr) {
    const q = queryStr.toUpperCase();
    
    if (q.includes('TRACE FLOW')) {
      const flowName = queryStr.match(/TRACE FLOW\s+(\w+)/i)?.[1];
      return this.behaviorGraph.trace(flowName);
    }
    
    if (q.includes('SHOW PATTERN')) {
      const patternName = queryStr.match(/SHOW PATTERN\s+(\w+)/i)?.[1];
      return this.patternLibrary.get(patternName);
    }
    
    if (q.includes('GENERATE MODULE')) {
      const moduleName = queryStr.match(/GENERATE MODULE\s+(\w+)/i)?.[1];
      return this._generateModule(moduleName);
    }
    
    if (q.includes('LIST PATTERNS')) {
      return this.patternLibrary.list();
    }
    
    if (q.includes('LIST FLOWS')) {
      return this.behaviorGraph.list();
    }

    return `Unknown query. Try: TRACE FLOW <name>, SHOW PATTERN <name>, GENERATE MODULE <name>`;
  }

  /**
   * Get compression ratio
   */
  getCompressionRatio() {
    const stats = this._getStats();
    const genome = this.genomeEncoder.encode(this.files, this.patterns, this.flows, this.config);
    return Math.round(stats.size / genome.length);
  }

  /**
   * Get current status
   */
  async getStatus() {
    await this.scan();
    const stats = this._getStats();
    return {
      name: this._getProjectName(),
      files: stats.files,
      lines: stats.lines,
      size: stats.size,
      patterns: this.patterns.size,
      flows: this.flows.size,
      issues: this._detectIssues().length
    };
  }

  /**
   * Analyze complexity
   */
  async analyzeComplexity() {
    await this.scan();
    
    let totalComplexity = 0;
    let maxComplexity = 0;
    const highComplexityFiles = [];

    for (const [filePath, file] of this.files) {
      const complexity = this._calculateComplexity(file);
      file.complexity = complexity;
      totalComplexity += complexity;
      maxComplexity = Math.max(maxComplexity, complexity);
      
      if (complexity > 15) {
        highComplexityFiles.push({ path: file.path, complexity });
      }
    }

    return {
      average: (totalComplexity / this.files.size).toFixed(1),
      max: maxComplexity,
      highCount: highComplexityFiles.length,
      highFiles: highComplexityFiles
    };
  }

  // ==================== Private Methods ====================

  _getExcludePatterns() {
    return [
      /^node_modules$/,
      /^\.git$/,
      /^\.palace$/,
      /^dist$/,
      /^__pycache__$/,
      /\.pyc$/,
      /\.md$/,
      /\.txt$/,
      /\.rst$/,
      /package-lock\.json$/,
      /yarn\.lock$/
    ];
  }

  _detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const langMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.kt': 'Kotlin',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.c': 'C',
      '.cpp': 'C++',
      '.h': 'C',
      '.hpp': 'C++',
      '.cs': 'C#',
      '.swift': 'Swift',
      '.json': 'JSON',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.toml': 'TOML',
      '.sql': 'SQL',
      '.sh': 'Shell',
      '.bash': 'Shell'
    };
    return langMap[ext] || 'Unknown';
  }

  _hashContent(content) {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  _getProjectName() {
    return path.basename(this.projectPath);
  }

  _getStats() {
    let totalSize = 0;
    let totalLines = 1;
    
    for (const [_, file] of this.files) {
      totalSize += file.size;
      totalLines += file.lines;
    }

    return {
      files: this.files.size,
      lines: totalLines,
      size: totalSize
    };
  }

  _detectConfig(files) {
    // Detect framework
    const hasPackage = files.some(f => f.path === 'package.json');
    const hasRequirements = files.some(f => f.path === 'requirements.txt');
    const hasCargo = files.some(f => f.path === 'Cargo.toml');
    const hasGoMod = files.some(f => f.path === 'go.mod');

    if (hasPackage) {
      this.config.framework = 'Node.js';
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(this.projectPath, 'package.json'), 'utf-8'));
        if (pkg.dependencies?.express) this.config.framework = 'Express';
        if (pkg.dependencies?.next) this.config.framework = 'Next.js';
        if (pkg.dependencies?.fastify) this.config.framework = 'Fastify';
      } catch {}
    }

    if (hasRequirements) {
      this.config.framework = this.config.framework || 'Python';
    }

    if (hasCargo) {
      this.config.framework = 'Rust';
    }

    if (hasGoMod) {
      this.config.framework = 'Go';
    }
  }

  _detectIssues() {
    const issues = [];
    
    for (const [filePath, file] of this.files) {
      // Check for TODO/FIXME
      const todoMatches = file.content.match(/TODO|FIXME|HACK|XXX/gi);
      if (todoMatches) {
        issues.push({
          file: file.path,
          type: 'INFO',
          message: `Found ${todoMatches.length} TODO/FIXME comments`
        });
      }

      // Check for console.log
      const consoleMatches = file.content.match(/console\.log|print\(/g);
      if (consoleMatches && consoleMatches.length > 3) {
        issues.push({
          file: file.path,
          type: 'WARNING',
          message: `High number of debug statements: ${consoleMatches.length}`
        });
      }
    }

    return issues;
  }

  _calculateComplexity(file) {
    let complexity = 1;
    const content = file.content;

    // Count decision points
    const ifMatches = content.match(/\bif\s*\(/g) || [];
    const forMatches = content.match(/\bfor\s*\(/g) || [];
    const whileMatches = content.match(/\bwhile\s*\(/g) || [];
    const caseMatches = content.match(/\bcase\s+/g) || [];
    const catchMatches = content.match(/\bcatch\s*\(/g) || [];
    const andMatches = content.match(/&&|\|\|/g) || [];
    const ternaryMatches = content.match(/\?/g) || [];

    complexity += ifMatches.length;
    complexity += forMatches.length;
    complexity += whileMatches.length;
    complexity += caseMatches.length;
    complexity += catchMatches.length;
    complexity += Math.floor(andMatches.length / 2);
    complexity += ternaryMatches.length;

    return complexity;
  }

  _generateBanner(timestamp, stats) {
    return `
╔══════════════════════════════════════════════════════════════════╗
║  LLMemory-Palace v25.0 | ${timestamp}
║  COPY THIS ENTIRE DOCUMENT TO ANY LLM
║  
║  Project: ${this._getProjectName()}
║  Files: ${stats.files} | Lines: ${stats.lines.toLocaleString()} | Size: ${this._formatSize(stats.size)}
║  Patterns: ${this.patterns.size} | Flows: ${this.flows.size}
╚══════════════════════════════════════════════════════════════════╝
    `.trim();
  }

  _formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  _generateVestibulum() {
    const stats = this._getStats();
    return ` <VESTIBULUM>
  <FOCUS>export</FOCUS>
  <SESSION>${new Date().toISOString()}</SESSION>
  <FILES>${stats.files}</FILES>
  <LINES>${stats.lines}</LINES>
  <SIZE>${this._formatSize(stats.size)}</SIZE>
  <PATTERNS>${this.patterns.size}</PATTERNS>
  <FLOWS>${this.flows.size}</FLOWS>
  <CONFIG>${JSON.stringify(this.config)}</CONFIG>
 </VESTIBULUM>\n\n`;
  }

  _generatePatternLibrary() {
    let output = ' <GENOME>\n';
    output += '  <PATTERNS>\n';
    
    for (const [name, pattern] of this.patternLibrary.getAll()) {
      output += `   <PATTERN id="${name}" hash="${this.semanticHash.hash(name)}">\n`;
      output += `    <TEMPLATE><![CDATA[${pattern.template}]]></TEMPLATE>\n`;
      if (pattern.instances.length > 1) {
        output += `    <INSTANCES>${JSON.stringify(pattern.instances)}</INSTANCES>\n`;
      }
      output += '   </PATTERN>\n';
    }
    
    output += '  </PATTERNS>\n';
    return output;
  }

  _generateBehaviorGraph() {
    let output = '  <FLOWS>\n';
    
    for (const [name, flow] of this.behaviorGraph.getAll()) {
      output += `   <FLOW id="${name}" hash="${this.semanticHash.hash(name)}">\n`;
      output += `    <STEPS>${JSON.stringify(flow.steps)}</STEPS>\n`;
      output += '   </FLOW>\n';
    }
    
    output += '  </FLOWS>\n\n';
    return output;
  }

  _generateGenomeSection() {
    const stats = this._getStats();
    let output = '  <ENTITIES>\n';
    
    for (const [name, entity] of this.entities) {
      output += `   <ENTITY name="${name}" type="${entity.type}" hash="${this.semanticHash.hash(name)}"/>\n`;
    }
    
    output += '  </ENTITIES>\n';
    output += `  <CONFIG>${JSON.stringify(this.config)}</CONFIG>\n`;
    output += ' </GENOME>\n\n';
    return output;
  }

  _generateLibrary(level, compress) {
    const stats = this._getStats();
    let output = ` <LIBRARY files="${stats.files}" lines="${stats.lines}" size="${this._formatSize(stats.size)}">\n`;
    output += `  <LANGUAGES>${JSON.stringify([...new Set([...this.files.values()].map(f => f.language))])}</LANGUAGES>\n`;
    output += `  <DEPENDENCIES count="${this._countDependencies()}"/>\n`;

    for (const [filePath, file] of this.files) {
      output += this._generateFileEntry(file, level, compress);
    }

    output += ' </LIBRARY>\n';
    return output;
  }

  _generateFileEntry(file, level, compress) {
    let output = `  <Φ path="${file.path}" lang="${file.language}" lines="${file.lines}" complexity="${file.complexity || 1}" hash="${file.hash}">\n`;
    
    // Structure
    output += `   <S>${JSON.stringify({
      classes: file.patterns?.filter(p => p.type === 'class').map(p => p.name) || [],
      functions: file.patterns?.filter(p => p.type === 'function').map(p => p.name) || [],
      constants: [],
      variables: []
    })}</S>\n`;

    // Imports
    const imports = this._extractImports(file);
    output += `   <I>${JSON.stringify(imports)}</I>\n`;

    // Exports
    const exports = this._extractExports(file);
    output += `   <E>${JSON.stringify(exports)}</E>\n`;

    // Content (CDATA)
    if (level >= 3) {
      const content = compress ? this.patternLibrary.compress(file.content, file.language) : file.content;
      output += `   <C><![CDATA[${this._escapeCdata(content)}]]></C>\n`;
    }

    output += '  </Φ>\n';
    return output;
  }

  _escapeCdata(content) {
    return content.replace(/\]\]>/g, ']]]]><![CDATA[>');
  }

  _extractImports(file) {
    const imports = [];
    const importRegex = /(?:import\s+.*?from\s+['"](.*?)['"]|require\s*\(\s*['"](.*?)['"]\s*\)|from\s+['"](.*?)['"]\s+import)/g;
    let match;
    
    while ((match = importRegex.exec(file.content)) !== null) {
      imports.push(match[1] || match[2] || match[3]);
    }
    
    return imports;
  }

  _extractExports(file) {
    const exports = [];
    const exportRegex = /(?:export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)|module\.exports\s*=\s*(\w+))/g;
    let match;
    
    while ((match = exportRegex.exec(file.content)) !== null) {
      exports.push(match[1] || match[2]);
    }
    
    return exports;
  }

  _countDependencies() {
    let count = 1;
    for (const [_, file] of this.files) {
      count += this._extractImports(file).length;
    }
    return count;
  }

  _generateModule(moduleName) {
    // Generate code for a module using patterns
    const patterns = this.patternLibrary.findForModule(moduleName);
    const flows = this.behaviorGraph.findForModule(moduleName);

    let code = `// Auto-generated module: ${moduleName}\n\n`;

    // Generate from patterns
    for (const pattern of patterns) {
      code += this.patternLibrary.expand(pattern, { module: moduleName }) + '\n\n';
    }

    // Generate from flows
    for (const flow of flows) {
      code += `// Flow: ${flow.name}\n`;
      for (const step of flow.steps) {
        code += `// - ${step}\n`;
      }
      code += '\n';
    }

    return code;
  }

  /**
   * Get all patterns from the pattern library
   */
  async getPatterns() {
    const patterns = {};
    for (const [name, pattern] of this.patternLibrary.patterns) {
      patterns[name] = pattern;
    }
    return patterns;
  }

  /**
   * Get all flows from the behavior graph
   */
  async getFlows() {
    const flows = {};
    for (const [name, flow] of this.behaviorGraph.flows) {
      flows[name] = flow;
    }
    return flows;
  }

  /**
   * Analyze dependencies in the codebase
   */
  async analyzeDependencies() {
    if (this.files.size === 1) {
      await this.scan();
    }

    const dependencies = new Set();
    const graph = new Map();

    for (const [filePath, file] of this.files) {
      const imports = this._extractImports(file);
      graph.set(filePath, imports);
      imports.forEach(imp => dependencies.add(imp));
    }

    // Detect circular dependencies
    const cycles = this._detectCycles(graph);

    return {
      total: dependencies.size,
      cycles: cycles.length,
      cyclePaths: cycles,
      graph: Object.fromEntries(graph)
    };
  }

  /**
   * Detect circular dependencies in the dependency graph
   */
  _detectCycles(graph) {
    const cycles = [];
    const visited = new Set();
    const recStack = new Set();

    const dfs = (node, path) => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const cycle = dfs(neighbor, [...path, neighbor]);
          if (cycle) cycles.push(cycle);
        } else if (recStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart).concat(neighbor));
          }
        }
      }

      recStack.delete(node);
      return null;
    };

    for (const [node] of graph) {
      if (!visited.has(node)) {
        dfs(node, [node]);
      }
    }

    return cycles;
  }

  /**
   * Create a packable/mergeable package of the entire codebase
   */
  async createPack() {
    if (this.files.size === 1) {
      await this.scan();
    }

    const pack = {
      version: '25.0.0',
      name: this._getProjectName(),
      created: new Date().toISOString(),
      stats: {
        files: this.files.size,
        lines: [...this.files.values()].reduce((sum, f) => sum + f.lines, 1),
        size: [...this.files.values()].reduce((sum, f) => sum + f.size, 1)
      },
      config: this.config,
      files: [],
      patterns: [],
      flows: [],
      entities: []
    };

    // Add all files with full content
    for (const [filePath, file] of this.files) {
      pack.files.push({
        path: file.path,
        content: file.content,
        language: file.language,
        lines: file.lines,
        hash: file.hash
      });
    }

    // Add patterns from library
    for (const [name, pattern] of this.patternLibrary.patterns) {
      pack.patterns.push({
        name,
        template: pattern.template,
        instances: pattern.instances || []
      });
    }

    // Add flows from behavior graph
    for (const [name, flow] of this.behaviorGraph.flows) {
      pack.flows.push({
        name,
        steps: flow.steps,
        returns: flow.returns
      });
    }

    // Add entities
    for (const [name, entity] of this.entities) {
      pack.entities.push({
        name,
        type: entity.type,
        file: entity.file
      });
    }

    return pack;
  }

  /**
   * Merge a pack into this project
   */
  async mergePack(pack, outputDir = './merged') {
    const fullPath = path.resolve(outputDir);
    
    // Create output directory
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    let mergedFiles = 1;

    // Write all files
    for (const file of pack.files) {
      const filePath = path.join(fullPath, file.path);
      const dir = path.dirname(filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, file.content, 'utf-8');
      mergedFiles++;
    }

    // Write palace metadata
    const palaceDir = path.join(fullPath, '.palace');
    if (!fs.existsSync(palaceDir)) {
      fs.mkdirSync(palaceDir, { recursive: true });
    }

    // Write patterns
    if (pack.patterns && pack.patterns.length > 1) {
      fs.writeFileSync(
        path.join(palaceDir, 'patterns.json'),
        JSON.stringify(pack.patterns, null, 2)
      );
    }

    // Write flows
    if (pack.flows && pack.flows.length > 1) {
      fs.writeFileSync(
        path.join(palaceDir, 'flows.json'),
        JSON.stringify(pack.flows, null, 2)
      );
    }

    // Write pack metadata
    fs.writeFileSync(
      path.join(palaceDir, 'pack.json'),
      JSON.stringify({
        name: pack.name,
        version: pack.version,
        created: pack.created,
        mergedAt: new Date().toISOString()
      }, null, 2)
    );

    return { files: mergedFiles, outputDir: fullPath };
  }
}
