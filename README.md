# LLMemory-Palace

[![npm version](https://img.shields.io/npm/v/llmemory-palace.svg)](https://www.npmjs.com/package/llmemory-palace)
[![Node CI](https://github.com/Alot1z/LLMemory-palace/actions/workflows/test.yml/badge.svg)](https://github.com/Alot1z/LLMemory-palace/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

**[npm](https://www.npmjs.com/package/llmemory-palace)** | **[Docs](./wiki/Home.md)** | **[Roadmap](./ROADMAP.md)** | **[Issues](https://github.com/Alot1z/LLMemory-palace/issues)**

Maps codebases into portable format for LLM context transfer. Patterns, flows, fingerprints—one string replaces dozens of file pastes.

## Install

```bash
npm install llmemory-palace
```

Node.js 18+

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
| `scan` | Analyze codebase |
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
| `validate` | Security check |

## v1.1.0

### AI Integration
```javascript
import { PromptTemplates } from 'llmemory-palace/ai/prompts';
const prompts = new PromptTemplates(palace);
prompts.formatForLLM('claude', query);
```

### Export Formats
- YAML (custom parser, zero deps)
- MessagePack (binary serialization)
- JSON (default)

### Streaming
```javascript
import { LargeFileHandler } from 'llmemory-palace/streaming';
const handler = new LargeFileHandler({ chunkSize: 1024 * 1024 });
handler.exportChunked(data, 'output');
```

### Web Interface
```bash
npx palace-web  # http://localhost:3000
```

### Plugin System
```javascript
import { HookSystem } from 'llmemory-palace/plugins';
hooks.on('scan', async (result) => { /* ... */ }, { priority: 10 });
```

### Performance
- LRU cache: 316x faster rescans
- Worker threads: parallel scanning
- Chunked processing: files >100MB

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
const genome = palace.generateGenome();
```

## Documentation

- [Palace](./wiki/Palace.md) — Main class
- [PatternLibrary](./wiki/PatternLibrary.md) — Templates
- [BehaviorGraph](./wiki/BehaviorGraph.md) — Flows
- [SemanticHash](./wiki/SemanticHash.md) — Fingerprints
- [Genome](./wiki/Genome.md) — Encoder/Decoder
- [CLI Validator](./wiki/CLI-Validator.md) — Security
- [Safe Parser](./wiki/Genome-Safe.md) — Safe parsing

## License

MIT
