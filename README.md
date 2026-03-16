# LLMemory-Palace

[![npm version](https://img.shields.io/npm/v/llmemory-palace.svg)](https://www.npmjs.com/package/llmemory-palace)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

**[📦 npm](https://www.npmjs.com/package/llmemory-palace)** • **[📖 Docs](./wiki/Home.md)** • **[🗺️ Roadmap](./ROADMAP.md)** • **[🐛 Issues](https://github.com/Alot1z/LLMemory-palace/issues)**

---

Give your code a memory that AI can carry.

## The Problem

You're working with Claude or ChatGPT. You paste your codebase files one by one. The context fills up. The AI forgets what it saw first. You explain again. Context overflows. You start over.

## The Solution

LLMemory-Palace maps your code into a portable format. Not your actual code—a structural map. Patterns, flows, fingerprints. One string replaces dozens of file pastes.

## Quick Start

```bash
npm install llmemory-palace
npx palace init
npx palace scan
npx palace genome
```

## CLI Commands

### Core Workflow

| Command | Purpose | Example |
|---------|---------|---------|
| `init` | Create `.palace/` directory | `npx palace init` |
| `scan` | Analyze codebase | `npx palace scan` |
| `genome` | Generate genome string | `npx palace genome` |
| `export` | Export to CXML/JSON | `npx palace export -f cxml -o out.cxml` |
| `rebuild` | Reconstruct from genome | `npx palace rebuild genome.txt` |

### Pack & Merge

| Command | Purpose | Example |
|---------|---------|---------|
| `pack` | Create portable package | `npx palace pack -o project.palace.json` |
| `merge` | Merge package into project | `npx palace merge project.palace.json` |

### Analysis

| Command | Purpose | Example |
|---------|---------|---------|
| `patterns` | View detected patterns | `npx palace patterns` |
| `flows` | View behavior graphs | `npx palace flows` |
| `deps` | Analyze dependencies | `npx palace deps` |
| `complexity` | Calculate complexity | `npx palace complexity` |
| `status` | Show current state | `npx palace status` |

### Utilities

| Command | Purpose | Example |
|---------|---------|---------|
| `compress` | Compress with patterns | `npx palace compress` |
| `query` | Interactive LLM query | `npx palace query "TRACE AUTH"` |
| `validate` | Security check genome | `npx palace validate genome.json` |

## Options

```
--output, -o      Output file/directory
--format, -f      Format: cxml | json | genome
--level, -l       Compression: 1-4 (default: 3)
--compress        Enable glyph compression
--quiet           Suppress banner
--verbose         Show details
--strict          Strict validation
```

## Typical Workflow

```bash
# 1. Initialize
npx palace init

# 2. Scan codebase
npx palace scan

# 3. Generate genome (paste into LLM)
npx palace genome

# 4. Or export to file
npx palace export -f genome -o project.genome

# 5. LLM loads it
# Paste genome string into Claude/ChatGPT
# Model now knows your codebase structure
```

## What You Get

| Feature | Description |
|---------|-------------|
| Pattern recognition | Repeated code becomes templates |
| Flow mapping | Step sequences (auth, data pipelines) |
| Semantic fingerprints | Similar code gets similar hashes |
| Portable context | One string, any LLM |

## What You Don't Get

- Source code compression (map, not archive)
- Perfect reconstruction (skeletons, not exact code)
- Magic (tool, not replacement for understanding)

## Security

| Feature | Status |
|---------|--------|
| No `eval()` | ✅ |
| Input validation | ✅ |
| Path traversal protection | ✅ |
| Injection protection | ✅ |
| Safe genome parsing | ✅ |

## Installation

```bash
npm install llmemory-palace
```

Node.js 18+

## Documentation

Full API in [`wiki/`](./wiki/Home.md):

- **[Palace](./wiki/Palace.md)** — Main class
- **[PatternLibrary](./wiki/PatternLibrary.md)** — Templates
- **[BehaviorGraph](./wiki/BehaviorGraph.md)** — Flows
- **[SemanticHash](./wiki/SemanticHash.md)** — Fingerprints
- **[Genome](./wiki/Genome.md)** — Encoder/Decoder
- **[CLI Validator](./wiki/CLI-Validator.md)** — Security
- **[Safe Parser](./wiki/Genome-Safe.md)** — Safe parsing

## License

MIT
