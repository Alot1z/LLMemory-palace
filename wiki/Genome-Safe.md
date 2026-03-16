# Safe Genome Parser

Security layer for genome data. No eval. No code execution. JSON only.

## Import

```javascript
import { 
  safeGenomeParse, 
  executeGenome,
  validateGenomeString,
  GenomeParseError,
  GenomeValidationError,
  SecurityError 
} from 'llmemory-palace/genome-safe';
```

## Functions

### `safeGenomeParse(data, options?)`

Parse with full validation. Scans for injection patterns.

```javascript
try {
  const genome = safeGenomeParse(userProvidedJson, {
    maxDepth: 10,
    maxLength: 1000000
  });
} catch (e) {
  if (e instanceof SecurityError) {
    console.log('Malicious content:', e.pattern);
    console.log('Found in field:', e.field);
  }
}
```

**Blocked Patterns:**
- `eval(`
- `Function(`
- `require(`
- `import `
- `process.env`
- `__proto__`
- `constructor`
- `<script`
- `javascript:`

**Returns:** `SafeGenome`

**Throws:** `SecurityError`, `GenomeParseError`

---

### `executeGenome(genome, context?)`

Run operations without code execution.

```javascript
const result = executeGenome(genome, {
  allowedOps: ['pattern.expand', 'flow.trace'],
  timeout: 5000
});

console.log(result.summary);
// → { total: 10, successful: 9, failed: 1 }
```

**Returns:** `ExecutionResult`

```typescript
interface ExecutionResult {
  genome: SafeGenome;
  results: OperationResult[];
  errors: ExecutionError[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}
```

---

### `validateGenomeString(str)`

Quick validation check.

```javascript
const valid = validateGenomeString(genomeString);
// → { valid: true, estimatedSize: 45678 }
// or
// → { valid: false, reason: 'Invalid header' }
```

**Returns:** `ValidationResult`

---

## Error Types

### SecurityError

Thrown when malicious content detected.

```javascript
try {
  safeGenomeParse(maliciousData);
} catch (e) {
  if (e instanceof SecurityError) {
    console.log({
      pattern: e.pattern,    // What was blocked
      field: e.field,        // Where it was found
      severity: e.severity   // 'high', 'medium', 'low'
    });
  }
}
```

### GenomeParseError

Thrown when JSON parsing fails.

```javascript
if (e instanceof GenomeParseError) {
  console.log({
    position: e.position,  // Character position
    line: e.line,          // Line number
    context: e.context     // Surrounding text
  });
}
```

### GenomeValidationError

Thrown when schema validation fails.

```javascript
if (e instanceof GenomeValidationError) {
  console.log({
    field: e.field,
    expected: e.expected,
    received: e.received,
    message: e.message
  });
}
```

---

## Security Guarantees

1. **No `eval()` or `Function()` constructor** — Code execution blocked
2. **Only JSON format accepted** — No executable content
3. **All strings scanned for injection patterns** — Regex-based detection
4. **Schema validation with Zod** — Type safety
5. **Depth limiting** — Prevents stack overflow from nested objects
6. **Length limiting** — Prevents memory exhaustion

---

## Example: Safe API Endpoint

```javascript
import { safeGenomeParse, SecurityError } from 'llmemory-palace/genome-safe';

app.post('/genome/load', (req, res) => {
  try {
    const genome = safeGenomeParse(req.body.genome);
    
    // Safe to use now
    const result = processGenome(genome);
    res.json({ success: true, result });
    
  } catch (error) {
    if (error instanceof SecurityError) {
      // Log security incident
      securityLogger.warn({
        ip: req.ip,
        pattern: error.pattern,
        timestamp: new Date()
      });
      
      res.status(400).json({ 
        error: 'Invalid genome format',
        code: 'SECURITY_VIOLATION'
      });
    } else {
      res.status(400).json({ 
        error: error.message 
      });
    }
  }
});
```

---

## Zod Schema

The parser uses Zod v4 for validation:

```javascript
const GenomeSchema = z.object({
  version: z.string().startsWith('v'),
  patterns: z.array(z.object({
    name: z.string(),
    template: z.string().max(10000),
    instances: z.array(z.any())
  })),
  flows: z.array(z.object({
    name: z.string(),
    steps: z.array(z.string())
  })),
  entities: z.record(z.string(), z.any()),
  config: z.record(z.string(), z.any()).optional().default({}),
  library: z.any().optional()
}).strict();
```
