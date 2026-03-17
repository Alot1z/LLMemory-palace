/**
 * LLMemory-Palace v3.0 - Semantic Hash
 *
 * Provides semantic hashing for deduplication and compression.
 * Direct port from v2.6.0 with TypeScript interfaces.
 *
 * @module core/semantic-hash
 * @version 3.0.0
 */
import type { HashTable, ReverseTable, SimilarityResult } from '../types.js';
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
export declare class SemanticHash {
    private hashTable;
    private reverseTable;
    constructor();
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
    hash(name: string): string;
    /**
     * Resolve a hash back to its original name
     *
     * @param hashCode - The 8-character hash to resolve
     * @returns The original name or null if not found
     */
    resolve(hashCode: string): string | null;
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
    compress(content: string): string;
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
    decompress(content: string): string;
    /**
     * Get the hash table as a plain object for serialization
     *
     * @returns Hash table mapping names to hashes
     */
    getHashTable(): HashTable;
    /**
     * Get the reverse table as a plain object
     *
     * @returns Reverse table mapping hashes to names
     */
    getReverseTable(): ReverseTable;
    /**
     * Load a hash table (for deserialization)
     *
     * @param table - Hash table to load
     */
    loadHashTable(table: HashTable): void;
    /**
     * Load a reverse table (alternative to loadHashTable)
     *
     * @param table - Reverse table to load
     */
    loadReverseTable(table: ReverseTable): void;
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
    findSimilar(name: string, threshold?: number): SimilarityResult[];
    /**
     * Check if a hash exists in the table
     *
     * @param hashCode - The hash to check
     * @returns True if the hash exists
     */
    hasHash(hashCode: string): boolean;
    /**
     * Check if a name exists in the table
     *
     * @param name - The name to check
     * @returns True if the name has been hashed
     */
    hasName(name: string): boolean;
    /**
     * Get the number of hashed items
     *
     * @returns Number of unique hashes
     */
    get size(): number;
    /**
     * Clear all hashes
     */
    clear(): void;
    /**
     * Export both tables for persistence
     *
     * @returns Object containing both hash and reverse tables
     */
    export(): {
        hashTable: HashTable;
        reverseTable: ReverseTable;
    };
    /**
     * Import tables from a previous export
     *
     * @param data - Exported data to import
     */
    import(data: {
        hashTable: HashTable;
        reverseTable?: ReverseTable;
    }): void;
    /**
     * Batch hash multiple names
     *
     * @param names - Names to hash
     * @returns Map of names to hashes
     */
    batchHash(names: string[]): Map<string, string>;
    /**
     * Batch resolve multiple hashes
     *
     * @param hashes - Hashes to resolve
     * @returns Map of hashes to names (null if not found)
     */
    batchResolve(hashes: string[]): Map<string, string | null>;
    /**
     * Escape special regex characters
     * @private
     */
    private escapeRegex;
}
export default SemanticHash;
//# sourceMappingURL=semantic-hash.d.ts.map