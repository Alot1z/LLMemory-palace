/**
 * LLMemory-Palace v3.0 - Semantic Hash
 *
 * Provides semantic hashing for deduplication and compression.
 * Direct port from v2.6.0 with TypeScript interfaces.
 *
 * @module core/semantic-hash
 * @version 3.0.0
 */
import { createHash } from 'crypto';
/**
 * SemanticHash provides deterministic short hashes for identifiers
 * and supports compression/decompression by replacing names with hashes.
 *
 * @example
 * ```typescript
 * const hasher = new SemanticHash();
 * const hash = hasher.hash('UserService'); // 'A1B2C3D4'
 * const original = hasher.resolve('A1B2C3D4'); // 'UserService'
 * ```
 */
export class SemanticHash {
    hashTable;
    reverseTable;
    constructor() {
        this.hashTable = new Map();
        this.reverseTable = new Map();
    }
    /**
     * Generate a semantic hash for a name/string
     *
     * @param name - The identifier to hash
     * @returns 8-character uppercase hex hash
     *
     * @example
     * ```typescript
     * hasher.hash('MyClass'); // 'A1B2C3D4'
     * hasher.hash('MyClass'); // 'A1B2C3D4' (cached)
     * ```
     */
    hash(name) {
        // Check cache first
        if (this.hashTable.has(name)) {
            return this.hashTable.get(name);
        }
        // Generate short hash (8 chars from SHA256)
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
     *
     * @param hashCode - The 8-character hash to resolve
     * @returns The original name or null if not found
     */
    resolve(hashCode) {
        return this.reverseTable.get(hashCode) || null;
    }
    /**
     * Compress content by replacing identifiers with hash references
     *
     * @param content - The content to compress
     * @returns Content with identifiers replaced by #HASH references
     *
     * @example
     * ```typescript
     * const compressed = hasher.compress('UserService.getUser()');
     * // '#A1B2C3D4.getUser()'
     * ```
     */
    compress(content) {
        let compressed = content;
        // Find all PascalCase/CamelCase identifiers
        const identifierRegex = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
        let match;
        while ((match = identifierRegex.exec(content)) !== null) {
            const identifier = match[1];
            if (!identifier)
                continue;
            // Skip very short identifiers (not worth hashing)
            if (identifier.length <= 3)
                continue;
            const hashCode = this.hash(identifier);
            // Only replace if we save space
            if (identifier.length > hashCode.length + 1) { // +1 for # prefix
                compressed = compressed.replace(new RegExp(`\\b${this.escapeRegex(identifier)}\\b`, 'g'), `#${hashCode}`);
            }
        }
        return compressed;
    }
    /**
     * Decompress content by replacing hash references with original names
     *
     * @param content - The compressed content
     * @returns Content with hash references replaced by original identifiers
     *
     * @example
     * ```typescript
     * const decompressed = hasher.decompress('#A1B2C3D4.getUser()');
     * // 'UserService.getUser()'
     * ```
     */
    decompress(content) {
        let decompressed = content;
        // Find all hash references (#XXXXXXXX)
        const hashRegex = /#([A-F0-9]{8})/g;
        let match;
        while ((match = hashRegex.exec(content)) !== null) {
            const hashCode = match[1];
            if (!hashCode)
                continue;
            const originalName = this.resolve(hashCode);
            if (originalName) {
                decompressed = decompressed.replace(`#${hashCode}`, originalName);
            }
        }
        return decompressed;
    }
    /**
     * Get the hash table as a plain object for serialization
     *
     * @returns Hash table mapping names to hashes
     */
    getHashTable() {
        return Object.fromEntries(this.hashTable);
    }
    /**
     * Get the reverse table as a plain object
     *
     * @returns Reverse table mapping hashes to names
     */
    getReverseTable() {
        return Object.fromEntries(this.reverseTable);
    }
    /**
     * Load a hash table (for deserialization)
     *
     * @param table - Hash table to load
     */
    loadHashTable(table) {
        for (const [name, hash] of Object.entries(table)) {
            this.hashTable.set(name, hash);
            this.reverseTable.set(hash, name);
        }
    }
    /**
     * Load a reverse table (alternative to loadHashTable)
     *
     * @param table - Reverse table to load
     */
    loadReverseTable(table) {
        for (const [hash, name] of Object.entries(table)) {
            this.reverseTable.set(hash, name);
            this.hashTable.set(name, hash);
        }
    }
    /**
     * Find similar strings using hash prefixes
     *
     * @param name - The name to find similar strings for
     * @param threshold - Minimum number of matching hash characters (default: 2)
     * @returns Array of similar names sorted by similarity
     *
     * @example
     * ```typescript
     * const similar = hasher.findSimilar('UserService', 3);
     * // [{ name: 'UserController', hash: 'A1B2C3D5', similarity: 4 }]
     * ```
     */
    findSimilar(name, threshold = 2) {
        const hash1 = this.hash(name);
        const similar = [];
        for (const [existingName, existingHash] of this.hashTable) {
            // Count matching characters
            let matches = 0;
            for (let i = 0; i < Math.min(hash1.length, existingHash.length); i++) {
                if (hash1[i] === existingHash[i])
                    matches++;
            }
            if (matches >= threshold && existingName !== name) {
                similar.push({
                    name: existingName,
                    hash: existingHash,
                    similarity: matches
                });
            }
        }
        return similar.sort((a, b) => b.similarity - a.similarity);
    }
    /**
     * Check if a hash exists in the table
     *
     * @param hashCode - The hash to check
     * @returns True if the hash exists
     */
    hasHash(hashCode) {
        return this.reverseTable.has(hashCode);
    }
    /**
     * Check if a name exists in the table
     *
     * @param name - The name to check
     * @returns True if the name has been hashed
     */
    hasName(name) {
        return this.hashTable.has(name);
    }
    /**
     * Get the number of hashed items
     *
     * @returns Number of unique hashes
     */
    get size() {
        return this.hashTable.size;
    }
    /**
     * Clear all hashes
     */
    clear() {
        this.hashTable.clear();
        this.reverseTable.clear();
    }
    /**
     * Export both tables for persistence
     *
     * @returns Object containing both hash and reverse tables
     */
    export() {
        return {
            hashTable: this.getHashTable(),
            reverseTable: this.getReverseTable()
        };
    }
    /**
     * Import tables from a previous export
     *
     * @param data - Exported data to import
     */
    import(data) {
        this.loadHashTable(data.hashTable);
        if (data.reverseTable) {
            this.loadReverseTable(data.reverseTable);
        }
    }
    /**
     * Batch hash multiple names
     *
     * @param names - Names to hash
     * @returns Map of names to hashes
     */
    batchHash(names) {
        const results = new Map();
        for (const name of names) {
            results.set(name, this.hash(name));
        }
        return results;
    }
    /**
     * Batch resolve multiple hashes
     *
     * @param hashes - Hashes to resolve
     * @returns Map of hashes to names (null if not found)
     */
    batchResolve(hashes) {
        const results = new Map();
        for (const hash of hashes) {
            results.set(hash, this.resolve(hash));
        }
        return results;
    }
    /**
     * Escape special regex characters
     * @private
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
export default SemanticHash;
//# sourceMappingURL=semantic-hash.js.map