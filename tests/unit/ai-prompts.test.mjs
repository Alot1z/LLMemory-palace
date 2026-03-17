/**
 * Unit tests for AI Prompts module
 *
 * Tests cover:
 * - PromptTemplates: generatePrompt, generateSystemPrompt, formatForLLM
 * - EmbeddingPatterns: getEmbeddingPatterns, getSemanticChunks, buildSearchIndex
 */

import { PromptTemplates } from '../../lib/ai/prompt-templates.js';
import { EmbeddingPatterns } from '../../lib/ai/embedding-patterns.js';

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assertEqual(actual, expected, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy value, got ${value}`);
  }
}

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg} Expected falsy value, got ${value}`);
  }
}

function assertContains(str, substr, msg = '') {
  if (typeof str !== 'string' || !str.includes(substr)) {
    throw new Error(`${msg} Expected "${str}" to contain "${substr}"`);
  }
}

function assertArrayLength(arr, expectedLength, msg = '') {
  if (arr.length !== expectedLength) {
    throw new Error(`${msg} Expected array length ${expectedLength}, got ${arr.length}`);
  }
}

function assertThrows(fn, msg = '') {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
  }
  if (!threw) {
    throw new Error(`${msg} Expected function to throw`);
  }
}

// ============================================
// Test Fixtures
// ============================================

const mockPalacePack = {
  name: 'TestProject',
  files: [
    {
      path: 'src/auth/login.js',
      language: 'JavaScript',
      lines: 50,
      content: `import jwt from 'jsonwebtoken';

async function authenticate(email, password) {
  const user = await db.users.findOne({ email });
  if (!user) throw new Error('User not found');
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Invalid password');
  
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
}

export { authenticate };`,
      patterns: [
        { type: 'function', name: 'authenticate', pattern: 'FUNCTION' }
      ]
    },
    {
      path: 'src/users/controller.js',
      language: 'JavaScript',
      lines: 80,
      content: `class UserController {
  async getUser(req, res) {
    const user = await userService.findById(req.params.id);
    res.json(user);
  }
}

export default new UserController();`,
      patterns: [
        { type: 'class', name: 'UserController', pattern: 'CLASS' },
        { type: 'function', name: 'getUser', pattern: 'FUNCTION' }
      ]
    }
  ],
  patterns: [
    {
      name: 'CRUD_ENTITY',
      template: 'async function {action}{entity}(id) { return db.{entity}.{method}({id}); }',
      description: 'CRUD operation pattern',
      instances: []
    },
    {
      name: 'EXPRESS_ROUTE',
      template: 'app.{method}("{path}", handler);',
      description: 'Express route pattern',
      instances: []
    }
  ],
  flows: [
    {
      name: 'AUTH_LOGIN',
      steps: ['validate_input', 'hash_password', 'db_lookup', 'compare_hash', 'generate_jwt'],
      returns: 'token',
      description: 'User authentication flow'
    },
    {
      name: 'CRUD_CREATE',
      steps: ['validate', 'check_permissions', 'db_insert'],
      returns: 'created_entity',
      description: 'Entity creation flow'
    }
  ],
  config: {
    framework: 'Express',
    languages: ['JavaScript']
  },
  stats: {
    files: 2,
    lines: 130,
    size: 1024
  }
};

// ============================================
// PromptTemplates Constructor Tests
// ============================================

test('PromptTemplates: constructor should create instance with defaults', () => {
  const templates = new PromptTemplates();
  assertTrue(templates instanceof PromptTemplates);
  assertEqual(templates.maxContextLength, 100000);
  assertTrue(templates.includePatterns);
  assertTrue(templates.includeFlows);
  assertTrue(templates.includeFiles);
});

// ============================================
// PromptTemplates generatePrompt Tests
// ============================================

test('PromptTemplates.generatePrompt: should generate prompt with query', () => {
  const templates = new PromptTemplates();
  const prompt = templates.generatePrompt(mockPalacePack, 'How does authentication work?');

  assertTrue(typeof prompt === 'string');
  assertContains(prompt, 'How does authentication work?');
  assertContains(prompt, 'TestProject');
});

test('PromptTemplates.generatePrompt: should include relevant patterns', () => {
  const templates = new PromptTemplates();
  const prompt = templates.generatePrompt(mockPalacePack, 'authentication');

  assertTrue(typeof prompt === 'string');
  // Should find AUTH_LOGIN flow
  assertContains(prompt, 'AUTH_LOGIN');
});

