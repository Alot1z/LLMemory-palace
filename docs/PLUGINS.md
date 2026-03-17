# LLMemory-Palace Plugin System

> **Version**: 2.6.0
> **Phase**: 4 - Plugin System

## Overview

The LLMemory-Palace plugin system allows you to extend and customize the code analysis, export, and refresh behaviors through hooks.

## Installation

Plugins are loaded from:
- **Global**: `~/.palace/plugins/`
- **Local**: `.palace/plugins/` (project-specific)

## Quick Start

### 1. Create a Plugin Directory

```bash
mkdir -p ~/.palace/plugins/my-plugin
cd ~/.palace/plugins/my-plugin
```

### 2. Create a Manifest

Create `manifest.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My custom palace plugin",
  "author": "Your Name",
  "main": "index.js",
  "dependencies": [],
  "hooks": ["afterScan", "afterExport", "afterRefresh"],
  "config": {
    "enabled": true
  }
}
```

### 3. Create the Plugin Module

Create `index.js`:

```javascript
export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom palace plugin',
  author: 'Your Name',
  dependencies: [],
  hooks: [],
  
  // Lifecycle hooks
  onScan: async (context) => {
    console.log('Scan completed!', context.data);
    // Modify context.data as needed
    return context;
  },
  
  onExport: async (context) => {
    console.log('Export completed!', context.data.format);
    return context;
  },
  
  onRefresh: async (context) => {
    console.log('Refresh completed!', context.data.updated);
    return context;
  },
  
  // Optional lifecycle methods
  onLoad: async () => {
    console.log('Plugin loaded!');
  },
  
  onUnload: async () => {
    console.log('Plugin unloaded!');
  }
};
```

## Hook Types

### Scan Hooks

| Hook | When | Data |
|------|------|------|
| `beforeScan` | Before scanning | `{ path, options }` |
| `afterScan` | After scanning | `{ files, lines, size, languages, patterns, flows }` |
| `onFileScan` | For each file | `{ file, content, language }` |

### Export Hooks

| Hook | When | Data |
|------|------|------|
| `beforeExport` | Before exporting | `{ format, level, compress }` |
| `afterExport` | After exporting | `{ format, content, level, compressed }` |
| `onFileExport` | For each file | `{ file, content, export }` |

### Refresh Hooks

| Hook | When | Data |
|------|------|------|
| `beforeRefresh` | Before refreshing | `{ target, options }` |
| `afterRefresh` | After refreshing | `{ target, updated, skipped, affected, changes }` |
| `onFileRefresh` | For each file | `{ file, changes }` |

### Other Hooks

| Hook | When | Data |
|------|------|------|
| `beforeConfigChange` | Before config change | `{ key, oldValue, newValue }` |
| `afterConfigChange` | After config change | `{ key, value }` |
| `onPatternDetected` | Pattern found | `{ pattern, file, matches }` |
| `onFlowDetected` | Flow found | `{ flow, file, steps }` |
| `onError` | Error occurs | `{ error, context }` |
| `onWarning` | Warning occurs | `{ warning, context }` |

## Hook Priorities

```javascript
import { HookPriorities } from 'llmemory-palace';

// Priority levels (higher = executes first)
HookPriorities.HIGHEST  // 1000
HookPriorities.HIGH     // 750
HookPriorities.NORMAL   // 500 (default)
HookPriorities.LOW      // 250
HookPriorities.LOWEST   // 100
```

## Plugin Manifest Schema

```typescript
interface PluginManifest {
  // Required
  name: string;         // lowercase, alphanumeric with dashes
  version: string;      // semver format (e.g., "1.0.0")
  
  // Optional
  description?: string;
  author?: string;
  main?: string;        // default: "index.js"
  dependencies?: string[];
  hooks?: string[];
  config?: object;
  license?: string;
}
```

## Plugin Structure

```typescript
interface Plugin {
  // Metadata
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  
  // Hooks
  hooks?: HookDefinition[];
  onScan?: (context: HookContext) => Promise<HookContext>;
  onExport?: (context: HookContext) => Promise<HookContext>;
  onRefresh?: (context: HookContext) => Promise<HookContext>;
  
  // Lifecycle
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  onError?: (error: Error) => void;
  
  // Custom methods
  [key: string]: any;
}
```

## Using the Plugin Manager

```javascript
import { getPluginManager } from 'llmemory-palace';

const manager = getPluginManager({
  projectPath: '/path/to/project',
  enableGlobal: true,
  enableLocal: true,
  hotReload: false
});

// Discover available plugins
const discovered = manager.discover();
console.log('Available plugins:', discovered);

// Load a plugin
await manager.load('my-plugin');

// Load all plugins
const result = await manager.loadAll();
console.log('Loaded:', result.loaded);
console.log('Failed:', result.failed);

// Execute hooks
const scanResult = await manager.executeOnScan({
  files: 100,
  lines: 5000,
  size: 150000
});

// Unload a plugin
await manager.unload('my-plugin');
```

## Creating Plugins Programmatically

