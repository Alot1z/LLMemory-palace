# SemanticHash Class

Two functions do the same thing? They should share a hash. SemanticHash generates fingerprints based on what code does, not how it's written.

## Import

```javascript
import { SemanticHash } from 'llmemory-palace';
```

## Constructor

```javascript
const hasher = new SemanticHash();
```

## Methods

### `hash(code)`

Generate semantic fingerprint.

```javascript
const hash1 = hasher.hash('async function getUser(id) { return db.users.find(id); }');
// → "a7f3b2c1d4e5f6"
```

**Returns:** `string` (32-char hex)

---

### `resolve(hash)`

Find original code by hash.

```javascript
const original = hasher.resolve('a7f3b2c1d4e5f6');
```

**Returns:** `string | undefined`

---

### `similarity(hash1, hash2)`

Compare two hashes.

```javascript
const hash2 = hasher.hash('async function fetchCustomer(id) { return database.customers.findById(id); }');

console.log(hasher.similarity(hash1, hash2)); 
// → 0.92 (very similar - same semantic intent)
```

**Returns:** `number` (0-1)

---

### `findSimilar(code, threshold)`

Find matching code above threshold.

```javascript
const matches = hasher.findSimilar(code, 0.8);
// → [{ hash: '...', similarity: 0.88, code: '...' }, ...]
```

**Returns:** `SimilarMatch[]`

---

### `store(code)`

Hash and store for later lookup.

```javascript
const hash = hasher.store(code);
// Now resolvable via hash
```

**Returns:** `string`

---

## How Semantic Hashing Works

1. **Normalize** — Remove variable names, comments, whitespace
2. **Extract structure** — Identify patterns like `async function X(Y) { return Z.W(V); }`
3. **Encode semantics** — Convert to structural tokens
4. **Hash** — Generate 32-char fingerprint

Two functions with different names but same behavior get similar hashes:

```javascript
// These get similar hashes (0.90+ similarity)
const a = 'function get(id) { return db.find(id); }';
const b = 'async function fetch(itemId) { return database.lookup(itemId); }';
```

---

## Use Cases

### Find Duplicates

```javascript
const files = getAllFiles();
const hashes = new Map();

files.forEach(file => {
  const hash = hasher.hash(file.content);
  if (hashes.has(hash)) {
    console.log(`Duplicate: ${file.path} = ${hashes.get(hash)}`);
  } else {
    hashes.set(hash, file.path);
  }
});
```

### Find Similar Implementations

```javascript
const newCode = fs.readFileSync('./new-feature.js');
const similar = hasher.findSimilar(newCode, 0.7);

similar.forEach(match => {
  console.log(`Similar to ${match.code} (${match.similarity * 100}%)`);
});
```

### Track Code Evolution

```javascript
// Before refactor
const oldHash = hasher.hash(oldCode);

// After refactor  
const newHash = hasher.hash(newCode);

const similarity = hasher.similarity(oldHash, newHash);
console.log(`Refactor preserved ${similarity * 100}% semantic intent`);
```
