"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TlaCodeActionProvider = void 0;
const vscode = require("vscode");
const parseModule_1 = require("./commands/parseModule");
/**
 * Provides actions for .tla files.
 */
class TlaCodeActionProvider {
    constructor() {
        this.actParseModule = {
            kind: vscode.CodeActionKind.Source,
            title: 'Parse module',
            command: {
                title: 'Parse module',
                command: parseModule_1.CMD_PARSE_MODULE
            }
        };
    }
    provideCodeActions(document, range, context, token) {
        return [this.actParseModule];
    }
}
exports.TlaCodeActionProvider = TlaCodeActionProvider;
//# sourceMappingURL=actions.js.map