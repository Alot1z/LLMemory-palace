// Type alias for the reconstruction layer
import type { CodeIndex } from '../types.js';

// Local genome index for parsing
interface GenomeIndex {
  files: Map<string, FileInfo>;
  patterns: PatternInfo[];
  metadata: Record<string, unknown>;
  flows?: ExtractedFlow[];
  entities?: string[];
  dependencies?: Map<string, string[]>;
  symbols?: Map<string, Symbol>;
  stats?: IndexStats;
}

