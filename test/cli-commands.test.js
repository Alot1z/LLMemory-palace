/**
 * CLI Commands Tests - v2.6.0
 * Tests for diff, watch, stats, config commands
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CLI_PATH = path.join(process.cwd(), 'bin', 'cli.js');
const NODE_CMD = `node ${CLI_PATH}`;

describe('CLI Commands (v2.6.0)', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'palace-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    
    // Initialize palace
    execSync(`${NODE_CMD} init --quiet`, { encoding: 'utf-8' });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('diff command', () => {
    beforeEach(() => {
      // Create a test file
      fs.writeFileSync('test.js', 'const x = 1;\n', 'utf-8');
      execSync(`${NODE_CMD} scan --quiet`, { encoding: 'utf-8' });
    });

    it('should show diff for unchanged file', () => {
      const result = execSync(`${NODE_CMD} diff test.js`, { encoding: 'utf-8' });
      expect(result).to.include('File Diff Report');
      expect(result).to.include('test.js');
    });

    it('should detect file changes', () => {
      // Modify file
      fs.writeFileSync('test.js', 'const x = 2;\nconst y = 3;\n', 'utf-8');
      
      const result = execSync(`${NODE_CMD} diff test.js`, { encoding: 'utf-8' });
      expect(result).to.include('Changed:');
      expect(result).to.include('Yes');
    });

    it('should output JSON with --json flag', () => {
      const result = execSync(`${NODE_CMD} diff test.js --json`, { encoding: 'utf-8' });
      const json = JSON.parse(result);
      
      expect(json).to.have.property('file', 'test.js');
      expect(json).to.have.property('previousHash');
      expect(json).to.have.property('currentHash');
      expect(json).to.have.property('changed');
    });

    it('should error on missing file', () => {
      expect(() => {
        execSync(`${NODE_CMD} diff nonexistent.js`, { encoding: 'utf-8' });
      }).to.throw();
    });
  });

  describe('stats command', () => {
    beforeEach(() => {
      // Create test files
      fs.writeFileSync('app.js', 'function app() { return 1; }\n', 'utf-8');
      fs.writeFileSync('utils.js', 'function util() { return 2; }\n', 'utf-8');
      execSync(`${NODE_CMD} scan --quiet`, { encoding: 'utf-8' });
    });

    it('should show detailed statistics', () => {
      const result = execSync(`${NODE_CMD} stats`, { encoding: 'utf-8' });
      
      expect(result).to.include('Detailed Statistics Report');
      expect(result).to.include('Project Summary');
      expect(result).to.include('Pattern Detection');
      expect(result).to.include('Complexity Metrics');
      expect(result).to.include('Dependencies');
      expect(result).to.include('Languages');
    });

    it('should output JSON with --json flag', () => {
      const result = execSync(`${NODE_CMD} stats --json`, { encoding: 'utf-8' });
      const json = JSON.parse(result);
      
      expect(json).to.have.property('project');
      expect(json).to.have.property('summary');
      expect(json).to.have.property('patterns');
      expect(json).to.have.property('complexity');
      expect(json).to.have.property('dependencies');
      expect(json).to.have.property('languages');
    });

    it('should show detailed file distribution with -d flag', () => {
      const result = execSync(`${NODE_CMD} stats -d`, { encoding: 'utf-8' });
      
      expect(result).to.include('File Size Distribution');
      expect(result).to.include('Min:');
      expect(result).to.include('Median:');
      expect(result).to.include('90th percentile:');
    });
  });

  describe('config command', () => {
    it('should show configuration', () => {
      const result = execSync(`${NODE_CMD} config show`, { encoding: 'utf-8' });
      
      expect(result).to.include('Palace Configuration');
    });

    it('should set a config value', () => {
      execSync(`${NODE_CMD} config set --key test.value --value "hello"`, { encoding: 'utf-8' });
      
      const result = execSync(`${NODE_CMD} config get --key test.value`, { encoding: 'utf-8' });
      expect(result).to.include('hello');
    });

    it('should get a config value', () => {
      // First set a value
      execSync(`${NODE_CMD} config set --key mySetting --value 42`, { encoding: 'utf-8' });
      
      const result = execSync(`${NODE_CMD} config get --key mySetting`, { encoding: 'utf-8' });
      expect(result).to.include('42');
    });

    it('should reset configuration', () => {
      // Set a custom value
      execSync(`${NODE_CMD} config set --key custom --value "test"`, { encoding: 'utf-8' });
      
      // Reset
      execSync(`${NODE_CMD} config reset`, { encoding: 'utf-8' });
      
      // Check it's gone
      const result = execSync(`${NODE_CMD} config show`, { encoding: 'utf-8' });
      expect(result).to.not.include('custom');
    });

    it('should support nested keys with dot notation', () => {
      execSync(`${NODE_CMD} config set --key nested.deep.key --value "nested-value"`, { encoding: 'utf-8' });
      
      const result = execSync(`${NODE_CMD} config get --key nested.deep.key`, { encoding: 'utf-8' });
      expect(result).to.include('nested-value');
    });

    it('should parse JSON values', () => {
      execSync(`${NODE_CMD} config set --key arrayValue --value '["a","b","c"]'`, { encoding: 'utf-8' });
      
      const result = execSync(`${NODE_CMD} config get --key arrayValue`, { encoding: 'utf-8' });
      expect(result).to.include('a');
      expect(result).to.include('b');
      expect(result).to.include('c');
    });
  });

  describe('watch command', () => {
    // Note: Watch tests are limited since the command runs indefinitely
    
    it('should start watching with valid options', function(done) {
      this.timeout(5000);
      
      const proc = require('child_process').spawn('node', [CLI_PATH, 'watch', '--interval', '5000', '--quiet'], {
        cwd: tempDir
      });
      
      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      // Give it a moment to start
      setTimeout(() => {
        proc.kill();
        
        expect(output).to.include('Watching');
        done();
      }, 1000);
    });
  });

  describe('help text', () => {
    it('should show new commands in help', () => {
      const result = execSync(`${NODE_CMD} help`, { encoding: 'utf-8' });
      
      expect(result).to.include('New Commands (v2.6.0)');
      expect(result).to.include('diff');
      expect(result).to.include('watch');
      expect(result).to.include('stats');
      expect(result).to.include('config');
    });
  });
});

describe('CLI Command Options', () => {
  it('should show diff help', function() {
    this.timeout(5000);
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'palace-diff-'));
    const originalCwd = process.cwd();
    
    try {
      process.chdir(tempDir);
      
      // Without a file, diff shows help
      expect(() => {
        execSync(`node ${CLI_PATH} diff`, { encoding: 'utf-8' });
      }).to.throw(/Specify target file/);
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should show stats without scan', function() {
    this.timeout(5000);
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'palace-stats-'));
    const originalCwd = process.cwd();
    
    try {
      process.chdir(tempDir);
      execSync(`node ${CLI_PATH} init --quiet`, { encoding: 'utf-8' });
      const result = execSync(`node ${CLI_PATH} stats`, { encoding: 'utf-8' });
      expect(result).to.include('Statistics');
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
