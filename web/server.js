/**
 * LLMemory-Palace Web Server
 * Express-based web interface for Palace operations
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Palace } from '../lib/palace.js';
import { GenomeEncoder } from '../lib/genome.js';
import { PatternLibrary } from '../lib/patterns.js';
import { BehaviorGraph } from '../lib/flows.js';
import { Reconstructor } from '../lib/reconstructor.js';
import { createApiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PalaceWebServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.projectPath = options.projectPath || process.cwd();
    this.app = express();
    this.palace = null;
    this.server = null;
    
    this._setupMiddleware();
    this._setupRoutes();
  }

  _setupMiddleware() {
    // Enable CORS
    this.app.use(cors());

    // Parse JSON bodies
    this.app.use(express.json({ limit: '50mb' }));

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
      next();
    });

    // Static files
    const publicPath = path.join(__dirname, 'public');
    this.app.use(express.static(publicPath));
  }

  _setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '3.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // API routes
    const apiRouter = createApiRouter(this);
    this.app.use('/api', apiRouter);

    // SPA fallback - serve index.html for all non-API routes
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Error handling
    this.app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({
        error: err.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });
  }

  async initialize() {
    console.log('Initializing Palace...');
    this.palace = new Palace(this.projectPath);
    await this.palace.scan();
    console.log('Palace initialized successfully');
    return this.palace;
  }

  async start() {
    await this.initialize();

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, this.host, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  LLMemory-Palace Web Server v3.0.0                              
║                                                                  
║  Server running at: http://${this.host}:${this.port}                   
║  API endpoint:      http://${this.host}:${this.port}/api              
║  Health check:      http://${this.host}:${this.port}/health          
║                                                                  
║  Press Ctrl+C to stop                                            
╚══════════════════════════════════════════════════════════════════╝
        `);
        resolve(this.server);
      });

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use`));
        } else {
          reject(err);
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Server stopped');
            resolve();
          }
        });
      });
    }
  }

  getPalace() {
    return this.palace;
  }

  getApp() {
    return this.app;
  }
}

export default PalaceWebServer;
