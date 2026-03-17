/**
 * LLMemory-Palace - Genome Encoder/Decoder Wrapper
 *
 * Re-exports genome encoding/decoding classes from genome directory.
 *
 * @module genome
 */
export { GenomeEncoder, createGenomeEncoder } from './genome/genome-encoder.js';
export { GenomeDecoder, createGenomeDecoder, quickDecode, validateGenome, parseGenome } from './genome/genome-decoder.js';
export { GenomeValidator, createGenomeValidator } from './genome/genome-validator.js';

// Re-export safe genome functions from genome-safe.js
export {
  safeGenomeParse,
  executeGenome,
  GenomeParseError,
  GenomeValidationError,
  SecurityError,
  ALLOWED_OPERATIONS
} from './genome-safe.js';
