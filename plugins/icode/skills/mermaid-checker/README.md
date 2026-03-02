# Mermaid Checker

Fast Mermaid diagram syntax validator for Markdown files.

## Features

- **Fast**: ~50ms per diagram (50x faster than mmdc)
- **Accurate**: 100% compatible with Mermaid v11+
- **Lightweight**: No browser required, pure Node.js
- **Comprehensive**: Supports all Mermaid diagram types
- **Diff Mode**: Check only affected blocks for Edit operations

## Installation

### Local Install (Recommended)

```bash
# From project root
npm install -g ./

# This installs the package with all dependencies globally
# Test with:
mermaid-check --help
```

### From npm Registry

```bash
npm install -g @yangzhuo/mermaid-checker
```

## Usage

### CLI

```bash
# Check entire file
mermaid-check README.md

# Check specific line range (diff mode)
mermaid-check README.md --diff --line-start 10 --line-end 50

# Check specific blocks
mermaid-check README.md --diff --blocks 0,2,3

# Check multiple files (glob)
mermaid-check "**/*.md"

# Check directory
mermaid-check --dir docs/

# Quiet mode (JSON output)
mermaid-check README.md --quiet
```

### Programmatic API

```javascript
import { checkFile, checkBlocks, validateCode } from '@yangzhuo/mermaid-checker';

// Check file
const result = await checkFile('README.md');
console.log(result.validCount, result.invalidCount);

// Check with diff mode
const diffResult = await checkFile('README.md', {
    lineStart: 10,
    lineEnd: 50
});

// Validate single code
const validation = await validateCode('graph TD\nA-->B');
```

## Output Examples

### Success

```
✅ README.md - Passed
────────────────────────────────────────────────────────────
Diagrams: 3/3 valid
Time: 52.3ms

Results:
  [Line 15] ✅ flowchart - 15.2ms
  [Line 42] ✅ sequence - 18.7ms
  [Line 78] ✅ class - 18.4ms
```

### Failure

```
❌ README.md - Failed
────────────────────────────────────────────────────────────
Diagrams: 2/3 valid
Time: 48.1ms

Results:
  [Line 15] ✅ flowchart - 15.2ms
  [Line 42] ❌ sequence
    Error: Parse error on line 4
  [Line 78] ✅ class - 14.5ms

❌ 1 diagram(s) failed validation
```

### JSON Output (--quiet)

```json
{
  "success": true,
  "filePath": "/path/to/README.md",
  "totalBlocks": 3,
  "validCount": 2,
  "invalidCount": 1,
  "blocks": [...],
  "totalTime": 48.1
}
```

## Supported Diagram Types

| Type | Keywords |
|------|----------|
| Flowchart | `flowchart`, `graph` |
| Sequence | `sequenceDiagram` |
| Class | `classDiagram` |
| State | `stateDiagram` |
| ER | `erDiagram` |
| Gantt | `gantt` |
| Pie | `pie` |
| Journey | `journey` |
| Mindmap | `mindmap` |
| Git | `gitGraph` |
| C4 | `C4Context` |

## Exit Codes

- `0` - All diagrams valid
- `1` - One or more diagrams invalid
- `2` - Error (file not found, etc.)

## License

MIT
