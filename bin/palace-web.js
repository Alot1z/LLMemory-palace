#!/usr/bin/env node
/**
 * LLMemory-Palace Web Server Entry Point
 * 
 * Usage: node bin/palace-web.js [options]
 * 
 * Options:
 *   --port, -p     Server port (default: 3000)
 *   --host, -h     Server host (default: localhost)
 *   --help         Show help
 *   --version      Show version
 */

import { PalaceWebServer } from '../web/server.js';
import chalk from 'chalk';

const VERSION = '3.0.0';

// Parse arguments
const args = process.argv.slice(2);

function getArg(names, defaultValue) {
  for (let i = 0; i < args.length; i++) {
    if (names.includes(args[i])) {
      const value = args[i + 1];
      if (value && !value.startsWith('-')) {
        return value;
      }
      return defaultValue;
    }
  }
  return defaultValue;
}

function hasArg(names) {
  return args.some(a => names.includes(a));
}

// Help
if (hasArg(['--help', '-h']) && !args.includes('--host')) {
  console.log(`
${chalk.cyan('LLMemory-Palace Web Server v' + VERSION)}

${chalk.bold('Usage:')} palace-web [options]

${chalk.bold('Options:')}
  --port, -p <port>    Server port (default: 3000)
  --host, -h <host>    Server host (default: localhost)
  --help               Show this help
  --version            Show version

${chalk.bold('Examples:')}
  palace-web                     Start on default port 3000
  palace-web --port 8080         Start on port 8080
  palace-web -p 8080 -h 0.0.0.0  Listen on all interfaces

${chalk.bold('API Endpoints:')}
  GET  /api/status        Get palace status
  GET  /api/health        Health check
  POST /api/scan          Rescan project
  GET  /api/files         List all files
  GET  /api/patterns      List patterns
  GET  /api/flows         List behavior flows
  GET  /api/dependencies  Analyze dependencies
  GET  /api/complexity    Get complexity metrics
  GET  /api/genome        Generate genome
  POST /api/export        Export project
  POST /api/query         Execute query
  POST /api/pack          Create pack
  POST /api/merge         Merge pack
  POST /api/rebuild       Reconstruct from genome
`);
  process.exit(0);
}

// Version
if (hasArg(['--version', '-v'])) {
  console.log(`LLMemory-Palace Web Server v${VERSION}`);
  process.exit(0);
}

// Parse options
const options = {
  port: parseInt(getArg(['--port', '-p'], '3000'), 10),
  host: getArg(['--host', '-h'], 'localhost')
};

// Validate port
if (isNaN(options.port) || options.port < 1 || options.port > 65535) {
  console.error(chalk.red('Error: Invalid port number'));
  process.exit(1);
}

// Start server
async function main() {
  try {
    const server = new PalaceWebServer(options);
    await server.start();

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.gray('\nShutting down...'));
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log(chalk.gray('\nShutting down...'));
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(chalk.red(`Error: Port ${options.port} is already in use`));
      console.log(chalk.gray(`Try: palace-web --port ${options.port + 1}`));
    } else {
      console.error(chalk.red('Failed to start server:'), error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

main();
