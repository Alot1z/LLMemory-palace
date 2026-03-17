# Task Brief: Fix Tests

## Context
Tests were passing. This is a known issue with the tests importing modules from the wrong paths.

## Objective
Update test file imports to match the actual module structure.

## Scope
Update `tests/palace.test.mjs`:
- Change imports from `../lib/palace.js` to `./lib/index.js`
- Change imports from `../lib/patterns.js` to `./lib/patterns/pattern-library.js`
- Change imports from `../lib/flows.js` into `./lib/flows/behavior-graph.js`
- Change imports from `../lib/semantic-hash.js` into `./lib/core/semantic-hash.js`
- Change imports from `../lib/genome.js` to `./lib/genome/genome-encoder.js`
- Change imports from `../lib/reconstructor.js` to `./lib/reconstructor.js` (self-reference)

- Or remove the `../lib/reconstructor.js` line entirely (use simple class)

- Update test to use simple path re-exports

## Non-goals
- Do not add new tests
- Do not modify implementation logic
- Do not change package.json

- Do not change src/ structure

## Acceptance Criteria
- `npm run test` passes
- All imports resolve without errors
- No failing tests
