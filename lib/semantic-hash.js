/**
 * LLMemory-Palace v25.0 - Semantic Hash
 * Provides semantic hashing for deduplication
 */

import { createHash } from 'crypto';

export class SemanticHash {
  constructor() {
    this.hashTable = new Map();
    this.reverseTable = new Map();
  }

  /**
   * Generate a semantic hash for a name/string
   */
  hash(name) {
    // Check cache first
    if (this.hashTable.has(name)) {
      return this.hashTable.get(name);
    }

    // Generate short hash
    const fullHash = createHash('sha256')
      .update(name)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();

    this.hashTable.set(name, fullHash);
    this.reverseTable.set(fullHash, name);

    return fullHash;
  }

  /**
   * Resolve a hash back to its original name
   */
  resolve(hashCode) {
    return this.reverseTable.get(hashCode) || null;
  }

  /**
   * Compress content by replacing names with hashes
   */
  compress(content) {
    let compressed = content;

    // Find all identifier-like strings
    const identifierRegex = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
    let match;

    while ((match = identifierRegex.exec(content)) !== null) {
      const identifier = match[1];
      
      // Skip very short identifiers (not worth hashing)
      if (identifier.length <= 3) continue;

      const hashCode = this.hash(identifier);
      
      // Only replace if we save space
      if (identifier.length > hashCode.length) {
        compressed = compressed.replace(new RegExp(`\\b${identifier}\\b`, 'g'), `#${hashCode}`);
      }
    }

    return compressed;
  }

  /**
   * Decompress content by replacing hashes with names
   */
  decompress(content) {
    let decompressed = content;

    // Find all hash references
    const hashRegex = /#([A-F0-9]{8})/g;
    let match;

    while ((match = hashRegex.exec(content)) !== null) {
      const hashCode = match[1];
      const originalName = this.resolve(hashCode);
      
      if (originalName) {
        decompressed = decompressed.replace(`#${hashCode}`, originalName);
      }
    }

    return decompressed;
  }

  /**
   * Get the hash table for serialization
   */
  getHashTable() {
    return Object.fromEntries(this.hashTable);
  }

  /**
   * Load a hash table
   */
  loadHashTable(table) {
    for (const [name, hash] of Object.entries(table)) {
      this.hashTable.set(name, hash);
      this.reverseTable.set(hash, name);
    }
  }

  /**
   * Find similar strings using hash prefixes
   */
  findSimilar(name, threshold = 2) {
    const hash1 = this.hash(name);
    const similar = [];

    for (const [existingName, existingHash] of this.hashTable) {
      // Count matching characters
      let matches = 0;
      for (let i = 0; i < Math.min(hash1.length, existingHash.length); i++) {
        if (hash1[i] === existingHash[i]) matches++;
      }

      if (matches >= threshold && existingName !== name) {
        similar.push({ name: existingName, hash: existingHash, similarity: matches });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity);
  }
}
