/**
 * @fileoverview CLI input validation and sanitization
 * @version 2.6.0
 * @description Secure input handling for CLI commands
 * 
 * SECURITY FEATURES:
 * - Path traversal prevention
 * - Injection attack prevention
 * - Input sanitization
 * - Schema validation with Zod
 */

import { z } from 'zod';
import { resolve, normalize, basename, extname } from 'path';
import { existsSync, statSync } from 'fs';

// ============================================
// CONSTANTS
// ============================================
const MAX_PATH_LENGTH = 4096;
const MAX_STRING_LENGTH = 10000;
const MAX_EXCLUDE_PATTERNS = 100;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Path validation schema with security checks
 */
export const PathSchema = z.string()
  .min(1, 'Path cannot be empty')
  .max(MAX_PATH_LENGTH, `Path exceeds maximum length of ${MAX_PATH_LENGTH} characters`)
  .refine(
    path => !path.includes('\0'),
    'Path contains null bytes (potential injection attack)'
  )
  .refine(
    path => !path.includes('..'),
    'Path traversal detected: ".." not allowed in paths'
  )
  .refine(
    path => !/^\/dev\//.test(path) && !/^\/proc\//.test(path) && !/^\/sys\//.test(path),
    'Access to system directories not allowed'
  )
  .refine(
    path => !/[\x00-\x1f\x7f]/.test(path),
    'Path contains control characters'
  )
  .refine(
    path => !path.includes('|') && !path.includes(';') && !path.includes('&'),
    'Path contains shell metacharacters'
  )
  .transform(path => normalize(path));

/**
 * Output file path schema
 */
export const OutputPathSchema = z.string()
  .min(1, 'Output path cannot be empty')
  .max(MAX_PATH_LENGTH, 'Output path too long')
  .refine(
    path => !path.includes('\0') && !path.includes('..'),
    'Invalid characters in output path'
  )
  .refine(
    path => !path.includes('|') && !path.includes(';') && !path.includes('&'),
    'Output path contains shell metacharacters'
  );

/**
 * File size schema (in bytes)
 */
export const FileSizeSchema = z.number()
  .int('File size must be an integer')
  .min(1, 'File size must be at least 1 byte')
  .max(MAX_FILE_SIZE, `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);

/**
 * Exclude patterns schema
 */
export const ExcludePatternsSchema = z.array(
  z.string()
    .max(256, 'Exclude pattern too long')
    .refine(p => !p.includes('\0'), 'Invalid character in pattern')
    .refine(p => !/[;&|`$()]/.test(p), 'Exclude pattern contains shell metacharacters')
).max(MAX_EXCLUDE_PATTERNS, `Too many exclude patterns (max ${MAX_EXCLUDE_PATTERNS})`).default([]);

/**
 * Scan command options schema
 */
export const ScanOptionsSchema = z.object({
  path: PathSchema,
  exclude: ExcludePatternsSchema,
  maxFileSize: FileSizeSchema.default(DEFAULT_MAX_FILE_SIZE),
  patterns: z.boolean().default(true),
  flows: z.boolean().default(true),
  verbose: z.boolean().default(false),
  output: OutputPathSchema.optional()
});

/**
 * Pack command options schema
 */
export const PackOptionsSchema = z.object({
  path: PathSchema,
  output: OutputPathSchema.default('package.palace.json'),
  compress: z.boolean().default(false),
  includeTests: z.boolean().default(false),
  includeHidden: z.boolean().default(false),
  metadata: z.record(z.string().max(1024)).optional()
});

/**
 * Merge command options schema
 */
export const MergeOptionsSchema = z.object({
  packFile: z.string()
    .min(1, 'Pack file path required')
    .max(MAX_PATH_LENGTH, 'Pack file path too long')
    .refine(path => path.endsWith('.json'), 'Pack file must be .json')
    .refine(path => !path.includes('..'), 'Path traversal not allowed'),
  output: PathSchema,
  force: z.boolean().default(false),
  backup: z.boolean().default(true)
});

/**
 * Analyze command options schema
 */
export const AnalyzeOptionsSchema = z.object({
  path: PathSchema,
  type: z.enum(['full', 'security', 'quality', 'patterns', 'flows']).default('full'),
  depth: z.number().int().min(1).max(10).default(3),
  output: z.string().max(MAX_PATH_LENGTH).optional(),
  format: z.enum(['json', 'markdown', 'html']).default('json')
});

