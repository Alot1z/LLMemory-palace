# CLI Validator

Input sanitization. Prevents injection attacks, path traversal, malicious data.

## Import

```javascript
import { 
  validatePath, 
  sanitizeString, 
  validateCommand,
  validateNumber,
  sanitizeFilename,
  ValidationError 
} from 'llmemory-palace/cli-validator';
```

## Functions

### `validatePath(path, options?)`

Check for traversal, null bytes, system directories.

```javascript
try {
  const safePath = validatePath(userInput, { 
    baseDir: '/project',
    allowAbsolute: false 
  });
} catch (e) {
  if (e instanceof ValidationError) {
    console.log(e.message); // "Path traversal detected"
  }
}
```

**Blocked:**
- `../../../etc/passwd`
- `/proc/self`
- `file\x00name`
- `CON:` (Windows)
- `..` sequences

**Returns:** `string` (normalized safe path)

---

### `sanitizeString(input, options?)`

Remove control chars, escape HTML.

```javascript
const clean = sanitizeString('<script>alert(1)</script>', {
  escapeHtml: true,
  stripControlChars: true,
  maxLength: 1000
});
// → '&lt;script&gt;alert(1)&lt;/script&gt;'
```

**Returns:** `string`

---

### `validateCommand(name, options)`

Validate CLI command options.

```javascript
const validated = validateCommand('scan', { 
  path: './src', 
  exclude: ['node_modules'],
  recursive: true
});
// Returns validated + type-coerced options
```

**Returns:** `ValidatedOptions`

**Throws:** `ValidationError` if invalid

---

### `validateNumber(value, options?)`

Range checking.

```javascript
const count = validateNumber(userInput, {
  min: 1,
  max: 100,
  integer: true
});
```

**Returns:** `number`

---

### `sanitizeFilename(name)`

Remove path separators, dangerous chars.

```javascript
const safe = sanitizeFilename('../../../etc/passwd');
// → 'etcpasswd'
```

**Returns:** `string`

---

## ValidationError

Custom error class with details:

```javascript
try {
  validatePath(maliciousInput);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log({
      code: error.code,      // 'PATH_TRAVERSAL', 'INVALID_CHARS', etc.
      message: error.message,
      input: error.input,     // Original input
      field: error.field      // Field name if applicable
    });
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `PATH_TRAVERSAL` | `..` sequences detected |
| `NULL_BYTE` | `\x00` in input |
| `SYSTEM_PATH` | Accessing /proc, /sys, etc. |
| `INVALID_CHARS` | Control characters |
| `EXCEEDS_MAX` | Value exceeds maximum |
| `BELOW_MIN` | Value below minimum |
| `INVALID_TYPE` | Wrong type |
| `INJECTION` | Code injection detected |

---

## Example: Express Middleware

```javascript
import { validatePath, ValidationError } from 'llmemory-palace/cli-validator';

app.get('/files/*', (req, res) => {
  try {
    const safePath = validatePath(req.params[0], { baseDir: '/data' });
    const content = fs.readFileSync(safePath, 'utf-8');
    res.send(content);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).json({ error: e.message });
    } else {
      res.status(500).json({ error: 'Internal error' });
    }
  }
});
```
