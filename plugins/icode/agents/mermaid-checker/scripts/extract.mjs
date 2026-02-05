#!/usr/bin/env node
/**
 * Mermaid 代码块提取脚本
 *
 * 从 Markdown 文件中提取所有 Mermaid 代码块，保存为独立文件
 *
 * 用法:
 *   node extract.mjs <markdown-file> [output-dir]
 */

import fs from 'fs';
import path from 'path';

/**
 * 从 Markdown 内容中提取 Mermaid 代码块
 */
function extractMermaidBlocks(content) {
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
            blockStart = i + 1;
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
 */
function detectDiagramType(code) {
    const typeMatch = code.match(/^(\w+)/);
    if (typeMatch) {
        const type = typeMatch[1];
        const typeMap = {
            'graph': 'flowchart',
            'sequenceDiagram': 'sequence',
            'classDiagram': 'class',
            'stateDiagram': 'state',
            'erDiagram': 'er',
            'journey': 'journey-map'
        };
        return typeMap[type] || type;
    }
    return 'unknown';
}

/**
 * 主函数
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
Mermaid 代码块提取脚本

用法:
  node extract.mjs <markdown-file> [output-dir]

参数:
  markdown-file  - 要处理的 Markdown 文件路径
  output-dir     - 输出目录（默认: .mermaid_temp）

示例:
  node extract.mjs README.md
  node extract.mjs docs/architecture.md .mermaid_temp
        `);
        process.exit(1);
    }

    const mdFile = args[0];
    const outputDir = args[1] || '.mermaid_temp';

    // 检查文件是否存在
    if (!fs.existsSync(mdFile)) {
        console.error(`错误: 文件不存在: ${mdFile}`);
        process.exit(1);
    }

    // 读取 Markdown 文件
    const content = fs.readFileSync(mdFile, 'utf-8');

    // 提取 Mermaid 代码块
    const blocks = extractMermaidBlocks(content);

    if (blocks.length === 0) {
        console.log(`未找到 Mermaid 代码块: ${mdFile}`);
        process.exit(0);
    }

    // 创建输出目录
    fs.mkdirSync(outputDir, { recursive: true });

    // 获取文件名（不含扩展名）作为前缀
    const mdFileName = path.basename(mdFile, path.extname(mdFile));

    // 保存每个代码块
    const results = [];
    for (const block of blocks) {
        const diagramType = detectDiagramType(block.code);
        const fileName = `${mdFileName}_block${block.index}_${diagramType}.mmd`;
        const filePath = path.join(outputDir, fileName);

        fs.writeFileSync(filePath, block.code, 'utf-8');

        results.push({
            fileName,
            filePath,
            lineStart: block.lineStart,
            lineEnd: block.lineEnd,
            diagramType,
            index: block.index
        });
    }

    // 输出结果（JSON 格式）
    const output = {
        sourceFile: mdFile,
        outputDir: outputDir,
        totalBlocks: blocks.length,
        blocks: results
    };

    console.log(JSON.stringify(output, null, 2));
}

main().catch(error => {
    console.error('错误:', error.message);
    process.exit(1);
});
