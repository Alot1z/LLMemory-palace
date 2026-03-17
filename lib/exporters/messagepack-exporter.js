/**
 * MessagePack Exporter - Binary serialization for palace data
 * Task 006: Export Formats
 * 
 * Uses a lightweight MessagePack-inspired binary format for efficient
 * serialization of palace data structures.
 */

// MessagePack format markers
const FORMAT = {
  // Positive fixint (0x00 - 0x7f)
  POSITIVE_FIXINT_MAX: 0x7f,
  // Negative fixint (0xe0 - 0xff)
  NEGATIVE_FIXINT_MIN: 0xe0,
  // Fixmap (0x80 - 0x8f)
  FIXMAP: 0x80,
  // Fixarray (0x90 - 0x9f)
  FIXARRAY: 0x90,
  // Fixstr (0xa0 - 0xbf)
  FIXSTR: 0xa0,
  // nil
  NIL: 0xc0,
  // false
  FALSE: 0xc2,
  // true
  TRUE: 0xc3,
  // bin 8
  BIN8: 0xc4,
  // bin 16
  BIN16: 0xc5,
  // bin 32
  BIN32: 0xc6,
  // float 32
  FLOAT32: 0xca,
  // float 64
  FLOAT64: 0xcb,
  // uint 8
  UINT8: 0xcc,
  // uint 16
  UINT16: 0xcd,
  // uint 32
  UINT32: 0xce,
  // uint 64
  UINT64: 0xcf,
  // int 8
  INT8: 0xd0,
  // int 16
  INT16: 0xd1,
  // int 32
  INT32: 0xd2,
  // int 64
  INT64: 0xd3,
  // str 8
  STR8: 0xd9,
  // str 16
  STR16: 0xda,
  // str 32
  STR32: 0xdb,
  // array 16
  ARRAY16: 0xdc,
  // array 32
  ARRAY32: 0xdd,
  // map 16
  MAP16: 0xde,
  // map 32
  MAP32: 0xdf
};

/**
 * MessagePack Encoder
 */
class Encoder {
  constructor() {
    this.buffer = Buffer.alloc(1024 * 1024); // 1MB initial
    this.offset = 0;
  }

  ensureCapacity(bytes) {
    if (this.offset + bytes > this.buffer.length) {
      const newBuffer = Buffer.alloc(this.buffer.length * 2);
      this.buffer.copy(newBuffer);
      this.buffer = newBuffer;
    }
  }

  writeByte(byte) {
    this.ensureCapacity(1);
    this.buffer.writeUInt8(byte, this.offset++);
  }

  writeUInt16(value) {
    this.ensureCapacity(2);
    this.buffer.writeUInt16BE(value, this.offset);
    this.offset += 2;
  }

  writeUInt32(value) {
    this.ensureCapacity(4);
    this.buffer.writeUInt32BE(value, this.offset);
    this.offset += 4;
  }

  writeUInt64(value) {
    this.ensureCapacity(8);
    this.buffer.writeBigUInt64BE(BigInt(value), this.offset);
    this.offset += 8;
  }

  writeInt8(value) {
    this.ensureCapacity(1);
    this.buffer.writeInt8(value, this.offset++);
  }

  writeInt16(value) {
    this.ensureCapacity(2);
    this.buffer.writeInt16BE(value, this.offset);
    this.offset += 2;
  }

  writeInt32(value) {
    this.ensureCapacity(4);
    this.buffer.writeInt32BE(value, this.offset);
    this.offset += 4;
  }

  writeFloat32(value) {
    this.ensureCapacity(4);
    this.buffer.writeFloatBE(value, this.offset);
    this.offset += 4;
  }

  writeFloat64(value) {
    this.ensureCapacity(8);
    this.buffer.writeDoubleBE(value, this.offset);
    this.offset += 8;
  }

  writeBytes(bytes) {
    this.ensureCapacity(bytes.length);
    bytes.copy(this.buffer, this.offset);
    this.offset += bytes.length;
  }

  encode(value) {
    if (value === null || value === undefined) {
      this.writeByte(FORMAT.NIL);
      return;
    }

    if (typeof value === 'boolean') {
      this.writeByte(value ? FORMAT.TRUE : FORMAT.FALSE);
      return;
    }

    if (typeof value === 'number') {
      this.encodeNumber(value);
      return;
    }

    if (typeof value === 'string') {
      this.encodeString(value);
      return;
    }

    if (Buffer.isBuffer(value)) {
      this.encodeBinary(value);
      return;
    }

    if (Array.isArray(value)) {
      this.encodeArray(value);
      return;
    }

    if (value instanceof Date) {
      this.encodeString(value.toISOString());
      return;
    }

    if (typeof value === 'object') {
      this.encodeMap(value);
      return;
    }

    // Fallback: convert to string
    this.encodeString(String(value));
  }

