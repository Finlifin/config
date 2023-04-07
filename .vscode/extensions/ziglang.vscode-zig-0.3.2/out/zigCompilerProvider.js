'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const vscode = require("vscode");
class ZigCompilerProvider {
    activate(subscriptions) {
        subscriptions.push(this);
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection();
        vscode.workspace.onDidOpenTextDocument(this.doCompile, this, subscriptions);
        vscode.workspace.onDidCloseTextDocument((textDocument) => {
            this.diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);
        vscode.workspace.onDidSaveTextDocument(this.doCompile, this);
    }
    dispose() {
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
    }
    doCompile(textDocument) {
        let config = vscode.workspace.getConfiguration('zig');
        let buildOnSave = config.get("buildOnSave");
        if (textDocument.languageId !== 'zig' || buildOnSave !== true) {
            return;
        }
        let buildOption = config.get("buildOption");
        let processArg = [buildOption];
        switch (buildOption) {
            case "build":
                let buildFilePath = config.get("buildFilePath");
                processArg.push("--build-file");
                processArg.push(buildFilePath.replace("${workspaceFolder}", vscode.workspace.rootPath));
                break;
            default:
                processArg.push(textDocument.fileName);
                break;
        }
        let extraArgs = config.get("buildArgs");
        extraArgs.forEach(element => {
            processArg.push(element);
        });
        let decoded = '';
        let childProcess = cp.spawn('zig', processArg, undefined);
        if (childProcess.pid) {
            childProcess.stderr.on('data', (data) => {
                decoded += data;
            });
            childProcess.stdout.on('end', () => {
                var diagnostics = {};
                let regex = /(\S.*):(\d*):(\d*): ([^:]*): (.*)/g;
                this.diagnosticCollection.clear();
                for (let match = regex.exec(decoded); match; match = regex.exec(decoded)) {
                    let path = match[1].trim();
                    let line = parseInt(match[2]) - 1;
                    let column = parseInt(match[3]) - 1;
                    let type = match[4];
                    let message = match[5];
                    let severity = type.trim().toLowerCase() === "error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Information;
                    let range = new vscode.Range(line, column, line, column + 1);
                    if (diagnostics[path] == null)
                        diagnostics[path] = [];
                    diagnostics[path].push(new vscode.Diagnostic(range, message, severity));
                }
                for (let path in diagnostics) {
                    let diagnostic = diagnostics[path];
                    this.diagnosticCollection.set(vscode.Uri.file(path), diagnostic);
                }
            });
        }
    }
    provideCodeActions(document, range, context, token) {
        return [];
    }
}
exports.default = ZigCompilerProvider;
//# sourceMappingURL=zigCompilerProvider.js.map