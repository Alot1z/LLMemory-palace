# LLMemory-Palace Wiki

Detailed documentation for all modules and functions.

## Table of Contents

1. **[Palace](Palace.md)** - Main class and orchestration
2. **[PatternLibrary](PatternLibrary.md)** - Code template management
3. **[BehaviorGraph](BehaviorGraph.md)** - Flow and sequence mapping
4. **[SemanticHash](SemanticHash.md)** - Code fingerprinting
5. **[GenomeEncoder/Decoder](Genome.md)** - Compression engine
6. **[Reconstructor](Reconstructor.md)** - Code generation from genome
7. **[CLI Validator](CLI-Validator.md)** - Input sanitization
8. **[Safe Genome Parser](Genome-Safe.md)** - Security layer

## Quick Reference

| Module | Purpose | Import |
|--------|---------|--------|
| Palace | Main orchestrator | `import { Palace } from 'llmemory-palace'` |
| PatternLibrary | Template management | `import { PatternLibrary } from 'llmemory-palace'` |
| BehaviorGraph | Flow mapping | `import { BehaviorGraph } from 'llmemory-palace'` |
| SemanticHash | Code fingerprinting | `import { SemanticHash } from 'llmemory-palace'` |
| GenomeEncoder | Encode to genome | `import { GenomeEncoder } from 'llmemory-palace/genome'` |
| GenomeDecoder | Decode from genome | `import { GenomeDecoder } from 'llmemory-palace/genome'` |
| Reconstructor | Generate code | `import { Reconstructor } from 'llmemory-palace/reconstructor'` |
| validatePath | Path validation | `import { validatePath } from 'llmemory-palace/cli-validator'` |
| safeGenomeParse | Safe parsing | `import { safeGenomeParse } from 'llmemory-palace/genome-safe'` |
