#!/usr/bin/env node
/**
 * Mermaid 文件验证脚本
 *
 * 验证单个 Mermaid 文件的语法正确性
 *
 * 用法:
 *   node validate.mjs <mermaid-file.mmd>
 *
 * 输出:
 *   JSON 格式的验证结果
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 动态导入模块（从插件目录解析）
 * 优先使用插件本地 node_modules，回退到全局安装
 */
async function importModule(moduleName) {
    // 尝试从插件目录查找 node_modules
    const possiblePaths = [
        // 插件目录下的 agents/mermaid-checker/node_modules
        path.join(__dirname, '..', '..', 'node_modules'),
        // skills/mermaid-checker/node_modules
        path.join(__dirname, '..', '..', '..', 'skills', 'mermaid-checker', 'node_modules'),
        // 从调用脚本所在目录向上查找
        process.cwd(),
    ];

    for (const basePath of possiblePaths) {
        const modulePath = path.join(basePath, 'node_modules', moduleName);
        const pkgPath = path.join(modulePath, 'package.json');

        if (fs.existsSync(pkgPath)) {
            try {
                // 尝试直接导入
                return await import(moduleName);
            } catch (e) {
                // 读取 package.json 获取主入口
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                const entry = pkg.main || pkg.module || pkg.exports?.['.' ]?.import || 'index.js';
                const entryPath = path.join(modulePath, entry);
                if (fs.existsSync(entryPath)) {
                    return await import(entryPath);
                }
            }
        }
    }

    // 回退到全局模块
    try {
        return await import(moduleName);
    } catch (e) {
        // 尝试从 nvm 全局查找
        const nvmPath = process.env.NVM_DIR || path.join(process.env.HOME, '.nvm');
        const globalNodePath = path.join(nvmPath, 'versions', 'node', process.version, 'lib', 'node_modules', moduleName);
        const pkgPath = path.join(globalNodePath, 'package.json');

        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const entry = pkg.main || pkg.module || 'index.js';
            const entryPath = path.join(globalNodePath, entry);
            return await import(entryPath);
        }
        throw new Error(`找不到模块: ${moduleName}\n  请在项目目录运行: npm install\n  或全局安装: npm install -g ${moduleName}`);
    }
}

/**
 * 设置 JSDOM 环境和 Mermaid 验证器
 */
async function setupMermaidValidator() {
    const { JSDOM } = await importModule('jsdom');

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
    const { default: mermaid } = await importModule('mermaid');

    // 初始化 Mermaid
    mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        logLevel: 'error',
        securityLevel: 'loose',
    });

    // 返回验证函数
    return async (code) => {
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
}

/**
 * 检测图表类型
 * @param {string} code - Mermaid 代码
 * @returns {string} - 图表类型
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
Mermaid 文件验证脚本

用法:
  node validate.mjs <mermaid-file.mmd>

参数:
  mermaid-file.mmd  - 要验证的 Mermaid 文件

输出:
  JSON 格式的验证结果

示例:
  node validate.mjs README_block_0_flowchart.mmd
        `);
        process.exit(1);
    }

    const mmdFile = args[0];

    // 检查文件是否存在
    if (!fs.existsSync(mmdFile)) {
        console.error(JSON.stringify({
            success: false,
            error: `文件不存在: ${mmdFile}`
        }, null, 2));
        process.exit(1);
    }

    // 读取 Mermaid 文件
    const code = fs.readFileSync(mmdFile, 'utf-8');

    // 设置验证器
    const validator = await setupMermaidValidator();

    // 验证
    const result = await validator(code);

    // 构建输出
    const output = {
        success: true,
        file: mmdFile,
        fileName: path.basename(mmdFile),
        diagramType: detectDiagramType(code),
        ...result
    };

    console.log(JSON.stringify(output, null, 2));

    // 退出码
    process.exit(result.valid ? 0 : 1);
}

main().catch(error => {
    console.error(JSON.stringify({
        success: false,
        error: error.message
    }, null, 2));
    process.exit(1);
});
