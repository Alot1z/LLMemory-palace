/**
 * Binary Format - Optimized binary genome format
 * Phase 4: Binary Format
 */
import type { CodeIndex } from '../types.js';
export interface BinaryFormatConfig {
    version: number;
    compression: boolean;
    checksumEnabled: boolean;
    stringEncoding: 'utf8' | 'utf16le' | 'ascii';
    alignment: 4 | 8 | 16;
}
export interface BinaryHeader {
    magic: number;
    version: number;
    flags: number;
    timestamp: number;
    checksum: number;
    indexOffset: number;
    dataOffset: number;
    totalSize: number;
}
export interface BinaryChunk {
    type: ChunkType;
    length: number;
    data: Buffer;
    checksum: number;
}
export declare enum ChunkType {
    HEADER = 1,
    FILE_INDEX = 2,
    SYMBOL_TABLE = 3,
    PATTERN_TABLE = 4,
    STRING_POOL = 5,
    SOURCE_DATA = 6,
    METADATA = 7,
    FOOTER = 8
}
interface BinaryIndex {
    files: Map<string, BinaryFileInfo>;
    patterns: BinaryPatternInfo[];
    behaviors: unknown[];
    metadata: Record<string, unknown>;
}
interface BinaryFileInfo {
    path: string;
    hash: string;
    symbols: BinarySymbolInfo[];
    imports: string[];
    exports: string[];
    dependencies: string[];
}
interface BinarySymbolInfo {
    name: string;
    kind: string;
    hash: string;
    signature?: string;
    location: {
        line: number;
        column: number;
    };
}
interface BinaryPatternInfo {
    name: string;
    hash: string;
    template?: string;
    description?: string;
    frequency?: number;
    occurrences?: {
        file: string;
        line: number;
    }[];
}
export declare class BinaryFormat {
    private config;
    private hashUtil;
    private patterns;
    private stringPool;
    private buffer;
    private offset;
    constructor(config?: Partial<BinaryFormatConfig>);
    encode(index: CodeIndex): Promise<Buffer>;
    private convertToBinaryIndex;
    private reset;
    private writeHeader;
    private buildStringPool;
    private writeStringPool;
    private writeFileIndex;
    private writeSymbolTable;
    private writePatternTable;
    private writeSourceData;
    private writeMetadata;
    private writeFooter;
    decode(buffer: Buffer): Promise<BinaryIndex>;
    private readHeader;
    private readStringPool;
    private readFileIndex;
    private readSymbolTable;
    private readPatternTable;
    private readMetadata;
    private writeByte;
    private readByte;
    private writeUInt16;
    private readUInt16;
    private writeUInt32;
    private readUInt32;
    private writeUInt64;
    private readUInt64;
    private writeString;
    private readString;
    private writeStringRef;
    private readStringRef;
    private writeChunkHeader;
    private updateChunkLength;
    private align;
    private ensureCapacity;
    private symbolKindToByte;
    private byteToSymbolKind;
    getFormatInfo(): {
        version: number;
        features: string[];
    };
    estimateSize(index: CodeIndex): number;
}
export declare function createBinaryFormat(config?: Partial<BinaryFormatConfig>): BinaryFormat;
export {};
//# sourceMappingURL=binary-format.d.ts.map