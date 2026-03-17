# Task: AI Prompts Integration

**Scope:**
- `lib/ai/prompt-templates.js`
- `lib/ai/embedding-patterns.js`
- `tests/unit/ai-prompts.test.mjs`

**Acceptance:**
- `generatePrompt(palace, query)` → LLM-ready context string
- `getEmbeddingPatterns(palace)` → patterns array for embeddings
- `generateSystemPrompt(palace)` → full system context
- `formatForLLM(palace, llm, 'claude' | 'gpt' | 'ollama')` → LLM-specific format
- Unit tests 3+ each
