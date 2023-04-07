"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanyStdoutParser = exports.SanyData = void 0;
const vscode = require("vscode");
const outputHandler_1 = require("../outputHandler");
const diagnostic_1 = require("../diagnostic");
const common_1 = require("../common");
const fs_1 = require("fs");
var OutBlockType;
(function (OutBlockType) {
    OutBlockType[OutBlockType["Parsing"] = 0] = "Parsing";
    OutBlockType[OutBlockType["Errors"] = 1] = "Errors";
    OutBlockType[OutBlockType["ParseError"] = 2] = "ParseError";
    OutBlockType[OutBlockType["AbortMessages"] = 3] = "AbortMessages";
    OutBlockType[OutBlockType["Warnings"] = 4] = "Warnings";
    OutBlockType[OutBlockType["StackTrace"] = 5] = "StackTrace";
})(OutBlockType || (OutBlockType = {}));
class SanyData {
    constructor() {
        this.dCollection = new diagnostic_1.DCollection();
        this.modulePaths = new Map();
        this.filePathToMonolithFilePath = new Map();
    }
}
exports.SanyData = SanyData;
/**
 * Parses stdout of TLA+ code parser.
 */
class SanyStdoutParser extends outputHandler_1.ProcessOutputHandler {
    constructor(source) {
        super(source, new SanyData());
        this.outBlockType = OutBlockType.Parsing;
        this.pendingAbortMessage = false;
        this.getFileContents = (filePath) => fs_1.readFileSync(filePath).toString(); // this should be set only at tests
    }
    handleLine(line) {
        if (line === null) {
            this.tryAddMessage(true); // Add error message when there's no range
            return;
        }
        if (line === '') {
            return;
        }
        if (line.startsWith('Parsing file ')) {
            const modPath = line.substring(13);
            this.rememberParsedModule(modPath);
            return;
        }
        if (line.startsWith('Semantic processing of module ')) {
            const curMod = line.substring(30);
            this.curFilePath = this.result.modulePaths.get(curMod);
            return;
        }
        let newBlockType;
        let newErrMessage;
        if (line.startsWith('*** Errors:')) {
            newBlockType = OutBlockType.Errors;
        }
        else if (line.startsWith('***Parse Error***')) {
            newBlockType = OutBlockType.ParseError;
        }
        else if (line.startsWith('*** Abort messages:')) {
            newBlockType = OutBlockType.AbortMessages;
        }
        else if (line.startsWith('*** Warnings:')) {
            newBlockType = OutBlockType.Warnings;
        }
        else if (line.startsWith('Fatal errors while parsing TLA+ spec')) {
            this.tryAddMonolithSpec(line);
            newBlockType = OutBlockType.ParseError;
            newErrMessage = line.trim();
        }
        else if (line.startsWith('Residual stack trace follows:')) {
            newBlockType = OutBlockType.StackTrace;
        }
        if (newBlockType) {
            if (this.outBlockType !== OutBlockType.StackTrace) {
                this.tryAddMessage(true);
            }
            this.resetErrData();
            this.outBlockType = newBlockType;
            this.errMessage = newErrMessage;
            return;
        }
        this.tryParseOutLine(line);
    }
    tryAddMonolithSpec(line) {
        const curMod = line.substring(45).split('.')[0];
        const actualFilePath = this.result.modulePaths.get(curMod);
        const sanyData = this.result;
        // If current file path differs from the actual file path, it means we are in a monolith spec.
        // Monolith specs are TLA files which have multiple modules inline.
        if (this.curFilePath && actualFilePath && actualFilePath !== this.curFilePath) {
            const filePath = this.curFilePath;
            const monolithFilePath = actualFilePath;
            // Adapt monolith error locations.
            // It modifies the Sany result adding the module offset in the monolith spec.
            const invertedModulePaths = new Map(Array.from(sanyData.modulePaths, (i) => i.reverse()));
            const text = this.getFileContents(monolithFilePath);
            const specName = invertedModulePaths.get(filePath);
            const moduleHeaderRegex = new RegExp(`^\\s*-{4,}\\s*(MODULE)\\s*${specName}\\s*-{4,}`);
            text.split('\n').every(function (line, number) {
                if (moduleHeaderRegex.test(line)) {
                    sanyData.dCollection.getMessages().filter(m => m.filePath === filePath).forEach(message => {
                        const oldRange = message.diagnostic.range;
                        // Remove message so it does not appear duplicated in the output.
                        sanyData.dCollection.removeMessage(message);
                        sanyData.dCollection.addMessage(monolithFilePath, new vscode.Range(oldRange.start.line + number, oldRange.start.character, oldRange.end.line + number, oldRange.end.character), message.diagnostic.message, message.diagnostic.severity);
                    });
                    return false; // Break out from `every`.
                }
                return true;
            });
        }
    }
    tryParseOutLine(line) {
        if (line === 'SANY finished.') {
            return;
        }
        let range;
        switch (this.outBlockType) {
            case OutBlockType.Parsing:
                this.tryParseLexicalError(line);
                break;
            case OutBlockType.Errors:
            case OutBlockType.Warnings:
                range = this.tryParseErrorRange(line);
                if (range) {
                    if (this.errRange) {
                        this.tryAddMessage(); // We found the beginning of a new message, so finish the previous one
                    }
                    this.errRange = range;
                }
                else {
                    this.appendErrMessage(line);
                }
                return;
            case OutBlockType.ParseError:
                this.appendErrMessage(line);
                this.tryParseParseErrorRange(line);
                break;
            case OutBlockType.AbortMessages:
                this.tryParseAbortError(line);
                break;
        }
        this.tryAddMessage();
    }
    resetErrData() {
        this.errRange = undefined;
        this.errMessage = undefined;
        this.pendingAbortMessage = false;
    }
    tryAddMessage(ignoreNoRange = false) {
        var _a;
        if (this.outBlockType === OutBlockType.StackTrace) {
            return;
        }
        if (!this.errRange && ((_a = this.errMessage) === null || _a === void 0 ? void 0 : _a.endsWith('sany.semantic.AbortException'))) {
            // This message only means that there're other parsing errors
            this.resetErrData();
            return;
        }
        if (this.curFilePath && this.errMessage && (this.errRange || ignoreNoRange)) {
            const severity = this.outBlockType === OutBlockType.Warnings
                ? vscode.DiagnosticSeverity.Warning
                : vscode.DiagnosticSeverity.Error;
            const range = this.errRange || new vscode.Range(0, 0, 0, 0);
            this.result.dCollection.addMessage(this.curFilePath, range, this.errMessage, severity);
            this.resetErrData();
        }
    }
    rememberParsedModule(modulePath) {
        const modName = common_1.pathToModuleName(modulePath);
        this.result.modulePaths.set(modName, modulePath);
        this.result.dCollection.addFilePath(modulePath);
        this.curFilePath = modulePath;
        if (!this.rootModulePath) {
            this.rootModulePath = modulePath;
        }
    }
    tryParseLexicalError(line) {
        const rxError = /^\s*Lexical error at line (\d+), column (\d+).\s*(.*)$/g;
        const errMatches = rxError.exec(line);
        if (!errMatches) {
            return;
        }
        const errLine = parseInt(errMatches[1]) - 1;
        const errCol = parseInt(errMatches[2]) - 1;
        this.errMessage = errMatches[3];
        this.errRange = new vscode.Range(errLine, errCol, errLine, errCol);
    }
    tryParseErrorRange(line) {
        const rxPosition = /^\s*line (\d+), col (\d+) to line (\d+), col (\d+) of module (\w+)\s*$/g;
        const posMatches = rxPosition.exec(line);
        if (!posMatches) {
            return undefined;
        }
        return new vscode.Range(parseInt(posMatches[1]) - 1, parseInt(posMatches[2]) - 1, parseInt(posMatches[3]) - 1, parseInt(posMatches[4]));
    }
    tryParseParseErrorRange(line) {
        const rxPosition = /\bat line (\d+), col(?:umn)? (\d+)\s+.*$/g;
        const posMatches = rxPosition.exec(line);
        if (!posMatches) {
            return;
        }
        const errLine = parseInt(posMatches[1]) - 1;
        const errCol = parseInt(posMatches[2]) - 1;
        this.errRange = new vscode.Range(errLine, errCol, errLine, errCol);
    }
    // Parses abort messages with unknown locations
    tryParseAbortError(line) {
        if (line === 'Unknown location') {
            this.pendingAbortMessage = true;
            return;
        }
        if (!this.pendingAbortMessage || !this.rootModulePath) {
            return;
        }
        if (line.startsWith('Circular dependency')) {
            // Have to wait for the next line that will contain the recursion description
            this.errMessage = line;
            return;
        }
        const message = this.errMessage ? this.errMessage + '\n' + line : line;
        this.result.dCollection.addMessage(this.rootModulePath, new vscode.Range(0, 0, 0, 0), message);
        this.resetErrData();
    }
    appendErrMessage(line) {
        if (!this.errMessage) {
            this.errMessage = line.trim();
        }
        else {
            this.errMessage += '\n' + line.trim();
        }
    }
}
exports.SanyStdoutParser = SanyStdoutParser;
//# sourceMappingURL=sany.js.map