test('PromptTemplates.generatePrompt: should include file structure when requested', () => {
  const templates = new PromptTemplates();
  const prompt = templates.generatePrompt(mockPalacePack, 'test query', { includeStructure: true });

  assertContains(prompt, 'Project Structure');
});

test('PromptTemplates.generatePrompt: should respect maxTokens option', () => {
  const templates = new PromptTemplates();
  const prompt = templates.generatePrompt(mockPalacePack, 'test', { maxTokens: 100 });

  assertTrue(typeof prompt === 'string');
  // Should be truncated
  assertTrue(prompt.length < 5000);
});

test('PromptTemplates.generatePrompt: should focus on specific area', () => {
  const templates = new PromptTemplates();
  const prompt = templates.generatePrompt(mockPalacePack, 'test', { focusArea: 'auth' });

  assertTrue(typeof prompt === 'string');
  // Should include auth file
  assertContains(prompt, 'login.js');
});

// ============================================
// PromptTemplates generateSystemPrompt Tests
// ============================================

test('PromptTemplates.generateSystemPrompt: should generate system prompt', () => {
  const templates = new PromptTemplates();
  const systemPrompt = templates.generateSystemPrompt(mockPalacePack);

  assertTrue(typeof systemPrompt === 'string');
  assertContains(systemPrompt, 'expert');
  assertContains(systemPrompt, 'TestProject');
});

test('PromptTemplates.generateSystemPrompt: should include role definition', () => {
  const templates = new PromptTemplates();
  const systemPrompt = templates.generateSystemPrompt(mockPalacePack, {
    role: 'senior-developer',
    expertise: 'backend systems'
  });

  assertContains(systemPrompt, 'senior-developer');
  assertContains(systemPrompt, 'backend systems');
});

test('PromptTemplates.generateSystemPrompt: should include pattern library', () => {
  const templates = new PromptTemplates();
  const systemPrompt = templates.generateSystemPrompt(mockPalacePack);

  assertContains(systemPrompt, 'Pattern Library');
  assertContains(systemPrompt, 'CRUD_ENTITY');
});

test('PromptTemplates.generateSystemPrompt: should include behavior flows', () => {
  const templates = new PromptTemplates();
  const systemPrompt = templates.generateSystemPrompt(mockPalacePack);

  assertContains(systemPrompt, 'Behavior Flows');
  assertContains(systemPrompt, 'AUTH_LOGIN');
});

test('PromptTemplates.generateSystemPrompt: should include constraints', () => {
  const templates = new PromptTemplates();
  const systemPrompt = templates.generateSystemPrompt(mockPalacePack, {
    constraints: ['No external API calls', 'Use TypeScript']
  });

  assertContains(systemPrompt, 'Constraints');
  assertContains(systemPrompt, 'No external API calls');
});

// ============================================
// PromptTemplates formatForLLM Tests
// ============================================

test('PromptTemplates.formatForLLM: should format for Claude', () => {
  const templates = new PromptTemplates();
  const result = templates.formatForLLM(mockPalacePack, 'claude');

  assertEqual(result.model, 'claude-3-opus-20240229');
  assertTrue(result.system !== undefined);
  assertTrue(Array.isArray(result.messages));
});

test('PromptTemplates.formatForLLM: should format for Claude with query', () => {
  const templates = new PromptTemplates();
  const result = templates.formatForLLM(mockPalacePack, 'claude', { query: 'Test query' });

  assertArrayLength(result.messages, 1);
  assertEqual(result.messages[0].role, 'user');
  assertEqual(result.messages[0].content, 'Test query');
});

test('PromptTemplates.formatForLLM: should format for GPT', () => {
  const templates = new PromptTemplates();
  const result = templates.formatForLLM(mockPalacePack, 'gpt');

  assertEqual(result.model, 'gpt-4-turbo-preview');
  assertTrue(result.messages[0].role === 'system');
});

test('PromptTemplates.formatForLLM: should format for GPT with query', () => {
  const templates = new PromptTemplates();
  const result = templates.formatForLLM(mockPalacePack, 'gpt', { query: 'Test query' });

  assertTrue(result.messages.length >= 2);
  assertEqual(result.messages[result.messages.length - 1].role, 'user');
});

test('PromptTemplates.formatForLLM: should format for Ollama', () => {
  const templates = new PromptTemplates();
  const result = templates.formatForLLM(mockPalacePack, 'ollama');

  assertEqual(result.model, 'codellama');
  assertTrue(result.system !== undefined);
  assertTrue(result.options !== undefined);
});

test('PromptTemplates.formatForLLM: should format for Ollama with query', () => {
  const templates = new PromptTemplates();
  const result = templates.formatForLLM(mockPalacePack, 'ollama', { query: 'Test query' });

  assertEqual(result.prompt, 'Test query');
});

