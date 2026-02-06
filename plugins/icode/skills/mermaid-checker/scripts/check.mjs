#!/usr/bin/env node
/**
 * Mermaid 图表语法检查主脚本
 *
 * 工作流：
 *   1. 调用提取脚本，从 Markdown 提取 Mermaid 代码块
 *   2. 对每个代码块调用验证脚本
 *   3. 汇总结果并生成报告
 *
 * 用法:
 *   node check.mjs <markdown-file> [output-dir]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 执行提取脚本
 * @param {string} mdFile - Markdown 文件路径
 * @param {string} outputDir - 输出目录
 * @returns {Object} - 提取结果
 */
function extractBlocks(mdFile, outputDir) {
    const scriptPath = path.join(__dirname, 'extract.mjs');
    const cmd = `node "${scriptPath}" "${mdFile}" "${outputDir}" 2>/dev/null`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    return JSON.parse(output);
}

/**
 * 执行验证脚本
 * @param {string} mmdFile - Mermaid 文件路径
 * @returns {Object} - 验证结果
 */
function validateFile(mmdFile) {
    const scriptPath = path.join(__dirname, 'validate.mjs');
    const cmd = `node "${scriptPath}" "${mmdFile}"`;
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(output);
}

/**
 * 格式化输出报告
 * @param {Object} result - 汇总结果
 */
function printReport(result) {
    const { sourceFile, totalBlocks, validCount, invalidCount, blocks, totalTime } = result;

    const icon = invalidCount === 0 ? '✅' : '❌';
    const status = invalidCount === 0 ? 'Passed' : 'Failed';

    console.log(`\n${icon} ${path.basename(sourceFile)} - ${status}`);
    console.log('─'.repeat(60));

    if (totalBlocks === 0) {
        console.log('No Mermaid diagrams found.');
        return;
    }

    console.log(`Diagrams: ${validCount}/${totalBlocks} valid`);
    console.log(`Time: ${totalTime.toFixed(1)}ms`);

    console.log('\nResults:');
    for (const block of blocks) {
        const blockIcon = block.valid ? '✅' : '❌';
        const time = block.executionTime.toFixed(1) + 'ms';
        const pos = `[Line ${block.lineStart}]`;

        if (block.valid) {
            console.log(`  ${pos} ${blockIcon} ${block.diagramType} - ${time}`);
        } else {
            console.log(`  ${pos} ${blockIcon} ${block.diagramType}`);
            console.log(`    Error: ${block.error.split('\n')[0]}`);
        }
    }

    if (invalidCount > 0) {
        console.log(`\n❌ ${invalidCount} diagram(s) failed validation`);
    }
}

/**
 * 清理临时文件
 * @param {string} outputDir - 临时文件目录
 */
function cleanup(outputDir) {
    try {
        fs.rmSync(outputDir, { recursive: true, force: true });
    } catch (e) {
        // 忽略错误
    }
}

/**
 * 主函数
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
Mermaid 图表语法检查

用法:
  node check.mjs <markdown-file> [output-dir]

参数:
  markdown-file  - 要检查的 Markdown 文件
  output-dir     - 临时文件目录（默认: .mermaid_temp）

选项:
  --keep-temp    - 保留临时文件（用于调试）
  --quiet        - 静默模式，只输出 JSON

示例:
  node check.mjs README.md
  node check.mjs docs/architecture.md
  node check.mjs README.md --quiet
        `);
        process.exit(1);
    }

    const mdFile = args[0];
    const outputDir = args[1] || '.mermaid_temp';
    const keepTemp = args.includes('--keep-temp');
    const quiet = args.includes('--quiet');

    // 检查文件是否存在
    if (!fs.existsSync(mdFile)) {
        console.error(`错误: 文件不存在: ${mdFile}`);
        process.exit(1);
    }

    try {
        // 步骤 1: 提取 Mermaid 代码块
        const extractResult = extractBlocks(mdFile, outputDir);

        if (extractResult.totalBlocks === 0) {
            if (!quiet) {
                console.log(`\n未找到 Mermaid 代码块: ${mdFile}`);
            }
            process.exit(0);
        }

        // 步骤 2: 验证每个代码块
        const blocks = [];
        let totalTime = 0;
        let validCount = 0;
        let invalidCount = 0;

        for (const blockInfo of extractResult.blocks) {
            const validationResult = validateFile(blockInfo.filePath);

            blocks.push({
                ...blockInfo,
                valid: validationResult.valid,
                executionTime: validationResult.executionTime,
                error: validationResult.error
            });

            totalTime += validationResult.executionTime;
            if (validationResult.valid) {
                validCount++;
            } else {
                invalidCount++;
            }
        }

        // 步骤 3: 汇总结果
        const result = {
            sourceFile: mdFile,
            outputDir: outputDir,
            totalBlocks: extractResult.totalBlocks,
            validCount,
            invalidCount,
            blocks,
            totalTime
        };

        // 输出
        if (quiet) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            printReport(result);
        }

        // 清理临时文件
        if (!keepTemp) {
            cleanup(outputDir);
        }

        // 退出码
        process.exit(invalidCount > 0 ? 1 : 0);

    } catch (error) {
        console.error(`错误: ${error.message}`);
        cleanup(outputDir);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
