/**
 * LLMemory-Palace v3.0 - Behavior Graph
 * 
 * Represents logic flows and their relationships.
 * Direct port from v2.6.0 with TypeScript interfaces.
 * 
 * @module flows/behavior-graph
 * @version 3.0.0
 */

import { createHash } from 'crypto';
import type {
  Flow,
  FlowStep,
  FlowRegistrationOptions,
  FlowListItem,
  ExtractedFlow,
  Language
} from '../types.js';

/**
 * BehaviorGraph manages code flows for compression and generation.
 * 
 * @example
 * ```typescript
 * const graph = new BehaviorGraph();
 * 
 * // Get flow info
 * const flow = graph.get('AUTH_LOGIN');
 * 
 * // Generate ASCII diagram
 * const diagram = graph.diagram('AUTH_LOGIN');
 * 
 * // Register custom flow
 * graph.register('MY_FLOW', {
 *   steps: ['step1', 'step2', 'step3'],
 *   returns: 'result'
 * });
 * ```
 */
export class BehaviorGraph {
  private flows: Map<string, Flow>;

  constructor() {
    this.flows = new Map<string, Flow>();
    this.loadBuiltInFlows();
  }

  /**
   * Load built-in flows for common patterns
   * @private
   */
  private loadBuiltInFlows(): void {
    // Authentication Flow (v12)
    this.register('AUTH_LOGIN', {
      steps: ['validate_input', 'hash_password', 'db_lookup_user', 'compare_hash', 'generate_jwt'],
      returns: 'token',
      version: 'v12',
      description: 'User authentication flow with JWT generation',
      errors: {
        invalid_credentials: { status: 401, message: 'Invalid email or password' },
        user_not_found: { status: 404, message: 'User not found' },
        db_error: { status: 500, message: 'Database error' }
      }
    });

    // Registration Flow
    this.register('AUTH_REGISTER', {
      steps: ['validate_input', 'check_existing_user', 'hash_password', 'create_user', 'generate_jwt'],
      returns: 'user',
      version: 'v12',
      description: 'User registration flow',
      errors: {
        user_exists: { status: 409, message: 'User already exists' },
        invalid_email: { status: 400, message: 'Invalid email format' },
        weak_password: { status: 400, message: 'Password does not meet requirements' }
      }
    });

    // CRUD Create Flow
    this.register('CRUD_CREATE', {
      steps: ['validate_input', 'check_permissions', 'transform_data', 'db_insert', 'emit_event'],
      returns: 'created_entity',
      version: 'v12',
      description: 'Generic entity creation flow',
      errors: {
        validation_failed: { status: 400, message: 'Validation failed' },
        unauthorized: { status: 403, message: 'Permission denied' },
        db_error: { status: 500, message: 'Database error' }
      }
    });

    // CRUD Read Flow
    this.register('CRUD_READ', {
      steps: ['validate_input', 'check_permissions', 'db_query', 'transform_response'],
      returns: 'entity',
      version: 'v12',
      description: 'Generic entity read flow',
      errors: {
        not_found: { status: 404, message: 'Entity not found' },
        unauthorized: { status: 403, message: 'Permission denied' }
      }
    });

    // CRUD Update Flow
    this.register('CRUD_UPDATE', {
      steps: ['validate_input', 'check_permissions', 'fetch_existing', 'merge_data', 'db_update', 'emit_event'],
      returns: 'updated_entity',
      version: 'v12',
      description: 'Generic entity update flow',
      errors: {
        not_found: { status: 404, message: 'Entity not found' },
        unauthorized: { status: 403, message: 'Permission denied' },
        validation_failed: { status: 400, message: 'Validation failed' }
      }
    });

    // CRUD Delete Flow
    this.register('CRUD_DELETE', {
      steps: ['validate_input', 'check_permissions', 'check_dependencies', 'db_delete', 'emit_event'],
      returns: 'success',
      version: 'v12',
      description: 'Generic entity delete flow',
      errors: {
        not_found: { status: 404, message: 'Entity not found' },
        unauthorized: { status: 403, message: 'Permission denied' },
        has_dependencies: { status: 409, message: 'Cannot delete: entity has dependencies' }
      }
    });

    // Order Processing Flow (v19)
    this.register('ORDER_PROCESS', {
      steps: ['validate_order', 'check_inventory', 'reserve_items', 'charge_payment', 'confirm_order', 'notify_user'],
      returns: 'order',
      version: 'v19',
      description: 'E-commerce order processing flow',
      errors: {
        out_of_stock: { status: 400, message: 'Items out of stock' },
        payment_failed: { status: 402, message: 'Payment processing failed' },
        invalid_order: { status: 400, message: 'Invalid order data' }
      }
    });

    // API Request Flow
    this.register('API_REQUEST', {
      steps: ['authenticate', 'authorize', 'validate', 'process', 'respond'],
      returns: 'response',
      version: 'v12',
      description: 'Generic API request handling flow',
      errors: {
        unauthenticated: { status: 401, message: 'Authentication required' },
        unauthorized: { status: 403, message: 'Permission denied' },
        invalid_request: { status: 400, message: 'Invalid request' },
        server_error: { status: 500, message: 'Internal server error' }
      }
    });

    // Error Handling Flow
    this.register('ERROR_HANDLING', {
      steps: ['catch_error', 'log_error', 'classify_error', 'format_response', 'send_response'],
      returns: 'error_response',
      version: 'v12',
      description: 'Centralized error handling flow',
      errors: {
        unknown_error: { status: 500, message: 'An unexpected error occurred' },
        critical_error: { status: 500, message: 'Critical system error' }
      }
    });
  }