test('PromptTemplates.formatForLLM: should throw for unknown LLM', () => {
  const templates = new PromptTemplates();

  assertThrows(() => templates.formatForLLM(mockPalacePack, 'unknown'));
});

test('PromptTemplates.formatForLLM: should support stream option', () => {
  const templates = new PromptTemplates();
  const result = templates.formatForLLM(mockPalacePack, 'claude', { stream: true });

  assertTrue(result.stream === true);
});

// ============================================
// EmbeddingPatterns Constructor Tests
// ============================================

test('EmbeddingPatterns: constructor should create instance with defaults', () => {
  const embeddings = new EmbeddingPatterns();
  assertTrue(embeddings instanceof EmbeddingPatterns);
  assertEqual(embeddings.maxPatternLength, 500);
  assertEqual(embeddings.minPatternLength, 20);
  assertTrue(embeddings.includeMetadata);
});

// ============================================
// EmbeddingPatterns getEmbeddingPatterns Tests
// ============================================

test('EmbeddingPatterns.getEmbeddingPatterns: should return array of patterns', () => {
  const embeddings = new EmbeddingPatterns();
  const patterns = embeddings.getEmbeddingPatterns(mockPalacePack);

  assertTrue(Array.isArray(patterns));
});

test('EmbeddingPatterns.getEmbeddingPatterns: should include code patterns', () => {
  const embeddings = new EmbeddingPatterns();
  const patterns = embeddings.getEmbeddingPatterns(mockPalacePack, { includeCodePatterns: true });

  assertTrue(patterns.some(p => p.type === 'code-pattern'));
});

test('EmbeddingPatterns.getEmbeddingPatterns: should include flow patterns', () => {
  const embeddings = new EmbeddingPatterns();
  const patterns = embeddings.getEmbeddingPatterns(mockPalacePack, { includeFlowPatterns: true });

  assertTrue(patterns.some(p => p.type === 'flow-pattern'));
});

test('EmbeddingPatterns.getEmbeddingPatterns: should respect maxPatterns option', () => {
  const embeddings = new EmbeddingPatterns();
  const patterns = embeddings.getEmbeddingPatterns(mockPalacePack, { maxPatterns: 5 });

  assertTrue(patterns.length <= 5);
});

test('EmbeddingPatterns.getEmbeddingPatterns: should deduplicate patterns', () => {
  const embeddings = new EmbeddingPatterns();
  const patterns = embeddings.getEmbeddingPatterns(mockPalacePack);

  const ids = patterns.map(p => p.id);
  const uniqueIds = [...new Set(ids)];

  assertEqual(ids.length, uniqueIds.length);
});

test('EmbeddingPatterns.getEmbeddingPatterns: should exclude patterns when disabled', () => {
  const embeddings = new EmbeddingPatterns();
  const patterns = embeddings.getEmbeddingPatterns(mockPalacePack, {
    includeCodePatterns: false,
    includeFlowPatterns: false,
    includeStructuralPatterns: false,
    includeSemanticPatterns: false
  });

  assertEqual(patterns.length, 0);
});

// ============================================
// EmbeddingPatterns getSemanticChunks Tests
// ============================================

test('EmbeddingPatterns.getSemanticChunks: should return array of chunks', () => {
  const embeddings = new EmbeddingPatterns();
  const chunks = embeddings.getSemanticChunks(mockPalacePack);

  assertTrue(Array.isArray(chunks));
});

test('EmbeddingPatterns.getSemanticChunks: should chunk by function', () => {
  const embeddings = new EmbeddingPatterns();
  const chunks = embeddings.getSemanticChunks(mockPalacePack, { chunkBy: 'function' });

  assertTrue(chunks.length > 0);
  assertTrue(chunks.some(c => c.type === 'function' || c.type === 'arrow_function'));
});

test('EmbeddingPatterns.getSemanticChunks: should chunk by class', () => {
  const embeddings = new EmbeddingPatterns();
  const chunks = embeddings.getSemanticChunks(mockPalacePack, { chunkBy: 'class' });

  assertTrue(Array.isArray(chunks));
  assertTrue(chunks.some(c => c.type === 'class'));
});

test('EmbeddingPatterns.getSemanticChunks: should chunk by file', () => {
  const embeddings = new EmbeddingPatterns();
  const chunks = embeddings.getSemanticChunks(mockPalacePack, { chunkBy: 'file' });

  assertTrue(chunks.length > 0);
  assertTrue(chunks.some(c => c.type === 'file-chunk'));
});

