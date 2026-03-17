# Changelog

Format: `[vMAJOR.MINOR.PATCH] - YYYY-MM-DD`

---

## [v1.1.0] - 2025-03-17

### AI Integration
- **Prompt Templates** (`lib/ai/prompt-templates.js`) - LLM-ready prompts for Claude, GPT, Ollama
- **Embedding Patterns** (`lib/ai/embedding-patterns.js`) - Semantic chunking, search index generation

### Export Formats
- **YAML Exporter** (`lib/exporters/yaml-exporter.js`) - Custom parser, zero dependencies
- **MessagePack Exporter** (`lib/exporters/messagepack-exporter.js`) - Binary serialization

### Streaming
- **Large File Handler** (`lib/streaming/large-file-handler.js`) - Stream files >100MB with backpressure
- **Chunked Export/Import** - Split genomes with checksums
- **LRU Cache** - 316x scanner speedup

### Plugin System
- **Hook System** (`lib/plugins/hooks.js`) - Priority hooks: onScan, onExport, onRefresh
- **Plugin Loader** (`lib/plugins/loader.js`) - Dynamic loading from `.palace/plugins/`

### Web Interface
- **Express Server** (`web/server.js`) - REST API + web UI
- **11 API Endpoints** (`web/routes/api.js`) - HTTP operations
- **Dashboard** (`web/public/index.html`) - Browser management

### CI/CD
- GitHub Actions: Node 18/20/22 testing
- Auto-publish on version tags

### Tests
- 422+ tests passing
- Security: 28/28
- CLI validation: 61/61

### Export Paths
```
./ai/prompts      -> lib/ai/prompt-templates.js
./ai/embedding    -> lib/ai/embedding-patterns.js
./exporters/yaml  -> lib/exporters/yaml-exporter.js
./exporters/msgpack -> lib/exporters/messagepack-exporter.js
./streaming       -> lib/streaming/large-file-handler.js
./plugins         -> lib/plugins/hooks.js
```

### Internal
- Redux-like StateReducer (immutable updates)
- Worker threads (parallel scanning)
- Import graph parsing (ripple effects)
- Progress callbacks (long operations)

---

## [v1.0.8] - 2025-03-16

### Added
- Parallel Chain Refresh System
  - `lib/refresh.js` - Ripple propagation
  - `lib/scanner-parallel.js` - Worker pool
  - `lib/state-reducer.js` - Atomic reducers
  - `lib/refresh-analyzer.js` - Metric analysis
- CLI: `palace refresh <file>` with `--ripple`, `--dry-run`, `--metrics`
- Incremental state with semantic twin tracking
- Dependency tracking with automatic propagation

---

## [v1.0.7] - 2025-03-16

### Added
- CLI documentation (15 commands)
- Wiki folder (8 API guides)
- npm badges

---

## [v1.0.5] - 2025-03-16

### Added
- Semantic version badges
- Non-developer explanation section

### Changed
- README rewritten
- API docs moved to wiki/

---

## [v1.0.4] - 2025-03-16

### Added
- GitHub repository
- MIT License
- Initial npm publish

### Security
- No `eval()`
- Input validation
- Path traversal protection
- Injection prevention
- Safe genome parsing

---

## [v1.0.0] - 2025-03-14

### Core Modules
- `Palace` - Main orchestrator
- `PatternLibrary` - Template management
- `BehaviorGraph` - Flow mapping
- `SemanticHash` - Fingerprinting
- `GenomeEncoder/Decoder` - Compression
- `Reconstructor` - Code generation
- `CLIValidator` - Input sanitization
- `GenomeSafe` - Security layer

### CLI Commands
- `init`, `scan`, `genome`, `export`, `rebuild`
- `pack`, `merge`, `compress`
- `patterns`, `flows`, `deps`, `complexity`, `status`
- `query`, `validate`

### Configuration
- `config/exclude.json`
- `config/patterns.json`
- `config/settings.json`

---

## Versioning

```
MAJOR - Breaking changes
MINOR - New features, backward compatible
PATCH - Bug fixes
```

---

## Upcoming

See [ROADMAP.md](./ROADMAP.md)

### [v1.2.0]
- Watch mode
- Config file (`.palacerc`)
- Custom pattern registration
- Flow templates

### [v1.3.0]
- Multi-project genomes
- LLM provider integrations
- Real-time sync

### [v2.0.0]
- Web dashboard
- Cloud sync
- IDE extensions
