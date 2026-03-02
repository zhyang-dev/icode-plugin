/**
 * 核心检查器
 *
 * 整合提取和验证逻辑
 */

import { extractFromFile, detectDiagramType } from './extractor.mjs';
import { validateCode } from './validator.mjs';

/**
 * 检查单个文件
 * @param {string} filePath - 文件路径
 * @param {Object} options - 选项
 * @param {number} [options.lineStart] - 变更起始行（用于 diff 模式）
 * @param {number} [options.lineEnd] - 变更结束行（用于 diff 模式）
 * @param {Array<number>} [options.blockIndices] - 指定块索引
 * @returns {Promise<Object>} - 检查结果
 */
export async function checkFile(filePath, options = {}) {
    const { lineStart, lineEnd, blockIndices } = options;

    // 提取代码块
    const extractResult = extractFromFile(filePath, {
        lineStart,
        lineEnd,
        blockIndices
    });

    if (!extractResult.success) {
        return {
            success: false,
            filePath,
            error: extractResult.error,
            totalBlocks: 0,
            validCount: 0,
            invalidCount: 0,
            blocks: [],
            totalTime: 0
        };
    }

    if (extractResult.totalBlocks === 0) {
        return {
            success: true,
            filePath,
            totalBlocks: 0,
            validCount: 0,
            invalidCount: 0,
            blocks: [],
            totalTime: 0
        };
    }

    // 验证代码块
    const blocks = [];
    let totalTime = 0;
    let validCount = 0;
    let invalidCount = 0;

    for (const block of extractResult.blocks) {
        const result = await validateCode(block.code);
        blocks.push({
            ...block,
            ...result
        });

        totalTime += result.executionTime;
        if (result.valid) {
            validCount++;
        } else {
            invalidCount++;
        }
    }

    return {
        success: true,
        filePath,
        totalBlocks: blocks.length,
        validCount,
        invalidCount,
        blocks,
        totalTime
    };
}

/**
 * 检查多个代码块
 * @param {Array<{code: string, lineStart?: number, lineEnd?: number, index?: number}>} codeBlocks - 代码块数组
 * @returns {Promise<Object>} - 检查结果
 */
export async function checkBlocks(codeBlocks) {
    const blocks = [];
    let totalTime = 0;
    let validCount = 0;
    let invalidCount = 0;

    for (const block of codeBlocks) {
        const result = await validateCode(block.code);
        const diagramType = detectDiagramType(block.code);

        blocks.push({
            ...block,
            diagramType,
            ...result
        });

        totalTime += result.executionTime;
        if (result.valid) {
            validCount++;
        } else {
            invalidCount++;
        }
    }

    return {
        success: true,
        totalBlocks: blocks.length,
        validCount,
        invalidCount,
        blocks,
        totalTime
    };
}