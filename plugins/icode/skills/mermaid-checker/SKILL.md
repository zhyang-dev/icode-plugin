---
name: mermaid-checker
description: 验证 Markdown 文件中 Mermaid 图表语法。
user-invocable: false
---

# Mermaid 图表语法验证

## 安装

```bash
# 本地安装（推荐，自动处理依赖）
npm install -g ./

# 从 npm registry 安装
npm install -g @yangzhuo/mermaid-checker
```

## 工作流程

```
Markdown 文件 → 提取 Mermaid 块 → 验证语法 → 汇总报告
```

## 调用方式

### 1. 检查整个文件（Write 操作后）

```bash
mermaid-check README.md
```

**示例**：
```bash
$ mermaid-check docs/api.md
✅ api.md - Passed
────────────────────────────────────────────────────────────
Diagrams: 2/2 valid
Time: 36.2ms

Results:
  [Line 10] ✅ flowchart - 18.1ms
  [Line 25] ✅ sequence - 18.1ms
```

### 2. 检查变更行范围内的块（Edit 操作后）

```bash
mermaid-check <file.md> --diff --line-start <start> --line-end <end>
```

**场景**：只修改了文件中的某一部分，只需检查受影响的图表。

**示例**：
```bash
# 假设修改了第 15-30 行的内容
$ mermaid-check README.md --diff --line-start 15 --line-end 30
✅ README.md - Passed
────────────────────────────────────────────────────────────
Diagrams: 1/1 valid
Time: 18.5ms

Results:
  [Line 20] ✅ sequence - 18.5ms
```

### 3. 检查指定的块

```bash
mermaid-check <file.md> --diff --blocks <index1>,<index2>,...
```

**场景**：知道修改了第 0 个和第 2 个图表，直接指定索引。

**示例**：
```bash
# 只检查第 0 和 2 个图表
$ mermaid-check architecture.md --diff --blocks 0,2
✅ architecture.md - Passed
────────────────────────────────────────────────────────────
Diagrams: 2/2 valid
Time: 37.2ms
```

### 4. 静默模式（JSON 输出）

```bash
mermaid-check <file.md> --quiet
```

**示例**：
```bash
$ mermaid-check docs.md --quiet
{
  "success": true,
  "filePath": "/path/to/docs.md",
  "totalBlocks": 3,
  "validCount": 2,
  "invalidCount": 1,
  "blocks": [
    {
      "code": "graph TD\n    A-->B",
      "lineStart": 10,
      "lineEnd": 12,
      "index": 0,
      "diagramType": "flowchart",
      "valid": true,
      "executionTime": 18.5,
      "error": null
    }
  ],
  "totalTime": 36.2
}
```

## 使用案例

### 案例 1：完整文件检查

**需求**：检查 `README.md` 中的所有 Mermaid 图表。

```bash
mermaid-check README.md
```

### 案例 2：Edit 操作后的增量验证

**需求**：编辑了 `docs/api.md` 的第 20-35 行，只检查受影响的图表。

```bash
mermaid-check docs/api.md --diff --line-start 20 --line-end 35
```

### 案例 3：批量修改特定图表

**需求**：修改了第 1 个和第 3 个流程图，其他图表未改动。

```bash
mermaid-check docs.md --diff --blocks 1,3
```

### 案例 4：CI/CD 增量检查

**需求**：只检查本次 commit 变更的图表。

```bash
# 获取变更行范围
LINES=$(git diff HEAD~1 README.md | grep '^@@' | head -1 | sed 's/.*+\([0-9]*\).*/\1/')
END_LINES=$(git diff HEAD~1 README.md | grep '^@@' | head -1 | sed 's/.* \([0-9]*\) @@/\1/')

# 检查变更范围内的图表
mermaid-check README.md --diff --line-start $LINES --line-end $END_LINES
```

### 案例 5：检查目录下所有文件

```bash
mermaid-check --dir docs/
```

### 案例 6：使用 glob 模式

```bash
mermaid-check "**/*.md"
mermaid-check "docs/**/*.md"
```

## 返回格式

### 成功

```
✅ filename.md - Passed
────────────────────────────────────────────────────────────
Diagrams: 3/3 valid
Time: 52.3ms

Results:
  [Line 15] ✅ flowchart - 15.2ms
  [Line 42] ✅ sequence - 18.7ms
  [Line 78] ✅ class - 18.4ms
```

### 失败

```
❌ filename.md - Failed
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

### 无图表

```
✅ filename.md - Passed
────────────────────────────────────────────────────────────
No Mermaid diagrams found.
```

## 退出码

- `0` - 所有图表有效
- `1` - 一个或多个图表无效
- `2` - 错误（文件未找到等）

## 支持的图表类型

| 类型 | 关键字 | 示例用途 |
|------|--------|----------|
| 流程图 | `flowchart`, `graph` | 流程、架构图 |
| 时序图 | `sequenceDiagram` | 时序交互 |
| 类图 | `classDiagram` | 类结构 |
| 状态图 | `stateDiagram` | 状态转换 |
| ER图 | `erDiagram` | 数据库关系 |
| 甘特图 | `gantt` | 项目计划 |
| 饼图 | `pie` | 数据占比 |
| 旅程图 | `journey` | 用户旅程 |
| 思维导图 | `mindmap` | 思维结构 |
| Git图 | `gitGraph` | Git 历史 |
| C4图 | `C4Context` | 架构图 |

## 程序化 API

```javascript
import { checkFile, checkBlocks, validateCode } from '@yangzhuo/mermaid-checker';

// 检查文件
const result = await checkFile('README.md');
console.log(result.validCount, result.invalidCount);

// 检查指定行范围（diff 模式）
const diffResult = await checkFile('README.md', {
    lineStart: 10,
    lineEnd: 50
});

// 检查指定块索引
const blocksResult = await checkFile('README.md', {
    blockIndices: [0, 2]
});

// 验证单个代码块
const validation = await validateCode('graph TD\nA-->B');
console.log('Valid:', validation.valid);
console.log('Error:', validation.error);
```