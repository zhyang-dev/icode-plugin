---
name: mermaid-checker
description: 验证 Markdown 文件中 Mermaid 图表语法。
user-invocable: false

---

# Mermaid 图表语法验证

## 工作流程

```
Markdown 文件 → 提取 Mermaid 块 → 生成 .mmd 文件 → 逐个验证 → 汇总报告
```

## 步骤

### 1. 提取 Mermaid 代码块
- 调用：`node scripts/extract.mjs <markdown-file> [output-dir]`
- 功能：从 Markdown 中提取 ```mermaid 代码块，保存为独立 .mmd 文件
- 返回：JSON 格式的元数据（文件名、行号、图表类型）

### 2. 验证单个 Mermaid 文件
- 调用：`node scripts/validate.mjs <mermaid-file.mmd>`
- 功能：验证 Mermaid 语法正确性
- 返回：JSON 格式的验证结果（valid/error/executionTime）

### 3. 完整检查（推荐）
- 调用：`node scripts/check.mjs <markdown-file>`
- 功能：自动执行提取→验证→汇总流程
- 返回：可读报告 + JSON 数据（可选）

## 返回格式

### 成功
```
✅ filename.md - Passed
Diagrams: 3/3 valid
Time: 52ms

Results:
  [Line 15] ✅ flowchart - 15ms
  [Line 42] ✅ sequence - 18ms
  [Line 78] ✅ class - 18ms
```

### 失败
```
❌ filename.md - Failed
Diagrams: 2/3 valid
Results:
  [Line 15] ✅ flowchart - 15ms
  [Line 42] ❌ sequence - Parse error: ...
  [Line 78] ✅ class - 18ms
```

### JSON 输出（--quiet 模式）
```json
{
  "sourceFile": "README.md",
  "totalBlocks": 3,
  "validCount": 2,
  "invalidCount": 1,
  "blocks": [...],
  "totalTime": 52
}
```

## 支持的图表类型

flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie, journey, mindmap, gitGraph, C4Context

## 技术文档

- 工作流实现：[scripts/check.mjs](scripts/check.mjs)
- 技术细节：[README.md](README.md)
