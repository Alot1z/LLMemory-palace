/**
 * Binary Format - Optimized binary genome format
 * Phase 4: Binary Format
 */
import { SemanticHash } from '../core/semantic-hash.js';
import { PatternLibrary } from '../patterns/pattern-library.js';
export var ChunkType;
(function (ChunkType) {
    ChunkType[ChunkType["HEADER"] = 1] = "HEADER";
    ChunkType[ChunkType["FILE_INDEX"] = 2] = "FILE_INDEX";
    ChunkType[ChunkType["SYMBOL_TABLE"] = 3] = "SYMBOL_TABLE";
    ChunkType[ChunkType["PATTERN_TABLE"] = 4] = "PATTERN_TABLE";
    ChunkType[ChunkType["STRING_POOL"] = 5] = "STRING_POOL";
    ChunkType[ChunkType["SOURCE_DATA"] = 6] = "SOURCE_DATA";
    ChunkType[ChunkType["METADATA"] = 7] = "METADATA";
    ChunkType[ChunkType["FOOTER"] = 8] = "FOOTER";
})(ChunkType || (ChunkType = {}));
const MAGIC_NUMBER = 0x4C4C4D50; // 'LLMP'
const CURRENT_VERSION = 0x03;
const DEFAULT_CONFIG = {
    version: CURRENT_VERSION,
    compression: true,
    checksumEnabled: true,
    stringEncoding: 'utf8',
    alignment: 8
};
export class BinaryFormat {
    config;
    hashUtil;
    patterns;
    stringPool;
    buffer;
    offset;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.hashUtil = new SemanticHash();
        this.patterns = new PatternLibrary();
        this.stringPool = new Map();
        this.buffer = Buffer.alloc(1024 * 1024); // 1MB initial
        this.offset = 0;
    }
    // Encoding
    async encode(index) {
        this.reset();
        // Convert CodeIndex to internal format
        const binaryIndex = this.convertToBinaryIndex(index);
        // Write header
        this.writeHeader();
        // Build string pool
        this.buildStringPool(binaryIndex);
        // Write string pool
        this.writeStringPool();
        // Write file index
        this.writeFileIndex(binaryIndex);
        // Write symbol table
        this.writeSymbolTable(binaryIndex);
        // Write pattern table
        this.writePatternTable(binaryIndex);
        // Write source data
        this.writeSourceData(binaryIndex);
        // Write metadata
        this.writeMetadata(binaryIndex);
        // Write footer
        this.writeFooter();
        return this.buffer.slice(0, this.offset);
    }
    convertToBinaryIndex(index) {
        const files = new Map();
        for (const file of index.files) {
            const symbols = file.analysis.symbols.map(s => ({
                name: s.name,
                kind: s.type,
                hash: file.hash,
                signature: s.signature,
                location: { line: s.line, column: 0 }
            }));
            files.set(file.path, {
                path: file.path,
                hash: file.hash,
                symbols,
                imports: file.analysis.dependencies.map(d => d.to),
                exports: [],
                dependencies: file.analysis.dependencies.map(d => d.to)
            });
        }
        return {
            files,
            patterns: index.patterns.map(p => ({
                name: p.name,
                hash: '',
                template: p.pattern,
                description: undefined,
                frequency: 0,
                occurrences: []
            })),
            behaviors: [],
            metadata: {}
        };
    }
    reset() {
        this.stringPool.clear();
        this.offset = 0;
        this.buffer = Buffer.alloc(1024 * 1024);
    }
    writeHeader() {
        this.writeUInt32(MAGIC_NUMBER);
        this.writeUInt16(this.config.version);
        this.writeUInt16(0); // flags
        this.writeUInt64(BigInt(Date.now()));
        this.writeUInt32(0); // checksum (filled later)
        this.writeUInt32(0); // index offset (filled later)
        this.writeUInt32(0); // data offset (filled later)
        this.align(this.config.alignment);
    }
    buildStringPool(index) {
        let id = 0;
        for (const [path] of index.files) {
            if (!this.stringPool.has(path)) {
                this.stringPool.set(path, id++);
            }
        }
        for (const file of index.files.values()) {
            for (const symbol of file.symbols) {
                if (!this.stringPool.has(symbol.name)) {
                    this.stringPool.set(symbol.name, id++);
                }
                if (symbol.signature && !this.stringPool.has(symbol.signature)) {
                    this.stringPool.set(symbol.signature, id++);
                }
            }
        }
        for (const pattern of index.patterns) {
            if (!this.stringPool.has(pattern.name)) {
                this.stringPool.set(pattern.name, id++);
            }
        }
    }
    writeStringPool() {
        const strings = Array.from(this.stringPool.entries())
            .sort((a, b) => a[1] - b[1])
            .map(([str]) => str);
        this.writeChunkHeader(ChunkType.STRING_POOL, 0);
        this.writeUInt32(strings.length);
        for (const str of strings) {
            this.writeString(str);
        }
        this.updateChunkLength();
    }
    writeFileIndex(index) {
        this.writeChunkHeader(ChunkType.FILE_INDEX, 0);
        this.writeUInt32(index.files.size);
        for (const [path, file] of index.files) {
            this.writeStringRef(path);
            this.writeStringRef(file.hash);
            this.writeUInt32(file.symbols.length);
            this.writeUInt32(file.imports.length);
            this.writeUInt32(file.exports.length);
        }
        this.updateChunkLength();
    }
    writeSymbolTable(index) {
        this.writeChunkHeader(ChunkType.SYMBOL_TABLE, 0);
        let count = 0;
        for (const file of index.files.values()) {
            count += file.symbols.length;
        }
        this.writeUInt32(count);
        for (const file of index.files.values()) {
            for (const symbol of file.symbols) {
                this.writeStringRef(symbol.name);
                this.writeByte(this.symbolKindToByte(symbol.kind));
                this.writeStringRef(symbol.hash);
                this.writeStringRef(symbol.signature || '');
                this.writeUInt32(symbol.location?.line || 0);
                this.writeUInt32(symbol.location?.column || 0);
            }
        }
        this.updateChunkLength();
    }
    writePatternTable(index) {
        this.writeChunkHeader(ChunkType.PATTERN_TABLE, 0);
        this.writeUInt32(index.patterns.length);
        for (const pattern of index.patterns) {
            this.writeStringRef(pattern.name);
            this.writeStringRef(pattern.hash);
            this.writeStringRef(pattern.template || '');
            this.writeStringRef(pattern.description || '');
            this.writeUInt32(pattern.frequency || 0);
        }
        this.updateChunkLength();
    }
    writeSourceData(_index) {
        this.writeChunkHeader(ChunkType.SOURCE_DATA, 0);
        // Placeholder - would contain actual compressed source data
        this.writeUInt32(0);
        this.updateChunkLength();
    }
    writeMetadata(index) {
        this.writeChunkHeader(ChunkType.METADATA, 0);
        const metadata = index.metadata || {};
        const keys = Object.keys(metadata);
        this.writeUInt32(keys.length);
        for (const key of keys) {
            this.writeString(key);
            this.writeString(JSON.stringify(metadata[key]));
        }
        this.updateChunkLength();
    }
    writeFooter() {
        this.writeChunkHeader(ChunkType.FOOTER, 0);
        this.writeUInt32(MAGIC_NUMBER); // EOF marker
        this.updateChunkLength();
    }
    // Decoding
    async decode(buffer) {
        this.buffer = buffer;
        this.offset = 0;
        // Read and validate header
        const header = this.readHeader();
        if (header.magic !== MAGIC_NUMBER) {
            throw new Error('Invalid binary format: bad magic number');
        }
        // Read string pool
        this.readStringPool();
        // Read file index
        const index = this.readFileIndex();
        // Read symbol table
        this.readSymbolTable(index);
        // Read pattern table
        this.readPatternTable(index);
        // Read metadata
        this.readMetadata(index);
        return index;
    }
    readHeader() {
        return {
            magic: this.readUInt32(),
            version: this.readUInt16(),
            flags: this.readUInt16(),
            timestamp: Number(this.readUInt64()),
            checksum: this.readUInt32(),
            indexOffset: this.readUInt32(),
            dataOffset: this.readUInt32(),
            totalSize: this.readUInt32()
        };
    }
    readStringPool() {
        const _chunkType = this.readByte();
        const chunkLength = this.readUInt32();
        const startOffset = this.offset;
        const count = this.readUInt32();
        for (let i = 0; i < count; i++) {
            this.stringPool.set(this.readString(), i);
        }
        this.offset = startOffset + chunkLength;
    }
    readFileIndex() {
        const count = this.readUInt32();
        const index = {
            files: new Map(),
            patterns: [],
            behaviors: [],
            metadata: {}
        };
        for (let i = 0; i < count; i++) {
            const path = this.readStringRef();
            const hash = this.readStringRef();
            const symbolCount = this.readUInt32();
            const importCount = this.readUInt32();
            const exportCount = this.readUInt32();
            index.files.set(path, {
                path,
                hash,
                symbols: [],
                imports: new Array(importCount).fill(''),
                exports: new Array(exportCount).fill(''),
                dependencies: []
            });
        }
        return index;
    }
    readSymbolTable(index) {
        const count = this.readUInt32();
        for (let _i = 0; _i < count; _i++) {
            const name = this.readStringRef();
            const kind = this.byteToSymbolKind(this.readByte());
            const hash = this.readStringRef();
            const signature = this.readStringRef();
            const line = this.readUInt32();
            const column = this.readUInt32();
            // Find the file this symbol belongs to (simplified)
            for (const file of index.files.values()) {
                if (file.symbols.length < 100) { // Prevent infinite loop
                    file.symbols.push({
                        name,
                        kind,
                        hash,
                        signature,
                        location: { line, column }
                    });
                    break;
                }
            }
        }
    }
    readPatternTable(index) {
        const count = this.readUInt32();
        for (let _i = 0; _i < count; _i++) {
            const name = this.readStringRef();
            const hash = this.readStringRef();
            const template = this.readStringRef();
            const description = this.readStringRef();
            const frequency = this.readUInt32();
            index.patterns.push({
                name,
                hash,
                template,
                description,
                frequency,
                occurrences: []
            });
        }
    }
    readMetadata(index) {
        const count = this.readUInt32();
        for (let _i = 0; _i < count; _i++) {
            const key = this.readString();
            const value = JSON.parse(this.readString());
            index.metadata[key] = value;
        }
    }
    // Low-level I/O
    writeByte(value) {
        this.ensureCapacity(1);
        this.buffer.writeUInt8(value & 0xFF, this.offset++);
    }
    readByte() {
        return this.buffer.readUInt8(this.offset++);
    }
    writeUInt16(value) {
        this.ensureCapacity(2);
        this.buffer.writeUInt16LE(value, this.offset);
        this.offset += 2;
    }
    readUInt16() {
        const value = this.buffer.readUInt16LE(this.offset);
        this.offset += 2;
        return value;
    }
    writeUInt32(value) {
        this.ensureCapacity(4);
        this.buffer.writeUInt32LE(value, this.offset);
        this.offset += 4;
    }
    readUInt32() {
        const value = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }
    writeUInt64(value) {
        this.ensureCapacity(8);
        this.buffer.writeBigUInt64LE(value, this.offset);
        this.offset += 8;
    }
    readUInt64() {
        const value = this.buffer.readBigUInt64LE(this.offset);
        this.offset += 8;
        return value;
    }
    writeString(value) {
        const buffer = Buffer.from(value, this.config.stringEncoding);
        this.writeUInt32(buffer.length);
        this.ensureCapacity(buffer.length);
        buffer.copy(this.buffer, this.offset);
        this.offset += buffer.length;
    }
    readString() {
        const length = this.readUInt32();
        const value = this.buffer.toString(this.config.stringEncoding, this.offset, this.offset + length);
        this.offset += length;
        return value;
    }
    writeStringRef(value) {
        const id = this.stringPool.get(value);
        if (id === undefined) {
            throw new Error(`String not in pool: ${value}`);
        }
        this.writeUInt32(id);
    }
    readStringRef() {
        const id = this.readUInt32();
        const entry = Array.from(this.stringPool.entries())
            .find(([_, i]) => i === id);
        return entry ? entry[0] : '';
    }
    writeChunkHeader(type, length) {
        this.writeByte(type);
        this.writeUInt32(length);
        this.writeUInt32(0); // checksum placeholder
    }
    updateChunkLength() {
        // Update the length field of the current chunk
        // (implementation simplified)
    }
    align(bytes) {
        const remainder = this.offset % bytes;
        if (remainder > 0) {
            this.offset += bytes - remainder;
        }
    }
    ensureCapacity(bytes) {
        if (this.offset + bytes > this.buffer.length) {
            const newBuffer = Buffer.alloc(this.buffer.length * 2);
            this.buffer.copy(newBuffer);
            this.buffer = newBuffer;
        }
    }
    symbolKindToByte(kind) {
        const kinds = {
            function: 1,
            class: 2,
            interface: 3,
            type: 4,
            constant: 5,
            variable: 6,
            method: 7,
            property: 8
        };
        return kinds[kind] || 0;
    }
    byteToSymbolKind(byte) {
        const kinds = {
            1: 'function',
            2: 'class',
            3: 'interface',
            4: 'type',
            5: 'constant',
            6: 'variable',
            7: 'method',
            8: 'property'
        };
        return kinds[byte] || 'function';
    }
    // Utility methods
    getFormatInfo() {
        return {
            version: this.config.version,
            features: [
                this.config.compression ? 'compression' : null,
                this.config.checksumEnabled ? 'checksums' : null,
                `encoding:${this.config.stringEncoding}`,
                `alignment:${this.config.alignment}`
            ].filter(Boolean)
        };
    }
    estimateSize(index) {
        let size = 64; // header
        for (const file of index.files) {
            size += Buffer.byteLength(file.path) + 4;
            size += Buffer.byteLength(file.hash) + 4;
        }
        for (const pattern of index.patterns) {
            size += Buffer.byteLength(pattern.name) + 4;
            size += Buffer.byteLength(pattern.pattern) + 4;
        }
        return size;
    }
}
export function createBinaryFormat(config) {
    return new BinaryFormat(config);
}
//# sourceMappingURL=binary-format.js.map