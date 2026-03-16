# PatternLibrary Class

Stores code templates, A CRUD operation looks the same across fifty files—why remember fifty versions when one template covers them all?

## Import

```javascript
import { PatternLibrary } from 'llmemory-palace';
```

## Constructor

```javascript
const lib = new PatternLibrary();
```

## Methods

### `register(name, template)`

Add a new pattern template.

```javascript
lib.register('CRUD_OPERATION', 
  'async function {action}{Entity}(id) { return db.{entity}.{method}({id}); }'
);
```

**Parameters:**
- `name` (string) - Unique pattern identifier
- `template` (string) - Template string with `{placeholder}` markers

**Returns:** `void`

---

### `expand(name, params)`

Fill template placeholders with values.

```javascript
const code = lib.expand('CRUD_OPERATION', { 
  action: 'get', 
  Entity: 'User', 
  entity: 'user', 
  method: 'find' 
});
// → async function getUser(id) { return db.user.find(id); }
```

**Parameters:**
- `name` (string) - Pattern name
- `params` (object) - Key-value pairs for placeholders

**Returns:** `string` - Expanded code

**Throws:** `PatternNotFoundError` if pattern doesn't exist

---

### `extract(code)`

Find patterns in source code.

```javascript
const patterns = lib.extract(sourceCode);
// → [
//      { 
//        type: 'function', 
//        name: 'getUser', 
//        template: 'async function {action}{Entity}(id) {...}', 
//        instances: [...],
//        confidence: 0.95
//      }
//    ]
```

**Parameters:**
- `code` (string) - Source code to analyze

**Returns:** `ExtractedPattern[]`

```typescript
interface ExtractedPattern {
  type: 'function' | 'class' | 'method' | 'loop' | 'conditional';
  name: string;
  template: string;
  instances: CodeInstance[];
  confidence: number; // 0-1
}
```

---

### `get(name)`

Retrieve a pattern by name.

```javascript
const pattern = lib.get('CRUD_OPERATION');
```

**Returns:** `Pattern | undefined`

---

### `list()`

Return all registered patterns.

```javascript
const all = lib.list();
// → [{ name: 'CRUD_OPERATION', template: '...', uses: 45 }, ...]
```

**Returns:** `PatternSummary[]`

---

### `match(code)`

Find which pattern a code block matches.

```javascript
const match = lib.match(codeBlock);
// → { pattern: 'CRUD_OPERATION', confidence: 0.92, params: { action: 'delete', Entity: 'Post' } }
```

**Parameters:**
- `code` (string) - Code to match

**Returns:** `MatchResult | null`

```typescript
interface MatchResult {
  pattern: string;
  confidence: number;
  params: Record<string, string>;
}
```

---

## Built-in Patterns

PatternLibrary includes these patterns by default:

| Pattern | Description |
|---------|-------------|
| `CRUD_OPERATION` | Create/Read/Update/Delete operations |
| `ASYNC_HANDLER` | Async function with try/catch |
| `EXPRESS_ROUTE` | Express.js route handler |
| `REACT_COMPONENT` | React functional component |
| `CLASS_CONSTRUCTOR` | Class with constructor |
| `FETCH_WRAPPER` | Fetch with error handling |
| `EVENT_EMITTER` | Event emitter pattern |
| `MIDDLEWARE` | Express middleware pattern |

---

## Adding Custom Patterns

```javascript
lib.register('MY_PATTERN', `
function {name}({params}) {
  {body}
  return {result};
}
`);
```

Placeholders use `{camelCase}` notation. The library auto-detects them during expansion.