```javascript
import { getPluginManager, HookPriorities } from 'llmemory-palace';

const manager = getPluginManager();

// Create a scan plugin
const scanPlugin = manager.createScanPlugin({
  name: 'custom-scanner',
  version: '1.0.0',
  description: 'Custom scan handler',
  onScan: async (context) => {
    // Add custom analysis
    context.data.customMetric = calculateMetric(context.data.files);
    return context;
  },
  priority: HookPriorities.HIGH
});

manager.register(scanPlugin);
```

## Plugin Examples

### Example 1: File Counter Plugin

```javascript
// ~/.palace/plugins/file-counter/index.js
export default {
  name: 'file-counter',
  version: '1.0.0',
  description: 'Counts files by extension',
  author: 'palace-user',
  dependencies: [],
  
  onScan: async (context) => {
    const extensions = {};
    
    for (const file of context.data.files || []) {
      const ext = file.split('.').pop();
      extensions[ext] = (extensions[ext] || 0) + 1;
    }
    
    context.data.extensionCounts = extensions;
    console.log('File counts by extension:', extensions);
    
    return context;
  }
};
```

### Example 2: Export Formatter Plugin

```javascript
// ~/.palace/plugins/export-formatter/index.js
export default {
  name: 'export-formatter',
  version: '1.0.0',
  description: 'Custom export formatting',
  author: 'palace-user',
  dependencies: [],
  
  onExport: async (context) => {
    if (context.data.format === 'cxml') {
      // Add custom header
      context.data.content = context.data.content.replace(
        '<PALACE',
        '<!-- Custom Export Plugin -->\n<PALACE'
      );
    }
    
    return context;
  }
};
```

### Example 3: Refresh Logger Plugin

```javascript
// ~/.palace/plugins/refresh-logger/index.js
import fs from 'fs';
import path from 'path';

export default {
  name: 'refresh-logger',
  version: '1.0.0',
  description: 'Logs refresh operations',
  author: 'palace-user',
  dependencies: [],
  
  onRefresh: async (context) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      target: context.data.target,
      updated: context.data.updated?.length || 0,
      affected: context.data.affected?.length || 0
    };
    
    const logPath = path.join(process.cwd(), '.palace', 'refresh.log');
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    
    return context;
  }
};
```

### Example 4: Dependency Validator Plugin

```javascript
// ~/.palace/plugins/deps-validator/index.js
export default {
  name: 'deps-validator',
  version: '1.0.0',
  description: 'Validates dependencies during scan',
  author: 'palace-user',
  dependencies: [],
  
  onScan: async (context) => {
    const issues = [];
    
    for (const file of context.data.files || []) {
      // Check for deprecated dependencies
      if (file.content?.includes('request')) {
        issues.push({
          file: file.path,
          message: 'Deprecated dependency: request'
        });
      }
    }
    
    if (issues.length > 0) {
      context.addWarning(`Found ${issues.length} dependency issues`);
      context.data.dependencyIssues = issues;
    }
    
    return context;
  }
};
```

## CLI Integration

```bash
# Discover plugins
palace config show --plugins

# Enable/disable plugins (via config)
palace config set --key plugins.disabled --value '["plugin-name"]'

# View plugin stats
palace stats --plugins
```

## Best Practices

1. **Naming**: Use lowercase with dashes (e.g., `my-plugin`)
2. **Versioning**: Follow semver (e.g., `1.0.0`)
3. **Dependencies**: List all required plugins
4. **Error Handling**: Use `context.addError()` for errors
5. **Async**: All hook handlers should be async functions
6. **Return Context**: Always return the modified context

## Troubleshooting

### Plugin Not Loading

1. Check manifest.json is valid
2. Verify plugin name matches directory name
3. Check dependencies are installed
4. Look for errors in `palace scan --verbose`

### Hook Not Executing

1. Verify hook type is correct
2. Check plugin is loaded (`manager.isLoaded('name')`)
3. Ensure handler returns the context

### Dependency Errors

1. Load dependencies first
2. Check for circular dependencies
3. Use `manager.discover()` to see available plugins

## API Reference

### PluginManager

| Method | Description |
|--------|-------------|
| `register(plugin)` | Register a plugin |
| `unregister(name)` | Unregister a plugin |
| `load(name)` | Load a plugin by name |
| `loadAll()` | Load all discovered plugins |
| `unload(name)` | Unload a plugin |
| `unloadAll()` | Unload all plugins |
| `discover()` | Discover available plugins |
| `executeOnScan(data)` | Execute scan hooks |
| `executeOnExport(data)` | Execute export hooks |
| `executeOnRefresh(data)` | Execute refresh hooks |
| `getPlugin(name)` | Get a plugin by name |
| `getPlugins()` | Get all registered plugins |
| `getLoadedPlugins()` | Get all loaded plugins |
| `isLoaded(name)` | Check if plugin is loaded |
| `getStats()` | Get plugin system stats |

### HookContext

| Property | Description |
|----------|-------------|
| `hookType` | Type of hook |
| `data` | Hook data |
| `metadata` | Additional metadata |
| `errors` | Error messages |
| `warnings` | Warning messages |
| `cancelled` | Whether cancelled |
| `cancel()` | Cancel the operation |
| `addError(msg)` | Add an error |
| `addWarning(msg)` | Add a warning |

---

**Version**: 2.6.0
**Last Updated**: 2026-03-17
