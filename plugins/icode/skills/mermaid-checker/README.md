# Mermaid Checker Skill

## 概述

`mermaid-checker` 是一个用于验证 Markdown 文件中 Mermaid 图表语法正确性的 Claude Code skill。

## 核心特性

- **快速**: 比 mmdc 快 50 倍（~50ms/图 vs ~2800ms/图）
- **准确**: 100% 兼容 Mermaid v11+
- **轻量**: 无需浏览器，纯 Node.js 实现
- **全面**: 支持所有 Mermaid 图表类型

## 工作流程

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Markdown 文件   │ -> │ 提取 Mermaid    │ -> │  JSDOM +        │
│  (*.md)         │    │  代码块         │    │  Mermaid.parse()│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                         │
                                                         v
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   生成报告      │ <- │  收集结果       │ <- │  语法验证       │
│   (JSON/文本)   │    │  (有效/无效)    │    │  (每个图)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 核心实现要点

### 1. JSDOM 环境设置

```javascript
// 创建模拟浏览器环境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

// 设置全局对象
global.window = dom.window;
global.document = dom.window.document;
// ... 其他全局对象
```

### 2. DOMPurify Mock

```javascript
// Mermaid 需要 DOMPurify，但语法验证不需要真正清理
global.DOMPurify = {
    sanitize: (html) => String(html),
    addHook: () => {},
    removeHook: () => {},
    removeAllHooks: () => {}
};
```

### 3. Mermaid 初始化

```javascript
mermaid.initialize({
    startOnLoad: false,           // 不自动加载
    suppressErrorRendering: true, // 抑制错误渲染
    logLevel: 'error',            // 只记录错误
    securityLevel: 'loose',       // 禁用安全检查
});
```

### 4. Markdown 解析

```javascript
// 提取 ```mermaid 代码块
function extractMermaidBlocks(content) {
    const blocks = [];
    const lines = content.split('\n');
    let inMermaidBlock = false;
    let blockStart = 0;
    let blockContent = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '```mermaid') {
            inMermaidBlock = true;
            blockStart = i + 1;
        } else if (inMermaidBlock && lines[i].trim() === '```') {
            blocks.push({
                code: blockContent.join('\n'),
                lineStart: blockStart,
                lineEnd: i
            });
            inMermaidBlock = false;
        } else if (inMermaidBlock) {
            blockContent.push(lines[i]);
        }
    }
    return blocks;
}
```

## 使用方式

### 作为 Claude Code Skill

当用户需要验证 Mermaid 图表时，Claude 会自动使用此 skill：

```
用户: "检查 README.md 中的 Mermaid 图表是否正确"
Claude: [使用 mermaid-checker skill]
      [提取并验证所有 Mermaid 块]
      [生成验证报告]
```

### 独立脚本使用

```bash
# 安装依赖
npm install mermaid jsdom glob

# 检查单个文件
node mermaid-check.mjs README.md

# 检查多个文件
node mermaid-check.mjs "docs/**/*.md"

# 检查目录
node mermaid-check.mjs --dir docs/

# 递归检查
node mermaid-check.mjs --dir docs/ --recursive

# 安静模式
node mermaid-check.mjs README.md --quiet
```

### 集成到项目

#### package.json scripts

```json
{
    "scripts": {
        "check:mermaid": "node scripts/mermaid-check.mjs \"docs/**/*.md\"",
        "check:mermaid:file": "node scripts/mermaid-check.mjs"
    }
}
```

#### VS Code tasks

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Validate Mermaid",
            "type": "shell",
            "command": "node scripts/mermaid-check.mjs ${file}",
            "problemMatcher": []
        }
    ]
}
```

#### Git Hooks (使用 husky)

```bash
# .husky/pre-commit
node scripts/mermaid-check.mjs "*.md"
```

## 支持的图表类型

| 类型 | 关键字 | 示例 |
|------|--------|------|
| 流程图 | `flowchart`, `graph` | 流程图、架构图 |
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

## 输出示例

### 成功输出

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

### 失败输出

```
❌ README.md - Failed
────────────────────────────────────────────────────────────
Diagrams: 2/3 valid
Time: 48.1ms

Results:
  [Line 15] ✅ flowchart - 15.2ms
  [Line 42] ❌ sequence
    Error: Parse error on line 4: Expecting '->>' or '-->>'
  [Line 78] ✅ class - 14.5ms

❌ 1 diagram(s) failed validation
```

## 常见错误与解决

| 错误 | 原因 | 解决方法 |
|------|------|----------|
| `DOMPurify is not defined` | 未设置 mock DOMPurify | 在 import mermaid 前设置 |
| `Cannot set property navigator` | 只读属性 | 使用 `Object.defineProperty` |
| `No diagram type detected` | 图表类型错误 | 检查关键字拼写 |

## 性能对比

| 方案 | 平均耗时/图 | 总耗时 (18图) | 加速比 |
|------|-------------|---------------|--------|
| **JSDOM (本方案)** | **56ms** | **1.02s** | **1x** |
| mmdc | 2813ms | 50.64s | 0.02x |
| **性能提升** | **50x** | **50x** | - |

## 相关文件

- `SKILL.md` - Claude Code skill 定义
- `mermaid-check.mjs` - 完整实现脚本
- `README.md` - 本文档

## 参考资料

- [Mermaid 官方文档](https://mermaid.js.org/)
- [JSDOM 文档](https://github.com/jsdom/jsdom)
- [验证方案测试项目](/mnt/data/gv0/home/yangzhuo/code/test_mermaid/)
