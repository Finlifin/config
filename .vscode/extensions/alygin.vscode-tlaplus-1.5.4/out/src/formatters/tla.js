"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TlaOnTypeFormattingEditProvider = void 0;
const vscode = require("vscode");
const formatting_1 = require("./formatting");
/**
 * Formats the code on the fly in .tla files.
 */
class TlaOnTypeFormattingEditProvider {
    provideOnTypeFormattingEdits(document, position, ch, options, token) {
        if (position.line === 0) {
            return [];
        }
        if (ch === '\n') {
            return tryIndentBlockStart(document, position, options);
        }
        else if (ch === 'd' || ch === 'e' || ch === 'f' || ch === 'r') {
            return tryIndentBlockEnd(document, position, options);
        }
        return [];
    }
}
exports.TlaOnTypeFormattingEditProvider = TlaOnTypeFormattingEditProvider;
/**
 * Indents text inside a block.
 */
function tryIndentBlockStart(document, position, options) {
    const prevLine = document.lineAt(position.line - 1);
    const startInfo = testSimpleBlockStart(prevLine)
        || testStateDefBlockStart(prevLine, options)
        || findEnclosingBlockStart(document, position.line - 1);
    if (!startInfo) {
        return [];
    }
    const lineText = document.lineAt(position.line).text;
    switch (startInfo.indentationType) {
        case formatting_1.IndentationType.Right:
            return formatting_1.indentRight(lineText, position, startInfo.indentation, options);
        case formatting_1.IndentationType.Exact:
            return formatting_1.indentExact(lineText, position, startInfo.indentation);
    }
    return [];
}
/**
 * Indents a line that ends some block by aligning it to the block start.
 */
function tryIndentBlockEnd(document, position, options) {
    const line = document.lineAt(position.line);
    const endInfo = testBlockEnd(line);
    if (!endInfo || endInfo.indentation.length === 0) {
        return [];
    }
    const startInfo = findEnclosingBlockStart(document, position.line - 1);
    if (!startInfo) {
        return [];
    }
    const startIndentLen = formatting_1.indentationLen(startInfo.indentation, options);
    const endIndentLen = formatting_1.indentationLen(endInfo.indentation, options);
    if (endIndentLen === startIndentLen) {
        return [];
    }
    const lineStart = new vscode.Position(position.line, 0);
    const indentationEnd = new vscode.Position(position.line, endIndentLen);
    return [
        vscode.TextEdit.replace(new vscode.Range(lineStart, indentationEnd), startInfo.indentation)
    ];
}
/**
 * Finds the beginning of the block that encloses the given line.
 */
function findEnclosingBlockStart(document, lineNo) {
    let n = lineNo;
    while (n >= 0) {
        const line = document.lineAt(n);
        const startInfo = testBlockStart(line);
        if (startInfo) {
            return startInfo;
        }
        const endInfo = testBlockEnd(line);
        if (endInfo) {
            return undefined;
        }
        if (line.text.length > 0 && !line.text.startsWith(' ') && !line.text.startsWith('\n')) {
            return undefined; // some text with no indentation, stop analysis to prevent too long searching
        }
        n -= 1;
    }
    return undefined;
}
function testSimpleBlockStart(line) {
    const gMatches = /^(\s*)(?:variables|VARIABLE(S)?|CONSTANT(S)?|\w+:)\s*$/g.exec(line.text);
    return gMatches ? new formatting_1.LineInfo(line, gMatches[1], formatting_1.IndentationType.Right) : undefined;
}
function testStateDefBlockStart(line, options) {
    const gMatches = /^((\s*)[\w(),\s]+==\s*)((?:\/\\|\\\/).*)?\s*$/g.exec(line.text);
    if (!gMatches) {
        return undefined;
    }
    if (gMatches[3]) {
        return new formatting_1.LineInfo(line, formatting_1.makeSpaces(formatting_1.indentationLen(gMatches[1], options)), formatting_1.IndentationType.Exact);
    }
    return new formatting_1.LineInfo(line, gMatches[2], formatting_1.IndentationType.Right);
}
function testBlockStart(line) {
    // eslint-disable-next-line max-len
    const matches = /^(\s*)(?:\w+:)?\s*(?:begin\b|if\b|else\b|elsif\b|while\b|either\b|or\b|with\b|define\b|macro\b|procedure\b|\{).*/g.exec(line.text);
    return matches ? new formatting_1.LineInfo(line, matches[1], formatting_1.IndentationType.Right) : undefined;
}
function testBlockEnd(line) {
    const matches = /^(\s*)(?:end\b|else\b|elsif\b|or\b|\}).*/g.exec(line.text);
    return matches ? new formatting_1.LineInfo(line, matches[1], formatting_1.IndentationType.Left) : undefined;
}
//# sourceMappingURL=tla.js.map