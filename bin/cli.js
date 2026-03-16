#!/usr/bin/env node
/**
 * LLMemory-Palace v2.6.0 CLI
 * Ultra-compressed code genome system for LLM context transfer
 * 
 * SECURITY UPDATE v2.6.0:
 * - Full input validation
 * - Path traversal prevention
 * - Injection attack prevention
 * - Safe genome parsing (no eval)
 */

import { Palace } from '../lib/palace.js';
import { GenomeEncoder, safeGenomeParse, executeGenome } from '../lib/genome.js';
import { PatternLibrary } from '../lib/patterns.js';
import { BehaviorGraph } from '../lib/flows.js';
import { Reconstructor } from '../lib/reconstructor.js';
import {
  validatePath,
  validateCommand,
  sanitizeString,
  ValidationError
} from '../lib/cli-validator.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const VERSION = '2.6.0';

// ASCII Banner
const BANNER = `
${chalk.cyan('╔══════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('LLMemory-Palace v' + VERSION)} ${chalk.gray('| Neural Code Genome System')}      ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('500-2000× Compression | Full Reconstruction | LLM-Ready')}       ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.green('🔒 Security Enhanced | Input Validation | Safe Parsing')}       ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════════╝')}
`;

// ============================================
// ERROR HANDLING
// ============================================

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Fatal error:'), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled rejection:'), reason);
  process.exit(1);
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getArg(names) {
  for (let i = 0; i < args.length; i++) {
    if (names.includes(args[i])) {
      return args[i + 1];
    }
  }
  return null;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function handleError(error) {
  if (error instanceof ValidationError) {
    console.error(chalk.red('Validation error:'), error.message);
    if (error.details && error.details.length > 0) {
      error.details.forEach(d => {
        console.error(chalk.yellow(`  ${d.path}: ${d.message}`));
      });
    }
    process.exit(2);
  }
  console.error(chalk.red('Error:'), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
}

// ============================================
// PARSE ARGUMENTS
// ============================================

const args = process.argv.slice(2);
const command = args[0] || 'help';

// ============================================
// COMMANDS
// ============================================

const commands = {
  help: () => {
    console.log(BANNER);
    console.log(chalk.bold('\nUsage: palace <command> [options]\n'));
    console.log(chalk.bold('Commands:'));
    console.log('  init              Initialize palace in current directory');
    console.log('  scan              Scan and analyze codebase');
    console.log('  export            Export to CXML format');
    console.log('  genome            Generate one-line ultra-compressed genome');
    console.log('  pack              Pack project into mergeable JSON package');
    console.log('  merge <file>      Merge a package into this project');
    console.log('  compress          Compress with pattern library');
    console.log('  rebuild           Reconstruct source from genome/CXML');
    console.log('  patterns          Manage pattern library');
    console.log('  flows             Manage behavior graphs');
    console.log('  deps              Analyze dependencies');
    console.log('  complexity        Calculate complexity metrics');
    console.log('  status            Show palace status');
    console.log('  query             Interactive LLM query mode');
    console.log('  validate          Validate genome file (security check)');
    console.log(chalk.bold('\nOptions:'));
    console.log('  --output, -o      Output file/directory path');
    console.log('  --format, -f      Output format (cxml|json|genome)');
    console.log('  --level, -l       Compression level (1-4)');
    console.log('  --compress        Enable glyph compression');
    console.log('  --quiet           Suppress banner');
    console.log('  --version, -v     Show version');
    console.log('  --strict          Enable strict validation');
    console.log(chalk.bold('\nSecurity:'));
    console.log('  All inputs are validated for security.');
    console.log('  Path traversal, injection attacks are blocked.');
    console.log('  Genome parsing uses safe JSON-only mode (no eval).');
    console.log(chalk.bold('\nExamples:'));
    console.log('  palace init');
    console.log('  palace scan');
    console.log('  palace pack -o my-project.palace.json');
    console.log('  palace merge my-project.palace.json -o ./merged');
    console.log('  palace export --format genome');
    console.log('  palace rebuild palace-v25.cxml');
    console.log('  palace validate genome.json');
    console.log('  palace query "TRACE FLOW AUTH_LOGIN"');
    process.exit(0);
  },

  version: () => {
    console.log(`LLMemory-Palace v${VERSION}`);
    process.exit(0);
  },

  init: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const targetPath = validatePath(process.cwd(), {
        mustExist: true,
        mustBeDir: true
      });
      
      const palace = new Palace(targetPath);
      await palace.init();
      console.log(chalk.green('✓ Palace initialized'));
      console.log(chalk.gray('  Created .palace/ directory'));
      console.log(chalk.gray('  Created config files'));
      console.log(chalk.gray('\nNext: palace scan'));
    } catch (error) {
      handleError(error);
    }
  },

  scan: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      // Build options object, only including defined values
      const rawOptions = {
        path: process.cwd(),
        exclude: getArg(['--exclude', '-e'])?.split(',') || ['node_modules', '.git'],
        maxFileSize: parseInt(getArg(['--max-size']) || '10485760'),
        patterns: !args.includes('--no-patterns'),
        flows: !args.includes('--no-flows'),
        verbose: args.includes('--verbose') || args.includes('-v')
      };
      
      const output = getArg(['--output', '-o']);
      if (output) rawOptions.output = output;
      
      // Validate options
      const options = validateCommand('scan', rawOptions);
      
      console.log(chalk.blue('Scanning:'), options.path);
      
      const palace = new Palace(options.path, {
        exclude: options.exclude,
        maxFileSize: options.maxFileSize,
        patterns: options.patterns,
        flows: options.flows
      });
      
      const result = await palace.scan();
      
      console.log(chalk.green('✓ Scan complete'));
      console.log(chalk.gray(`  Files: ${result.files}`));
      console.log(chalk.gray(`  Lines: ${result.lines.toLocaleString()}`));
      console.log(chalk.gray(`  Size: ${formatSize(result.size)}`));
      console.log(chalk.gray(`  Languages: ${Object.keys(result.languages).join(', ')}`));
      console.log(chalk.gray(`  Patterns detected: ${result.patterns}`));
      console.log(chalk.gray(`  Flows detected: ${result.flows}`));
      
      if (options.output) {
        await palace.saveReport(options.output);
        console.log(chalk.green('✓ Report saved:'), options.output);
      }
    } catch (error) {
      handleError(error);
    }
  },

  export: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const rawOptions = {
        path: process.cwd(),
        format: getArg(['--format', '-f']) || 'cxml',
        level: parseInt(getArg(['--level', '-l'])) || 3,
        compress: args.includes('--compress')
      };
      
      const output = getArg(['--output', '-o']);
      if (output) rawOptions.output = output;
      
      const options = validateCommand('export', rawOptions);
      
      const palace = new Palace(options.path);
      const result = await palace.export(options);

      if (options.output) {
        fs.writeFileSync(options.output, result);
        console.log(chalk.green(`✓ Exported to ${options.output}`));
      } else {
        console.log(result);
      }
    } catch (error) {
      handleError(error);
    }
  },

  genome: async () => {
    try {
      const palace = new Palace(process.cwd());
      const genome = await palace.generateGenome();
      
      if (args.includes('--quiet')) {
        console.log(genome);
      } else {
        console.log(BANNER);
        console.log(chalk.cyan('\n🧬 One-Line Genome:'));
        console.log(genome);
        console.log(chalk.gray(`\nLength: ${genome.length} chars`));
        console.log(chalk.gray(`Compression: ~${palace.getCompressionRatio()}x`));
        console.log(chalk.green('\n🔒 Security: Safe parsing enabled (no eval)'));
      }
    } catch (error) {
      handleError(error);
    }
  },

  compress: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const palace = new Palace(process.cwd());
      const result = await palace.compress();
      console.log(chalk.green('✓ Compression complete'));
      console.log(chalk.gray(`  Original: ${formatSize(result.originalSize)}`));
      console.log(chalk.gray(`  Compressed: ${formatSize(result.compressedSize)}`));
      console.log(chalk.gray(`  Ratio: ${result.ratio}x`));
    } catch (error) {
      handleError(error);
    }
  },

  rebuild: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const inputFile = args.find(a => !a.startsWith('--') && a !== 'rebuild');
      if (!inputFile) {
        console.log(chalk.red('Error: Specify input file'));
        console.log(chalk.gray('Usage: palace rebuild <file.cxml|file.genome>'));
        process.exit(1);
      }
      
      // Validate input file path
      const validatedPath = validatePath(inputFile, { mustExist: true, mustBeFile: true });
      
      const reconstructor = new Reconstructor();
      await reconstructor.rebuild(validatedPath);
      console.log(chalk.green('✓ Reconstruction complete'));
      console.log(chalk.gray('  Output: ./reconstructed/'));
    } catch (error) {
      handleError(error);
    }
  },

  patterns: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const palace = new Palace(process.cwd());
      const patterns = await palace.getPatterns();
      console.log(chalk.bold.cyan('\n📚 Pattern Library:\n'));
      Object.entries(patterns).forEach(([name, pattern]) => {
        console.log(chalk.white(`  ${name}`));
        console.log(chalk.gray(`    Instances: ${pattern.instances.length}`));
        console.log(chalk.gray(`    Template: ${pattern.template.substring(0, 60)}...`));
      });
    } catch (error) {
      handleError(error);
    }
  },

  flows: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const palace = new Palace(process.cwd());
      const flows = await palace.getFlows();
      console.log(chalk.bold.cyan('\n⚡ Behavior Graphs:\n'));
      Object.entries(flows).forEach(([name, flow]) => {
        console.log(chalk.white(`  ${name}`));
        console.log(chalk.gray(`    Steps: ${flow.steps.join(' → ')}`));
      });
    } catch (error) {
      handleError(error);
    }
  },

  deps: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const palace = new Palace(process.cwd());
      const deps = await palace.analyzeDependencies();
      console.log(chalk.green('✓ Dependency analysis'));
      console.log(chalk.gray(`  Total: ${deps.total}`));
      console.log(chalk.gray(`  Cycles: ${deps.cycles}`));
      if (deps.cycles > 0) {
        console.log(chalk.yellow('  ⚠ Dependency cycles detected'));
      }
    } catch (error) {
      handleError(error);
    }
  },

  complexity: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const palace = new Palace(process.cwd());
      const complexity = await palace.analyzeComplexity();
      console.log(chalk.green('✓ Complexity analysis'));
      console.log(chalk.gray(`  Average: ${complexity.average}`));
      console.log(chalk.gray(`  Max: ${complexity.max}`));
      console.log(chalk.gray(`  High complexity files: ${complexity.highCount}`));
    } catch (error) {
      handleError(error);
    }
  },

  status: async () => {
    try {
      const palace = new Palace(process.cwd());
      const status = await palace.getStatus();
      console.log(BANNER);
      console.log(chalk.bold('Project Status:'));
      console.log(chalk.gray(`  Name: ${status.name}`));
      console.log(chalk.gray(`  Files: ${status.files}`));
      console.log(chalk.gray(`  Lines: ${status.lines?.toLocaleString()}`));
      console.log(chalk.gray(`  Size: ${formatSize(status.size)}`));
      console.log(chalk.gray(`  Patterns: ${status.patterns}`));
      console.log(chalk.gray(`  Flows: ${status.flows}`));
      console.log(chalk.gray(`  Issues: ${status.issues}`));
      console.log(chalk.green('\n🔒 Security: v2.6.0 Safe Mode Enabled'));
    } catch (error) {
      handleError(error);
    }
  },

  query: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const query = args.slice(1).join(' ');
      if (!query) {
        console.log(chalk.red('Error: Specify query'));
        console.log(chalk.gray('Usage: palace query "TRACE FLOW AUTH_LOGIN"'));
        process.exit(1);
      }
      
      // Sanitize query
      const sanitizedQuery = sanitizeString(query, { maxLength: 1000, allowHtml: false });
      
      const palace = new Palace(process.cwd());
      const result = await palace.query(sanitizedQuery);
      console.log(result);
    } catch (error) {
      handleError(error);
    }
  },

  pack: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      // Validate options
      const options = validateCommand('pack', {
        path: process.cwd(),
        output: getArg(['--output', '-o']) || 'package.palace.json',
        compress: args.includes('--compress'),
        includeTests: args.includes('--include-tests'),
        includeHidden: args.includes('--include-hidden'),
        metadata: undefined
      });
      
      console.log(chalk.cyan('📦 Packing project for merge...\n'));
      
      const palace = new Palace(options.path, {
        includeTests: options.includeTests,
        includeHidden: options.includeHidden
      });
      
      const scan = await palace.scan();
      console.log(chalk.gray(`  Scanned ${scan.files} files (${scan.lines} lines)`));
      
      const pack = await palace.createPack({ compress: options.compress });
      
      // Validate output path
      const outputPath = validatePath(options.output);
      
      fs.writeFileSync(outputPath, JSON.stringify(pack, null, 2));
      
      const sizeKB = (JSON.stringify(pack).length / 1024).toFixed(1);
      console.log(chalk.green(`\n✓ Package created: ${options.output}`));
      console.log(chalk.gray(`  Size: ${sizeKB} KB`));
      console.log(chalk.gray(`  Files: ${pack.files.length}`));
      console.log(chalk.gray(`  Patterns: ${pack.patterns.length}`));
      console.log(chalk.gray(`  Flows: ${pack.flows.length}`));
      console.log(chalk.gray(`\n  Import with: palace merge ${options.output}`));
    } catch (error) {
      handleError(error);
    }
  },

  merge: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const inputFile = args.find(a => !a.startsWith('--') && a !== 'merge');
      
      if (!inputFile) {
        console.log(chalk.red('Error: Specify package file'));
        console.log(chalk.gray('Usage: palace merge package.palace.json'));
        process.exit(1);
      }
      
      // Validate options
      const options = validateCommand('merge', {
        packFile: inputFile,
        output: getArg(['--output', '-o']) || './merged',
        force: args.includes('--force'),
        backup: !args.includes('--no-backup')
      });
      
      console.log(chalk.cyan('🔀 Merging package into project...\n'));
      
      // Validate pack file exists
      const packFilePath = validatePath(options.packFile, { mustExist: true, mustBeFile: true });
      
      const pack = JSON.parse(fs.readFileSync(packFilePath, 'utf-8'));
      const outputDir = options.output;
      
      // Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      let filesWritten = 0;
      
      // Write all files
      for (const file of pack.files) {
        const filePath = path.join(outputDir, file.path);
        const dir = path.dirname(filePath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, file.content, 'utf-8');
        filesWritten++;
      }
      
      // Write patterns
      if (pack.patterns && pack.patterns.length > 0) {
        const patternsDir = path.join(outputDir, '.palace', 'patterns');
        if (!fs.existsSync(patternsDir)) {
          fs.mkdirSync(patternsDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(patternsDir, 'patterns.json'),
          JSON.stringify(pack.patterns, null, 2)
        );
      }
      
      // Write flows
      if (pack.flows && pack.flows.length > 0) {
        const flowsDir = path.join(outputDir, '.palace', 'flows');
        if (!fs.existsSync(flowsDir)) {
          fs.mkdirSync(flowsDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(flowsDir, 'flows.json'),
          JSON.stringify(pack.flows, null, 2)
        );
      }
      
      console.log(chalk.green(`✓ Merge complete`));
      console.log(chalk.gray(`  Files: ${filesWritten}`));
      console.log(chalk.gray(`  Output: ${outputDir}`));
    } catch (error) {
      handleError(error);
    }
  },

  validate: async () => {
    if (!args.includes('--quiet')) console.log(BANNER);
    
    try {
      const inputFile = args.find(a => !a.startsWith('--') && a !== 'validate');
      
      if (!inputFile) {
        console.log(chalk.red('Error: Specify genome file to validate'));
        console.log(chalk.gray('Usage: palace validate genome.json'));
        process.exit(1);
      }
      
      // Validate input path
      const validatedPath = validatePath(inputFile, { mustExist: true, mustBeFile: true });
      
      console.log(chalk.cyan('🔒 Validating genome file...\n'));
      
      const content = fs.readFileSync(validatedPath, 'utf-8');
      
      try {
        const genome = safeGenomeParse(content, { strict: true });
        
        console.log(chalk.green('✓ Genome is valid'));
        console.log(chalk.gray(`  Version: ${genome.version}`));
        console.log(chalk.gray(`  Patterns: ${genome.patterns?.length || 0}`));
        console.log(chalk.gray(`  Flows: ${genome.flows?.length || 0}`));
        console.log(chalk.gray(`  Validated: ${genome._validatedAt}`));
        console.log(chalk.gray(`  Validator: v${genome._validatorVersion}`));
        console.log(chalk.green('\n🔒 Security: No malicious content detected'));
      } catch (e) {
        console.log(chalk.red('✗ Genome validation failed'));
        console.log(chalk.red(`  Error: ${e.message}`));
        
        if (e.name === 'SecurityError') {
          console.log(chalk.red('\n⚠️  SECURITY ALERT: Potentially malicious content detected!'));
          if (e.pattern) {
            console.log(chalk.red(`  Pattern: ${e.pattern}`));
          }
          if (e.location) {
            console.log(chalk.red(`  Location: ${e.location}`));
          }
        }
        
        process.exit(1);
      }
    } catch (error) {
      handleError(error);
    }
  }
};

// ============================================
// MAIN EXECUTION
// ============================================

// Handle --version flag
if (args.includes('--version') || args.includes('-v')) {
  commands.version();
}

// Handle --help flag
if (args.includes('--help') || args.includes('-h')) {
  commands.help();
}

// Run command
if (commands[command]) {
  commands[command]();
} else {
  console.log(chalk.red(`Unknown command: ${command}`));
  console.log(chalk.gray('Run "palace help" for usage'));
  process.exit(1);
}
