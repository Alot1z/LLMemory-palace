/**
 * LLMemory-Palace API Routes
 * RESTful API endpoints for Palace operations
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { Palace } from '../../lib/palace.js';
import { GenomeEncoder } from '../../lib/genome.js';
import { PatternLibrary } from '../../lib/patterns.js';
import { BehaviorGraph } from '../../lib/flows.js';
import { Reconstructor } from '../../lib/reconstructor.js';
import {
  validatePath,
  sanitizeString,
  ValidationError
} from '../../lib/cli-validator.js';

export function createApiRouter(server) {
  const router = express.Router();

  // Get Palace instance
  const getPalace = () => server.getPalace();

  // ============================================
  // Status & Health
  // ============================================

  router.get('/status', async (req, res) => {
    try {
      const palace = getPalace();
      const status = await palace.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '3.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // ============================================
  // Scanning & Analysis
  // ============================================

  router.post('/scan', async (req, res) => {
    try {
      const palace = getPalace();
      const result = await palace.scan();
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get('/files', async (req, res) => {
    try {
      const palace = getPalace();
      const files = Array.from(palace.files.values()).map(f => ({
        path: f.path,
        language: f.language,
        lines: f.lines,
        size: f.size,
        hash: f.hash,
        patterns: f.patterns?.length || 0,
        flows: f.flows?.length || 0
      }));
      res.json({
        success: true,
        data: files
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get('/files/:filePath(*)', async (req, res) => {
    try {
      const palace = getPalace();
      const filePath = decodeURIComponent(req.params.filePath);
      const file = palace.files.get(path.resolve(filePath));

      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      res.json({
        success: true,
        data: {
          path: file.path,
          language: file.language,
          lines: file.lines,
          size: file.size,
          hash: file.hash,
          patterns: file.patterns,
          flows: file.flows,
          content: file.content
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // Patterns
  // ============================================

  router.get('/patterns', async (req, res) => {
    try {
      const palace = getPalace();
      const patterns = await palace.getPatterns();
      res.json({
        success: true,
        data: Object.entries(patterns).map(([name, pattern]) => ({
          name,
          instances: pattern.instances?.length || 0,
          template: pattern.template?.substring(0, 100) + '...'
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get('/patterns/:patternName', async (req, res) => {
    try {
      const palace = getPalace();
      const patterns = await palace.getPatterns();
      const pattern = patterns[req.params.patternName];

      if (!pattern) {
        return res.status(404).json({
          success: false,
          error: 'Pattern not found'
        });
      }

      res.json({
        success: true,
        data: pattern
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // Flows (Behavior Graphs)
  // ============================================

  router.get('/flows', async (req, res) => {
    try {
      const palace = getPalace();
      const flows = await palace.getFlows();
      res.json({
        success: true,
        data: Object.entries(flows).map(([name, flow]) => ({
          name,
          steps: flow.steps,
          returns: flow.returns
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get('/flows/:flowName', async (req, res) => {
    try {
      const palace = getPalace();
      const flows = await palace.getFlows();
      const flow = flows[req.params.flowName];

      if (!flow) {
        return res.status(404).json({
          success: false,
          error: 'Flow not found'
        });
      }

      res.json({
        success: true,
        data: flow
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // Export & Genome
  // ============================================

  router.post('/export', async (req, res) => {
    try {
      const palace = getPalace();
      const options = {
        format: req.body.format || 'cxml',
        level: parseInt(req.body.level) || 3,
        compress: req.body.compress || false
      };

      const result = await palace.export(options);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get('/genome', async (req, res) => {
    try {
      const palace = getPalace();
      const genome = await palace.generateGenome();
      res.json({
        success: true,
        data: {
          genome,
          length: genome.length,
          compressionRatio: palace.getCompressionRatio()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // Complexity & Dependencies
  // ============================================

  router.get('/complexity', async (req, res) => {
    try {
      const palace = getPalace();
      const complexity = await palace.analyzeComplexity();
      res.json({
        success: true,
        data: complexity
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get('/dependencies', async (req, res) => {
    try {
      const palace = getPalace();
      const deps = await palace.analyzeDependencies();
      res.json({
        success: true,
        data: deps
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // Pack & Merge
  // ============================================

  router.post('/pack', async (req, res) => {
    try {
      const palace = getPalace();
      const pack = await palace.createPack();
      res.json({
        success: true,
        data: pack
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.post('/merge', async (req, res) => {
    try {
      const palace = getPalace();
      const pack = req.body.pack;
      const outputDir = req.body.outputDir || './merged';

      if (!pack) {
        return res.status(400).json({
          success: false,
          error: 'Pack data required'
        });
      }

      const result = await palace.mergePack(pack, outputDir);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // Query
  // ============================================

  router.post('/query', async (req, res) => {
    try {
      const palace = getPalace();
      const query = sanitizeString(req.body.query, { maxLength: 1000 });

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query required'
        });
      }

      const result = await palace.query(query);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // Rebuild
  // ============================================

  router.post('/rebuild', async (req, res) => {
    try {
      const reconstructor = new Reconstructor();
      const genomeData = req.body.genome;

      if (!genomeData) {
        return res.status(400).json({
          success: false,
          error: 'Genome data required'
        });
      }

      const result = await reconstructor.rebuildFromData(genomeData);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // Statistics
  // ============================================

  router.get('/stats', async (req, res) => {
    try {
      const palace = getPalace();
      const status = await palace.getStatus();
      const complexity = await palace.analyzeComplexity();
      const deps = await palace.analyzeDependencies();

      // Language breakdown
      const languages = {};
      for (const [_, file] of palace.files) {
        languages[file.language] = (languages[file.language] || 0) + 1;
      }

      res.json({
        success: true,
        data: {
          status,
          complexity,
          dependencies: {
            total: deps.total,
            cycles: deps.cycles
          },
          languages,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

export default createApiRouter;
