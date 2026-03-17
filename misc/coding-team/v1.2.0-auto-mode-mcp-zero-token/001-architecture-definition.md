# Task Brief 001: v1.2.0 AUTO-MODE + Zero-Token MCP Server Architecture

## Context

LLMemory-Palace v1.1.0 is published. User wants v1.2.0 with:
- AUTO-MODE (like gsd-2 pattern)
- MCP server using cli-anything pattern
- Zero-token architecture: LLM knows everything WITHOUT context bloat
- Integration with 1.8k starred repos
- Insanely token-effective tool usage

## Objective

Define and implement a zero-token MCP server where:
1. Tools return semantic REFERENCES, not content
2. LLM "knows" project structure through compressed metadata
3. AUTO-MODE detects intent and executes automatically
4. All palace CLI tools wrapped as MCP tools

## Scope

Phase 1: Architecture Definition (THIS TASK)
- Define zero-token reference pattern
- Define AUTO-MODE detection system
- Design MCP server structure
- Plan cli-anything integration

## Non-goals / Later

- Bun integration (Phase 2)
- Starred repo integration (Phase 3)
- Full TypeScript migration (future)

## Core Architecture

### Zero-Token Reference Pattern

```
LLM Query: "What functions in src/auth/?"
├─ MCP Tool: palace_query_symbols
├─ Input: { path: "src/auth/", depth: 1 }
└─ Output: {
      "ref": "palace://symbols/auth_7f3a",
      "meta": {
        "count": 12,
        "exports": ["login", "logout", "validate"],
        "imports": ["bcrypt", "jsonwebtoken"],
        "patterns": ["auth-flow", "middleware"]
      }
    }
≈ 50 tokens (vs 5000+ for full content)

LLM "knows": 12 functions exist, their names, their patterns
LLM does NOT receive: function bodies (0 tokens)
When needed: LLM requests specific function by ID
```

### AUTO-MODE Detection System

```
User Input: "fix the auth bug"
    ↓
[INTENT ANALYZER]
├─ Pattern: "fix" → bug fix mode
├─ Context: "auth" → scan auth files
├─ Action: diagnose → run palace analyze
└─ Confidence: 0.89 → auto-execute
    ↓
[AUTO-EXECUTOR]
├─ palace genome src/auth/
├─ palace analyze --pattern security
├─ palace diagnose --flow auth
└─ Generate fix proposal
    ↓
[VALIDATOR]
├─ Test fix passes?
├─ No regression?
└─ Complete or retry
```

### MCP Server Structure

```javascript
// mcp-server/index.js
const MCP_SERVER = {
  name: "llmemory-palace",
  version: "1.2.0",

  // ZERO-TOKEN TOOLS (return references only)
  tools: {
    // Query metadata without content
    palace_query: {
      reference_only: true,
      returns: "semantic_ref"
    },

    // Get structure overview
    palace_structure: {
      compressed: true,
      format: "tree_detailed"
    },

    // Find patterns
    palace_patterns: {
      returns: "pattern_refs"
    },

    // LAZY-LOAD TOOLS (fetch on demand)
    palace_get_symbol: {
      lazy: true,
      requires: "symbol_id"
    },

    palace_get_file: {
      lazy: true,
      chunked: true
    },

    // AUTO-MODE TOOLS
    palace_auto: {
      intent_detection: true,
      auto_execute: true
    }
  }
};
```

### cli-anything Integration

```
palace CLI tools → cli-anything → MCP tools

palace genome → mcp__palace__genome
palace analyze → mcp__palace__analyze
palace patterns → mcp__palace__patterns
palace structure → mcp__palace__structure
palace export → mcp__palace__export
palace import → mcp__palace__import
palace validate → mcp__palace__validate
palace refresh → mcp__palace__refresh
palace auto → mcp__palace__auto (NEW)
```

## Token Effectiveness Matrix

| Operation | Native | MCP | Zero-Token MCP |
|-----------|--------|-----|----------------|
| List files | 2000 | 500 | 50 |
| Query symbols | 5000 | 1000 | 100 |
| Get structure | 10000 | 2000 | 200 |
| Find patterns | 3000 | 800 | 80 |
| Auto-diagnose | N/A | 5000 | 300 |

**Savings: 95-98% vs standard MCP**

## Constraints / Caveats

1. Must maintain backward compatibility with v1.1.0
2. CLI tools must work standalone
3. MCP server is optional add-on
4. Zero-token is DEFAULT, full content available on request

## Success Criteria

- [ ] Architecture document approved
- [ ] Zero-token reference pattern defined
- [ ] AUTO-MODE detection system specified
- [ ] MCP server structure designed
- [ ] Token effectiveness targets set (95%+ savings)
- [ ] Implementation tasks identified for Phase 2

## Next Tasks (After Approval)

002 - Implement MCP server scaffold
003 - Implement zero-token reference system
004 - Implement AUTO-MODE intent detector
005 - Wrap all palace CLI tools as MCP tools
006 - Add Bun support
007 - Integrate with starred repos
