/**
 * LLMemory-Palace v25.0 - Behavior Graph
 * Represents logic flows and their relationships
 */

import { createHash } from 'crypto';

export class BehaviorGraph {
  constructor() {
    this.flows = new Map();
    this._loadBuiltInFlows();
  }

  /**
   * Load built-in flows for common patterns
   */
  _loadBuiltInFlows() {
    // Authentication Flow (v12)
    this.register('AUTH_LOGIN', {
      steps: ['validate_input', 'hash_password', 'db_lookup_user', 'compare_hash', 'generate_jwt'],
      returns: 'token'
    });

    // Registration Flow
    this.register('AUTH_REGISTER', {
      steps: ['validate_input', 'check_existing_user', 'hash_password', 'create_user', 'generate_jwt'],
      returns: 'user'
    });

    // CRUD Create Flow
    this.register('CRUD_CREATE', {
      steps: ['validate_input', 'check_permissions', 'transform_data', 'db_insert', 'emit_event'],
      returns: 'created_entity'
    });

    // CRUD Read Flow
    this.register('CRUD_READ', {
      steps: ['validate_input', 'check_permissions', 'db_query', 'transform_response'],
      returns: 'entity'
    });

    // CRUD Update Flow
    this.register('CRUD_UPDATE', {
      steps: ['validate_input', 'check_permissions', 'fetch_existing', 'merge_data', 'db_update', 'emit_event'],
      returns: 'updated_entity'
    });

    // CRUD Delete Flow
    this.register('CRUD_DELETE', {
      steps: ['validate_input', 'check_permissions', 'check_dependencies', 'db_delete', 'emit_event'],
      returns: 'success'
    });

    // Order Processing Flow (v19)
    this.register('ORDER_PROCESS', {
      steps: ['validate_order', 'check_inventory', 'reserve_items', 'charge_payment', 'confirm_order', 'notify_user'],
      returns: 'order'
    });

    // API Request Flow
    this.register('API_REQUEST', {
      steps: ['authenticate', 'authorize', 'validate', 'process', 'respond'],
      returns: 'response'
    });

    // Error Handling Flow
    this.register('ERROR_HANDLING', {
      steps: ['catch_error', 'log_error', 'classify_error', 'format_response', 'send_response'],
      returns: 'error_response'
    });
  }

  /**
   * Register a new flow
   */
  register(name, flow) {
    this.flows.set(name, {
      name,
      steps: flow.steps,
      returns: flow.returns,
      hash: this._hash(name)
    });
  }

  /**
   * Get a flow by name
   */
  get(name) {
    return this.flows.get(name);
  }

  /**
   * Get all flows
   */
  getAll() {
    return this.flows.entries();
  }

  /**
   * Trace a flow and return detailed information
   */
  trace(flowName) {
    const flow = this.flows.get(flowName);
    if (!flow) {
      return `Flow "${flowName}" not found. Available: ${[...this.flows.keys()].join(', ')}`;
    }

    let output = `\n⚡ Flow: ${flowName}\n`;
    output += `   Hash: ${flow.hash}\n`;
    output += `   Returns: ${flow.returns}\n`;
    output += `   Steps:\n`;
    
    flow.steps.forEach((step, i) => {
      output += `     ${i + 1}. ${step}\n`;
    });

    return output;
  }

  /**
   * Extract flows from code content
   */
  extractFlows(content, language) {
    const flows = [];

    // Look for async function patterns that represent flows
    const asyncFuncRegex = /async\s+function\s+(\w+)\s*\([^)]*\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
    let match;

    while ((match = asyncFuncRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];

      // Extract step-like calls
      const steps = [];
      const stepRegex = /(?:await\s+)?(\w+)\s*\(/g;
      let stepMatch;
      
      while ((stepMatch = stepRegex.exec(body)) !== null) {
        const stepName = stepMatch[1];
        if (!['console', 'return', 'if', 'while', 'for'].includes(stepName)) {
          steps.push(stepName);
        }
      }

      if (steps.length >= 2) {
        flows.push({
          name,
          steps,
          returns: 'unknown'
        });
      }
    }

    return flows;
  }

  /**
   * Find flows relevant to a module
   */
  findForModule(moduleName) {
    const flows = [];
    const lowerName = moduleName.toLowerCase();

    for (const [name, flow] of this.flows) {
      // Check if flow is related to module
      if (name.toLowerCase().includes(lowerName) ||
          flow.steps.some(s => s.toLowerCase().includes(lowerName))) {
        flows.push({ name, ...flow });
      }
    }

    return flows;
  }

  /**
   * List all flows
   */
  list() {
    const list = [];
    for (const [name, flow] of this.flows) {
      list.push({
        name,
        steps: flow.steps.length,
        returns: flow.returns
      });
    }
    return list;
  }

  /**
   * Generate flow diagram (ASCII)
   */
  diagram(flowName) {
    const flow = this.flows.get(flowName);
    if (!flow) return null;

    let diagram = `\n${flowName}\n`;
    diagram += '↓\n';
    
    flow.steps.forEach((step, i) => {
      diagram += `┌─────────────────┐\n`;
      diagram += `│ ${step.padEnd(15)} │\n`;
      diagram += `└────────┬────────┘\n`;
      
      if (i < flow.steps.length - 1) {
        diagram += '         ↓\n';
      }
    });
    
    diagram += `→ ${flow.returns}\n`;
    
    return diagram;
  }

  /**
   * Generate hash for flow
   */
  _hash(name) {
    return createHash('sha256')
      .update(name + JSON.stringify(this.flows.get(name)?.steps || []))
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
  }
}
