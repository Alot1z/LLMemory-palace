# LLMemory-Palace API Reference

## Installation

```bash
npm install llmemory-palace
```

## Quick Start

```javascript
import { Palace } from 'llmemory-palace';

const palace = new Palace('./my-project');
await palace.scan();
const genome = await palace.generateGenome();
console.log(genome);
```

## Classes

### Palace

Main orchestrator class.

```javascript
import { Palace } from 'llmemory-palace';

const palace = new Palace(projectPath, options?);
```

#### Constructor Options

```typescript
interface PalaceOptions {
  compressionLevel?: 1 | 2 | 3 | 4;
  format?: 'cxml' | 'json' | 'genome';
}
```

#### Methods

##### `init(): Promise<void>`

Initialize palace in the project directory.

```javascript
await palace.init();
```

##### `scan(): Promise<ScanResult>`

Scan the project and analyze files.

```javascript
const result = await palace.scan();
// { files: 50, lines: 5000, size: 100000, patterns: 10, flows: 5, issues: 2 }
```

##### `export(options?): Promise<string>`

Export to CXML format.

```javascript
const cxml = await palace.export({ level: 3, compress: true });
```

##### `generateGenome(): Promise<string>`

Generate one-line genome.

```javascript
const genome = await palace.generateGenome();
// GENOME|VERSION:v25|PATTERNS:...|FLOWS:...|ENTITIES:...|CONFIG:...|LIBRARY:...
```

##### `compress(): Promise<CompressResult>`

Compress the codebase.

```javascript
const result = await palace.compress();
// { original: 100000, compressed: 500, ratio: 200 }
```

##### `query(question: string): Promise<string>`

Query the codebase (LLM-interactive mode).

```javascript
const answer = await palace.query('What authentication flow is used?');
```

---

### PatternLibrary

Pattern detection and template expansion.

```javascript
import { PatternLibrary } from 'llmemory-palace';

const lib = new PatternLibrary();
```

#### Methods

##### `register(name: string, pattern: PatternDefinition): void`

Register a new pattern.

```javascript
lib.register('MY_PATTERN', {
  template: 'function {action}{Entity}() { return db.{method}(); }',
  instances: []
});
```

##### `get(name: string): Pattern | undefined`

Get a pattern by name.

```javascript
const pattern = lib.get('CRUD_ENTITY');
```

##### `expand(patternName: string, params: object): string | null`

Expand a pattern with parameters.

```javascript
const code = lib.expand('CRUD_ENTITY', {
  action: 'get',
  entity: 'User',
  method: 'findUnique'
});
// "function getUser() { return db.findUnique(); }"
```

##### `extractPatterns(content: string, language: string): PatternInstance[]`

Extract pattern instances from code.

```javascript
const instances = lib.extractPatterns(code, 'javascript');
```

##### `compress(content: string, language: string): string`

Compress content using patterns.

```javascript
const compressed = lib.compress(code, 'javascript');
```

---

### BehaviorGraph

Flow analysis and behavior graphs.

```javascript
import { BehaviorGraph } from 'llmemory-palace';

const graph = new BehaviorGraph();
```

#### Methods

##### `register(name: string, flow: FlowDefinition): void`

Register a new flow.

```javascript
graph.register('MY_FLOW', {
  steps: ['validate', 'process', 'respond'],
  returns: 'result'
});
```

##### `get(name: string): Flow | undefined`

Get a flow by name.

```javascript
const flow = graph.get('AUTH_LOGIN');
// { name: 'AUTH_LOGIN', steps: [...], returns: 'token' }
```

##### `trace(flowName: string): string`

Get a human-readable trace of a flow.

```javascript
console.log(graph.trace('AUTH_LOGIN'));
```

##### `list(): FlowSummary[]`

List all registered flows.

```javascript
const flows = graph.list();
// [{ name: 'AUTH_LOGIN', steps: 5, returns: 'token' }, ...]
```

##### `analyze(content: string): FlowDefinition[]`

Analyze code to detect flows.

```javascript
const detectedFlows = graph.analyze(code);
```

---

### SemanticHash

Content-addressable hashing.

```javascript
import { SemanticHash } from 'llmemory-palace';

const hasher = new SemanticHash();
```

#### Methods

##### `hash(name: string): string`

Generate an 8-character hash.