/**
 * Genome command options schema
 */
export const GenomeOptionsSchema = z.object({
  action: z.enum(['generate', 'export', 'import', 'validate', 'execute']),
  input: z.string().max(MAX_PATH_LENGTH).optional(),
  output: OutputPathSchema.optional(),
  format: z.enum(['json', 'yaml', 'toml']).default('json'),
  strict: z.boolean().default(true)
});

/**
 * Export command options schema
 */
export const ExportOptionsSchema = z.object({
  path: PathSchema,
  output: OutputPathSchema.optional(),
  format: z.enum(['cxml', 'json', 'genome']).default('cxml'),
  level: z.number().int().min(1).max(4).default(3),
  compress: z.boolean().default(false)
});

/**
 * Refresh command options schema
 */
export const RefreshOptionsSchema = z.object({
  target: z.string()
    .min(1, 'Target file or pattern required')
    .max(MAX_PATH_LENGTH, 'Target too long')
    .refine(t => !t.includes('\0'), 'Invalid characters in target'),
  ripple: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  metrics: z.boolean().default(false),
  parallel: z.boolean().default(true)
});

// ============================================
// ERROR CLASS
// ============================================

export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.details = details;
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details
    };
  }
  
  toString() {
    if (this.details.length === 0) {
      return `${this.name}: ${this.message}`;
    }
    const detailsStr = this.details.map(d => `  - ${d.path}: ${d.message}`).join('\n');
    return `${this.name}: ${this.message}\n${detailsStr}`;
  }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate and sanitize path
 * @param {string} path - Path to validate
 * @param {object} options - Validation options
 * @param {boolean} options.mustExist - Path must exist
 * @param {boolean} options.mustBeDir - Path must be a directory
 * @param {boolean} options.mustBeFile - Path must be a file
 * @param {boolean} options.allowAbsolute - Allow absolute paths
 * @param {boolean} options.allowRelative - Allow relative paths
 * @returns {string} Validated absolute path
 * @throws {ValidationError}
 */
export function validatePath(path, options = {}) {
  const { 
    mustExist = false, 
    mustBeDir = false, 
    mustBeFile = false,
    allowAbsolute = true,
    allowRelative = true 
  } = options;
  
  // Schema validation using safeParse
  const result = PathSchema.safeParse(path);
  if (!result.success) {
    // Zod v4 compatibility: handle different error structures
    const errorMessages = result.error?.issues?.map(e => e.message) 
      || result.error?.errors?.map(e => e.message)
      || [result.error?.message || 'Validation failed'];
    throw new ValidationError(
      `Path validation failed: ${errorMessages.join(', ')}`
    );
  }
  const validated = result.data;
  
  // Check absolute/relative
  const isAbsolute = validated.startsWith('/');
  if (!allowAbsolute && isAbsolute) {
    throw new ValidationError('Absolute paths not allowed');
  }
  if (!allowRelative && !isAbsolute) {
    throw new ValidationError('Relative paths not allowed');
  }
  
  // Resolve to absolute path
  const resolved = resolve(validated);
  
  // Existence check
  if (mustExist && !existsSync(resolved)) {
    throw new ValidationError(`Path does not exist: ${resolved}`);
  }
  
  // Type checks
  if (mustExist && (mustBeDir || mustBeFile)) {
    const stats = statSync(resolved);
    if (mustBeDir && !stats.isDirectory()) {
      throw new ValidationError(`Path is not a directory: ${resolved}`);
    }
    if (mustBeFile && !stats.isFile()) {
      throw new ValidationError(`Path is not a file: ${resolved}`);
    }
  }
  
  return resolved;
}

/**
 * Validate command options
 * @param {string} commandName - Command name
 * @param {object} options - Options to validate
 * @returns {object} Validated options
 * @throws {ValidationError}
 */
