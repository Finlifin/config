"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TlaCompletionItemProvider = exports.TLA_STD_MODULES = exports.TLA_CONSTANTS = exports.TLA_OTHER_KEYWORDS = exports.TLA_PROOF_STARTING_KEYWORDS = exports.TLA_STARTING_KEYWORDS = exports.TLA_OPERATORS = void 0;
const vscode = require("vscode");
const completions_1 = require("./completions");
exports.TLA_OPERATORS = [
    'E', 'A', 'X', 'lnot', 'land', 'lor', 'cdot', 'equiv', 'subseteq', 'in', 'notin', 'intersect',
    'union', 'leq', 'geq', 'cup', 'cap'
];
exports.TLA_STARTING_KEYWORDS = [
    'EXTENDS', 'VARIABLE', 'VARIABLES', 'CONSTANT', 'CONSTANTS', 'ASSUME', 'ASSUMPTION', 'AXIOM', 'THEOREM',
    'PROOF', 'LEMMA', 'PROPOSITION', 'COROLLARY', 'RECURSIVE'
];
exports.TLA_PROOF_STARTING_KEYWORDS = [
    'DEFINE', 'QED', 'HIDE', 'SUFFICES', 'PICK', 'HAVE', 'TAKE', 'WITNESS'
];
exports.TLA_OTHER_KEYWORDS = [
    'LET', 'IN', 'EXCEPT', 'ENABLED', 'UNCHANGED', 'LAMBDA', 'DOMAIN', 'CHOOSE', 'LOCAL',
    'INSTANCE', 'WITH', 'SUBSET', 'UNION', 'SF_', 'WF_', 'USE', 'BY', 'DEF', 'DEFS', 'PROVE', 'OBVIOUS',
    'NEW', 'ACTION', 'OMITTED', 'ONLY', 'STATE', 'TEMPORAL',
    // -- control keywords
    'IF', 'THEN', 'ELSE', 'CASE', 'OTHER',
    // -- other
    'BOOLEAN'
];
exports.TLA_CONSTANTS = ['TRUE', 'FALSE'];
exports.TLA_STD_MODULES = [
    'Bags', 'FiniteSets', 'Integers', 'Naturals', 'Randomization', 'Reals', 'RealTime', 'Sequences', 'TLC'
];
const TLA_STARTING_KEYWORD_ITEMS = exports.TLA_STARTING_KEYWORDS.map(w => {
    return new vscode.CompletionItem(w, vscode.CompletionItemKind.Keyword);
});
const TLA_PROOF_STARTING_KEYWORD_ITEMS = exports.TLA_PROOF_STARTING_KEYWORDS.map(w => {
    return new vscode.CompletionItem(w, vscode.CompletionItemKind.Keyword);
});
const TLA_OTHER_KEYWORD_ITEMS = exports.TLA_OTHER_KEYWORDS.map(w => {
    return new vscode.CompletionItem(w, vscode.CompletionItemKind.Keyword);
});
const TLA_CONST_ITEMS = exports.TLA_CONSTANTS.map(w => new vscode.CompletionItem(w, vscode.CompletionItemKind.Constant));
const TLA_OPERATOR_ITEMS = exports.TLA_OPERATORS.map(w => {
    return new vscode.CompletionItem('\\' + w, vscode.CompletionItemKind.Operator);
});
const TLA_INNER_ITEMS = TLA_OTHER_KEYWORD_ITEMS.concat(TLA_CONST_ITEMS);
const TLA_STD_MODULE_ITEMS = exports.TLA_STD_MODULES.map(m => {
    return new vscode.CompletionItem(m, vscode.CompletionItemKind.Module);
});
/**
 * Completes TLA+ text.
 */
class TlaCompletionItemProvider {
    constructor(docInfos) {
        this.docInfos = docInfos;
    }
    provideCompletionItems(document, position, token, context) {
        const prevText = completions_1.getPrevText(document, position);
        if (prevText.startsWith('EXTENDS')) {
            return new vscode.CompletionList(TLA_STD_MODULE_ITEMS, false);
        }
        if (prevText.startsWith('CONSTANT') || prevText.startsWith('RECURSIVE')) {
            return new vscode.CompletionList([], false);
        }
        const isOperator = /^.*(?<!\/)\\\w*$/g.test(prevText); // contains \ before the trailing letters, but not /\
        if (isOperator) {
            return new vscode.CompletionList(TLA_OPERATOR_ITEMS, false);
        }
        const docInfo = this.docInfos.get(document.uri);
        const symbols = docInfo.symbols || [];
        const symbolInfos = symbols.map(s => new vscode.CompletionItem(s.name, mapKind(s.kind)));
        let items = TLA_INNER_ITEMS.concat(symbolInfos);
        if (!docInfo.isPlusCalAt(position)) {
            const isProofStep = /^\s*<\d+>[<>\d.a-zA-Z]*\s+[a-zA-Z]*$/g.test(prevText);
            const isNewLine = /^\s*[a-zA-Z]*$/g.test(prevText);
            if (isProofStep) {
                items = items.concat(TLA_PROOF_STARTING_KEYWORD_ITEMS);
            }
            else if (isNewLine) {
                items = items.concat(TLA_STARTING_KEYWORD_ITEMS);
            }
        }
        return new vscode.CompletionList(items, false);
    }
    resolveCompletionItem(item, token) {
        switch (item.kind) {
            case vscode.CompletionItemKind.Keyword:
                item.insertText = item.label + ' ';
                break;
            case vscode.CompletionItemKind.Operator:
                item.insertText = item.label.substring(1) + ' ';
                break;
        }
        return item;
    }
}
exports.TlaCompletionItemProvider = TlaCompletionItemProvider;
function mapKind(symbolKind) {
    switch (symbolKind) {
        case vscode.SymbolKind.Field:
            return vscode.CompletionItemKind.Field;
        case vscode.SymbolKind.Variable:
            return vscode.CompletionItemKind.Variable;
        case vscode.SymbolKind.Function:
            return vscode.CompletionItemKind.Function;
        case vscode.SymbolKind.Method:
            return vscode.CompletionItemKind.Method;
        case vscode.SymbolKind.Namespace:
        case vscode.SymbolKind.Module:
            return vscode.CompletionItemKind.Module;
        case vscode.SymbolKind.Constant:
            return vscode.CompletionItemKind.Constant;
    }
    return vscode.CompletionItemKind.Text;
}
//# sourceMappingURL=tlaCompletions.js.map