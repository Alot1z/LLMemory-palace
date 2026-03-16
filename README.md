# LLMemory-Palace

[![npm version](https://img.shields.io/npm/v/llmemory-palace.svg)](https://www.npmjs.com/package/llmemory-palace)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

**[📦 npm](https://www.npmjs.com/package/llmemory-palace)** • **[📖 Documentation](./wiki/Home.md)** • **[🐛 Issues](https://github.com/Alot1z/LLMemory-palace/issues)**

---

Give your code a memory that AI can carry.

## The Problem

You're working with Claude or ChatGPT. You paste your codebase files one by one. The context fills up. The AI forgets what it saw first. You explain again. Context overflows. You start over.

This happens because LLMs have limited memory windows. Every file you send takes space. By file fifty, the model has forgotten file one.

## The Insight

Ancient Greek orators memorized entire speeches by walking through imaginary buildings. Each room held a thought. Corridors connected ideas. The Method of Loci turned memory into architecture.

Your codebase is already a building. Patterns repeat like identical rooms. Functions connect like corridors. Dependencies form the structural load-bearing walls.

What if you could hand an AI the blueprints instead of walking it through every room?

## What This Does

LLMemory-Palace maps your code into a portable format called a genome. Not your actual code—a structural map. Pattern templates. Behavior flows. Entity relationships. File fingerprints.

The genome fits in a single prompt. An LLM loads it and understands your project's architecture without reading every file.

**Blueprints, not the building. Table of contents, not the book.**

## Quick Start

```bash
npm install llmemory-palace
npx palace init
npx palace scan
npx palace genome
```

Your project now has a genome string. Paste it into any LLM conversation. The model now knows your codebase structure.

## What You Get

| Feature | Description |
|---------|-------------|
| Pattern recognition | Repeated code structures become templates |
| Flow mapping | Step-by-step sequences (auth flows, data pipelines) |
| Semantic fingerprints | Similar code gets similar hashes |
| Portable context | One string replaces dozens of file pastes |

## What You Don't Get

- Source code compression (this is a map, not an archive)
- Perfect reconstruction (templates generate skeleton code)
- Magic (this is a tool, not a replacement for understanding)

## For Non-Developers

Imagine you're describing your house to someone over the phone. You could list every object in every room—that takes hours. Or you could describe the layout: three bedrooms connected by a hallway, kitchen opens to living room, garage attached.

The second approach is faster but less detailed. That's what LLMemory-Palace does for software. It describes the layout so an AI can navigate without memorizing every line of code.

## For Developers

```javascript
import { Palace } from 'llmemory-palace';

const palace = new Palace('./my-project');
await palace.init();
await palace.scan();
const genome = await palace.generateGenome();

// Send genome to any LLM
const response = await claude.messages.create({
  role: 'user',
  content: `Project genome:\n${genome}\nWhat patterns do you see?`
});
```

## How It Works

```
Scan → Template → Map flows → Hash → Compress
 ↓        ↓         ↓        ↓       ↓
files   patterns   flows   fingerprints  genome string
```

1. **Scan** — Walk your codebase, find repeating patterns
2. **Template** — Turn patterns into fillable templates
3. **Map flows** — Trace how code moves through steps
4. **Hash** — Create semantic fingerprints of similar code
5. **Compress** — Bundle everything into one string

## CLI Commands

| Command | Purpose |
|---------|---------|
| `npx palace init` | Create `.palace/` directory |
| `npx palace scan` | Analyze codebase |
| `npx palace genome` | Generate genome string |
| `npx palace export` | Write to file |
| `npx palace rebuild` | Reconstruct from genome |
| `npx palace status` | Show current state |

## Use Cases

**Starting fresh on a project** — Load the genome, ask the LLM what the codebase does.

**Context switching** — Save your project's genome, load it in a new session, continue where you left off.

**Code review preparation** — Generate a genome, let the reviewer understand the architecture first.

**Documentation helper** — The genome reveals patterns and flows that belong in your docs.

## Security

| Feature | Status |
|---------|--------|
| No `eval()` or code execution | ✅ |
| Input validation | ✅ |
| Path traversal protection | ✅ |
| Injection attack protection | ✅ |
| Safe genome parsing (JSON only) | ✅ |

## Installation

```bash
npm install llmemory-palace
```

Requires Node.js 18 or higher.

## Documentation

Full API documentation is in the [`wiki/`](./wiki/Home.md) folder:

- **[Palace](./wiki/Palace.md)** — Main class and orchestration
- **[PatternLibrary](./wiki/PatternLibrary.md)** — Code template management
- **[BehaviorGraph](./wiki/BehaviorGraph.md)** — Flow and sequence mapping
- **[SemanticHash](./wiki/SemanticHash.md)** — Code fingerprinting
- **[Genome Encoder/Decoder](./wiki/Genome.md)** — Compression engine
- **[CLI Validator](./wiki/CLI-Validator.md)** — Input sanitization
- **[Safe Genome Parser](./wiki/Genome-Safe.md)** — Security layer

## The Name

LLMemory = LLM + Memory + Palace

The Greeks called it the Memory Palace. We're bringing it back for the AI age.

## Links

- **[GitHub](https://github.com/Alot1z/LLMemory-palace)**
- **[npm](https://www.npmjs.com/package/llmemory-palace)**
- **[Report an Issue](https://github.com/Alot1z/LLMemory-palace/issues)**

## License

MIT
