# Changelog

All notable changes to this project will be documented in this file.

Format: `[vMAJOR.MINOR.PATCH] - YYYY-MM-DD`

---

## [v1.0.5] - 2025-03-16

### Added
- Complete CLI documentation in README (15 commands)
- Wiki documentation folder with 8 API guides
- npm badges and quick links in README

### Changed
- Removed .gitignore from repo (local only)
- Clean repo history (no junk files)

---

## [v1.0.4] - 2025-03-16

### Added
- Semantic version badges in README
- `/stop-slop` principles applied to documentation
- Non-developer explanation section

### Changed
- README rewritten for accessibility
- Philosophical storytelling approach
- Detailed API docs moved to wiki/

---

## [v1.0.3] - 2025-03-16

### Added
- GitHub repository setup
- MIT License
- Initial npm publish

### Security
- No `eval()` - completely removed
- Full input validation
- Path traversal protection
- Injection attack prevention
- Safe genome parsing (JSON only)

---

## [v1.0.0] - 2025-03-14

### Added
- **Core Modules**
  - `Palace` - Main orchestrator class
  - `PatternLibrary` - Code template management
  - `BehaviorGraph` - Flow and sequence mapping
  - `SemanticHash` - Code fingerprinting
  - `GenomeEncoder/Decoder` - Compression engine
  - `Reconstructor` - Code generation from genome
  - `CLIValidator` - Input sanitization
  - `GenomeSafe` - Security layer

- **CLI Commands**
  - `init` - Initialize palace directory
  - `scan` - Analyze codebase
  - `genome` - Generate genome string
  - `export` - Export to CXML/JSON
  - `rebuild` - Reconstruct from genome
  - `pack` - Create portable package
  - `merge` - Merge package into project
  - `compress` - Pattern compression
  - `patterns` - Manage pattern library
  - `flows` - Manage behavior graphs
  - `deps` - Dependency analysis
  - `complexity` - Complexity metrics
  - `status` - Show current state
  - `query` - Interactive LLM query
  - `validate` - Security validation

- **Configuration**
  - `config/exclude.json` - File exclusion patterns
  - `config/patterns.json` - Built-in patterns
  - `config/settings.json` - Default settings

---

## Versioning Scheme

```
vMAJOR.MINOR.PATCH

MAJOR - Breaking changes
MINOR - New features, backward compatible
PATCH - Bug fixes, documentation
```

---

## Upcoming

See [ROADMAP.md](./ROADMAP.md) for full details.

### [v1.1.0] - Planned

- [ ] Watch mode (`palace watch`)
- [ ] Config file support (`.palacerc`)
- [ ] Plugin system
- [ ] Custom pattern registration
- [ ] Flow templates

### [v1.2.0] - Future

- [ ] Multi-project genomes
- [ ] LLM provider integrations
- [ ] Real-time sync

### [v2.0.0] - Platform

- [ ] Web dashboard
- [ ] Cloud sync
- [ ] API server
- [ ] IDE extensions
