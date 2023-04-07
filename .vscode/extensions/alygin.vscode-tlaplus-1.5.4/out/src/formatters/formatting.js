"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indentationLen = exports.makeSpaces = exports.indentExact = exports.indentRight = exports.LineInfo = exports.IndentationType = void 0;
const vscode = require("vscode");
const SPACES = ['', ' ', '  ', '   ', '    ', '     ', '      ', '       ', '        '];
var IndentationType;
(function (IndentationType) {
    IndentationType[IndentationType["Exact"] = 0] = "Exact";
    IndentationType[IndentationType["Right"] = 1] = "Right";
    IndentationType[IndentationType["Left"] = 2] = "Left"; // Decrease indentation
})(IndentationType = exports.IndentationType || (exports.IndentationType = {}));
class LineInfo {
    constructor(line, indentation, indentationType) {
        this.line = line;
        this.indentation = indentation;
        this.indentationType = indentationType;
    }
}
exports.LineInfo = LineInfo;
/**
 * Adds tab to the given line.
 */
function indentRight(lineText, position, baseIndentation, options) {
    if (lineText === baseIndentation) {
        // The user has just hit the Enter right after the block start
        // and VSCode aligned the new line to the block start. Just add a new tab.
        return [vscode.TextEdit.insert(position, makeTab(options))];
    }
    if (position.character === indentationLen(baseIndentation, options) + options.tabSize) {
        // The user just hit the Enter while continuing to type inside already indented
        // block. VSCode does everyting itself.
        return [];
    }
    // Otherwise just force the correct indentation
    // This works in all cases. The cases above are just to improve user experience a bit
    const newIdent = baseIndentation + makeTab(options);
    const lineStart = new vscode.Position(position.line, 0);
    return [vscode.TextEdit.replace(new vscode.Range(lineStart, position), newIdent)];
}
exports.indentRight = indentRight;
/**
 * Indents the block with the given indentation string.
 */
function indentExact(lineText, position, indentation) {
    if (lineText === indentation) {
        return [];
    }
    const lineStart = new vscode.Position(position.line, 0);
    return [vscode.TextEdit.replace(new vscode.Range(lineStart, position), indentation)];
}
exports.indentExact = indentExact;
function makeSpaces(num) {
    if (num < SPACES.length) {
        return SPACES[num];
    }
    let len = SPACES.length - 1;
    const spaces = SPACES.slice(SPACES.length - 1);
    while (len < num) {
        len += 1;
        spaces.push(' ');
    }
    return spaces.join('');
}
exports.makeSpaces = makeSpaces;
function indentationLen(str, options) {
    let len = 0;
    for (const ch of str) {
        len += ch === '\t' ? options.tabSize : 1;
    }
    return len;
}
exports.indentationLen = indentationLen;
function makeTab(options) {
    return options.insertSpaces ? makeSpaces(options.tabSize) : '\t';
}
//# sourceMappingURL=formatting.js.map