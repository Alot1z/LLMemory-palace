# Palace Class

The main orchestrator. Holds all components together and provides the primary API.

## Import

```javascript
import { Palace } from 'llmemory-palace';
```

## Constructor

```javascript
const palace = new Palace(projectPath, options?);
```

**Parameters:**
- `projectPath` (string) - Path to project directory
- `options` (object, optional)
  - `recursive` (boolean) - Scan subdirectories (default: true)
  - `exclude` (string[]) - Patterns to exclude (default: `['node_modules', '.git']`)
  - `maxFiles` (number) - Maximum files to scan (default: 1000)

## Methods

### `init()`

Creates the `.palace/` directory structure.

```javascript
await palace.init();
// Creates:
// .palace/
// ├── state/
// │   ├── history.json
// │   └── current.json
// ├── output/
// └── config.json
```

**Returns:** `Promise<void>`

---

### `scan()`

Walks all files, extracts patterns, detects flows, generates semantic hashes.

```javascript
await palace.scan();
```

**Returns:** `Promise<ScanResult>`

```typescript
interface ScanResult {
  files: number;
  patterns: number;
  flows: number;
  entities: number;
  duration: number;
}
```

---

### `generateGenome()`

Compresses everything into a one-line genome string.

```javascript
const genome = await palace.generateGenome();
// Returns: "GENOME|VERSION:v2.6.0|PATTERN:...|FLOW:...|ENTITIES:...|CONFIG:...|LIBRARY:..."
```

**Returns:** `Promise<string>`

---

### `export(options)`

Writes genome to disk.

```javascript
await palace.export({ 
  format: 'cxml',  // 'cxml' | 'json' | 'genome'
  output: '.palace/output/genome.cxml'
});
```

**Parameters:**
- `format` (string) - Output format
- `output` (string) - Output path

**Returns:** `Promise<string>` - Path to written file

---

### `query(command)`

Interactive queries against the genome.

```javascript
// List all patterns
const patterns = palace.query('LIST patterns');

// Trace a specific flow
const flow = palace.query('TRACE auth-login');

// Get entity details
const entity = palace.query('GET UserService');
```

**Returns:** `Promise<QueryResult>`

---

### `getStats()`

Returns current state statistics.

```javascript
const stats = palace.getStats();
// Returns: { files: 45, lines: 3200, patterns: 12, flows: 5, entities: 89 }
```

**Returns:** `Stats`

---

### `fromString(genome)`

Load a genome from string (static method).

```javascript
const palace = await Palace.fromString(savedGenome);
```

**Returns:** `Promise<Palace>`

---

### `fromFile(path)`

Load a genome from file (static method).

```javascript
const palace = await Palace.fromFile('./genome.txt');
```

**Returns:** `Promise<Palace>`

---

## Events

The Palace class emits events during operations:

```javascript
palace.on('scan:file', (file) => console.log(`Scanned: ${file}`));
palace.on('scan:pattern', (pattern) => console.log(`Found pattern: ${pattern}`));
palace.on('genome:encode', (stats) => console.log(`Encoded: ${stats}`));
```

## Error Handling

All methods throw typed errors:

```javascript
try {
  await palace.scan();
} catch (error) {
  if (error instanceof PalaceError) {
    console.log(error.code); // 'SCAN_FAILED', 'INVALID_PATH', etc.
    console.log(error.message);
  }
}
```
