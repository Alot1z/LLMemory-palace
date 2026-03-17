/**
 * LLMemory-Palace - Genome Safe Module
 *
 * Provides safe/secure genome parsing with security validation.
 *
 * @module genome-safe
 */

import { createHash } from 'crypto';

// Allowed operations whitelist
export const ALLOWED_OPERATIONS = new Set([
  'encode',
  'decode',
  'validate',
  'parse',
  'getStats',
  'extract',
  'analyze',
  'transform',
  'compress',
  'hash',
  'scan',
  'reconstruct'
]);

// Dangerous patterns to detect
const DANGEROUS_PATTERNS = [
  /eval\s*\(/i,
  /Function\s*\(/i,
  /require\s*\(/i,
  /process\.env/i,
  /process\.exit/i,
  /child_process/i,
  /exec\s*\(/i,
  /spawn\s*\(/i,
  /__dirname/i,
  /__filename/i,
];

/**
 * Validates genome data structure with security checks
 */
export function safeGenomeParse(data, options = {}) {
  // Handle different input types
  let content;
  if (Buffer.isBuffer(data)) {
    content = data.toString('utf-8');
  } else if (typeof data === 'object') {
    content = JSON.stringify(data);
  } else {
    content = String(data);
  }

  // Basic validation
  if (!content || content.length === 0) {
    throw new GenomeValidationError('Empty genome data');
  }

  // Check for code strings (not JSON)
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new GenomeParseError('Invalid genome format: expected JSON object');
  }

  // Try to parse as JSON
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new GenomeParseError('Invalid genome header: not valid JSON');
  }

  // Validate version
  if (!parsed.version || !/^\d+\.\d+\.\d+$/.test(parsed.version)) {
    throw new GenomeValidationError('Invalid version format');
  }

  // Security check: scan for dangerous patterns
  const contentToCheck = JSON.stringify(parsed);
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(contentToCheck)) {
      throw new SecurityError(`Security violation: dangerous pattern detected`);
    }
  }

  // Validate operations if present
  if (parsed.patterns && Array.isArray(parsed.patterns)) {
    for (const pattern of parsed.patterns) {
      if (pattern.operation && !ALLOWED_OPERATIONS.has(pattern.operation)) {
        throw new GenomeValidationError(`Unknown operation: ${pattern.operation}`);
      }
    }
  }

  return {
    version: parsed.version,
    patterns: parsed.patterns || [],
    metadata: parsed.metadata || {}
  };
}

/**
 * Executes a genome with context
 */
export function executeGenome(genome, context = {}) {
  const parsed = safeGenomeParse(genome);
  
  // Execute in safe context
  const safeContext = {
    ...context,
    maxMemory: 1024 * 1024,
    maxTime: 30000
  };

  // Track execution results
  const results = [];
  let successful = 0;
  let failed = 0;

  // Execute each pattern/operation
  if (parsed.patterns && Array.isArray(parsed.patterns)) {
    for (const pattern of parsed.patterns) {
      try {
        // Simulate safe execution of allowed operations
        if (ALLOWED_OPERATIONS.has(pattern.operation)) {
          results.push({
            operation: pattern.operation,
            success: true,
            target: pattern.target || null
          });
          successful++;
        } else {
          results.push({
            operation: pattern.operation,
            success: false,
            error: 'Unknown operation'
          });
          failed++;
        }
      } catch (e) {
        results.push({
          operation: pattern.operation,
          success: false,
          error: e.message
        });
        failed++;
      }
    }
  }

  return {
    success: true,
    result: parsed,
    summary: {
      total: parsed.patterns ? parsed.patterns.length : 0,
      successful,
      failed
    },
    results,
    context: safeContext
  };
}

/**
 * Validates a file path
 */
export function validatePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    throw new ValidationError('Invalid path');
  }

  if (filePath.length === 0) {
    throw new ValidationError('Empty path');
  }

  if (filePath.length > 4096) {
    throw new ValidationError('Path too long');
  }

  // Check for traversal attempts
  if (filePath.includes('..')) {
    throw new SecurityError('Path traversal detected');
  }

  // Check for null bytes
  if (filePath.includes('\0')) {
    throw new ValidationError('Null byte in path');
  }

  return filePath;
}

/**
 * Validates a command object
 */
export function validateCommand(command) {
  if (!command || typeof command !== 'string') {
    throw new ValidationError('Invalid command');
  }

  // Check for injection patterns
  const injectionPatterns = [
    /;|/,
    /&&/,
    /\|\|/,
    /`/,
    /\$\{/,
    /\$\(/,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(command)) {
      throw new SecurityError('Command injection detected');
    }
  }

  return command;
}

/**
 * Sanitizes a string
 */
export function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return input;
  }

  const { maxLength = 10000, escapeHtml = true } = options;

  if (input.length > maxLength) {
    throw new ValidationError('Input exceeds maximum length');
  }

  let sanitized = input;

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Escape HTML if requested
  if (escapeHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return sanitized;
}

// Error classes
export class GenomeParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GenomeParseError';
  }
}

export class GenomeValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GenomeValidationError';
  }
}

export class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export default { safeGenomeParse, executeGenome, validatePath, validateCommand, sanitizeString };
