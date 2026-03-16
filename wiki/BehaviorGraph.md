# BehaviorGraph Class

Code doesn't sit still. It flows. Authentication has steps: validate input, check database, compare hash, issue token. BehaviorGraph maps these sequences.

## Import

```javascript
import { BehaviorGraph } from 'llmemory-palace';
```

## Constructor

```javascript
const graph = new BehaviorGraph();
```

## Methods

### `addFlow(name, steps)`

Define a behavior flow.

```javascript
graph.addFlow('AUTH_LOGIN', [
  'validate_input',
  'hash_password', 
  'db_lookup',
  'compare_hash',
  'issue_jwt'
]);
```

**Parameters:**
- `name` (string) - Flow identifier
- `steps` (string[]) - Ordered list of step names

**Returns:** `void`

---

### `trace(name)`

Get steps for a flow.

```javascript
const steps = graph.trace('AUTH_LOGIN');
// → ['validate_input', 'hash_password', 'db_lookup', 'compare_hash', 'issue_jwt']
```

**Returns:** `string[]`

---

### `detect(code)`

Find flows in code automatically.

```javascript
const detected = graph.detect(sourceCode);
// → [
//      { 
//        flow: 'AUTH_LOGIN', 
//        confidence: 0.85, 
//        matchedSteps: 4,
//        missingSteps: ['issue_jwt']
//      }
//    ]
```

**Returns:** `DetectedFlow[]`

```typescript
interface DetectedFlow {
  flow: string;
  confidence: number; // 0-1
  matchedSteps: number;
  missingSteps: string[];
  evidence: CodeLocation[];
}
```

---

### `getFlow(name)`

Retrieve flow definition.

```javascript
const flow = graph.getFlow('AUTH_LOGIN');
// → { name: 'AUTH_LOGIN', steps: [...], occurrences: 12 }
```

**Returns:** `Flow | undefined`

---

### `listFlows()`

Return all flows.

```javascript
const flows = graph.listFlows();
// → ['AUTH_LOGIN', 'USER_REGISTER', 'PASSWORD_RESET', 'API_CALL']
```

**Returns:** `string[]`

---

### `findSimilar(steps)`

Find flows matching a step sequence.

```javascript
const similar = graph.findSimilar(['validate', 'lookup', 'respond']);
// → [{ flow: 'AUTH_LOGIN', similarity: 0.75 }, { flow: 'API_CALL', similarity: 0.60 }]
```

**Returns:** `SimilarFlow[]`

---

## Built-in Flows

| Flow | Steps |
|------|-------|
| `AUTH_LOGIN` | validate → hash → lookup → compare → issue |
| `USER_REGISTER` | validate → check_existing → create → verify → welcome |
| `API_CALL` | prepare → execute → parse → handle_error → respond |
| `DB_QUERY` | connect → prepare → execute → fetch → close |
| `FILE_UPLOAD` | validate → stream → process → store → confirm |
| `PAYMENT` | validate → authorize → capture → confirm → notify |

---

## Flow Detection Algorithm

BehaviorGraph uses fuzzy matching:

1. Normalize step names (remove `_`, lowercase)
2. Compare against known flow steps
3. Calculate confidence: `matchedSteps / totalSteps`
4. Require minimum 60% confidence for detection

---

## Example: Full Workflow

```javascript
import { BehaviorGraph } from 'llmemory-palace';

const graph = new BehaviorGraph();

// Define custom flow
graph.addFlow('USER_ONBOARDING', [
  'send_welcome_email',
  'create_profile',
  'setup_preferences',
  'import_contacts',
  'show_tutorial'
]);

// Detect in codebase
const results = graph.detect(codebase);

// Find what's missing
results.forEach(r => {
  if (r.confidence > 0.7) {
    console.log(`Flow ${r.flow} detected (${r.confidence * 100}%)`);
    console.log(`Missing steps: ${r.missingSteps.join(', ')}`);
  }
});
```
