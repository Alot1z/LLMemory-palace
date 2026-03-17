# 🏛️ LLMemory-Palace

[![npm version](https://img.shields.io/npm/v/llmemory-palace.svg?color=blue)](https://www.npmjs.com/package/llmemory-palace)
[![npm downloads](https://img.shields.io/npm/dm/llmemory-palace.svg?color=green)](https://www.npmjs.com/package/llmemory-palace)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh/)
[![Node](https://img.shields.io/badge/Node-18+-green?logo=node.js)](https://nodejs.org/)

**[📦 npm](https://www.npmjs.com/package/llmemory-palace)** | **[💻 GitHub](https://github.com/Alot1z/LLMemory-palace)** | **[📖 Docs](./wiki/Home.md)** | **[🗺️ Roadmap](./ROADMAP.md)** | **[🐛 Issues](https://github.com/Alot1z/LLMemory-palace/issues)**

---

## The Problem

You're working with Claude or ChatGPT. You paste your codebase files one by one. The context fills up. The AI forgets what it saw first. You explain again. Context overflows. You start over.

## The Solution

LLMemory-Palace maps your code into a portable format. Not your actual code—a structural map. Patterns, flows, fingerprints. One string replaces dozens of file pastes.

## Install

```bash
# npm
npm install llmemory-palace

# bun
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
| `validate` | Security check genome |

## v1.1.0 Features

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

### Large Files
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

- [Palace](./wiki/Palace.md)
- [PatternLibrary](./wiki/PatternLibrary.md)
- [BehaviorGraph](./wiki/BehaviorGraph.md)
- [SemanticHash](./wiki/SemanticHash.md)
- [Genome](./wiki/Genome.md)
- [CLI Validator](./wiki/CLI-Validator.md)
- [Safe Parser](./wiki/Genome-Safe.md)

## License

MIT

---

**[⬆ Back to Top](#️-llmemory-palace)**

**Links:** [npm](https://www.npmjs.com/package/llmemory-palace) | [GitHub](https://github.com/Alot1z/LLMemory-palace) | [Issues](https://github.com/Alot1z/LLMemory-palace/issues)
