/**
 * Mermaid 语法验证器
 *
 * 使用 JSDOM + Mermaid 进行语法验证
 */

import { JSDOM } from 'jsdom';

let validatorInstance = null;

/**
 * 设置 JSDOM 环境和 Mermaid 验证器
 * @returns {Promise<Function>} - 验证函数
 */
export async function setupMermaidValidator() {
    if (validatorInstance) {
        return validatorInstance;
    }

    // 创建 JSDOM 环境
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'http://localhost',
        pretendToBeVisual: true,
        resources: 'usable'
    });

    // 设置全局对象
    global.window = dom.window;
    global.document = dom.window.document;
    global.self = global;
    global.global = global;
    global.Element = dom.window.Element;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    Object.defineProperty(global, 'navigator', {
        value: dom.window.navigator,
        writable: false,
        configurable: true
    });

    // Mock DOMPurify（必须在 import mermaid 前设置）
    const dompurifyMock = {
        sanitize: (html) => String(html),
        addHook: () => {},
        removeHook: () => {},
        removeAllHooks: () => {}
    };
    dom.window.DOMPurify = dompurifyMock;
    global.DOMPurify = dompurifyMock;
    global.window.DOMPurify = dompurifyMock;

    // 动态导入 Mermaid
    const { default: mermaid } = await import('mermaid');

    // 初始化 Mermaid - 完全禁用日志输出
    mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        logLevel: 'fatal',  // 只输出致命错误
        securityLevel: 'loose',
        quiet: true,  // 静默模式
    });

    // 创建验证函数
    validatorInstance = async (code) => {
        const startTime = performance.now();
        try {
            await mermaid.parse(code);
            return {
                valid: true,
                executionTime: performance.now() - startTime,
                error: null
            };
        } catch (error) {
            return {
                valid: false,
                executionTime: performance.now() - startTime,
                error: error.message || error.toString()
            };
        }
    };

    return validatorInstance;
}

/**
 * 验证单个 Mermaid 代码块
 * @param {string} code - Mermaid 代码
 * @returns {Promise<Object>} - 验证结果
 */
export async function validateCode(code) {
    const validator = await setupMermaidValidator();

    // Suppress console output during validation
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;
    console.error = () => {};
    console.log = () => {};

    try {
        const result = await validator(code);
        return result;
    } finally {
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
    }
}

/**
 * 验证多个代码块
 * @param {Array<{code: string}>} blocks - 代码块数组
 * @returns {Promise<Array>} - 验证结果数组
 */
export async function validateBlocks(blocks) {
    const validator = await setupMermaidValidator();
    const results = [];

    // Suppress console output during validation
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;
    console.error = () => {};
    console.log = () => {};

    try {
        for (const block of blocks) {
            const result = await validator(block.code);
            results.push({
                ...block,
                ...result
            });
        }
    } finally {
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
    }

    return results;
}