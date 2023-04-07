"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDiagnostics = exports.applyDCollection = exports.DCollection = void 0;
const vscode = require("vscode");
const common_1 = require("./common");
/**
 * Collection of DMessages that were generated during a single check run.
 */
class DCollection {
    constructor() {
        this.modules = new Map(); // Map of checked modules names to file paths
        this.messages = []; // Collection of diagnostic messages from the check run
    }
    getModules() {
        return this.modules;
    }
    getMessages() {
        return this.messages;
    }
    addFilePath(filePath) {
        this.modules.set(common_1.pathToModuleName(filePath), filePath);
    }
    addMessage(filePath, range, text, severity = vscode.DiagnosticSeverity.Error) {
        this.messages.push(new DMessage(filePath, range, text, severity));
        this.addFilePath(filePath);
    }
    removeMessage(dMessage) {
        this.messages = this.messages.filter(v => v !== dMessage);
    }
    addAll(src) {
        src.messages.forEach((msg) => this.messages.push(msg));
        src.modules.forEach((path, mod) => this.modules.set(mod, path));
    }
}
exports.DCollection = DCollection;
/**
 * Applies all the messages from the given collection.
 * Also removes messages from the checked files if necessary.
 */
function applyDCollection(dCol, dc) {
    // Clear diagnostic for all checked files
    dCol.getModules().forEach((modPath) => dc.delete(common_1.pathToUri(modPath)));
    // Add messages that were found
    const uri2diag = new Map();
    dCol.getMessages().forEach((d) => {
        let list = uri2diag.get(d.filePath);
        if (!list) {
            list = [];
            uri2diag.set(d.filePath, list);
        }
        list.push(d.diagnostic);
    });
    uri2diag.forEach((diags, path) => dc.set(common_1.pathToUri(path), diags));
}
exports.applyDCollection = applyDCollection;
/**
 * Adds all diagnostics from one collection to another.
 */
function addDiagnostics(from, to) {
    from.getModules().forEach((modPath) => to.addFilePath(modPath));
    from.getMessages().forEach((msg) => to.addMessage(msg.filePath, msg.diagnostic.range, msg.diagnostic.message, msg.diagnostic.severity));
}
exports.addDiagnostics = addDiagnostics;
/**
 * A Diagnostic instance linked to the corresponding file.
 */
class DMessage {
    constructor(filePath, range, text, severity) {
        this.filePath = filePath;
        this.diagnostic = new vscode.Diagnostic(range, text, severity);
    }
}
//# sourceMappingURL=diagnostic.js.map