/**
 * Mermaid Checker - 核心模块导出
 *
 * 提供程序化 API 和便捷函数
 */

// 提取相关
export {
    extractMermaidBlocks,
    detectDiagramType,
    isBlockAffected,
    filterBlocksByLineRange,
    filterBlocksByIndices,
    extractFromFile
} from './extractor.mjs';

// 验证相关
export {
    setupMermaidValidator,
    validateCode,
    validateBlocks
} from './validator.mjs';

// 检查相关
export {
    checkFile,
    checkBlocks
} from './checker.mjs';

// 报告相关
export {
    printFileReport,
    printSummary,
    toJson
} from './reporter.mjs';