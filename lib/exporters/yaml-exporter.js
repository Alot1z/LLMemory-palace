/**
 * YAML Exporter - Export/Import palace data in YAML format
 * Task 006: Export Formats
 */

/**
 * Convert a value to YAML string representation
 * @param {*} value - The value to convert
 * @param {number} indent - Current indentation level
 * @returns {string} YAML string
 */
function toYAML(value, indent = 0) {
  const spaces = '  '.repeat(indent);
  
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'null';
  }
  
  if (typeof value === 'string') {
    // Check if string needs quoting
    const needsQuote = /^[\s#:{}[\],&*?|<>=!`"'%@\\]/.test(value) ||
                       /^[0-9]/.test(value) ||
                       value.includes('\n') ||
                       value.includes(': ') ||
                       value === '';
    
    if (value.includes('\n')) {
      // Multi-line string - use literal block
      return '|\n' + value.split('\n').map(line => spaces + '  ' + line).join('\n');
    }
    
    if (needsQuote) {
      return '"' + value.replace(/"/g, '\\"').replace(/\\/g, '\\\\') + '"';
    }
    
    return value;
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  if (Buffer.isBuffer(value)) {
    return '"' + value.toString('base64') + '"';
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    
    return '\n' + value.map(item => {
      const yamlItem = toYAML(item, indent + 1);
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return spaces + '- ' + yamlItem.trimStart();
      }
      return spaces + '- ' + yamlItem;
    }).join('\n');
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    
    if (keys.length === 0) {
      return '{}';
    }
    
    return '\n' + keys.map(key => {
      const yamlKey = /^[a-zA-Z0-9_-]+$/.test(key) ? key : '"' + key + '"';
      const yamlValue = toYAML(value[key], indent + 1);
      
      if (typeof value[key] === 'object' && value[key] !== null) {
        return spaces + yamlKey + ':' + yamlValue;
      }
      
      return spaces + yamlKey + ': ' + yamlValue;
    }).join('\n');
  }
  
  return String(value);
}

/**
 * Parse YAML string to JavaScript object
 * @param {string} yaml - YAML string
 * @returns {*} Parsed value
 */
function parseYAML(yaml) {
  const lines = yaml.split('\n');
  let index = 0;
  
  function getIndent(line) {
    const match = line.match(/^( *)/);
    return match ? match[1].length : 0;
  }
  
  function parseValue(str) {
    str = str.trim();
    
    if (str === '' || str === 'null' || str === '~') {
      return null;
    }
    
    if (str === 'true') {
      return true;
    }
    
    if (str === 'false') {
      return false;
    }
    
    // Number parsing
    if (/^-?\d+$/.test(str)) {
      return parseInt(str, 10);
    }
    
    if (/^-?\d+\.\d+$/.test(str)) {
      return parseFloat(str);
    }
    
    // Quoted string
    if ((str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith("'") && str.endsWith("'"))) {
      return str.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    
    // Literal block (already processed)
    if (str.includes('\n')) {
      return str;
    }
    
    return str;
  }
  
  function parseBlock(indent = 0) {
    const result = {};
    let currentKey = null;
    let currentValue = null;
    let isArray = false;
    const arrayResult = [];
    
    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (trimmed === '' || trimmed.startsWith('#')) {
        index++;
        continue;
      }
      
      const currentIndent = getIndent(line);
      
      // If we've dedented, return to parent
      if (currentIndent < indent) {
        break;
      }
      
      // Array item
      if (trimmed.startsWith('- ')) {
        isArray = true;
        const itemStr = trimmed.slice(2);
        
        if (itemStr.includes(': ') && !itemStr.startsWith('"') && !itemStr.startsWith("'")) {
          // Array of objects
          const obj = {};
          const colonIndex = itemStr.indexOf(': ');
          const key = itemStr.slice(0, colonIndex);
          const valueStr = itemStr.slice(colonIndex + 2);
          
          index++;
          obj[key] = valueStr ? parseValue(valueStr) : parseBlock(currentIndent + 2);
          arrayResult.push(obj);
        } else {
          index++;
          arrayResult.push(parseValue(itemStr));
        }
        continue;
      }
      
      // Key-value pair
      const colonMatch = trimmed.match(/^([^:]+):(.*)$/);
      if (colonMatch) {
        const key = colonMatch[1].trim();
        const valueStr = colonMatch[2].trim();
        
        if (valueStr === '' || valueStr === '|') {
          // Value on next lines or literal block
          index++;
          if (valueStr === '|') {
            // Literal block
            let literalValue = '';
            while (index < lines.length) {
              const nextLine = lines[index];
              if (nextLine.trim() === '' || getIndent(nextLine) <= currentIndent) {
                break;
              }
              literalValue += (literalValue ? '\n' : '') + nextLine.slice(currentIndent + 2);
              index++;
            }
            result[key] = literalValue;
          } else {
            result[key] = parseBlock(currentIndent + 2);
          }
        } else {
          index++;
          result[key] = parseValue(valueStr);
        }
        continue;
      }
      
      index++;
    }
    
    return isArray ? arrayResult : result;
  }
  
  return parseBlock(0);
}

/**
 * Export palace data to YAML format
 * @param {Object} palace - Palace data object
 * @returns {string} YAML string
 */
export function exportToYAML(palace) {
  if (!palace || typeof palace !== 'object') {
    throw new Error('Invalid palace data: must be an object');
  }
  
  const yamlDoc = {
    version: palace.version || '25.0.0',
    name: palace.name || 'unknown',
    created: palace.created || new Date().toISOString(),
    stats: palace.stats || {},
    config: palace.config || {},
    files: palace.files || [],
    patterns: palace.patterns || [],
    flows: palace.flows || [],
    entities: palace.entities || []
  };
  
  return '# LLMemory-Palace YAML Export\n' +
         '# Generated: ' + new Date().toISOString() + '\n\n' +
         'palace:' + toYAML(yamlDoc, 1);
}

/**
 * Import palace data from YAML format
 * @param {string} yaml - YAML string
 * @returns {Object} Palace data object
 */
export function importFromYAML(yaml) {
  if (typeof yaml !== 'string') {
    throw new Error('Invalid YAML input: must be a string');
  }
  
  // Remove comments and header
  const lines = yaml.split('\n').filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('#') || trimmed.includes(':');
  });
  
  const cleanYaml = lines.join('\n');
  const parsed = parseYAML(cleanYaml);
  
  // Handle wrapped format
  const data = parsed.palace || parsed;
  
  return {
    version: data.version || '25.0.0',
    name: data.name || 'unknown',
    created: data.created || new Date().toISOString(),
    stats: data.stats || {},
    config: data.config || {},
    files: Array.isArray(data.files) ? data.files : [],
    patterns: Array.isArray(data.patterns) ? data.patterns : [],
    flows: Array.isArray(data.flows) ? data.flows : [],
    entities: Array.isArray(data.entities) ? data.entities : []
  };
}

/**
 * Validate palace data structure
 * @param {Object} data - Data to validate
 * @returns {boolean} True if valid
 */
export function validatePalaceData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Check required fields
  if (typeof data.version !== 'string') return false;
  if (typeof data.name !== 'string') return false;
  if (!Array.isArray(data.files)) return false;
  
  return true;
}

export default {
  exportToYAML,
  importFromYAML,
  validatePalaceData
};
