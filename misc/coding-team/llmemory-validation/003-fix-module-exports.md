# Task Brief: Fix Module Exports

## Context
The `lib/` directory structure changed from flat files to nested directories. The `package.json` exports and tests expect the old flat structure.

**Expected (by package.json & tests):**
- `lib/palace.js` → Palace class
- `lib/patterns.js` → PatternLibrary class
- `lib/flows.js` → BehaviorGraph class
- `lib/semantic-hash.js` → SemanticHash class
- `lib/genome.js` → GenomeEncoder/GenomeDecoder
- `lib/reconstructor.js` → Reconstructor

**Actual structure in lib/:**
- `lib/index.js` → exports all classes
- `lib/patterns/pattern-library.js`
- `lib/flows/behavior-graph.js`
- `lib/core/semantic-hash.js`
- `lib/genome/genome-encoder.js`
- `lib/reconstruction/source-reconstructor.js`

## Objective
Create wrapper files in `lib/` that re-export classes from nested directories to match expected flat structure.

## Scope
Create these files in `lib/`:

1. `lib/palace.js` - Re-export Palace from index.js or create main class
2. `lib/patterns.js` - Re-export PatternLibrary from `./patterns/pattern-library.js`
3. `lib/flows.js` - Re-export BehaviorGraph from `./flows/behavior-graph.js`
4. `lib/semantic-hash.js` - Re-export SemanticHash from `./core/semantic-hash.js`
5. `lib/genome.js` - Re-export genome classes from `./genome/` files
6. `lib/reconstructor.js` - Re-export from `./reconstruction/` files

Also check if these files already exist elsewhere and need to be moved:
- `lib/genome-safe.js`
- `lib/cli-validator.js`
- `lib/refresh.js`
- `lib/refresh-analyzer.js`
- `lib/state-reducer.js`
- `lib/scanner-parallel.js`

## Non-goals
- Do not modify `src/` TypeScript files
- Do not change `package.json` exports
- Do not rewrite existing functionality

## Acceptance Criteria
- All wrapper files exist in `lib/`
- `npm run test` passes (or at least imports resolve)
- `node -e "import { Palace } from './lib/palace.js'"` succeeds

## Notes
- Use ES module `export ... from` syntax
- Check if Palace class exists or if we need to create it from existing components
