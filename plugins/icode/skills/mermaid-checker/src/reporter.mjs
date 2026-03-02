/**
 * 报告生成器
 *
 * 格式化输出验证结果
 */

import path from 'path';

/**
 * 打印单个文件的验证结果
 * @param {Object} result - 验证结果
 * @param {boolean} verbose - 是否显示详细输出
 */
export function printFileReport(result, verbose = true) {
    const icon = result.invalidCount === 0 ? '✅' : '❌';
    const status = result.invalidCount === 0 ? 'Passed' : 'Failed';

    console.log(`\n${icon} ${path.basename(result.filePath)} - ${status}`);
    console.log('─'.repeat(60));

    if (result.totalBlocks === 0) {
        console.log('No Mermaid diagrams found.');
        return;
    }

    console.log(`Diagrams: ${result.validCount}/${result.totalBlocks} valid`);
    console.log(`Time: ${result.totalTime.toFixed(1)}ms`);

    if (verbose && result.blocks.length > 0) {
        console.log('\nResults:');
        for (const block of result.blocks) {
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
    }

    if (result.invalidCount > 0) {
        console.log(`\n❌ ${result.invalidCount} diagram(s) failed validation`);
    }
}

/**
 * 打印多文件汇总
 * @param {Array} results - 多个文件的验证结果
 */
export function printSummary(results) {
    const totalFiles = results.length;
    const totalDiagrams = results.reduce((sum, r) => sum + r.totalBlocks, 0);
    const totalValid = results.reduce((sum, r) => sum + r.validCount, 0);
    const totalInvalid = results.reduce((sum, r) => sum + r.invalidCount, 0);
    const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
    const filesWithErrors = results.filter(r => r.invalidCount > 0).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`Files checked:    ${totalFiles}`);
    console.log(`Total diagrams:  ${totalDiagrams}`);
    console.log(`Valid:           ${totalValid} ✅`);
    console.log(`Invalid:         ${totalInvalid} ${totalInvalid > 0 ? '❌' : '✅'}`);
    console.log(`Files with errors: ${filesWithErrors}`);
    console.log(`Total time:      ${totalTime.toFixed(1)}ms`);
    console.log('='.repeat(60));
}

/**
 * 生成 JSON 格式的结果
 * @param {Object} result - 验证结果
 * @returns {string} - JSON 字符串
 */
export function toJson(result) {
    return JSON.stringify(result, null, 2);
}