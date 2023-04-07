"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseModule = exports.CMD_PARSE_MODULE = void 0;
const vscode = require("vscode");
const diagnostic_1 = require("../diagnostic");
const pluscal_1 = require("../parsers/pluscal");
const sany_1 = require("../parsers/sany");
const tla2tools_1 = require("../tla2tools");
const outputChannels_1 = require("../outputChannels");
const common_1 = require("../common");
exports.CMD_PARSE_MODULE = 'tlaplus.parse';
const plusCalOutChannel = new outputChannels_1.ToolOutputChannel('PlusCal');
const sanyOutChannel = new outputChannels_1.ToolOutputChannel('SANY');
/**
 * Parses .tla module:
 * - Transpiles PlusCal to TLA+
 * - Parses resulting TLA+ specification and checks for syntax errors
 */
function parseModule(diagnostic) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No editor is active, cannot find a TLA+ file to transpile');
        return;
    }
    if (editor.document.languageId !== common_1.LANG_TLAPLUS) {
        vscode.window.showWarningMessage('File in the active editor is not a TLA+ file, it cannot be transpiled');
        return;
    }
    editor.document.save().then(() => doParseFile(editor.document, diagnostic));
}
exports.parseModule = parseModule;
function doParseFile(doc, diagnostic) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const messages = yield transpilePlusCal(doc.uri);
            vscode.window.showTextDocument(doc); // To force changes reloading
            const specData = yield parseSpec(doc.uri);
            messages.addAll(specData.dCollection);
            diagnostic_1.applyDCollection(messages, diagnostic);
        }
        catch (e) {
            vscode.window.showErrorMessage(e.message);
        }
    });
}
/**
 * Transpiles PlusCal code in the current .tla file to TLA+ code in the same file.
 */
function transpilePlusCal(fileUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const procInfo = yield tla2tools_1.runPlusCal(fileUri.fsPath);
        plusCalOutChannel.bindTo(procInfo);
        const stdoutParser = new pluscal_1.TranspilerStdoutParser(procInfo.process.stdout, fileUri.fsPath);
        return stdoutParser.readAll();
    });
}
/**
 * Parses the resulting TLA+ spec.
 */
function parseSpec(fileUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const procInfo = yield tla2tools_1.runSany(fileUri.fsPath);
        sanyOutChannel.bindTo(procInfo);
        const stdoutParser = new sany_1.SanyStdoutParser(procInfo.process.stdout);
        return stdoutParser.readAll();
    });
}
//# sourceMappingURL=parseModule.js.map