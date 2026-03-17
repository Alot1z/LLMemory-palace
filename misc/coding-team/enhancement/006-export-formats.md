# Task: Export Formats

**Scope:** 
- `lib/exporters/yaml-exporter.js`
- `lib/exporters/messagepack-exporter.js`
- `tests/unit/exporters.test.mjs`

**Acceptance:**
- `exportToYAML(palace)` → valid YAML string
- `exportToMessagePack(palace)` → Buffer (binary)
- `detectFormat(buffer)` → 'yaml' | 'msgpack' | 'json'
- `importFromYAML(yaml)` → palace data object
- `importFromMessagePack(buffer)` → palace object
- Unit tests 3+ each