  /**
   * Register a new flow
   * 
   * @param name - Unique flow name
   * @param options - Flow registration options
   */
  register(name: string, options: FlowRegistrationOptions): void {
    const flow: Flow = {
      name,
      steps: options.steps,
      returns: options.returns,
      hash: this.hashFlow(name, options.steps),
      version: options.version,
      description: options.description,
      errors: options.errors
    };

    this.flows.set(name, flow);
  }

  /**
   * Get a flow by name
   * 
   * @param name - Flow name
   * @returns Flow definition or undefined
   */
  get(name: string): Flow | undefined {
    return this.flows.get(name);
  }

  /**
   * Check if a flow exists
   * 
   * @param name - Flow name
   * @returns True if flow exists
   */
  has(name: string): boolean {
    return this.flows.has(name);
  }

  /**
   * Get all flows as entries
   * 
   * @returns Iterable of flow entries
   */
  getAll(): IterableIterator<[string, Flow]> {
    return this.flows.entries();
  }

  /**
   * Trace a flow and return detailed information
   * 
   * @param flowName - Flow name to trace
   * @returns Human-readable flow trace
   */
  trace(flowName: string): string {
    const flow = this.flows.get(flowName);
    if (!flow) {
      return `Flow "${flowName}" not found. Available: ${[...this.flows.keys()].join(', ')}`;
    }

    let output = `\n⚡ Flow: ${flowName}\n`;
    output += `   Hash: ${flow.hash}\n`;
    output += `   Returns: ${flow.returns}\n`;
    if (flow.version) output += `   Version: ${flow.version}\n`;
    if (flow.description) output += `   Description: ${flow.description}\n`;
    output += `   Steps:\n`;
    
    const steps = this.normalizeSteps(flow.steps);
    steps.forEach((step, i) => {
      output += `     ${i + 1}. ${typeof step === 'string' ? step : step.name}\n`;
    });

    if (flow.errors) {
      output += `   Errors:\n`;
      for (const [key, error] of Object.entries(flow.errors)) {
        output += `     - ${key}: ${error.status} (${error.message})\n`;
      }
    }

    return output;
  }

