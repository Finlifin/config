"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CfgCompletionItemProvider = exports.TLA_CFG_KEYWORDS = void 0;
const vscode = require("vscode");
const completions_1 = require("./completions");
const tlaCompletions_1 = require("./tlaCompletions");
exports.TLA_CFG_KEYWORDS = [
    'SPECIFICATION', 'INVARIANT', 'INVARIANTS', 'PROPERTY', 'PROPERTIES', 'CONSTANT', 'CONSTANTS', 'INIT',
    'NEXT', 'SYMMETRY', 'CONSTRAINT', 'CONSTRAINTS', 'ACTION_CONSTRAINT', 'ACTION_CONSTRAINTS', 'VIEW',
    'CHECK_DEADLOCK', 'POSTCONDITION'
];
const KEYWORD_ITEMS = exports.TLA_CFG_KEYWORDS.map(w => {
    return new vscode.CompletionItem(w, vscode.CompletionItemKind.Keyword);
});
const TLA_CONST_ITEMS = tlaCompletions_1.TLA_CONSTANTS.map(w => new vscode.CompletionItem(w, vscode.CompletionItemKind.Constant));
/**
 * Completes text in .cfg files.
 */
class CfgCompletionItemProvider {
    provideCompletionItems(document, position, token, context) {
        const prevText = completions_1.getPrevText(document, position);
        const isNewLine = /^\s*[a-zA-Z]*$/g.test(prevText);
        if (prevText.startsWith('CHECK_DEADLOCK')) {
            return new vscode.CompletionList(TLA_CONST_ITEMS, false);
        }
        return new vscode.CompletionList(isNewLine ? KEYWORD_ITEMS : [], false);
    }
    resolveCompletionItem(item, token) {
        item.insertText = item.label + ' ';
        return item;
    }
}
exports.CfgCompletionItemProvider = CfgCompletionItemProvider;
//# sourceMappingURL=cfgCompletions.js.map