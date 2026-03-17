# LLMemory-Palace CLI Reference

## Installation

```bash
# Global installation
npm install -g llmemory-palace

# Or use with npx
npx llmemory-palace --help
```

## Commands

### `palace init`

Initialize LLMemory-Palace in your project.

```bash
palace init
```

Creates:
- `.palace/` directory
- `.palace/config/` with settings
- `.palace/state/` for tracking

### `palace scan`

Scan and analyze your codebase.

```bash
palace scan [options]

Options:
  --format <format>  Output format: json, text (default: text)
  --output <file>    Write output to file
```

Output includes:
- File count
- Line count
- Languages detected
- Patterns found
- Flows detected

### `palace export`

Export to CXML format.

```bash
palace export [options]

Options:
  --level <1-4>      Compression level (default: 3)
  --output <file>    Output file (default: stdout)
  --compress         Apply pattern compression
```

Compression levels:
1. State only (minimal)
2. Structure + dependencies
3. Full source (default)
4. Maximum density genome

### `palace genome`

Generate one-line ultra-compressed genome.

```bash
palace genome [options]

Options:
  --output <file>    Save to file
  --stats            Show compression statistics
```

The genome is a single line containing:
- Version identifier
- Pattern definitions
- Flow definitions
- Entity references
- Configuration
- File references

### `palace compress`

Compress codebase using pattern library.

```bash
palace compress [options]

Options:
  --output <file>    Save compressed output
  --hash             Apply semantic hashing
```

### `palace rebuild`

Reconstruct source from genome/CXML.

```bash
palace rebuild [options]

Options:
  --input <file>     Input genome/CXML file
  --output <dir>     Output directory (default: ./reconstructed)
```

### `palace patterns`

Manage pattern library.

```bash
palace patterns [action] [options]

Actions:
  list               List all patterns
  add <name> <file>  Add pattern from file
  expand <name>      Show pattern expansion

Options:
  --params <json>    Parameters for expansion
```

### `palace flows`

Manage behavior graphs.

```bash
palace flows [action] [options]

Actions:
  list               List all flows
  trace <name>       Trace a specific flow
  add <name> <file>  Add flow from file

Options:
  --diagram          Generate ASCII diagram
```

### `palace deps`

Analyze dependencies.

```bash
palace deps [options]

Options:
  --circular         Find circular dependencies
  --tree             Show dependency tree
  --format <format>  Output format: json, text
```

### `palace complexity`

Calculate complexity metrics.

```bash
palace complexity [options]

Options:
  --threshold <n>    Highlight files above threshold (default: 10)
  --format <format>  Output format: json, text
```

### `palace status`

Show palace status.

```bash
palace status [options]

Options:
  --quiet            Minimal output
  --json             JSON output
```

### `palace query`

Interactive LLM query mode.

```bash
palace query [options]

Options:
  --question <q>     Question to ask
  --context <level>  Context level: minimal, standard, full
```

## Environment Variables

- `PALACE_COMPRESSION_LEVEL` - Default compression level (1-4)
- `PALACE_EXCLUDE` - Additional exclude patterns (comma-separated)
- `PALACE_OUTPUT_FORMAT` - Default output format

## Configuration

Configuration is stored in `.palace/config/settings.json`:

```json
{
  "compressionLevel": 3,
  "languages": [],
  "framework": null,
  "db": null,
  "auth": null
}
```

Exclude patterns in `.palace/config/exclude.json`:

```json
[
  "node_modules",
  ".git",
  "dist",
  "*.min.js"
]
```

## Examples

```bash
# Initialize and scan
palace init
palace scan

# Generate genome
palace genome --output project.genome

# Export to CXML
palace export --level 4 --output project.cxml

# Reconstruct from genome
palace rebuild --input project.genome --output ./restored

# Check complexity
palace complexity --threshold 15

# Find circular deps
palace deps --circular
```