test('EmbeddingPatterns.getSemanticChunks: should respect maxChunkSize', () => {
  const embeddings = new EmbeddingPatterns();
  const chunks = embeddings.getSemanticChunks(mockPalacePack, {
    maxChunkSize: 200,
    chunkBy: 'file'
  });

  chunks.forEach(chunk => {
    assertTrue(chunk.content.length <= 250); // Allow some margin
  });
});

test('EmbeddingPatterns.getSemanticChunks: should include metadata', () => {
  const embeddings = new EmbeddingPatterns();
  const chunks = embeddings.getSemanticChunks(mockPalacePack);

  chunks.forEach(chunk => {
    assertTrue(chunk.id !== undefined);
    assertTrue(chunk.filePath !== undefined);
    assertTrue(chunk.language !== undefined);
  });
});

// ============================================
// EmbeddingPatterns buildSearchIndex Tests
// ============================================

test('EmbeddingPatterns.buildSearchIndex: should return index structure', () => {
  const embeddings = new EmbeddingPatterns();
  const index = embeddings.buildSearchIndex(mockPalacePack);

  assertTrue(index.patterns !== undefined);
  assertTrue(index.flows !== undefined);
  assertTrue(index.files !== undefined);
  assertTrue(index.symbols !== undefined);
  assertTrue(index.metadata !== undefined);
});

test('EmbeddingPatterns.buildSearchIndex: should index patterns', () => {
  const embeddings = new EmbeddingPatterns();
  const index = embeddings.buildSearchIndex(mockPalacePack);

  assertTrue(Array.isArray(index.patterns));
  assertTrue(index.patterns.some(p => p.name === 'CRUD_ENTITY'));
});

test('EmbeddingPatterns.buildSearchIndex: should index flows', () => {
  const embeddings = new EmbeddingPatterns();
  const index = embeddings.buildSearchIndex(mockPalacePack);

  assertTrue(Array.isArray(index.flows));
  assertTrue(index.flows.some(f => f.name === 'AUTH_LOGIN'));
});

test('EmbeddingPatterns.buildSearchIndex: should index files', () => {
  const embeddings = new EmbeddingPatterns();
  const index = embeddings.buildSearchIndex(mockPalacePack);

  assertTrue(Array.isArray(index.files));
  assertTrue(index.files.length > 0);
});

test('EmbeddingPatterns.buildSearchIndex: should include searchableText', () => {
  const embeddings = new EmbeddingPatterns();
  const index = embeddings.buildSearchIndex(mockPalacePack);

  index.patterns.forEach(p => {
    assertTrue(typeof p.searchableText === 'string');
  });

  index.flows.forEach(f => {
    assertTrue(typeof f.searchableText === 'string');
  });
});

test('EmbeddingPatterns.buildSearchIndex: should calculate totalItems', () => {
  const embeddings = new EmbeddingPatterns();
  const index = embeddings.buildSearchIndex(mockPalacePack);

  const expected =
    index.patterns.length +
    index.flows.length +
    index.files.length +
    index.symbols.length;

  assertEqual(index.metadata.totalItems, expected);
});

test('EmbeddingPatterns.buildSearchIndex: should exclude sections when disabled', () => {
  const embeddings = new EmbeddingPatterns();
  const index = embeddings.buildSearchIndex(mockPalacePack, {
    includePatterns: false,
    includeFlows: false
  });

  assertArrayLength(index.patterns, 0);
  assertArrayLength(index.flows, 0);
});

// ============================================
// EmbeddingPatterns generateEmbeddingTexts Tests
// ============================================

test('EmbeddingPatterns.generateEmbeddingTexts: should return texts for embedding', () => {
  const embeddings = new EmbeddingPatterns();
  const texts = embeddings.generateEmbeddingTexts(mockPalacePack);

  assertTrue(Array.isArray(texts));
  texts.forEach(t => {
    assertTrue(t.id !== undefined);
    assertTrue(t.text !== undefined);
    assertTrue(t.metadata !== undefined);
  });
});

test('EmbeddingPatterns.generateEmbeddingTexts: should include pattern type in metadata', () => {
  const embeddings = new EmbeddingPatterns();
  const texts = embeddings.generateEmbeddingTexts(mockPalacePack);

  texts.forEach(t => {
    assertTrue(t.metadata.type !== undefined);
  });
});

// ============================================
// Run Tests
// ============================================

console.log('Running AI Prompts unit tests...\n');

for (const { name, fn } of tests) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${tests.length} total`);

if (failed > 0) {
  process.exit(1);
}

console.log('\nAll tests passed!');
process.exit(0);