  encodeNumber(value) {
    if (Number.isInteger(value)) {
      if (value >= 0) {
        if (value <= FORMAT.POSITIVE_FIXINT_MAX) {
          this.writeByte(value);
        } else if (value <= 0xff) {
          this.writeByte(FORMAT.UINT8);
          this.writeByte(value);
        } else if (value <= 0xffff) {
          this.writeByte(FORMAT.UINT16);
          this.writeUInt16(value);
        } else if (value <= 0xffffffff) {
          this.writeByte(FORMAT.UINT32);
          this.writeUInt32(value);
        } else {
          this.writeByte(FORMAT.UINT64);
          this.writeUInt64(value);
        }
      } else {
        if (value >= -32) {
          this.writeByte(0x100 + value); // negative fixint
        } else if (value >= -128) {
          this.writeByte(FORMAT.INT8);
          this.writeInt8(value);
        } else if (value >= -32768) {
          this.writeByte(FORMAT.INT16);
          this.writeInt16(value);
        } else if (value >= -2147483648) {
          this.writeByte(FORMAT.INT32);
          this.writeInt32(value);
        } else {
          this.writeByte(FORMAT.INT64);
          this.writeUInt64(BigInt(value));
        }
      }
    } else {
      // Float
      this.writeByte(FORMAT.FLOAT64);
      this.writeFloat64(value);
    }
  }

  encodeString(value) {
    const bytes = Buffer.from(value, 'utf8');
    const length = bytes.length;

    if (length <= 31) {
      this.writeByte(FORMAT.FIXSTR | length);
    } else if (length <= 0xff) {
      this.writeByte(FORMAT.STR8);
      this.writeByte(length);
    } else if (length <= 0xffff) {
      this.writeByte(FORMAT.STR16);
      this.writeUInt16(length);
    } else {
      this.writeByte(FORMAT.STR32);
      this.writeUInt32(length);
    }

    this.writeBytes(bytes);
  }

  encodeBinary(value) {
    const length = value.length;

    if (length <= 0xff) {
      this.writeByte(FORMAT.BIN8);
      this.writeByte(length);
    } else if (length <= 0xffff) {
      this.writeByte(FORMAT.BIN16);
      this.writeUInt16(length);
    } else {
      this.writeByte(FORMAT.BIN32);
      this.writeUInt32(length);
    }

    this.writeBytes(value);
  }

  encodeArray(value) {
    const length = value.length;

    if (length <= 15) {
      this.writeByte(FORMAT.FIXARRAY | length);
    } else if (length <= 0xffff) {
      this.writeByte(FORMAT.ARRAY16);
      this.writeUInt16(length);
    } else {
      this.writeByte(FORMAT.ARRAY32);
      this.writeUInt32(length);
    }

    for (const item of value) {
      this.encode(item);
    }
  }

  encodeMap(value) {
    const keys = Object.keys(value);
    const length = keys.length;

    if (length <= 15) {
      this.writeByte(FORMAT.FIXMAP | length);
    } else if (length <= 0xffff) {
      this.writeByte(FORMAT.MAP16);
      this.writeUInt16(length);
    } else {
      this.writeByte(FORMAT.MAP32);
      this.writeUInt32(length);
    }

    for (const key of keys) {
      this.encodeString(key);
      this.encode(value[key]);
    }
  }

  getBuffer() {
    return this.buffer.slice(0, this.offset);
  }
}

/**
 * MessagePack Decoder
 */
class Decoder {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  readByte() {
    return this.buffer.readUInt8(this.offset++);
  }

  readUInt16() {
    const value = this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    return value;
  }

