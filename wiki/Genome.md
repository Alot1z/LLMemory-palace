# Genome Encoder/Decoder

The compression engine. Takes your project structure and reduces it to a portable string.

## Import

```javascript
import { GenomeEncoder, GenomeDecoder } from 'llmemory-palace/genome';
```

## GenomeEncoder

### `encode(files, patterns, flows, config)`

Generate genome string.

```javascript
const encoder = new GenomeEncoder();
const genome = encoder.encode(files, patterns, flows, config);
// → "GENOME|VERSION:v2.6.0|PATTERN:...|FLOW:...|ENTITIES:...|CONFIG:...|LIBRARY:..."
```

**Returns:** `string`

---

### `getStats(genome)`

Return genome statistics.

```javascript
const stats = encoder.getStats(genome);
// → { 
//      length: 663562, 
//      tokenEstimate: 165891, 
//      patternCount: 45, 
//      flowCount: 12,
//      entityCount: 234
//    }
```

**Returns:** `GenomeStats`

---

## GenomeDecoder

### `decode(genome)`

Parse genome back to object.

```javascript
const decoder = new GenomeDecoder();
const decoded = decoder.decode(genome);
// → { version, patterns, flows, entities, config, library }
```

**Returns:** `DecodedGenome`

---

### `validate(genome)`

Check genome integrity.

```javascript
const valid = decoder.validate(genome);
// → { valid: true, errors: [] }
// or
// → { valid: false, errors: ['Invalid version header', 'Corrupted pattern block'] }
```

**Returns:** `ValidationResult`

---

### `reconstruct(genome, outputDir)`

Generate files from genome.

```javascript
const result = await decoder.reconstruct(genome, './output');
// → { files: 45, success: true, warnings: [...] }
```

**Returns:** `Promise<ReconstructionResult>`

---

## Genome Format

The genome uses a pipe-delimited format:

```
GENOME|VERSION:v2.6.0|PATTERN:[base64]|FLOW:[base64]|ENTITIES:[base64]|CONFIG:[json]|LIBRARY:[base64]
```

### Sections

| Section | Content | Encoding |
|---------|---------|----------|
| PATTERN | Pattern templates | Base64 + zlib |
| FLOW | Behavior sequences | Base64 + zlib |
| ENTITIES | Names + hashes | Base64 + zlib |
| CONFIG | Settings | JSON |
| LIBRARY | Pattern library | Base64 + zlib |

---

## Token Estimation

GenomeEncoder estimates token usage:

```javascript
const stats = encoder.getStats(genome);
console.log(`~${stats.tokenEstimate} tokens`);
// Rule: tokenEstimate ≈ length / 4
```

---

## Example: Full Workflow

```javascript
import { GenomeEncoder, GenomeDecoder } from 'llmemory-palace/genome';

// Encoding
const encoder = new GenomeEncoder();
const genome = encoder.encode(
  scannedFiles,
  extractedPatterns,
  detectedFlows,
  projectConfig
);

console.log(`Genome: ${genome.length} chars`);
console.log(`Tokens: ~${encoder.getStats(genome).tokenEstimate}`);

// Decoding
const decoder = new GenomeDecoder();
const decoded = decoder.decode(genome);

console.log(decoded.patterns); // Array of patterns
console.log(decoded.flows);    // Array of flows
```