export function validateCommand(commandName, options) {
  const schemas = {
    scan: ScanOptionsSchema,
    pack: PackOptionsSchema,
    merge: MergeOptionsSchema,
    analyze: AnalyzeOptionsSchema,
    genome: GenomeOptionsSchema,
    export: ExportOptionsSchema,
    refresh: RefreshOptionsSchema
  };
  
  const schema = schemas[commandName];
  if (!schema) {
    throw new ValidationError(`Unknown command: ${commandName}`);
  }
  
  const result = schema.safeParse(options);
  if (!result.success) {
    const errors = (result.error?.errors || []).map(err => ({
      path: err.path?.join('.') || 'unknown',
      message: err.message || 'Unknown error',
      code: err.code || 'unknown'
    }));
    throw new ValidationError(
      `Validation failed for ${commandName} command`,
      errors
    );
  }
  
  return result.data;
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @param {object} options - Sanitization options
 * @param {number} options.maxLength - Maximum string length
 * @param {boolean} options.allowHtml - Allow HTML characters
 * @param {boolean} options.allowSpecialChars - Allow special characters
 * @param {boolean} options.allowNewlines - Allow newlines
 * @returns {string} Sanitized string
 * @throws {ValidationError}
 */
export function sanitizeString(input, options = {}) {
  const { 
    maxLength = MAX_STRING_LENGTH, 
    allowHtml = false, 
    allowSpecialChars = true,
    allowNewlines = true 
  } = options;
  
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }
  
  if (input.length > maxLength) {
    throw new ValidationError(`Input exceeds maximum length of ${maxLength}`);
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Remove control characters (except newline and tab if allowed)
  if (allowNewlines) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  }
  
  // HTML sanitization if needed
  if (!allowHtml) {
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  // Remove special characters if not allowed
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[^\w\s.-]/g, '');
  }
  
  return sanitized;
}

/**
 * Validate file extension
 * @param {string} filepath - File path
 * @param {string[]} allowedExtensions - Allowed extensions
 * @returns {string} Validated extension
 * @throws {ValidationError}
 */
export function validateFileExtension(filepath, allowedExtensions) {
  const ext = extname(filepath).toLowerCase().slice(1);
  
  if (!ext || !allowedExtensions.map(e => e.toLowerCase()).includes(ext)) {
    throw new ValidationError(
      `Invalid file extension ".${ext}". Allowed: ${allowedExtensions.join(', ')}`
    );
  }
  
  return ext;
}

/**
 * Validate number is within range
 * @param {number} value - Value to validate
 * @param {object} options - Range options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {boolean} options.integer - Must be integer
 * @returns {number} Validated number
 * @throws {ValidationError}
 */
export function validateNumber(value, options = {}) {
  const { 
    min = -Infinity, 
    max = Infinity, 
    integer = false 
  } = options;
  
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError('Value must be a valid number');
  }
  
  if (integer && !Number.isInteger(value)) {
    throw new ValidationError('Value must be an integer');
  }
  
  if (value < min) {
    throw new ValidationError(`Value must be at least ${min}`);
  }
  
  if (value > max) {
    throw new ValidationError(`Value must be at most ${max}`);
  }
  
  return value;
}

/**
 * Validate that input is not a path traversal attack
 * @param {string} input - Input to check
 * @returns {boolean} True if safe
 */
export function isPathSafe(input) {
  if (typeof input !== 'string') return false;
  if (input.includes('..')) return false;
  if (input.includes('\0')) return false;
  if (/[;&|`$()]/.test(input)) return false;
  return true;
}

/**
 * Sanitize filename
 * @param {string} filename - Filename to sanitize
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return '';
  
  // Remove path separators and dangerous characters
  return filename
    .replace(/[\/\\]/g, '_')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
}

// ============================================
// EXPORT ALL
// ============================================
export default {
  // Schemas
  PathSchema,
  OutputPathSchema,
  FileSizeSchema,
  ExcludePatternsSchema,
  ScanOptionsSchema,
  PackOptionsSchema,
  MergeOptionsSchema,
  AnalyzeOptionsSchema,
  GenomeOptionsSchema,
  ExportOptionsSchema,
  RefreshOptionsSchema,
  
  // Functions
  validatePath,
  validateCommand,
  sanitizeString,
  validateFileExtension,
  validateNumber,
  isPathSafe,
  sanitizeFilename,
  
  // Errors
  ValidationError,
  
  // Constants
  MAX_PATH_LENGTH,
  MAX_STRING_LENGTH,
  MAX_EXCLUDE_PATTERNS,
  MAX_FILE_SIZE,
  DEFAULT_MAX_FILE_SIZE
};
