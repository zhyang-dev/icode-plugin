#!/usr/bin/env node
/**
 * Mermaid Checker CLI
 *
 * Fast Mermaid diagram syntax validator for Markdown files.
 *
 * Usage:
 *   mermaid-check <file.md>                        Check entire file
 *   mermaid-check <file.md> --diff --line-start 10 --line-end 50  Check specific line range
 *   mermaid-check <file.md> --diff --blocks 0,2,3  Check specific blocks
 *   mermaid-check "<glob-pattern>"                 Check multiple files
 *   mermaid-check --dir docs/                      Check all .md in directory
 *
 * Exit codes:
 *   0 - All diagrams valid
 *   1 - One or more diagrams invalid
 *   2 - Error (file not found, etc.)
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

import { checkFile } from '../src/checker.mjs';
import { printFileReport, printSummary, toJson } from '../src/reporter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CLI Argument Parsing
// ============================================

function parseArgs(args) {
    const options = {
        files: [],
        diff: false,
        lineStart: null,
        lineEnd: null,
        blocks: null,
        quiet: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '-h' || arg === '--help') {
            options.help = true;
        } else if (arg === '-q' || arg === '--quiet') {
            options.quiet = true;
        } else if (arg === '--diff') {
            options.diff = true;
        } else if (arg === '--line-start') {
            options.lineStart = parseInt(args[++i], 10);
        } else if (arg === '--line-end') {
            options.lineEnd = parseInt(args[++i], 10);
        } else if (arg === '--blocks') {
            options.blocks = args[++i].split(',').map(n => parseInt(n.trim(), 10));
        } else if (arg === '--dir') {
            options.directory = args[++i];
        } else if (!arg.startsWith('-')) {
            options.files.push(arg);
        }
    }

    return options;
}

function printHelp() {
    console.log(`
Mermaid Diagram Syntax Validator

Usage:
  mermaid-check <file.md>                              Check entire file
  mermaid-check <file.md> --diff --line-start N --line-end N  Check specific line range
  mermaid-check <file.md> --diff --blocks 0,2,3        Check specific blocks
  mermaid-check "**/*.md"                              Check multiple files (glob)
  mermaid-check --dir docs/                            Check all .md in directory
  mermaid-check --dir docs/ --recursive                Check recursively

Options:
  --diff              Only check blocks affected by changes
  --line-start N      Start line number (for --diff mode)
  --line-end N        End line number (for --diff mode)
  --blocks N,N,...    Specific block indices to check
  --quiet, -q         Output JSON only
  --help, -h          Show this help message

Examples:
  mermaid-check README.md
  mermaid-check README.md --quiet
  mermaid-check docs/**/*.md
  mermaid-check README.md --diff --line-start 10 --line-end 50
  mermaid-check README.md --diff --blocks 0,2
    `);
}

// ============================================
// Main
// ============================================

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        printHelp();
        process.exit(2);
    }

    const options = parseArgs(args);

    if (options.help) {
        printHelp();
        process.exit(0);
    }

    // Validate diff options
    if (options.diff) {
        if (options.lineStart !== null && options.lineEnd === null) {
            console.error('Error: --line-end is required when --line-start is specified');
            process.exit(2);
        }
        if (options.lineStart === null && options.lineEnd !== null) {
            console.error('Error: --line-start is required when --line-end is specified');
            process.exit(2);
        }
    }

    // Collect files to check
    let filePaths = [];

    if (options.directory) {
        const pattern = options.recursive ? '**/*.md' : '*.md';
        filePaths = await glob(pattern, { cwd: options.directory, absolute: true });
    } else if (options.files.length > 0) {
        for (const file of options.files) {
            const matches = await glob(file, { absolute: true });
            filePaths.push(...matches);
        }
    }

    // Remove duplicates
    filePaths = [...new Set(filePaths)];

    if (filePaths.length === 0) {
        console.error('No Markdown files found.');
        process.exit(2);
    }

    // Build check options
    const checkOptions = {};
    if (options.diff && options.lineStart !== null) {
        checkOptions.lineStart = options.lineStart;
        checkOptions.lineEnd = options.lineEnd;
    }
    if (options.blocks) {
        checkOptions.blockIndices = options.blocks;
    }

    // Check each file
    const results = [];
    for (const filePath of filePaths) {
        try {
            const result = await checkFile(filePath, checkOptions);
            results.push(result);

            if (options.quiet) {
                console.log(toJson(result));
            } else {
                printFileReport(result);
            }
        } catch (error) {
            console.error(`Error processing ${filePath}: ${error.message}`);
        }
    }

    // Print summary if multiple files
    if (results.length > 1 && !options.quiet) {
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