#!/usr/bin/env node
/**
 * Mermaid Diagram Syntax Validator
 *
 * Fast (50x faster than mmdc) Mermaid syntax checker for Markdown files.
 * Uses Node.js + JSDOM to validate Mermaid diagrams without rendering.
 *
 * Usage:
 *   node mermaid-check.mjs <file.md>              # Check single file
 *   node mermaid-check.mjs "**/*.md"              # Check multiple files (glob)
 *   node mermaid-check.mjs --dir docs/            # Check all .md in directory
 *
 * Exit codes:
 *   0 - All diagrams valid
 *   1 - One or more diagrams invalid
 *   2 - Error (file not found, etc.)
 */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// JSDOM + Mermaid Setup
// ============================================

async function setupMermaidValidator() {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'http://localhost',
        pretendToBeVisual: true,
        resources: 'usable'
    });

    // Setup global objects
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

    // Mock DOMPurify (required by Mermaid)
    const dompurifyMock = {
        sanitize: (html) => String(html),
        addHook: () => {},
        removeHook: () => {},
        removeAllHooks: () => {}
    };
    dom.window.DOMPurify = dompurifyMock;
    global.DOMPurify = dompurifyMock;
    global.window.DOMPurify = dompurifyMock;

    // Dynamic import Mermaid
    const { default: mermaid } = await import('mermaid');

    // Initialize Mermaid
    mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        logLevel: 'error',
        securityLevel: 'loose',
    });

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

// ============================================
// Markdown Processing
// ============================================

/**
 * Extract Mermaid code blocks from Markdown content
 * @param {string} content - Markdown file content
 * @returns {Array<{code: string, lineStart: number, lineEnd: number, index: number}>}
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
 * Detect diagram type from Mermaid code
 * @param {string} code - Mermaid diagram code
 * @returns {string} - Diagram type or 'unknown'
 */
function detectDiagramType(code) {
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

// ============================================
// Validation & Reporting
// ============================================

/**
 * Validate a single Markdown file
 * @param {string} filePath - Path to Markdown file
 * @param {Function} validator - Mermaid validation function
 * @returns {Promise<Object>} - Validation result
 */
async function validateMarkdownFile(filePath, validator) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const blocks = extractMermaidBlocks(content);

    const results = {
        filePath,
        fileName: path.basename(filePath),
        totalDiagrams: blocks.length,
        validCount: 0,
        invalidCount: 0,
        diagrams: [],
        totalTime: 0
    };

    for (const block of blocks) {
        const result = await validator(block.code);
        const diagramType = detectDiagramType(block.code);

        results.diagrams.push({
            ...block,
            diagramType,
            ...result
        });

        results.totalTime += result.executionTime;
        if (result.valid) {
            results.validCount++;
        } else {
            results.invalidCount++;
        }
    }

    return results;
}

/**
 * Print validation results
 * @param {Object} result - Validation result
 * @param {boolean} verbose - Show detailed output
 */
function printResults(result, verbose = true) {
    const icon = result.invalidCount === 0 ? '✅' : '❌';
    const status = result.invalidCount === 0 ? 'Passed' : 'Failed';

    console.log(`\n${icon} ${result.fileName} - ${status}`);
    console.log('─'.repeat(60));

    if (result.totalDiagrams === 0) {
        console.log('No Mermaid diagrams found.');
        return;
    }

    console.log(`Diagrams: ${result.validCount}/${result.totalDiagrams} valid`);
    console.log(`Time: ${result.totalTime.toFixed(1)}ms`);

    if (verbose) {
        console.log('\nResults:');
        for (const diag of result.diagrams) {
            const icon = diag.valid ? '✅' : '❌';
            const time = diag.executionTime.toFixed(1) + 'ms';
            const pos = `[Line ${diag.lineStart}]`;

            if (diag.valid) {
                console.log(`  ${pos} ${icon} ${diag.diagramType} - ${time}`);
            } else {
                console.log(`  ${pos} ${icon} ${diag.diagramType}`);
                console.log(`    Error: ${diag.error.split('\n')[0]}`);
            }
        }
    }

    if (result.invalidCount > 0) {
        console.log(`\n❌ ${result.invalidCount} diagram(s) failed validation`);
    }
}

/**
 * Print summary for multiple files
 * @param {Array} results - Array of validation results
 */
function printSummary(results) {
    const totalFiles = results.length;
    const totalDiagrams = results.reduce((sum, r) => sum + r.totalDiagrams, 0);
    const totalValid = results.reduce((sum, r) => sum + r.validCount, 0);
    const totalInvalid = results.reduce((sum, r) => sum + r.invalidCount, 0);
    const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
    const filesWithErrors = results.filter(r => r.invalidCount > 0).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`Files checked:    ${totalFiles}`);
    console.log(`Total diagrams:   ${totalDiagrams}`);
    console.log(`Valid:            ${totalValid} ✅`);
    console.log(`Invalid:          ${totalInvalid} ${totalInvalid > 0 ? '❌' : '✅'}`);
    console.log(`Files with errors:${filesWithErrors}`);
    console.log(`Total time:       ${totalTime.toFixed(1)}ms`);
    console.log('='.repeat(60));
}

// ============================================
// CLI Interface
// ============================================

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
Mermaid Diagram Syntax Validator

Usage:
  node mermaid-check.mjs <file.md>              # Check single file
  node mermaid-check.mjs "**/*.md"              # Check multiple files (glob)
  node mermaid-check.mjs --dir <directory>      # Check all .md in directory
  node mermaid-check.mjs --dir <directory> --recursive  # Recursive directory check

Options:
  --quiet, -q     Suppress detailed output
  --help, -h      Show this help message
        `);
        process.exit(2);
    }

    const quiet = args.includes('-q') || args.includes('--quiet');
    const filteredArgs = args.filter(a => !a.startsWith('-'));

    // Setup validator
    const validator = await setupMermaidValidator();

    let filePaths = [];

    // Parse arguments
    if (filteredArgs[0] === '--dir') {
        const dir = filteredArgs[1];
        const recursive = filteredArgs.includes('--recursive');
        const pattern = recursive ? '**/*.md' : '*.md';
        filePaths = await glob(pattern, { cwd: dir, absolute: true });
    } else {
        // Treat as glob pattern or direct file path
        filePaths = await glob(filteredArgs[0], { absolute: true });
    }

    if (filePaths.length === 0) {
        console.error(`No Markdown files found.`);
        process.exit(2);
    }

    // Validate each file
    const results = [];
    for (const filePath of filePaths) {
        try {
            const result = await validateMarkdownFile(filePath, validator);
            results.push(result);
            printResults(result, !quiet);
        } catch (error) {
            console.error(`Error processing ${filePath}: ${error.message}`);
        }
    }

    // Print summary if multiple files
    if (results.length > 1) {
        printSummary(results);
    }

    // Exit with appropriate code
    const hasErrors = results.some(r => r.invalidCount > 0);
    process.exit(hasErrors ? 1 : 0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(2);
});