```javascript
const hash = hasher.hash('MyClassName');
// "A1B2C3D4"
```

##### `resolve(hashCode: string): string | null`

Resolve a hash back to its original name.

```javascript
const name = hasher.resolve('A1B2C3D4');
// "MyClassName"
```

##### `compress(content: string): string`

Compress content by replacing identifiers with hashes.

```javascript
const compressed = hasher.compress(code);
```

##### `decompress(content: string): string`

Decompress content by replacing hashes with names.

```javascript
const original = hasher.decompress(compressed);
```

##### `findSimilar(name: string, threshold?: number): SimilarResult[]`

Find similar names based on hash similarity.

```javascript
const similar = hasher.findSimilar('getUser', 2);
// [{ name: 'getUserById', hash: '...', similarity: 4 }, ...]
```

---

### GenomeEncoder

One-line genome encoding/decoding.

```javascript
import { GenomeEncoder } from 'llmemory-palace';

const encoder = new GenomeEncoder();
```

#### Methods

##### `encode(files, patterns, flows, config): string`

Encode project to genome format.

```javascript
const genome = encoder.encode(files, patterns, flows, config);
```

##### `decode(genome: string): DecodeResult`

Decode genome to structured data.

```javascript
const { metadata, files } = encoder.decode(genome);
```

##### `getStats(genome: string): GenomeStats`

Get statistics about a genome.

```javascript
const stats = encoder.getStats(genome);
// { length: 5000, tokenEstimate: 1250, patternCount: 5, flowCount: 3 }
```

---

### Reconstructor

Source code reconstruction.

```javascript
import { Reconstructor } from 'llmemory-palace';

const recon = new Reconstructor();
```

#### Methods

##### `rebuild(inputFile: string, outputDir?: string): Promise<string>`

Rebuild source from genome/CXML file.

```javascript
const outputDir = await recon.rebuild('project.genome', './restored');
```

##### `reconstructPattern(patternName: string, params: object): string`

Reconstruct code from a pattern.

```javascript
const code = recon.reconstructPattern('CRUD_ENTITY', {
  action: 'create',
  entity: 'Order',
  method: 'save'
});
```

##### `verify(original: string, reconstructed: string): boolean`

Verify reconstruction matches original.

```javascript
const isValid = recon.verify(originalCode, reconstructedCode);
```

---

## Built-in Patterns

| Pattern | Description |
|---------|-------------|
| `CRUD_ENTITY` | CRUD operations for entities |
| `EXPRESS_ROUTE` | Express.js route handlers |
| `REPOSITORY_PATTERN` | Repository pattern for data access |
| `SERVICE_LAYER` | Service layer business logic |
| `MIDDLEWARE_CHAIN` | Middleware chain pattern |
| `ERROR_HANDLER` | Error handling pattern |
| `VALIDATOR` | Input validation pattern |
| `FACTORY` | Factory pattern |
| `SINGLETON` | Singleton pattern |
| `OBSERVER` | Observer/event pattern |

## Built-in Flows

| Flow | Steps | Returns |
|------|-------|---------|
| `AUTH_LOGIN` | validate_input, hash_password, db_lookup_user, compare_hash, generate_jwt | token |
| `AUTH_REGISTER` | validate_input, check_existing_user, hash_password, create_user, generate_jwt | user |
| `CRUD_CREATE` | validate_input, check_permissions, transform_data, db_insert, emit_event | created_entity |
| `CRUD_READ` | validate_input, check_permissions, db_query, transform_response | entity |
| `CRUD_UPDATE` | validate_input, check_permissions, fetch_existing, merge_data, db_update, emit_event | updated_entity |
| `CRUD_DELETE` | validate_input, check_permissions, check_dependencies, db_delete, emit_event | success |
| `ORDER_PROCESS` | validate_order, check_inventory, reserve_items, charge_payment, confirm_order, notify_user | order |
| `API_REQUEST` | authenticate, authorize, validate, process, respond | response |
| `ERROR_HANDLING` | catch_error, log_error, classify_error, format_response, send_response | error_response |

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { Palace, PatternLibrary, BehaviorGraph, SemanticHash, GenomeEncoder, Reconstructor } from 'llmemory-palace';
import type { ScanResult, PatternInstance, FlowDefinition, GenomeMetadata } from 'llmemory-palace';
```
