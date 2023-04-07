"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CfgOnTypeFormattingEditProvider = void 0;
const formatting_1 = require("./formatting");
class CfgOnTypeFormattingEditProvider {
    provideOnTypeFormattingEdits(document, position, ch, options, token) {
        if (position.line === 0) {
            return [];
        }
        const prevLine = document.lineAt(position.line - 1);
        const startInfo = testBlockStart(prevLine);
        if (!startInfo) {
            return [];
        }
        const lineText = document.lineAt(position.line).text;
        return formatting_1.indentRight(lineText, position, startInfo.indentation, options);
    }
}
exports.CfgOnTypeFormattingEditProvider = CfgOnTypeFormattingEditProvider;
function testBlockStart(line) {
    // eslint-disable-next-line max-len
    const regex = /^(\s*)(?:SPECIFICATION|INVARIANT(S)?|PROPERT(Y|IES)|CONSTANT(S)?|INIT|NEXT|SYMMETRY|CONSTRAINT(S)?|ACTION_CONSTRAINT(S)?|VIEW|CHECK_DEADLOCK|POSTCONDITION)\s*$/g;
    const gMatches = regex.exec(line.text);
    return gMatches ? new formatting_1.LineInfo(line, gMatches[1], formatting_1.IndentationType.Right) : undefined;
}
//# sourceMappingURL=cfg.js.map