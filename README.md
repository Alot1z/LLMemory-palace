# 🏛️ LLMemory-Palace

[![npm version](https://img.shields.io/npm/v/llmemory-palace.svg?color=blue)](https://www.npmjs.com/package/llmemory-palace)
[![npm downloads](https://img.shields.io/npm/dm/llmemory-palace.svg?color=green)](https://www.npmjs.com/package/llmemory-palace)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh/)
[![Node](https://img.shields.io/badge/Node-18+-green?logo=node.js)](https://nodejs.org/)

**[📦 npm](https://www.npmjs.com/package/llmemory-palace)** | **[💻 GitHub](https://github.com/Alot1z/LLMemory-palace)** | **[🐛 Issues](https://github.com/Alot1z/LLMemory-palace/issues)**

---

## The Problem

You're working with Claude or ChatGPT. You paste your codebase files one by one. The context fills up. The AI forgets what it saw first. You explain again. Context overflows. You start over.

## The Solution

LLMemory-Palace maps your code into a portable format. Not your actual code—a structural map. Patterns, flows, fingerprints. One string replaces dozens of file pastes.

## Install

```bash
npm install llmemory-palace
# or
bun add llmemory-palace
```

Node.js 18+ | Bun 1.0+

## Quick Start

```bash
npx palace init
npx palace scan
npx palace genome
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `.palace/` directory |
| `scan` | Analyze codebase structure |
| `genome` | Generate genome string |
| `export` | Export to CXML/JSON/YAML/MessagePack |
| `rebuild` | Reconstruct from genome |
| `pack` | Create portable package |
| `merge` | Merge package into project |
| `refresh` | Incremental update with `--ripple` for dependents |
| `patterns` | View detected patterns |
| `flows` | View behavior graphs |
| `deps` | Analyze dependencies |
| `status` | Show current state |
| `query` | Interactive LLM query |
| `validate` | Security check genome |

## Options

```
--output, -o      Output file/directory
--format, -f      cxml | json | yaml | msgpack | genome
--level, -l       Compression 1-4 (default: 3)
--ripple, -r      Update dependents (refresh command)
--dry-run, -d     Preview without changes
--metrics, -m     Show before/after metrics
```

## Security

- No `eval()`
- Input validation
- Path traversal protection
- Injection protection
- Safe genome parsing (JSON only)
- 28 security tests passing

## API

```javascript
import { Palace } from 'llmemory-palace';

const palace = new Palace({ projectPath: './my-project' });
await palace.init();
await palace.scan();
const genome = await palace.generateGenome();
console.log(genome);
```

## Documentation

- [Palace API](./wiki/Palace.md)
- [Pattern Library](./wiki/PatternLibrary.md)
- [Behavior Graph](./wiki/BehaviorGraph.md)
- [Semantic Hash](./wiki/SemanticHash.md)
- [Genome Format](./wiki/Genome.md)
- [CLI Validator](./wiki/CLI-Validator.md)
- [Safe Parser](./wiki/Genome-Safe.md)

## Export Formats

- **CXML** (default) - Compressed, token-efficient
- **JSON** - Human-readable
- **YAML** - Configuration-friendly
- **MessagePack** - Binary serialization

## Token Efficiency

Reference-based output saves 90%+ tokens:
- `palace://` URIs for on-demand resolution
- Compressed genomes: ~20KB for large projects
- Incremental scans with LRU caching

## MCP Server

90%+ token savings with reference-based minimal context:

```json
// ~/.claude.json
{
  "mcpServers": {
    "palace": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "llmemory-palace", "mcp"]
    }
  }
}
```

**Tools:**
- `mcp__palace__init` - Initialize project
- `mcp__palace__scan` - Scan with reference output (97% token savings)
- `mcp__palace__genome` - Generate compressed genome (99% savings)
- `mcp__palace__resolve_ref` - Resolve `palace://` URIs at depth 1-3
- `mcp__palace__status` - Check project status

**Token Savings:**

| Operation | Full | Reference | Savings |
|-----------|-----|-----------|---------|
| scan | 5000 | 150 | 97% |
| genome | 20000 | 200 | 99% |

## Performance

- LRU cache for faster rescans
- Worker threads for parallel scanning
- Chunked processing for files >100MB

## Plugin System

```javascript
import { HookSystem } from 'llmemory-palace/plugins';
hooks.on('scan', async (result) => { /* ... */ }, { priority: 10 });
```

## Large Files

```javascript
import { LargeFileHandler } from 'llmemory-palace/streaming';
const handler = new LargeFileHandler({ chunkSize: 1024 * 1024 });
handler.exportChunked(data, 'output');
```

## AI Integration

```javascript
import { PromptTemplates } from 'llmemory-palace/ai/prompts';
const prompts = new PromptTemplates(palace);
prompts.formatForLLM('claude', query);
```

## License

MIT
