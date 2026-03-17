/**
 * Exporters Index - Unified export for all format exporters
 * Task 006: Export Formats
 */

export { exportToYAML, importFromYAML, validatePalaceData } from './yaml-exporter.js';
export { exportToMessagePack, importFromMessagePack, detectFormat } from './messagepack-exporter.js';

/**
 * Export palace data to specified format
 * @param {Object} palace - Palace data object
 * @param {'yaml'|'msgpack'|'json'} format - Export format
 * @returns {string|Buffer} Exported data
 */
export function exportPalace(palace, format = 'yaml') {
  switch (format.toLowerCase()) {
    case 'yaml':
    case 'yml':
      return exportToYAML(palace);
    case 'msgpack':
    case 'messagepack':
      return exportToMessagePack(palace);
    case 'json':
      return JSON.stringify(palace, null, 2);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Import palace data from any supported format
 * @param {string|Buffer} input - Input data
 * @param {'yaml'|'msgpack'|'json'|'auto'} format - Import format (auto for detection)
 * @returns {Object} Palace data object
 */
export function importPalace(input, format = 'auto') {
  let detectedFormat = format;
  
  if (format === 'auto') {
    detectedFormat = detectFormat(input);
    if (detectedFormat === 'unknown') {
      throw new Error('Could not auto-detect format. Please specify format explicitly.');
    }
  }
  
  switch (detectedFormat.toLowerCase()) {
    case 'yaml':
    case 'yml':
      return importFromYAML(input);
    case 'msgpack':
    case 'messagepack':
      return importFromMessagePack(input);
    case 'json':
      return JSON.parse(input);
    default:
      throw new Error(`Unsupported import format: ${detectedFormat}`);
  }
}

export default {
  exportPalace,
  importPalace,
  exportToYAML,
  importFromYAML,
  exportToMessagePack,
  importFromMessagePack,
  detectFormat,
  validatePalaceData
};
