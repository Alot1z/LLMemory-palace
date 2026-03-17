# Task Brief: Environment Prep

## Context
LLMemory-Palace needs 100% verification before new features. First step is ensuring a clean build environment.

## Objective
Clean stale artifacts and reinstall dependencies to ensure no corrupted/outdated files cause false errors.

## Scope
- Delete `node_modules/` directory
- Delete `lib/` directory (generated JS output)
- Run `npm install` fresh

## Commands to Execute
```bash
cd /mnt/e/E-github-repos/my-claude-code-repos/One-Line-CXML-promting/LLMemory-Palace-package
rm -rf node_modules lib
npm install
```

## Non-goals
- Do not modify package.json
- Do not upgrade dependencies
- Do not modify any source files

## Acceptance Criteria
- `node_modules/` exists and is populated
- `npm install` completes without errors
- `package-lock.json` may be updated (acceptable)

## Notes
- `lib/` will be regenerated in next task by `npm run build`
- This ensures subsequent build/test results are accurate
