/**
 * Mermaid 代码块提取器
 *
 * 从 Markdown 文件中提取 Mermaid 代码块，支持行范围过滤
 */

import fs from 'fs';

/**
 * 从 Markdown 内容中提取 Mermaid 代码块
 * @param {string} content - Markdown 文件内容
 * @returns {Array<{code: string, lineStart: number, lineEnd: number, index: number}>}
 */
export function extractMermaidBlocks(content) {
    const blocks = [];
    const lines = content.split('\n');
    let inMermaidBlock = false;
    let blockStart = 0;
    let blockContent = [];
    let blockIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.trim() === '```mermaid') {
            inMermaidBlock = true;
            blockStart = i + 1; // Line numbers are 1-based
            blockContent = [];
        } else if (inMermaidBlock && line.trim() === '```') {
            inMermaidBlock = false;
            blocks.push({
                code: blockContent.join('\n'),
                lineStart: blockStart,
                lineEnd: i,
                index: blockIndex++
            });
            blockContent = [];
        } else if (inMermaidBlock) {
            blockContent.push(line);
        }
    }

    return blocks;
}

/**
 * 检测图表类型
 * @param {string} code - Mermaid 代码
 * @returns {string} - 图表类型
 */
export function detectDiagramType(code) {
    const typeMatch = code.match(/^(\w+)/);
    if (typeMatch) {
        const type = typeMatch[1];
        // Map aliases to standard names
        const typeMap = {
            'graph': 'flowchart',
            'sequenceDiagram': 'sequence',
            'classDiagram': 'class',
            'stateDiagram': 'state',
            'erDiagram': 'er',
            'journey': 'journey map'
        };
        return typeMap[type] || type;
    }
    return 'unknown';
}

/**
 * 判断块是否与变更行范围有交集
 * @param {Object} block - 代码块对象
 * @param {number} lineStart - 变更起始行
 * @param {number} lineEnd - 变更结束行
 * @returns {boolean}
 */
export function isBlockAffected(block, lineStart, lineEnd) {
    // 块的行范围 [block.lineStart-1, block.lineEnd] 与变更范围 [lineStart, lineEnd] 有交集
    // block.lineStart 是代码块内容的起始行（不含 ```mermaid）
    // 所以整个代码块（包含 ```mermaid 和 ```）的范围是 [block.lineStart-1, block.lineEnd]
    const blockStart = block.lineStart - 1; // 包含 ```mermaid 行
    const blockEnd = block.lineEnd; // 包含 ``` 行

    return !(blockEnd < lineStart || blockStart > lineEnd);
}

/**
 * 根据行范围过滤代码块
 * @param {Array} blocks - 代码块数组
 * @param {number} lineStart - 变更起始行
 * @param {number} lineEnd - 变更结束行
 * @returns {Array} - 过滤后的代码块
 */
export function filterBlocksByLineRange(blocks, lineStart, lineEnd) {
    return blocks.filter(block => isBlockAffected(block, lineStart, lineEnd));
}

/**
 * 根据块索引过滤代码块
 * @param {Array} blocks - 代码块数组
 * @param {Array<number>} indices - 块索引数组
 * @returns {Array} - 过滤后的代码块
 */
export function filterBlocksByIndices(blocks, indices) {
    return blocks.filter(block => indices.includes(block.index));
}

/**
 * 从文件提取 Mermaid 代码块
 * @param {string} filePath - 文件路径
 * @param {Object} options - 选项
 * @param {number} [options.lineStart] - 变更起始行
 * @param {number} [options.lineEnd] - 变更结束行
 * @param {Array<number>} [options.blockIndices] - 指定块索引
 * @returns {Object} - 提取结果
 */
export function extractFromFile(filePath, options = {}) {
    const { lineStart, lineEnd, blockIndices } = options;

    if (!fs.existsSync(filePath)) {
        return {
            success: false,
            error: `文件不存在: ${filePath}`,
            blocks: []
        };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let blocks = extractMermaidBlocks(content);

    // 根据选项过滤
    if (blockIndices && blockIndices.length > 0) {
        blocks = filterBlocksByIndices(blocks, blockIndices);
    } else if (lineStart !== undefined && lineEnd !== undefined) {
        blocks = filterBlocksByLineRange(blocks, lineStart, lineEnd);
    }

    // 为每个块添加图表类型
    blocks = blocks.map(block => ({
        ...block,
        diagramType: detectDiagramType(block.code)
    }));

    return {
        success: true,
        filePath,
        totalBlocks: blocks.length,
        blocks
    };
}