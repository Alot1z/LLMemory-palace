# AUTO-MODE for LLMemory-Palace

## Purpose

AUTO-MODE is a separate skill layer that automatically detects user intent and executes appropriate Palace operations without manual command selection.

## How It Works

```
User Input: "fix the auth bug"
    ↓
[INTENT ANALYZER]
├─ Pattern: "fix" → bugfix mode
├─ Context: "auth" → scan auth files
├─ Confidence: 0.89 → auto-execute
    ↓
[AUTO-EXECUTOR]
├─ mcp__palace__scan auth/
├─ mcp__palace__resolve_ref depth=2
├─ Analyze patterns + flows
└─ Generate fix proposal
    ↓
[PLAN REVIEW] (user approves)
    ↓
[APPLY FIX]
```

## Intent Patterns

| Pattern | Mode | Actions |
|---------|------|---------|
| "fix" | bugfix | scan → resolve → diagnose → propose |
| "add" | feature | scan → patterns → propose → implement |
| "refactor" | refactor | scan → flows → deps → plan |
| "understand" | explore | scan → resolve → explain |
| "optimize" | optimize | scan → genome → analyze |
| "security" | audit | scan → patterns → validate |

## Confidence Thresholds

- 0.9+: Auto-execute with notification
- 0.7-0.9: Ask for confirmation
- <0.7: Ask for clarification

## Integration Points

AUTO-MODE calls Palace MCP tools:
1. `mcp__palace__init` - Initialize project
2. `mcp__palace__scan` - Scan files
3. `mcp__palace__genome` - Generate genome
4. `mcp__palace__resolve_ref` - Resolve references
5. `mcp__palace__status` - Check status

## Example Flow

```javascript
// User: "fix the login bug"

// 1. Intent Analysis
{
  intent: "bugfix",
  context: ["auth", "login"],
  confidence: 0.91,
  suggestedActions: [
    "mcp__palace__scan with focus on auth/",
    "mcp__palace__resolve_ref depth=2 for auth patterns",
    "Analyze login flow for errors"
  ]
}

// 2. Auto-Execute (confidence > 0.9)
// - Scan auth/ directory
// - Resolve patterns at depth 2
// - Detect login flow anomalies

// 3. Generate Proposal
{
  issue: "Missing null check in login validation",
  location: "auth/validator.js:47",
  fix: "Add optional chaining: user?.session?.valid",
  risk: "low"
}

// 4. User Approves → Apply Fix
```

## Safety Guarantees

1. **Plan Review Required**: Changes to code always require user approval
2. **Risk Assessment**: Each action tagged with risk level (low/medium/high)
3. **Rollback Support**: All changes tracked for easy rollback
4. **Validation Loop**: Post-change validation ensures no regressions

## Token Efficiency

AUTO-MODE minimizes tokens by:
- Using references instead of full content (90% savings)
- Lazy-loading only what's needed
- Caching scan results between operations
- Batching related queries

Typical AUTO-MODE session: 500-1000 tokens vs 5000-10000 for manual mode.