  readUInt32() {
    const value = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  readUInt64() {
    const value = Number(this.buffer.readBigUInt64BE(this.offset));
    this.offset += 8;
    return value;
  }

  readInt8() {
    return this.buffer.readInt8(this.offset++);
  }

  readInt16() {
    const value = this.buffer.readInt16BE(this.offset);
    this.offset += 2;
    return value;
  }

  readInt32() {
    const value = this.buffer.readInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  readFloat32() {
    const value = this.buffer.readFloatBE(this.offset);
    this.offset += 4;
    return value;
  }

  readFloat64() {
    const value = this.buffer.readDoubleBE(this.offset);
    this.offset += 8;
    return value;
  }

  readBytes(length) {
    const value = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  decode() {
    const byte = this.readByte();

    // Positive fixint
    if (byte <= FORMAT.POSITIVE_FIXINT_MAX) {
      return byte;
    }

    // Fixmap
    if ((byte & 0xf0) === FORMAT.FIXMAP) {
      return this.decodeMap(byte & 0x0f);
    }

    // Fixarray
    if ((byte & 0xf0) === FORMAT.FIXARRAY) {
      return this.decodeArray(byte & 0x0f);
    }

    // Fixstr
    if ((byte & 0xe0) === FORMAT.FIXSTR) {
      return this.decodeString(byte & 0x1f);
    }

    // Negative fixint
    if (byte >= FORMAT.NEGATIVE_FIXINT_MIN) {
      return byte - 0x100;
    }

    switch (byte) {
      case FORMAT.NIL:
        return null;
      case FORMAT.FALSE:
        return false;
      case FORMAT.TRUE:
        return true;
      case FORMAT.BIN8:
        return this.readBytes(this.readByte());
      case FORMAT.BIN16:
        return this.readBytes(this.readUInt16());
      case FORMAT.BIN32:
        return this.readBytes(this.readUInt32());
      case FORMAT.FLOAT32:
        return this.readFloat32();
      case FORMAT.FLOAT64:
        return this.readFloat64();
      case FORMAT.UINT8:
        return this.readByte();
      case FORMAT.UINT16:
        return this.readUInt16();
      case FORMAT.UINT32:
        return this.readUInt32();
      case FORMAT.UINT64:
        return this.readUInt64();
      case FORMAT.INT8:
        return this.readInt8();
      case FORMAT.INT16:
        return this.readInt16();
      case FORMAT.INT32:
        return this.readInt32();
      case FORMAT.INT64:
        return this.readUInt64(); // Simplified
      case FORMAT.STR8:
        return this.decodeString(this.readByte());
      case FORMAT.STR16:
        return this.decodeString(this.readUInt16());
      case FORMAT.STR32:
        return this.decodeString(this.readUInt32());
      case FORMAT.ARRAY16:
        return this.decodeArray(this.readUInt16());
      case FORMAT.ARRAY32:
        return this.decodeArray(this.readUInt32());
      case FORMAT.MAP16:
        return this.decodeMap(this.readUInt16());
      case FORMAT.MAP32:
        return this.decodeMap(this.readUInt32());
      default:
        throw new Error(`Unknown format byte: 0x${byte.toString(16)}`);
    }
  }

  decodeString(length) {
    const bytes = this.readBytes(length);
    return bytes.toString('utf8');
  }

  decodeArray(length) {
    const result = [];
    for (let i = 0; i < length; i++) {
      result.push(this.decode());
    }
    return result;
  }

  decodeMap(length) {
    const result = {};
    for (let i = 0; i < length; i++) {
      const key = this.decode();
      const value = this.decode();
      result[key] = value;
    }
    return result;
  }
}

/**
 * Export palace data to MessagePack binary format
 * @param {Object} palace - Palace data object
 * @returns {Buffer} Binary buffer
 */
export function exportToMessagePack(palace) {
  if (!palace || typeof palace !== 'object') {
    throw new Error('Invalid palace data: must be an object');
  }

  const encoder = new Encoder();
  
  const data = {
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

  encoder.encode(data);
  return encoder.getBuffer();
}

/**
 * Import palace data from MessagePack binary format
 * @param {Buffer} buffer - Binary buffer
 * @returns {Object} Palace data object
 */
export function importFromMessagePack(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Invalid input: must be a Buffer');
  }

  const decoder = new Decoder(buffer);
  const data = decoder.decode();

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid MessagePack data: expected object');
  }

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
 * Detect the format of a buffer or string
 * @param {Buffer|string} input - Input data
 * @returns {'yaml'|'msgpack'|'json'|'unknown'} Detected format
 */
export function detectFormat(input) {
  // Handle Buffer input
  if (Buffer.isBuffer(input)) {
    // Check for MessagePack markers
    const firstByte = input[0];
    
    // MessagePack object (fixmap 0x80-0x8f, map16 0xde, map32 0xdf)
    if ((firstByte & 0xf0) === 0x80 || firstByte === 0xde || firstByte === 0xdf) {
      // Try to decode to verify
      try {
        const decoder = new Decoder(input);
        const data = decoder.decode();
        if (data && typeof data === 'object') {
          return 'msgpack';
        }
      } catch {
        // Not valid MessagePack
      }
    }
    
    // Try to parse as UTF-8 string
    try {
      const str = input.toString('utf8');
      return detectStringFormat(str);
    } catch {
      return 'unknown';
    }
  }
  
  // Handle string input
  if (typeof input === 'string') {
    return detectStringFormat(input);
  }
  
  return 'unknown';
}

/**
 * Detect format from string content
 * @param {string} str - String content
 * @returns {'yaml'|'json'|'unknown'} Detected format
 */
function detectStringFormat(str) {
  const trimmed = str.trim();
  
  // Empty string
  if (trimmed === '') {
    return 'unknown';
  }
  
  // JSON detection
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }
  
  // YAML detection
  // Check for YAML-specific patterns
  if (trimmed.startsWith('#') || 
      trimmed.includes(': ') ||
      trimmed.includes(':\n') ||
      /^\s*-\s/m.test(trimmed)) {
    // Verify it's not JSON with colons
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      return 'yaml';
    }
  }
  
  return 'unknown';
}

export default {
  exportToMessagePack,
  importFromMessagePack,
  detectFormat
};