  /**
   * Extract flows from code content
   * 
   * @param content - Code content to analyze
   * @param language - Programming language
   * @returns Array of extracted flows
   */
  extractFlows(content: string, _language: Language): ExtractedFlow[] {
    const flows: ExtractedFlow[] = [];

    // Look for async function patterns that represent flows
    const asyncFuncRegex = /async\s+function\s+(\w+)\s*\([^)]*\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
    let match;

    while ((match = asyncFuncRegex.exec(content)) !== null) {
      const name = match[1];
      if (!name) continue;
      const body = match[2];
      if (!body) continue;

      // Extract step-like calls
      const steps: string[] = [];
      const stepRegex = /(?:await\s+)?(\w+)\s*\(/g;
      let stepMatch;
      
      while ((stepMatch = stepRegex.exec(body)) !== null) {
        const stepName = stepMatch[1];
        if (stepName && !['console', 'return', 'if', 'while', 'for', 'const', 'let', 'var'].includes(stepName)) {
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
   * 
   * @param moduleName - Module name to search for
   * @returns Array of matching flows
   */
  findForModule(moduleName: string): (Flow & { name: string })[] {
    const flows: (Flow & { name: string })[] = [];
    const lowerName = moduleName.toLowerCase();

    for (const [name, flow] of this.flows) {
      const steps = this.normalizeSteps(flow.steps);
      
      // Check if flow is related to module
      if (name.toLowerCase().includes(lowerName) ||
          steps.some(s => {
            const stepName = typeof s === 'string' ? s : s.name;
            return stepName.toLowerCase().includes(lowerName);
          })) {
        flows.push({ name, ...flow });
      }
    }

    return flows;
  }

  /**
   * List all flows with summary info
   * 
   * @returns Array of flow list items
   */
  list(): FlowListItem[] {
    const list: FlowListItem[] = [];
    for (const [name, flow] of this.flows) {
      const steps = this.normalizeSteps(flow.steps);
      list.push({
        name,
        steps: steps.length,
        returns: flow.returns
      });
    }
    return list;
  }

  /**
   * Get all flow names
   * 
   * @returns Array of flow names
   */
  names(): string[] {
    return Array.from(this.flows.keys());
  }

  /**
   * Get the number of flows
   * 
   * @returns Flow count
   */
  get size(): number {
    return this.flows.size;
  }

  /**
   * Remove a flow
   * 
   * @param name - Flow name to remove
   * @returns True if flow was removed
   */
  delete(name: string): boolean {
    return this.flows.delete(name);
  }

  /**
   * Clear all flows
   */
  clear(): void {
    this.flows.clear();
  }

  /**
   * Generate flow diagram (ASCII)
   * 
   * @param flowName - Flow name to diagram
   * @returns ASCII diagram or null if flow not found
   * 
   * @example
   * ```typescript
   * console.log(graph.diagram('AUTH_LOGIN'));
   * // AUTH_LOGIN
   * // ↓
   * // ┌─────────────────┐
   * // │ validate_input  │
   * // └────────┬────────┘
   * //          ↓
   * // ┌─────────────────┐
   * // │ hash_password   │
   * // └────────┬────────┘
   * // ...
   * // → token
   * ```
   */
  diagram(flowName: string): string | null {
    const flow = this.flows.get(flowName);
    if (!flow) return null;

    let diagram = `\n${flowName}\n`;
    diagram += '↓\n';
    
    const steps = this.normalizeSteps(flow.steps);
    steps.forEach((step, i) => {
      const stepName = typeof step === 'string' ? step : step.name;
      diagram += `┌─────────────────┐\n`;
      diagram += `│ ${stepName.padEnd(15)} │\n`;
      diagram += `└────────┬────────┘\n`;
      
      if (i < steps.length - 1) {
        diagram += '         ↓\n';
      }
    });
    
    diagram += `→ ${flow.returns}\n`;
    
    return diagram;
  }

  /**
   * Generate code from a flow
   * 
   * @param flowName - Flow name
   * @param context - Context for code generation
   * @returns Generated code or null if flow not found
   */
  generateCode(flowName: string, _context: Record<string, string> = {}): string | null {
    const flow = this.flows.get(flowName);
    if (!flow) return null;

    const functionName = flowName.toLowerCase().replace(/_/g, '');
    const steps = this.normalizeSteps(flow.steps);
    
    let code = `async function ${functionName}(input) {\n`;
    
    for (const step of steps) {
      const stepName = typeof step === 'string' ? step : step.name;
      const stepAction = typeof step === 'object' && step.action ? step.action : `Execute ${stepName}`;
      code += `  // ${stepName}: ${stepAction}\n`;
      code += `  await ${stepName}(input);\n\n`;
    }
    
    code += `  return ${flow.returns};\n`;
    code += `}`;

    return code;
  }

  /**
   * Export flows for serialization
   * 
   * @returns Object containing all flows
   */
  export(): Record<string, Flow> {
    const result: Record<string, Flow> = {};
    for (const [name, flow] of this.flows) {
      result[name] = flow;
    }
    return result;
  }

  /**
   * Import flows from a previous export
   * 
   * @param data - Exported flows data
   */
  import(data: Record<string, Flow>): void {
    for (const [name, flow] of Object.entries(data)) {
      this.flows.set(name, flow);
    }
  }

  /**
   * Normalize steps to FlowStep array
   * @private
   */
  private normalizeSteps(steps: string[] | FlowStep[]): FlowStep[] {
    return steps.map(step => {
      if (typeof step === 'string') {
        return { name: step };
      }
      return step;
    });
  }

  /**
   * Generate hash for flow
   * @private
   */
  private hashFlow(name: string, steps: string[] | FlowStep[]): string {
    const stepsStr = JSON.stringify(steps);
    return createHash('sha256')
      .update(name + stepsStr)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
  }
}

export default BehaviorGraph;
